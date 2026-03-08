'use client';

import { Badge } from '@/components/ui/badge';
import {
  Search,
  MessageSquare,
  BookOpen,
  Landmark,
  Plug,
  ExternalLink,
} from 'lucide-react';

interface SourceAttributionProps {
  sourceName: string;
  sourceUrl: string;
  adapterKey: string;
  fetchedAt: Date | string;
}

const ADAPTER_ICONS: Record<string, typeof Search> = {
  search: Search,
  social: MessageSquare,
  research: BookOpen,
  government: Landmark,
  mcp: Plug,
};

function getAdapterIcon(adapterKey: string) {
  const category = adapterKey.split('_')[0] || adapterKey;
  return ADAPTER_ICONS[category] || Search;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SourceAttribution({
  sourceName,
  sourceUrl,
  adapterKey,
  fetchedAt,
}: SourceAttributionProps) {
  const Icon = getAdapterIcon(adapterKey);

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-sm font-medium text-foreground truncate max-w-[180px]">
        {sourceName}
      </span>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
        {adapterKey}
      </Badge>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
      <span className="text-[11px] text-muted-foreground shrink-0">
        {formatDate(fetchedAt)}
      </span>
    </div>
  );
}
