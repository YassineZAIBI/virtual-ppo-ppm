import { Badge } from '@/components/ui/badge';
import { FlaskConical } from 'lucide-react';

export function ExampleBadge() {
  return (
    <Badge
      variant="outline"
      className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-700 text-[10px] px-1.5 py-0"
    >
      <FlaskConical className="h-2.5 w-2.5 mr-0.5" />
      Example
    </Badge>
  );
}
