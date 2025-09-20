// app/api/sync/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { cache } from '@/lib/cache';
import type { SessionUser } from '@/types';

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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !(session.user as SessionUser).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as SessionUser).id;
    const syncStatusKey = `sync:status:${userId}`;
    
    // Get sync status from cache
    const syncStatus = await cache.get<SyncStatus>(syncStatusKey) || {
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

    return NextResponse.json(syncStatus);
  } catch (error) {
    console.error('Sync status error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}