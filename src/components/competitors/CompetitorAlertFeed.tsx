'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertTriangle, TrendingUp, DollarSign, Zap, Briefcase,
  Package, Handshake, ThumbsDown, ExternalLink, X, Loader2,
  RefreshCw, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { CompetitorAlertData } from '@/lib/types';

const ALERT_TYPE_CONFIG: Record<string, { icon: typeof AlertTriangle; label: string; color: string }> = {
  pricing_change: { icon: DollarSign, label: 'Pricing', color: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
  new_feature: { icon: Zap, label: 'Feature', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
  funding: { icon: TrendingUp, label: 'Funding', color: 'text-green-500 bg-green-50 dark:bg-green-950/30' },
  website_change: { icon: Eye, label: 'Website', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
  job_signal: { icon: Briefcase, label: 'Hiring', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
  product_launch: { icon: Package, label: 'Launch', color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' },
  partnership: { icon: Handshake, label: 'Partnership', color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/30' },
  reputation: { icon: ThumbsDown, label: 'Reputation', color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30' },
};

function getSignificanceLevel(s: number): { label: string; color: string } {
  if (s >= 0.7) return { label: 'High', color: 'text-red-600 border-red-300 bg-red-50 dark:bg-red-950/20' };
  if (s >= 0.4) return { label: 'Medium', color: 'text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20' };
  return { label: 'Low', color: 'text-slate-500 border-slate-300 bg-slate-50 dark:bg-slate-950/20' };
}

function timeAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface CompetitorAlertFeedProps {
  competitorId?: string;
}

export function CompetitorAlertFeed({ competitorId }: CompetitorAlertFeedProps) {
  const [alerts, setAlerts] = useState<CompetitorAlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const { settings } = useAppStore();

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (competitorId) params.set('competitorId', competitorId);
      const res = await fetch(`/api/competitors/alerts?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      toast.error('Could not load intelligence alerts');
    } finally {
      setLoading(false);
    }
  }, [competitorId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDismiss = async (id: string) => {
    try {
      await fetch('/api/competitors/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], status: 'dismissed' }),
      });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch {
      toast.error('Failed to dismiss alert');
    }
  };

  const handleScan = async () => {
    if (!competitorId) return;
    if (!settings?.llm?.apiKey) {
      toast.error('Configure your LLM provider in Settings to run intelligence scans.');
      return;
    }

    setScanning(true);
    try {
      const res = await fetch(`/api/competitors/${competitorId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmConfig: {
            provider: settings.llm.provider,
            apiKey: settings.llm.apiKey,
            model: settings.llm.model,
            apiEndpoint: settings.llm.apiEndpoint,
          },
        }),
      });
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      if (data.alertsGenerated > 0) {
        toast.success(`Found ${data.alertsGenerated} new intelligence alert(s)!`);
      } else {
        toast.info('Scan complete. No significant signals detected.');
      }
      await fetchAlerts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  // Group alerts by significance tier
  const high = alerts.filter(a => a.significance >= 0.7);
  const medium = alerts.filter(a => a.significance >= 0.4 && a.significance < 0.7);
  const low = alerts.filter(a => a.significance < 0.4);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading intelligence...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {competitorId && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Scanning...</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Scan Now</>
            )}
          </Button>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No intelligence alerts yet.</p>
          <p className="text-xs mt-1">
            {competitorId
              ? 'Click "Scan Now" to check for recent activity.'
              : 'Select a competitor and run a scan to start monitoring.'}
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-6">
            {high.length > 0 && (
              <AlertSection label="High Significance" alerts={high} onDismiss={handleDismiss} />
            )}
            {medium.length > 0 && (
              <AlertSection label="Medium Significance" alerts={medium} onDismiss={handleDismiss} />
            )}
            {low.length > 0 && (
              <AlertSection label="Low Significance" alerts={low} onDismiss={handleDismiss} />
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function AlertSection({
  label,
  alerts,
  onDismiss,
}: {
  label: string;
  alerts: CompetitorAlertData[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{label}</h3>
      <div className="space-y-2">
        {alerts.map(alert => (
          <AlertCard key={alert.id} alert={alert} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}

function AlertCard({
  alert,
  onDismiss,
}: {
  alert: CompetitorAlertData;
  onDismiss: (id: string) => void;
}) {
  const config = ALERT_TYPE_CONFIG[alert.alertType] ?? ALERT_TYPE_CONFIG.website_change;
  const Icon = config.icon;
  const sig = getSignificanceLevel(alert.significance);

  let sourceUrls: string[] = [];
  try { sourceUrls = JSON.parse(alert.sourceUrls); } catch { /* empty */ }

  return (
    <Card className="transition-all hover:shadow-sm">
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <div className={cn('rounded-md p-1.5 shrink-0', config.color)}>
            <Icon className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{alert.title}</span>
                <Badge variant="outline" className={cn('text-[10px]', sig.color)}>
                  {sig.label}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {config.label}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onDismiss(alert.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {alert.summary && (
              <p className="text-xs text-muted-foreground line-clamp-2">{alert.summary}</p>
            )}

            {alert.strategicNote && (
              <p className="text-xs text-foreground/80 italic border-l-2 border-primary/30 pl-2">
                {alert.strategicNote}
              </p>
            )}

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {alert.competitor?.name && (
                <span className="font-medium">{alert.competitor.name}</span>
              )}
              <span>{timeAgo(alert.createdAt)}</span>
              {sourceUrls.length > 0 && sourceUrls[0] && (
                <a
                  href={sourceUrls[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Source
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
