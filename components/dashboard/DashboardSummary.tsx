// components/dashboard/DashboardSummary.tsx
'use client';
import { useState } from 'react';
import SyncButton, { EmailSyncResult } from '@/components/SyncButton';


type Stats = {
  todaysTasks: number;
  thisWeek: number;
  interviews: number;
  emailsProcessed: number;
};

interface Props {
  initialStats: Stats;
}

export function DashboardSummary({ initialStats }: Props) {
  const [stats, setStats] = useState<Stats>(initialStats);

  const handleSyncComplete = (result?: EmailSyncResult) => {
    if (!result) return;
    setStats((prev) => ({
      todaysTasks: prev.todaysTasks + (result.tasksCreated ?? 0),
      thisWeek: prev.thisWeek + (result.tasksCreated ?? 0),
      interviews: prev.interviews,
      emailsProcessed: prev.emailsProcessed + (result.emailsProcessed ?? 0),
    }));
  };

  return (
    <div className="w-full">
      {/* Sync Button styled to match other quick action buttons */}
      <SyncButton 
        onSyncComplete={handleSyncComplete} 
        className="w-full justify-start text-sm text-gray-300 hover:bg-gray-700/50 bg-transparent border-none p-2 h-auto"
        iconClassName="w-4 h-4 mr-2"
        showMessage={false}
      />
    </div>
  );
}