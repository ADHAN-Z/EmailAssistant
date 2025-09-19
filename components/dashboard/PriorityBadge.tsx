// components/dashboard/PriorityBadge.tsx
import { Badge } from "@/components/ui/badge";

interface PriorityBadgeProps {
  priority: number;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getPriorityConfig = (priority: number) => {
    switch (priority) {
      case 4:
        return {
          label: 'Urgent',
          className: 'bg-red-500/20 text-red-400 border-red-500/30'
        };
      case 3:
        return {
          label: 'High',
          className: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
        };
      case 2:
        return {
          label: 'Medium',
          className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        };
      default:
        return {
          label: 'Low',
          className: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        };
    }
  };

  const config = getPriorityConfig(priority);

  return (
    <Badge variant="outline" className={`text-xs ${config.className}`}>
      {config.label}
    </Badge>
  );
}