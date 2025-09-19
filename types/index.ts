// types/index.ts
export interface Task {
  id: string;
  title: string;
  priority: number;
  deadline: Date | null;
  taskType: 'interview' | 'meeting' | 'assignment' | 'general';
  company?: string;
  role?: string;
  details: string;
  links: string[];
  status: 'todo' | 'in_progress' | 'done';
  userId: string;
  createdAt: Date;
}

export interface Interview {
  id: string;
  taskId: string;
  questions?: Question[];
  companyInfo?: Record<string, unknown>;
  prepScheduled: boolean;
  completed: boolean;
  userId: string;
}

export interface Question {
  type: 'behavioral' | 'technical' | 'company-specific';
  question: string;
}

export interface EmailAnalysis {
  is_actionable: boolean;
  tasks: ExtractedTask[];
}

export interface ExtractedTask {
  title: string;
  priority: number;
  deadline?: string;
  task_type: 'interview' | 'meeting' | 'assignment' | 'general';
  company?: string;
  role?: string;
  details: string;
  links?: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface SessionUser {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  accessToken?: string;
}

