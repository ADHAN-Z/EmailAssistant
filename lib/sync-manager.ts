// lib/sync-manager.ts
'use client';

export interface SyncStatus {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
  totalEmails: number;
  processedEmails: number;
  tasksCreated: number;
  lastSync: Date | null;
  error: string | null;
}

export class SyncManager {
  private static instance: SyncManager;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private status: SyncStatus = {
    isProcessing: false,
    progress: 0,
    currentStep: '',
    totalEmails: 0,
    processedEmails: 0,
    tasksCreated: 0,
    lastSync: null,
    error: null,
  };

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  // Subscribe to sync status updates
  subscribe(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    // Send current status immediately
    callback(this.status);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notify all listeners of status change
  private notify() {
    this.listeners.forEach(listener => listener(this.status));
  }

  // Update status and notify
  private updateStatus(updates: Partial<SyncStatus>) {
    this.status = { ...this.status, ...updates };
    this.notify();
  }

  // Check current sync status from server
  async checkSyncStatus(): Promise<SyncStatus> {
    try {
      const response = await fetch('/api/sync/status');
      if (response.ok) {
        const serverStatus = await response.json();
        this.updateStatus(serverStatus);
      }
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
    return this.status;
  }

  // Trigger sync (can be called on login or manually)
  async triggerSync(): Promise<boolean> {
    if (this.status.isProcessing) {
      console.log('Sync already in progress');
      return false;
    }

    try {
      this.updateStatus({
        isProcessing: true,
        progress: 0,
        currentStep: 'Starting sync...',
        error: null,
      });

      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      // Start polling for progress updates
      this.startProgressPolling();
      return true;
    } catch (error) {
      this.updateStatus({
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  // Poll for sync progress
  private async startProgressPolling() {
    const poll = async () => {
      try {
        const response = await fetch('/api/sync/status');
        if (response.ok) {
          const status = await response.json();
          this.updateStatus(status);

          // Continue polling if still processing
          if (status.isProcessing) {
            setTimeout(poll, 1000); // Poll every second
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Retry in 2 seconds
        if (this.status.isProcessing) {
          setTimeout(poll, 2000);
        }
      }
    };

    poll();
  }

  // Get current status without server call
  getCurrentStatus(): SyncStatus {
    return this.status;
  }
}