// components/interview/InterviewCard.tsx
'use client';

import { useState } from 'react';
import { Task } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface InterviewCardProps {
  task: Task;
}

type Question = {
  type: string;
  question: string;
};

export function InterviewCard({ task }: InterviewCardProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStartPrep = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/interviews/prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions.');
      }
      const data = await response.json();
      setQuestions(data.questions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#2a2a2a] p-4 rounded-lg mb-4 border border-gray-700">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold text-lg text-gray-200">{task.company}</p>
          <p className="text-sm text-gray-400">{task.role}</p>
        </div>
        <Badge variant="secondary">{task.taskType}</Badge>
      </div>

      {questions.length === 0 && (
        <Button onClick={handleStartPrep} disabled={isLoading} className="w-full mt-4">
          {isLoading ? <Loader2 className="animate-spin" /> : 'Start Prep'}
        </Button>
      )}

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

      {questions.length > 0 && (
        <div className="mt-4 space-y-3">
            <h4 className="font-semibold text-gray-300">Sample Questions:</h4>
            {questions.map((q, index) => (
                <div key={index} className="bg-gray-800 p-3 rounded text-sm">
                    <Badge variant={q.type === 'technical' ? 'destructive' : 'default'} className="mb-1">{q.type}</Badge>
                    <p className="text-gray-300">{q.question}</p>
                </div>
            ))}
        </div>
      )}
    </div>
  );
}