'use client';

import { useState } from 'react';
import { Button } from './ui/button';

export default function SyncButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setIsLoading(true);
    setMessage('Syncing emails...');

    try {
      const response = await fetch('/api/gmail/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong.');
      }

      setMessage(data.message);
      console.log('Synced Emails:', data.emails); // Check your browser console!

    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button onClick={handleSync} disabled={isLoading}>
        {isLoading ? 'Syncing...' : 'Sync Emails'}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}