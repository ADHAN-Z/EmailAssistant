'use client';
import { useState } from 'react';
import { Button } from './ui/button';
import { Mail } from 'lucide-react';

export interface EmailSyncResult {
  emailsProcessed: number;
  emailsFailed: number;
  tasksCreated: number;
}

interface SyncButtonProps {
  /**
   * Called when the sync finishes successfully (or undefined on error).
   * Parent can use this to update UI counts.
   */
  onSyncComplete?: (result?: EmailSyncResult) => void;
  /**
   * Optional className to style the button
   */
  className?: string;
  /**
   * Optional className to style the icon
   */
  iconClassName?: string;
  /**
   * Whether to show the message below the button
   */
  showMessage?: boolean;
}

export default function SyncButton({ 
  onSyncComplete, 
  className, 
  iconClassName,
  showMessage = true 
}: SyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setIsLoading(true);
    setMessage('Syncing emails...');
    
    try {
      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // keep shape if your endpoint accepts options
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data?.error || data?.message || 'Something went wrong.';
        throw new Error(errMsg);
      }

      // Show server message if present
      setMessage(data?.message ?? 'Sync complete.');

      // Normalize result (guard against missing shape)
      const result: EmailSyncResult | undefined = data?.data
        ? {
            emailsProcessed: Number(data.data.emailsProcessed ?? 0),
            emailsFailed: Number(data.data.emailsFailed ?? 0),
            tasksCreated: Number(data.data.tasksCreated ?? 0),
          }
        : undefined;

      // Let parent know about the result so it can update stats
      if (typeof onSyncComplete === 'function') {
        onSyncComplete(result);
      }

      console.debug('Gmail sync result:', result);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setMessage(`Error: ${msg}`);
      console.error('Sync error', error);
      
      // Notify parent of failure if they want to react
      if (typeof onSyncComplete === 'function') onSyncComplete(undefined);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button 
        onClick={handleSync} 
        disabled={isLoading}
        className={className}
        variant={className ? "ghost" : "default"}
      >
        <Mail className={iconClassName || "w-4 h-4 mr-2"} />
        {isLoading ? 'Syncing...' : 'Process New Emails'}
      </Button>
      {showMessage && message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}