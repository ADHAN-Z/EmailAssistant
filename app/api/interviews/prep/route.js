// app/api/interviews/prep/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { authOptions } from '../../auth/[...nextauth]/route';
import { generateInterviewQuestions } from '@/lib/langchain/interviewPrep';

const prisma = new PrismaClient();

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { taskId } = await request.json();
  if (!taskId) {
    return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
  }

  try {
    // 1. Find the original task to get company and role
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.taskType !== 'interview' || !task.company || !task.role) {
      return NextResponse.json({ error: 'Valid interview task not found' }, { status: 404 });
    }

    // 2. Generate questions using LangChain
    const questions = await generateInterviewQuestions(
      task.company,
      task.role,
      'technical' // For now, we default to 'technical'
    );

    // 3. Save the questions to the Interview model
    const interviewPrep = await prisma.interview.upsert({
      where: { taskId: taskId },
      update: { questions: questions },
      create: {
        taskId: taskId,
        userId: session.user.id,
        questions: questions,
        prepScheduled: true,
      },
    });

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Failed to generate interview prep:', error);
    return NextResponse.json({ error: 'Failed to generate interview prep' }, { status: 500 });
  }
}