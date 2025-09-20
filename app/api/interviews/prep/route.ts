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

    // 1. Find the original task to get company and role
    const task = await prisma.task.findFirst({
      where: { 
        id: validatedData.taskId,
        userId: sessionUser.id // Ensure user owns the task
      },
    });

    if (!task) {
      throw new NotFoundError('Task not found or access denied');
    }

    if (task.taskType !== 'interview') {
      throw new ValidationError('Task is not an interview task');
    }

    // 2. Extract company and role info, provide defaults if missing
    const company = task.company || extractCompanyFromContent(task.title, task.details);
    const role = task.role || extractRoleFromContent(task.title, task.details);

    // 3. Generate questions using available information
    const questions: Question[] | unknown = await generateInterviewQuestions(
      company,
      role,
      validatedData.interviewType || 'mixed'
    );

    // Defensive: normalize to an array (never return undefined)
    const safeQuestions: Question[] = Array.isArray(questions)
      ? (questions as Question[])
      : [];

    if (!Array.isArray(questions)) {
      logger.warn('Interview question generator returned unexpected format', {
        taskId: validatedData.taskId,
        returnedType: typeof questions,
      });
    }

    // Ensure we have at least some questions
    if (safeQuestions.length === 0) {
      safeQuestions.push(...getFallbackQuestions(role));
    }

    // 4. Save the questions to the Interview model (store as JSON)
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

    logger.info('Interview questions generated', { 
      questionCount: safeQuestions.length 
    });

    return NextResponse.json({ 
      success: true,
      data: { questions: safeQuestions }
    });

  } catch (error: unknown) {
    const errorResponse = handleApiError(error);
    logger.error('Failed to generate interview prep', error instanceof Error ? error : new Error('Unknown error'));
    
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}

// Helper function to extract company name from content
function extractCompanyFromContent(title: string, details: string): string {
  const content = `${title} ${details}`.toLowerCase();
  
  // Common patterns to look for company names
  const companyPatterns = [
    /interview (?:at|with) ([a-zA-Z0-9\s]+?)(?:\s|$|\.)/,
    /([a-zA-Z0-9\s]+?) interview/,
    /position at ([a-zA-Z0-9\s]+?)(?:\s|$|\.)/,
    /job at ([a-zA-Z0-9\s]+?)(?:\s|$|\.)/,
    /work at ([a-zA-Z0-9\s]+?)(?:\s|$|\.)/
  ];

  for (const pattern of companyPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const company = match[1].trim();
      // Filter out common words that aren't company names
      if (company.length > 2 && !['the', 'and', 'for', 'with'].includes(company)) {
        return company.replace(/\b\w/g, l => l.toUpperCase()); // Title case
      }
    }
  }

  return 'the company'; // Generic fallback
}

// Helper function to extract role from content
function extractRoleFromContent(title: string, details: string): string {
  const content = `${title} ${details}`.toLowerCase();
  
  // Common role patterns
  const rolePatterns = [
    /(software engineer|developer|engineer|manager|analyst|designer|consultant|intern|associate|director|specialist)/,
    /position.*?(?:as|for)\s+([a-zA-Z\s]+?)(?:\s|$|\.)/,
    /role.*?(?:as|for)\s+([a-zA-Z\s]+?)(?:\s|$|\.)/,
    /applying for ([a-zA-Z\s]+?)(?:\s|$|\.)/,
    /interview for ([a-zA-Z\s]+?)(?:\s|$|\.)/
  ];

  for (const pattern of rolePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const role = match[1].trim();
      if (role.length > 2) {
        return role.replace(/\b\w/g, l => l.toUpperCase()); // Title case
      }
    }
  }

  return 'the position'; // Generic fallback
}

// Fallback questions when no questions are generated
function getFallbackQuestions(role: string): Question[] {
  const isGeneric = role.toLowerCase().includes('position') || role.toLowerCase().includes('role');
  
  return [
    {
      type: 'behavioral',
      question: 'Tell me about a time when you had to overcome a significant challenge at work.'
    },
    {
      type: 'company-specific',
      question: `Why are you interested in ${isGeneric ? 'this position' : `working as a ${role}`}?`
    },
    {
      type: 'behavioral',
      question: 'Describe a situation where you had to work with a difficult team member.'
    },
    {
      type: 'company-specific',
      question: 'What are your greatest strengths and how do they relate to this role?'
    }
  ];
}