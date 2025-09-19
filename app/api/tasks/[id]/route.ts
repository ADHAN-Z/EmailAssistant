import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { logger } from '@/lib/logger';
import { AuthenticationError, NotFoundError, ValidationError, handleApiError } from '@/lib/errors';
import { taskUpdateSchema, type TaskUpdateInput } from '@/lib/validations';
// import type { Task } from '@/types';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

interface TaskUpdateResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function PATCH(
  request: Request, 
  { params }: RouteParams
): Promise<NextResponse<TaskUpdateResponse>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      throw new AuthenticationError();
    }

    const { id } = await params;
    const sessionUser = session.user as { id: string };

    // Validate the task ID format
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Invalid task ID');
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const validatedData: TaskUpdateInput = taskUpdateSchema.parse(body);

    logger.info('Updating task', { 
      taskId: id, 
      userId: sessionUser.id, 
      updates: validatedData 
    });

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findFirst({
      where: {
        id: id,
        userId: sessionUser.id,
      },
    });

    if (!existingTask) {
      throw new NotFoundError('Task not found or access denied');
    }

    // Update the task
    const updatedTask = await prisma.task.update({
      where: { id: id },
      data: validatedData,
    });

    logger.info('Task updated successfully', { 
      taskId: id, 
      userId: sessionUser.id 
    });

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });

  } catch (error) {
    const errorResponse = handleApiError(error);
    logger.error('Failed to update task', error as Error, { 
      taskId: (await params).id,
      error: errorResponse.error 
    });
    
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: RouteParams
): Promise<NextResponse<{ success: boolean; error?: string }>> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      throw new AuthenticationError();
    }

    const { id } = await params;
    const sessionUser = session.user as { id: string };

    // Validate the task ID format
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Invalid task ID');
    }

    logger.info('Deleting task', { 
      taskId: id, 
      userId: sessionUser.id 
    });

    // Check if task exists and belongs to user
    const existingTask = await prisma.task.findFirst({
      where: {
        id: id,
        userId: sessionUser.id,
      },
    });

    if (!existingTask) {
      throw new NotFoundError('Task not found or access denied');
    }

    // Delete the task
    await prisma.task.delete({
      where: { id: id },
    });

    logger.info('Task deleted successfully', { 
      taskId: id, 
      userId: sessionUser.id 
    });

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    const errorResponse = handleApiError(error);
    logger.error('Failed to delete task', error as Error, { 
      taskId: (await params).id,
      error: errorResponse.error 
    });
    
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.statusCode }
    );
  }
}

