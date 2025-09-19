// app/api/interviews/prep/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';
import { generateInterviewQuestions } from '@/lib/langchain/interviewPrep';
import { logger } from '@/lib/logger';
import { AuthenticationError, NotFoundError, ValidationError, handleApiError } from '@/lib/errors';
import { interviewPrepSchema, type InterviewPrepInput } from '@/lib/validations';
import { checkRateLimit, interviewPrepLimiter, getClientIP } from '@/lib/rate-limit';
import type { Question, SessionUser } from '@/types';
import type { Prisma } from '@prisma/client';

interface InterviewPrepResponse {
  success: boolean;
  data?: {
    questions: Question[];
  };
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse<InterviewPrepResponse>> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      throw new AuthenticationError();
    }

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(interviewPrepLimiter, clientIP);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.' 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          }
        }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validatedData: InterviewPrepInput = interviewPrepSchema.parse(body);

    const sessionUser = session.user as SessionUser;

    logger.info('Starting interview prep generation', { 
      taskId: validatedData.taskId, 
      userId: sessionUser.id 
    });

    // 1. Find the original task to get company and role
    const task = await prisma.task.findUnique({
      where: { id: validatedData.taskId },
    });

    if (!task) {
      throw new NotFoundError('Task not found');
    }

    if (task.taskType !== 'interview') {
      throw new ValidationError('Task is not an interview task');
    }

    if (!task.company || !task.role) {
      throw new ValidationError('Interview task is missing company or role information');
    }

    // 2. Generate questions using LangChain
    let questions: Question[] | unknown = await generateInterviewQuestions(
      task.company,
      task.role,
      validatedData.interviewType || 'technical'
    );

    // Defensive: normalize to an array (never return undefined)
    const safeQuestions: Question[] = Array.isArray(questions)
      ? (questions as Question[])
      : [];

    if (!Array.isArray(questions)) {
      logger.warn('generateInterviewQuestions returned non-array, normalizing to empty array', {
        taskId: validatedData.taskId,
        returnedType: typeof questions,
      });
    }

    // 3. Save the questions to the Interview model (store as JSON)
    await prisma.interview.upsert({
      where: { taskId: validatedData.taskId },
      update: { 
        questions: safeQuestions as unknown as Prisma.InputJsonValue,
        prepScheduled: true,
      },
      create: {
        taskId: validatedData.taskId,
        userId: sessionUser.id,
        questions: safeQuestions as unknown as Prisma.InputJsonValue,
        prepScheduled: true,
      },
    });

    logger.info('Interview prep generated successfully', { 
      taskId: validatedData.taskId, 
      userId: sessionUser.id,
      questionCount: safeQuestions.length 
    });

    return NextResponse.json({ 
      success: true,
      data: { questions: safeQuestions }
    });

  } catch (error: unknown) {
    const errorResponse = handleApiError(error);
    logger.error('Failed to generate interview prep', error instanceof Error ? error : new Error('Unknown error'), { 
      error: errorResponse.error 
    });
    
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}
