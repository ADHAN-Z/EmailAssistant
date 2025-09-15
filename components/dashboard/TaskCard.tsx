import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Task } from "@prisma/client"; // Import the Task type from Prisma
import { PriorityBadge } from "./PriorityBadge";
import { ExternalLink } from "lucide-react";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  return (
    <Card className="mb-4 bg-[#2a2a2a] border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg text-gray-200">{task.title}</CardTitle>
          <PriorityBadge priority={task.priority} />
        </div>
        {task.deadline && (
          <p className="text-xs text-red-400">
            Deadline: {new Date(task.deadline).toLocaleDateString()}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-400 mb-4">{task.details}</p>
        <div className="flex items-center gap-4">
          {task.links[0] && (
            <a
              href={task.links[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-xs text-blue-400 hover:underline"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Source Link
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}