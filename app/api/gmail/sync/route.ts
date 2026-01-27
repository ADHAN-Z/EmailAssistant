// app/api/gmail/sync/route.ts - Updated to use userId instead of accessToken
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { syncGmailEmails, type GmailMessage } from "@/lib/gmail";
import { emailAnalysisChain } from "@/lib/langchain/emailProcessor";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { AuthenticationError, handleApiError } from "@/lib/errors";
import { emailSyncSchema, type EmailSyncInput } from "@/lib/validations";
import { checkRateLimit, emailSyncLimiter, getClientIP } from "@/lib/rate-limit";
import type { SessionUser } from "@/types";
import { RetryHandler } from "@/lib/retry-handler";
import { PerformanceMonitor } from "@/lib/performance-monitor";
import { cache, cacheKeys } from "@/lib/cache";

interface TaskCreateData {
  title: string;
  priority: number;
  deadline: Date | null;
  taskType: string;
  company?: string;
  role?: string;
  details: string;
  links: string[];
  status: string;
  userId: string;
}

interface EmailSyncResponse {
  success: boolean;
  message?: string;
  data?: {
    emailsProcessed: number;
    emailsFailed: number;
    tasksCreated: number;
  };
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<EmailSyncResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      throw new AuthenticationError("Not authenticated");
    }

    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(emailSyncLimiter, clientIP);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Parse and validate request body
    const body: unknown = await request.json().catch(() => ({}));
    const validatedData: EmailSyncInput = emailSyncSchema.parse(body);

    const sessionUser = session.user as SessionUser;
    const syncStatusKey = `sync:status:${sessionUser.id}`;

    // Initialize sync status in cache
    await cache.set(syncStatusKey, {
      isProcessing: true,
      progress: 0,
      currentStep: 'Starting sync...',
      totalEmails: 0,
      processedEmails: 0,
      tasksCreated: 0,
      emailsFailed: 0,
      lastSync: null,
      error: null,
    });

    logger.info("Starting email sync", {
      userId: sessionUser.id,
      email: sessionUser.email,
      maxEmails: validatedData.maxEmails,
    });

    // 1️⃣ Fetch emails using userId (tokens will be handled internally)
    const emails: GmailMessage[] = await syncGmailEmails(sessionUser.id, {
      maxEmails: validatedData.maxEmails,
      onlyUnread: validatedData.onlyUnread
    });

    if (emails.length === 0) {
      logger.info("No new emails to process", { userId: sessionUser.id });
      return NextResponse.json({ success: true, message: "No new emails to process." });
    }

    logger.info(`Processing ${emails.length} emails`, { userId: sessionUser.id });

    // 2️⃣ Process each email and update progress
    const allTasksToCreate: TaskCreateData[] = [];
    let processedEmails = 0;
    let failedEmails = 0;

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      // Update progress
      const progress = Math.round(((i + 1) / emails.length) * 100);
      await cache.set(syncStatusKey, {
        isProcessing: true,
        progress,
        currentStep: `Processing email ${i + 1} of ${emails.length}`,
        totalEmails: emails.length,
        processedEmails: i,
        tasksCreated: allTasksToCreate.length,
        emailsFailed: failedEmails,
        lastSync: null,
        error: null,
      });

      try {
        const result = await PerformanceMonitor.measure(
          'email-analysis',
          async () => {
            try {
              return await RetryHandler.retry(async () => {
                const analysis = await emailAnalysisChain(email.content);
                return { email, analysis, success: true };
              });
            } catch (error) {
              logger.error('Email analysis failed', error as Error, { emailId: email.id });
              return { email, error, success: false };
            }
          },
          { emailId: email.id }
        );

        // Type guard to check if the result has analysis
        if (result.success && 'analysis' in result && result.analysis && result.analysis.is_actionable) {
          processedEmails++;
          for (const task of result.analysis.tasks) {
            allTasksToCreate.push({
              title: task.title,
              priority: task.priority,
              deadline: task.deadline ? new Date(task.deadline) : null,
              taskType: task.task_type,
              company: task.company,
              role: task.role,
              details: task.details,
              links: task.links || [],
              status: "todo",
              userId: sessionUser.id,
            });
          }
        } else {
          failedEmails++;
          // Type guard to check if the result has error
          if ('error' in result) {
            logger.error(`Failed to process email ${email.id}`, result.error as Error, {
              userId: sessionUser.id,
              emailId: email.id,
            });
          }
        }
      } catch (error) {
        failedEmails++;
        logger.error('Email processing failed', error as Error, {
          userId: sessionUser.id,
          emailId: email.id,
        });
      }
    }

    // 3️⃣ Deduplicate tasks before saving
    const deduplicatedTasks = [];
    const seenTasks = new Set();

    for (const task of allTasksToCreate) {
      // Create a unique key based on title, company, and role (for interviews)
      const taskKey = `${task.title.toLowerCase()}${task.company || ''}${task.role || ''}`;
      
      if (!seenTasks.has(taskKey)) {
        seenTasks.add(taskKey);
        deduplicatedTasks.push(task);
      }
    }

    // 4️⃣ Save tasks to DB
    let totalTasksCreated = 0;
    if (deduplicatedTasks.length > 0) {
      await prisma.task.createMany({
        data: deduplicatedTasks,
        skipDuplicates: true,
      });
      totalTasksCreated = deduplicatedTasks.length;
      
      // Clear user's tasks cache to ensure fresh data is fetched
      await cache.del(cacheKeys.userTasks(sessionUser.id));
    }

    // Update sync status in cache with final results
    await cache.set(syncStatusKey, {
      isProcessing: false,
      progress: 100,
      currentStep: 'Sync complete',
      totalEmails: emails.length,
      processedEmails,
      tasksCreated: totalTasksCreated,
      emailsFailed: failedEmails,
      lastSync: new Date(),
      error: null,
    });

    logger.info("Email sync completed", {
      userId: sessionUser.id,
      totalEmails: emails.length,
      processedEmails,
      failedEmails,
      tasksCreated: totalTasksCreated,
    });

    return NextResponse.json({
      success: true,
      message: `Sync complete. Processed ${processedEmails} emails, created ${totalTasksCreated} new tasks.`,
      data: {
        emailsProcessed: processedEmails,
        emailsFailed: failedEmails,
        tasksCreated: totalTasksCreated,
      },
    });
  } catch (error: unknown) {
    const errorResponse = handleApiError(error);
    logger.error("Email sync failed", error instanceof Error ? error : new Error("Unknown error"), {
      error: errorResponse.error,
    });

    return NextResponse.json({ success: false, error: errorResponse.error }, { status: errorResponse.statusCode });
  }
}