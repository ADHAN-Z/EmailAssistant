// components/dashboard/DashboardContent.tsx
'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskCard } from "./TaskCard";
import { InterviewCard } from '../interview/InterviewCard';
import { LoadingSkeleton, SyncComplete } from './LoadingSkeleton';
import { SyncManager, type SyncStatus } from '@/lib/sync-manager';
import { Search, Target, Calendar, TrendingUp, Mail, RefreshCw } from "lucide-react";
import type { Task } from "@prisma/client";

interface DashboardContentProps {
  userId: string;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function DashboardContent({ userId }: DashboardContentProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSyncComplete, setShowSyncComplete] = useState(false);

  useEffect(() => {
    const syncManager = SyncManager.getInstance();
    
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status);

      if (!status.isProcessing && status.lastSync && status.tasksCreated > 0) {
        const lastSyncTime = new Date(status.lastSync).getTime();
        const now = new Date().getTime();

        if (now - lastSyncTime < 5000 && !showSyncComplete) {
          setShowSyncComplete(true);
          loadTasks();
          setTimeout(() => setShowSyncComplete(false), 3000);
        }
      }
    });

    loadInitialData();
    return unsubscribe;
  }, [userId]);

  const loadInitialData = async () => {
    const syncManager = SyncManager.getInstance();
    await loadTasks();

    await syncManager.checkSyncStatus();
    const status = syncManager.getCurrentStatus();

    if (!status.isProcessing) {
      const shouldSync = !status.lastSync || 
        (new Date().getTime() - new Date(status.lastSync).getTime()) > 5 * 60 * 1000;

      if (shouldSync) {
        triggerSync();
      }
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSync = async () => {
    const syncManager = SyncManager.getInstance();
    await syncManager.triggerSync();
  };

  const interviewTasks = tasks.filter((task: Task) => task.taskType === 'interview');
  const regularTasks = tasks.filter((task: Task) => task.taskType !== 'interview');

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now);

  const todaysTasks = tasks.filter((t) => {
    const deadline = t.deadline ? new Date(t.deadline) : null;
    const createdAt = t.createdAt ? new Date(t.createdAt) : null;
    const isDueToday = deadline && deadline >= todayStart && deadline <= todayEnd;
    const createdToday = createdAt && createdAt >= todayStart && createdAt <= todayEnd;
    return Boolean(isDueToday || createdToday);
  }).length;

  const thisWeek = tasks.filter((t) => {
    const createdAt = t.createdAt ? new Date(t.createdAt) : null;
    return createdAt && createdAt >= weekStart;
  }).length;

  const interviews = interviewTasks.length;

  const stats = [
    { title: "Today's Tasks", value: todaysTasks.toString(), icon: Target, color: "text-red-500" },
    { title: "This Week", value: thisWeek.toString(), icon: Calendar, color: "text-orange-500" },
    { title: "Interviews", value: interviews.toString(), icon: TrendingUp, color: "text-blue-500" },
    { title: "Total Tasks", value: tasks.length.toString(), icon: Mail, color: "text-green-500" },
  ];

  if (syncStatus?.isProcessing) {
    return (
      <div className="container mx-auto px-6 py-6">
        <LoadingSkeleton syncStatus={syncStatus} />
      </div>
    );
  }

  if (isLoading && !syncStatus) {
    return (
      <div className="container mx-auto px-6 py-6">
        <LoadingSkeleton 
          syncStatus={{
            isProcessing: true,
            progress: 0,
            currentStep: 'Loading your dashboard...',
            totalEmails: 0,
            processedEmails: 0,
            tasksCreated: 0,
            emailsFailed: 0,
            lastSync: null,
            error: null,
          }} 
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-6">
      {showSyncComplete && syncStatus && (
        <div className="mb-6">
          <SyncComplete tasksCreated={syncStatus.tasksCreated} />
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-64 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
          />
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          onClick={triggerSync}
          disabled={syncStatus?.isProcessing}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncStatus?.isProcessing ? 'animate-spin' : ''}`} />
          {syncStatus?.isProcessing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">{stat.title}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-gray-800/30 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-white">Today&apos;s Priority Tasks</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    {regularTasks.length} tasks
                  </Badge>
                  <Badge variant="secondary" className="text-xs bg-red-500/20 text-red-400">
                    {regularTasks.filter(t => t.priority === 4).length} urgent
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {regularTasks.length > 0 ? (
                regularTasks
                  .filter(task => 
                    !searchQuery || 
                    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    task.details.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .sort((a, b) => b.priority - a.priority)
                  .map((task: Task) => <TaskCard key={task.id} task={task} />)
              ) : (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 mb-2">No tasks found</p>
                  <p className="text-sm text-gray-500">Your email tasks will appear here automatically!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-gray-800/30 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center text-white">
                <Target className="w-5 h-5 mr-2 text-blue-500" />
                Interview Prep
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {interviewTasks.length > 0 ? (
                interviewTasks.map((task: Task) => <InterviewCard key={task.id} task={task} />)
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Interview tasks from your emails will appear here.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {syncStatus?.lastSync && (
            <Card className="mt-6 bg-gray-800/20 border-gray-700 backdrop-blur-sm">
              <CardContent className="py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Last sync:</span>
                  <span className="text-gray-300">
                    {new Date(syncStatus.lastSync).toLocaleTimeString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
