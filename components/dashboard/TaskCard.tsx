// components/dashboard/TaskCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Task } from "@prisma/client";
import { PriorityBadge } from "./PriorityBadge";
import { ExternalLink, Clock, User } from "lucide-react";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 4: // urgent
        return 'border-l-red-500 bg-red-500/5';
      case 3: // high
        return 'border-l-orange-500 bg-orange-500/5';
      case 2: // medium
        return 'border-l-yellow-500 bg-yellow-500/5';
      default: // low
        return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  return (
    <Card className={`border-l-4 ${getPriorityColor(task.priority)} bg-gray-800/50 border-gray-700 backdrop-blur-sm hover:bg-gray-800/70 transition-colors`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold text-white leading-snug">
            {task.title}
          </CardTitle>
          <PriorityBadge priority={task.priority} />
        </div>
        
        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
          {task.deadline && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
            </div>
          )}
          
          {task.createdAt && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-gray-300 mb-4 leading-relaxed">
          {task.details}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.links && task.links.length > 0 && (
              <a
                href={task.links[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Source Link
              </a>
            )}
          </div>
          
          {task.taskType && (
            <Badge 
              variant="secondary" 
              className="text-xs bg-gray-700/50 text-gray-300 border-gray-600"
            >
              {task.taskType}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}