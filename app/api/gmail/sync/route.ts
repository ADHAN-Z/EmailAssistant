// app/api/gmail/sync/route.ts - Enhanced with progress tracking
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { syncGmailEmails, type GmailMessage } from "@/lib/gmail";
import { emailAnalysisChain } from "@/lib/langchain/emailProcessor";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { cache } from "@/lib/cache";
import { AuthenticationError, handleApiError } from "@/lib/errors";
import { emailSyncSchema, type EmailSyncInput } from "@/lib/validations";
import { checkRateLimit, emailSyncLimiter, getClientIP } from "@/lib/rate-limit";
import type { SessionUser } from "@/types";

interface TaskCreateData {
  title: string;
  priority: number;
  deadline: Date | null;
  taskType: string;
  company?: string | undefined;
  role?: string | undefined;
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
    status?: string;
  };
  error?: string;
}

interface SyncStatus {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
  totalEmails: number;
  processedEmails: number;
  tasksCreated: number;
  emailsFailed: number;
  lastSync: Date | null;
  error: string | null;
}

// Helper function to update sync status in cache
async function updateSyncStatus(userId: string, updates: Partial<SyncStatus>) {
  const syncStatusKey = `sync:status:${userId}`;
  
  // Get current status
  const currentStatus = await cache.get<SyncStatus>(syncStatusKey) || {
    isProcessing: false,
    progress: 0,
    currentStep: '',
    totalEmails: 0,
    processedEmails: 0,
    tasksCreated: 0,
    emailsFailed: 0,
    lastSync: null,
    error: null,
  };
  
  // Update with new values
  const updatedStatus: SyncStatus = {
    ...currentStatus,
    ...updates,
    lastSync: updates.isProcessing === false ? new Date() : currentStatus.lastSync,
  };

  // Cache for 5 minutes
  await cache.set(syncStatusKey, updatedStatus, 300);
  
  logger.info('Sync status updated', { userId, status: updatedStatus });
}

