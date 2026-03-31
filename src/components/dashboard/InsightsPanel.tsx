'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ProactiveInsightData } from '@/lib/types';

const PRIORITY_COLORS = {
  high: 'bg-red-50 border-red-200 text-red-800',
  medium: 'bg-amber-50 border-amber-200 text-amber-800',
  low: 'bg-blue-50 border-blue-200 text-blue-800',
};

const PRIORITY_BADGE = {
  high: 'destructive',
  medium: 'outline',
  low: 'secondary',
} as const;

const AGENT_LABELS: Record<string, string> = {
  strategy: 'Strategy',
  competitor: 'Competitor Intel',
  market: 'Market',
  risk: 'Risk',
  discovery: 'Discovery',
};

export function InsightsPanel() {
  const [insights, setInsights] = useState<ProactiveInsightData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchInsights();
  }, []);

  async function fetchInsights() {
    try {
      const res = await fetch('/api/insights?status=new&limit=5');
      if (!res.ok) return;
      const data = await res.json();
      setInsights(data.insights ?? []);
    } catch {
      // Fail silently — insights panel is non-critical
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss(id: string) {
    await fetch(`/api/insights/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'dismissed' }),
    });
    setInsights((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleRead(id: string) {
    await fetch(`/api/insights/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'read' }),
    });
    setInsights((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'read' as const } : i))
    );
  }

  if (loading) return null;
  if (insights.length === 0) return null;

  return (
    <Card className="mb-6 border-blue-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Proactive insights
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {insights.filter((i) => i.status === 'new').length} new
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={cn(
              'rounded-lg border p-3 text-sm transition-all',
              PRIORITY_COLORS[insight.priority as keyof typeof PRIORITY_COLORS] ?? 'bg-gray-50'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium opacity-70">
                    {AGENT_LABELS[insight.agentType] ?? insight.agentType}
                  </span>
                  <Badge variant={PRIORITY_BADGE[insight.priority as keyof typeof PRIORITY_BADGE] ?? 'secondary'} className="text-xs py-0">
                    {insight.priority}
                  </Badge>
                </div>
                <p className="font-medium leading-tight">{insight.title}</p>
                {expanded === insight.id && (
                  <p className="mt-2 text-xs opacity-80 whitespace-pre-line">{insight.content}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => {
                    setExpanded(expanded === insight.id ? null : insight.id);
                    if (insight.status === 'new') handleRead(insight.id);
                  }}
                >
                  {expanded === insight.id ? 'Less' : 'More'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs opacity-50 hover:opacity-100"
                  onClick={() => handleDismiss(insight.id)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
