// app/dashboard/page.tsx
import AuthButton from "@/components/AuthButton";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import type { Task } from "@prisma/client";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { InterviewCard } from '@/components/interview/InterviewCard';
import { cache, cacheKeys, CACHE_TTL } from '@/lib/cache';
import { logger } from '@/lib/logger';
import type { SessionUser } from '@/types';
import { Search, Filter, Plus, Mail, Calendar, Target, TrendingUp } from "lucide-react";

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
  // ISO week starts Monday
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 0 = Monday
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || !(session.user as SessionUser).id) {
    logger.warn('Unauthorized access attempt to dashboard');
    return <div>Please sign in to access the dashboard.</div>;
  }

  const sessionUser = session.user as SessionUser;
  const userId = sessionUser.id;

  // Try to get tasks from cache first
  let tasks = await cache.get<Task[]>(cacheKeys.userTasks(userId));

  if (!tasks) {
    logger.info('Cache miss for user tasks', { userId });

    // Fetch tasks from database
    tasks = await prisma.task.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        priority: 'desc',
      },
    });

    // Cache the results
    await cache.set(cacheKeys.userTasks(userId), tasks, CACHE_TTL.MEDIUM);
  } else {
    logger.info('Cache hit for user tasks', { userId });
  }

  // Filter tasks into two groups
  const interviewTasks = tasks.filter((task: Task) => task.taskType === 'interview');
  const regularTasks = tasks.filter((task: Task) => task.taskType !== 'interview');

  // Compute stats (server side)
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
  const emailsProcessed = tasks.length;

  const initialStats = {
    todaysTasks,
    thisWeek,
    interviews,
    emailsProcessed,
  };

  const stats = [
    { title: "Today's Tasks", value: todaysTasks.toString(), icon: Target, color: "text-red-500" },
    { title: "This Week", value: thisWeek.toString(), icon: Calendar, color: "text-orange-500" },
    { title: "Interviews", value: interviews.toString(), icon: TrendingUp, color: "text-blue-500" },
    { title: "Emails Processed", value: emailsProcessed.toString(), icon: Mail, color: "text-green-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Task Dashboard
              </h1>
              <p className="text-sm text-gray-400">Smart email-to-task extraction with interview prep</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search tasks..."
                  className="pl-10 w-64 bg-gray-800/50 border-gray-700 text-white placeholder-gray-400"
                />
              </div>
              <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Stats Grid */}
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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Tasks */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-800/30 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-white">Today's Priority Tasks</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                      {regularTasks.length} tasks
                    </Badge>
                    <Badge variant="secondary" className="text-xs bg-red-500/20 text-red-400">
                      {regularTasks.filter(t => t.priority === 'urgent').length} urgent
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {regularTasks.length > 0 ? (
                  regularTasks.map((task: Task) => <TaskCard key={task.id} task={task} />)
                ) : (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">No tasks found</p>
                    <p className="text-sm text-gray-500">Try syncing your emails to get started!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Interview Prep Sidebar */}
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

            {/* Quick Actions */}
            <Card className="mt-6 bg-gray-800/30 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-white">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <DashboardSummary initialStats={initialStats} />
                <Button variant="ghost" className="w-full justify-start text-sm text-gray-300 hover:bg-gray-700/50" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Sync Calendar
                </Button>
                <Button variant="ghost" className="w-full justify-start text-sm text-gray-300 hover:bg-gray-700/50" size="sm">
                  <Target className="w-4 h-4 mr-2" />
                  Generate Interview Questions
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}