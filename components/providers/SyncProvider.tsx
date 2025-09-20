// components/providers/SyncProvider.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { SyncManager, type SyncStatus } from '@/lib/sync-manager';
import { toast } from 'sonner'; // or your preferred toast library

interface SyncContextType {
  syncStatus: SyncStatus | null;
  triggerSync: () => Promise<boolean>;
  isProcessing: boolean;
}

const SyncContext = createContext<SyncContextType | null>(null);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncManager] = useState(() => SyncManager.getInstance());

  useEffect(() => {
    // Subscribe to sync status updates
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status);

      // Show toast notifications for key events
      if (status.isProcessing && status.currentStep === 'Starting sync...') {
        toast.info('🔄 Starting email sync...');
      } else if (!status.isProcessing && status.tasksCreated > 0) {
        toast.success(`✅ Sync complete! Created ${status.tasksCreated} new tasks`);
      } else if (status.error) {
        toast.error(`❌ Sync failed: ${status.error}`);
      }
    });

    // Check initial status
    syncManager.checkSyncStatus();

    return unsubscribe;
  }, [syncManager]);

  const triggerSync = async () => {
    return await syncManager.triggerSync();
  };

  return (
    <SyncContext.Provider 
      value={{ 
        syncStatus, 
        triggerSync, 
        isProcessing: syncStatus?.isProcessing || false 
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSyncContext() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
}

// Hook for email notifications (future feature)
export function useEmailNotifications() {
  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Listen for new emails (WebSocket or polling)
    const checkNewEmails = async () => {
      try {
        const response = await fetch('/api/emails/check-new');
        if (response.ok) {
          const data = await response.json();
          
          if (data.hasNewEmails && Notification.permission === 'granted') {
            new Notification('📧 New emails detected!', {
              body: 'Processing new emails for tasks...',
              icon: '/icon-192x192.png',
            });

            // Trigger automatic sync
            const syncManager = SyncManager.getInstance();
            await syncManager.triggerSync();
          }
        }
      } catch (error) {
        console.error('Error checking for new emails:', error);
      }
    };

    // Check every 5 minutes
    const interval = setInterval(checkNewEmails, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);
}