'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  MessageSquare,
  BookOpen,
  Landmark,
  Plug,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import type { MarketDataPoint } from '@/lib/types';

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

function formatDate(date: Date | string | undefined | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(text: string | undefined | null, maxLength: number = 200): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

export function DataPointCard({
  adapterKey,
  sourceUrl,
  sourceName,
  title,
  rawContent,
  contentType,
  fetchedAt,
  metadata,
  extractedFacts,
}: MarketDataPoint) {
  const Icon = getAdapterIcon(adapterKey);

  // extractedFacts may come as a JSON string from the DB — parse it safely
  const facts: Array<{ fact: string; confidence: number; category: string }> = (() => {
    if (Array.isArray(extractedFacts)) return extractedFacts;
    if (typeof extractedFacts === 'string') {
      try { return JSON.parse(extractedFacts); } catch { return []; }
    }
    return [];
  })();

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">
              {sourceName}
            </span>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {adapterKey}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-sm leading-snug">
          {sourceUrl ? (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline text-foreground inline-flex items-center gap-1"
            >
              {title}
              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
            </a>
          ) : (
            title
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Content preview */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {truncate(rawContent)}
        </p>

        {/* Extracted facts */}
        {facts.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-foreground">Key Facts</span>
            <ul className="space-y-0.5">
              {facts.slice(0, 3).map((fact, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground flex items-start gap-1.5"
                >
                  <span className="text-primary mt-0.5">&#8226;</span>
                  <span>{fact.fact}</span>
                  <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto shrink-0">
                    {fact.category}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-3 pt-1 border-t border-border">
          <Badge variant="outline" className="text-[10px]">
            {contentType}
          </Badge>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
            <Calendar className="h-3 w-3" />
            {formatDate(fetchedAt)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