export async function POST(request: Request): Promise<NextResponse<EmailSyncResponse>> {
  let userId: string | undefined;
  
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
    userId = sessionUser.id;

    logger.info("Starting email sync", {
      userId: sessionUser.id,
      email: sessionUser.email,
      maxEmails: validatedData.maxEmails,
    });

    // Check if sync is already in progress
    const currentStatus = await cache.get<SyncStatus>(`sync:status:${userId}`);
    if (currentStatus?.isProcessing) {
      return NextResponse.json({
        success: false,
        error: "Sync already in progress",
        data: { 
          emailsProcessed: 0,
          emailsFailed: 0,
          tasksCreated: 0,
          status: 'already_processing' 
        }
      }, { status: 409 });
    }

    // Set initial processing status
    await updateSyncStatus(userId, {
      isProcessing: true,
      progress: 0,
      currentStep: 'Connecting to Gmail...',
      totalEmails: 0,
      processedEmails: 0,
      tasksCreated: 0,
      emailsFailed: 0,
      error: null,
    });

    // Start async processing (don't await - let it run in background)
    processEmailsAsync(sessionUser, validatedData);

    // Return immediately with processing status
    return NextResponse.json({
      success: true,
      message: 'Email sync started successfully',
      data: {
        emailsProcessed: 0,
        emailsFailed: 0,
        tasksCreated: 0,
        status: 'processing'
      }
    });

  } catch (error: unknown) {
    // Update error status if we have userId
    if (userId) {
      await updateSyncStatus(userId, {
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const errorResponse = handleApiError(error);
    logger.error("Email sync failed", error instanceof Error ? error : new Error("Unknown error"), {
      error: errorResponse.error,
    });

    return NextResponse.json({ 
      success: false, 
      error: errorResponse.error 
    }, { 
      status: errorResponse.statusCode 
    });
  }
}

// Async processing function that handles the actual email sync
async function processEmailsAsync(sessionUser: SessionUser, validatedData: EmailSyncInput) {
  const userId = sessionUser.id;
  
  try {
    // Update status: Fetching emails
    await updateSyncStatus(userId, {
      progress: 10,
      currentStep: 'Fetching recent emails...',
    });

    // 1️⃣ Fetch emails using userId (tokens will be handled internally)
    const emails: GmailMessage[] = await syncGmailEmails(userId, {
      maxEmails: validatedData.maxEmails,
      onlyUnread: validatedData.onlyUnread
    });

    if (emails.length === 0) {
      logger.info("No new emails to process", { userId });
      await updateSyncStatus(userId, {
        isProcessing: false,
        progress: 100,
        currentStep: 'No new emails found',
        totalEmails: 0,
      });
      return;
    }

    logger.info(`Processing ${emails.length} emails`, { userId });

    await updateSyncStatus(userId, {
      progress: 20,
      currentStep: 'Analyzing emails with AI...',
      totalEmails: emails.length,
    });

    const allTasksToCreate: TaskCreateData[] = [];
    let processedEmails = 0;
    let failedEmails = 0;

    // 2️⃣ Process emails in batches for better progress tracking
    const batchSize = 3; // Process 3 emails at a time
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      // Process batch concurrently
      const batchResults = await Promise.allSettled(
        batch.map(async (email) => {
          try {
            // Check if this email was already processed
            const existingTask = await prisma.task.findFirst({
              where: {
                userId,
                // Use email subject + date as unique identifier
                title: {
                  contains: email.id?.substring(0, 50) || 'Untitled'
                },
                createdAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Within last 7 days
                }
              }
            });

            if (existingTask) {
              logger.info('Email already processed, skipping', { 
                emailId: email.id, 
                subject: email.id
              });
              return [];
            }

            const analysis = await emailAnalysisChain(email.content);

            if (analysis && analysis.is_actionable) {
              const tasksForEmail: TaskCreateData[] = [];
              for (const task of analysis.tasks) {
                // Ensure priority is mapped correctly (1-4 scale)
                const mappedPriority = Math.max(1, Math.min(4, task.priority));
                
                // Additional validation for deadline
                let validDeadline: Date | null = null;
                if (task.deadline) {
                  const deadlineDate = new Date(task.deadline);
                  const currentDate = new Date();
                  
                  // Only use deadline if it's valid and in the future
                  if (!isNaN(deadlineDate.getTime()) && deadlineDate >= currentDate) {
                    validDeadline = deadlineDate;
                  } else {
                    logger.info('Invalid or past deadline detected, setting to null', {
                      originalDeadline: task.deadline,
                      taskTitle: task.title
                    });
                  }
                }

                tasksForEmail.push({
                  title: task.title,
                  priority: mappedPriority, // Now properly mapped to 1-4 scale
                  deadline: validDeadline,
                  taskType: task.task_type,
                  company: task.company || undefined,
                  role: task.role || undefined,
                  details: task.details,
                  links: task.links || [],
                  status: "todo",
                  userId,
                });
              }
              return tasksForEmail;
            }
            return [];
          } catch (error) {
            logger.error(`Failed to process email ${email.id}`, error as Error, {
              userId,
              emailId: email.id,
            });
            throw error;
          }
        })
      );

      // Process batch results
      batchResults.forEach((result, batchIndex) => {
        if (result.status === 'fulfilled') {
          allTasksToCreate.push(...result.value);
          processedEmails++;
        } else {
          failedEmails++;
        }
      });

      // Update progress (20% to 80% for email processing)
      const emailProgress = ((processedEmails + failedEmails) / emails.length) * 60;
      const totalProgress = Math.min(20 + emailProgress, 80);
      
      await updateSyncStatus(userId, {
        progress: totalProgress,
        currentStep: `Analyzing emails... ${processedEmails + failedEmails}/${emails.length}`,
        processedEmails: processedEmails,
        emailsFailed: failedEmails,
      });

      // Small delay to prevent overwhelming the system
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // 3️⃣ Save tasks to DB
    await updateSyncStatus(userId, {
      progress: 85,
      currentStep: 'Saving tasks to database...',
    });

    let totalTasksCreated = 0;
    if (allTasksToCreate.length > 0) {
      try {
        await prisma.task.createMany({
          data: allTasksToCreate,
          skipDuplicates: true,
        });
        totalTasksCreated = allTasksToCreate.length;
      } catch (dbError) {
        logger.error('Failed to save tasks to database', dbError as Error, { userId });
        throw dbError;
      }
    }

    // Clear user cache to force refresh
    await cache.clearUserCache?.(userId);

    // Final status update
    await updateSyncStatus(userId, {
      isProcessing: false,
      progress: 100,
      currentStep: 'Sync completed successfully!',
      processedEmails: processedEmails,
      emailsFailed: failedEmails,
      tasksCreated: totalTasksCreated,
    });

    logger.info("Email sync completed", {
      userId,
      totalEmails: emails.length,
      processedEmails,
      failedEmails,
      tasksCreated: totalTasksCreated,
    });

  } catch (error: unknown) {
    logger.error("Async email processing failed", error instanceof Error ? error : new Error("Unknown error"), {
      userId,
    });
    
    await updateSyncStatus(userId, {
      isProcessing: false,
      error: error instanceof Error ? error.message : 'Processing failed',
      currentStep: 'Sync failed',
    });
  }
}