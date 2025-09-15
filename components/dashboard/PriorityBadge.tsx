import { Badge } from "@/components/ui/badge";

export function PriorityBadge({ priority }: { priority: number }) {
  if (priority > 7) {
    return <Badge variant="destructive">Urgent</Badge>;
  }
  if (priority > 4) {
    return <Badge className="bg-yellow-500 text-black hover:bg-yellow-600">High</Badge>;
  }
  if (priority > 2) {
    return <Badge className="bg-blue-500 hover:bg-blue-600">Medium</Badge>;
  }
  return <Badge variant="secondary">Low</Badge>;
}