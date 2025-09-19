// components/interview/InterviewCard.tsx
'use client';
import { useState } from 'react';
import { Task } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, Building2, Briefcase, Calendar, Clock } from 'lucide-react';

interface InterviewCardProps {
  task: Task;
}

type Question = {
  type: string;
  question: string;
};

type ApiPayload = {
  success?: boolean;
  data?: { questions?: Question[] } | null;
  error?: string;
  message?: string;
};

export function InterviewCard({ task }: InterviewCardProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleStartPrep = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/interviews/prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      });

      let payload: ApiPayload = {};
      try {
        payload = await response.json();
      } catch (parseErr) {
        console.error('Failed to parse JSON from /api/interviews/prep', parseErr);
        throw new Error('Invalid JSON response from server.');
      }

      console.debug('/api/interviews/prep payload:', payload);

      if (!response.ok) {
        const serverMsg = payload?.error ?? payload?.message ?? 'Failed to generate questions.';
        throw new Error(serverMsg);
      }

      const qs = Array.isArray(payload?.data?.questions) ? payload.data!.questions! : [];
      if (qs.length === 0) {
        setError('No questions were generated. Please try again.');
        setQuestions([]);
      } else {
        setQuestions(qs);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      console.error('Interview prep error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'technical':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'behavioral':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-700 backdrop-blur-sm hover:from-gray-800/60 hover:to-gray-900/60 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <p className="font-semibold text-white">{task.company || 'Company'}</p>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-300">{task.role || 'Role'}</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`text-xs ${getTypeColor(task.taskType || 'interview')}`}
          >
            {task.taskType || 'interview'}
          </Badge>
        </div>

        {task.deadline && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
            <Calendar className="w-3 h-3" />
            <span>Interview: {new Date(task.deadline).toLocaleDateString()}</span>
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {task.details && (
          <p className="text-sm text-gray-300 mb-4 leading-relaxed">
            {task.details}
          </p>
        )}

        {questions.length === 0 && (
          <Button 
            onClick={handleStartPrep} 
            disabled={isLoading} 
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2 w-4 h-4" />
                Preparing Questions...
              </>
            ) : (
              'Start Interview Prep'
            )}
          </Button>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-md p-3 mt-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {questions.length > 0 && (
          <div className="mt-4 space-y-3">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              Practice Questions:
            </h4>
            
            <div className="space-y-3">
              {questions.map((q, index) => (
                <div 
                  key={index} 
                  className="bg-gray-900/50 border border-gray-700 rounded-lg p-3"
                >
                  <Badge
                    variant="outline"
                    className={`text-xs mb-2 ${getTypeColor(q.type)}`}
                  >
                    {q.type}
                  </Badge>
                  <p className="text-sm text-gray-200 leading-relaxed">{q.question}</p>
                </div>
              ))}
            </div>

            <Button 
              onClick={handleStartPrep} 
              variant="outline"
              size="sm"
              className="w-full mt-3 border-gray-600 text-gray-300 hover:bg-gray-700/50"
              disabled={isLoading}
            >
              Generate More Questions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}