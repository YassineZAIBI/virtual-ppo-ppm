'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

export interface FeedItem {
  id: string;
  type: string;
  title: string;
  summary: string;
  source?: string;
  relevance: number;
  sentiment?: string;
  publishedAt?: string;
  competitor?: { name: string };
  createdAt: string;
}

interface CompetitorFeedItemProps {
  item: FeedItem;
}

const typeColorMap: Record<string, string> = {
  news: 'bg-teal-500',
  product_update: 'bg-purple-500',
  vision_shift: 'bg-red-500',
  rumor: 'bg-amber-500',
  pricing: 'bg-green-500',
  hiring: 'bg-blue-500',
};

const typeLabelMap: Record<string, string> = {
  news: 'News',
  product_update: 'Product Update',
  vision_shift: 'Vision Shift',
  rumor: 'Rumor',
  pricing: 'Pricing',
  hiring: 'Hiring',
};

const sentimentColorMap: Record<string, string> = {
  positive: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  negative: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

function formatDate(dateStr?: string) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CompetitorFeedItem({ item }: CompetitorFeedItemProps) {
  const dotColor = typeColorMap[item.type] || 'bg-gray-400';
  const typeLabel = typeLabelMap[item.type] || item.type;
  const displayDate = formatDate(item.publishedAt) || formatDate(item.createdAt);

  return (
    <div className="flex gap-3 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow">
      {/* Color dot indicator */}
      <div className="pt-1.5 shrink-0">
        <div className={cn('h-2.5 w-2.5 rounded-full', dotColor)} />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-medium leading-snug">{item.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{typeLabel}</span>
              {item.competitor && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground font-medium">
                    {item.competitor.name}
                  </span>
                </>
              )}
              {displayDate && (
                <>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{displayDate}</span>
                </>
              )}
            </div>
          </div>

          {item.sentiment && (
            <Badge
              variant="secondary"
              className={cn('text-xs capitalize shrink-0', sentimentColorMap[item.sentiment] || '')}
            >
              {item.sentiment}
            </Badge>
          )}
        </div>

        {/* Summary */}
        <p className="text-sm text-muted-foreground line-clamp-2">{item.summary}</p>

        {/* Footer: relevance bar + source link */}
        <div className="flex items-center justify-between gap-3">
          {/* Relevance bar */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs text-muted-foreground shrink-0">Relevance</span>
            <div className="h-1.5 flex-1 max-w-[120px] rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  item.relevance >= 0.7
                    ? 'bg-green-500'
                    : item.relevance >= 0.4
                      ? 'bg-amber-500'
                      : 'bg-gray-400'
                )}
                style={{ width: `${Math.round(item.relevance * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.round(item.relevance * 100)}%
            </span>
          </div>

          {/* Source link */}
          {item.source && (
            <a
              href={item.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ExternalLink className="h-3 w-3" />
              Source
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
