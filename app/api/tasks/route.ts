// app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { cache, cacheKeys, CACHE_TTL } from '@/lib/cache';
import { logger } from '@/lib/logger';
import type { SessionUser } from '@/types';
import type { Task } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as SessionUser).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as SessionUser).id;

    // Try to get tasks from cache first (same logic as your dashboard)
    let tasks = await cache.get<Task[]>(cacheKeys.userTasks(userId));

    if (!tasks) {
      logger.info('Cache miss for user tasks', { userId });

      // Fetch tasks from database with proper sorting and filtering
      tasks = await prisma.task.findMany({
        where: {
          userId: userId,
          // Only show tasks that are not overdue
          OR: [
            { deadline: null }, // Tasks without deadlines
            { deadline: { gte: new Date() } }, // Tasks with future deadlines
          ]
        },
        orderBy: [
          { priority: 'desc' }, // Primary sort: 4=Urgent, 3=High, 2=Medium, 1=Low
          { createdAt: 'desc' }  // Secondary sort: newest first
        ],
      });

      // Cache the results
      await cache.set(cacheKeys.userTasks(userId), tasks, CACHE_TTL.MEDIUM);
    } else {
      logger.info('Cache hit for user tasks', { userId });
    }

    return NextResponse.json({
      success: true,
      tasks: tasks || [],
      count: tasks?.length || 0
    });

  } catch (error) {
    // Get userId safely for logging
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      userId = (session?.user as SessionUser)?.id;
    } catch {
      userId = 'unknown';
    }

    logger.error('Failed to fetch tasks', error as Error, { userId });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch tasks',
        success: false,
        tasks: [],
        count: 0
      },
      { status: 500 }
    );
  }
}