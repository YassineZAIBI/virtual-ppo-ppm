'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ExternalLink, Pencil, Trash2, Rss } from 'lucide-react';
import { toast } from 'sonner';
import { safeJsonParse } from '@/lib/types';

export interface Competitor {
  id: string;
  name: string;
  website?: string;
  description?: string;
  tags?: string | string[];
  isActive: boolean;
  _count?: { feeds: number };
  createdAt: string;
}

interface CompetitorCardProps {
  competitor: Competitor;
  onUpdate: (id: string, data: Partial<Competitor>) => void;
  onDelete: (id: string) => void;
}

const tagColorMap: Record<string, string> = {
  direct: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  indirect: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  emerging: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

export function CompetitorCard({ competitor, onUpdate, onDelete }: CompetitorCardProps) {
  const [toggling, setToggling] = useState(false);

  const handleToggleActive = async (checked: boolean) => {
    setToggling(true);
    try {
      onUpdate(competitor.id, { isActive: checked });
      toast.success(`${competitor.name} ${checked ? 'activated' : 'deactivated'}`);
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = () => {
    onDelete(competitor.id);
  };

  const feedCount = competitor._count?.feeds ?? 0;
  const tags: string[] = Array.isArray(competitor.tags)
    ? competitor.tags
    : safeJsonParse<string[]>(competitor.tags as string, []);

  return (
    <Card className={cn(
      'transition-all hover:shadow-md',
      !competitor.isActive && 'opacity-60'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base font-semibold truncate">
              {competitor.name}
            </CardTitle>
            {competitor.website && (
              <a
                href={competitor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors truncate max-w-full"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{competitor.website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={competitor.isActive}
              onCheckedChange={handleToggleActive}
              disabled={toggling}
              aria-label={competitor.isActive ? 'Deactivate competitor' : 'Activate competitor'}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {competitor.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {competitor.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className={cn('text-xs capitalize', tagColorMap[tag] || '')}
            >
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Rss className="h-3.5 w-3.5" />
            <span>{feedCount} feed {feedCount === 1 ? 'item' : 'items'}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdate(competitor.id, {})}
              aria-label="Edit competitor"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete competitor"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
