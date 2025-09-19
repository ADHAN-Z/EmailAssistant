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

    const allTasksToCreate: TaskCreateData[] = [];
    let processedEmails = 0;
    let failedEmails = 0;

    // 2️⃣ Process each email
    for (const email of emails) {
      try {
        const analysis = await emailAnalysisChain(email.content);

        if (analysis && analysis.is_actionable) {
          for (const task of analysis.tasks) {
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
        }
        processedEmails++;
      } catch (error) {
        failedEmails++;
        logger.error(`Failed to process email ${email.id}`, error as Error, {
          userId: sessionUser.id,
          emailId: email.id,
        });
      }
    }

    // 3️⃣ Save tasks to DB
    let totalTasksCreated = 0;
    if (allTasksToCreate.length > 0) {
      await prisma.task.createMany({
        data: allTasksToCreate,
        skipDuplicates: true,
      });
      totalTasksCreated = allTasksToCreate.length;
    }

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