// lib/hooks/useLoginSync.tsx
'use client';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SyncManager } from '@/lib/sync-manager';

export function useLoginSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only trigger on fresh login
    if (status === 'authenticated' && session?.user) {
      const syncManager = SyncManager.getInstance();
      
      // Check if this is a fresh login (no recent sync)
      const checkAndSync = async () => {
        await syncManager.checkSyncStatus();
        const currentStatus = syncManager.getCurrentStatus();
        
        // Trigger sync if:
        // - Never synced before
        // - Last sync was more than 10 minutes ago
        // - Not currently processing
        const shouldSync =
          !currentStatus.lastSync || 
          (new Date().getTime() - new Date(currentStatus.lastSync).getTime()) > 10 * 60 * 1000 ||
          !currentStatus.isProcessing;

        if (shouldSync) {
          console.log('Triggering auto-sync on login...');
          await syncManager.triggerSync();
        }
      };

      // Small delay to ensure UI is ready
      setTimeout(checkAndSync, 1000);
    }
  }, [status, session]);
}

// ✅ Generic HOC to preserve props and remove `any`
export function withAutoSync<P extends object>(
  WrappedComponent: React.ComponentType<P>
) {
  function AutoSyncWrapper(props: P) {
    useLoginSync();
    return <WrappedComponent {...props} />;
  }

  AutoSyncWrapper.displayName = `withAutoSync(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AutoSyncWrapper;
}
