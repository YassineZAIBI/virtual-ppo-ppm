'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Loader2, Play, RefreshCw, Clock, CheckCircle2, XCircle,
  Zap, Eye, Target, AlertTriangle, TrendingUp, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CronJob {
  id: string;
  jobType: string;
  schedule: string;
  lastRun: string | null;
  nextRun: string | null;
  status: string;
  lastResult: string | null;
  lastError: string | null;
  runCount: number;
}

interface CronRun {
  id: string;
  jobType: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  tokensUsed: number | null;
  error: string | null;
}

const JOB_CONFIG: Record<string, { label: string; description: string; icon: typeof Eye; color: string }> = {
  competitor_scan: { label: 'Competitor Scan', description: 'Scan competitor activity via web sources', icon: Eye, color: 'text-red-500' },
  strategy_eval: { label: 'Strategy Evaluation', description: 'Re-evaluate initiative alignment scores', icon: Target, color: 'text-teal-500' },
  risk_reassess: { label: 'Risk Reassessment', description: 'Reassess risks with fresh market data', icon: AlertTriangle, color: 'text-amber-500' },
  market_pulse: { label: 'Market Pulse', description: 'General market scan for your industry', icon: TrendingUp, color: 'text-blue-500' },
  full_portfolio_review: { label: 'Portfolio Review', description: 'Weekly comprehensive cross-strategy analysis', icon: BarChart3, color: 'text-purple-500' },
  vision_guard: { label: 'VisionGuard', description: 'Periodic alignment drift detection', icon: Eye, color: 'text-indigo-500' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function CronDashboard() {
  const [jobs, setJobs] = useState<CronJob[]>([]);
  const [runs, setRuns] = useState<CronRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [jobsRes, runsRes] = await Promise.all([
        fetch('/api/cron/jobs'),
        fetch('/api/cron/runs?limit=20'),
      ]);
      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(Array.isArray(data) ? data : data.jobs ?? []);
      }
      if (runsRes.ok) {
        const data = await runsRes.json();
        setRuns(Array.isArray(data) ? data : data.runs ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      const res = await fetch('/api/cron/initialize', { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      toast.success(`Initialized ${data.initialized} job(s), ${data.existing} already existed`);
      fetchData();
    } catch {
      toast.error('Failed to initialize cron jobs');
    } finally {
      setInitializing(false);
    }
  };

  const handleToggle = async (job: CronJob) => {
    setTogglingId(job.id);
    const newStatus = job.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/cron/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: newStatus } : j));
      toast.success(`${JOB_CONFIG[job.jobType]?.label ?? job.jobType} ${newStatus}`);
    } catch {
      toast.error('Failed to update job');
    } finally {
      setTogglingId(null);
    }
  };

  const handleTrigger = async (job: CronJob) => {
    setTriggeringId(job.id);
    try {
      const res = await fetch(`/api/cron/jobs/${job.id}/trigger`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed');
      toast.success(`${JOB_CONFIG[job.jobType]?.label ?? job.jobType} triggered`);
      setTimeout(fetchData, 2000);
    } catch {
      toast.error('Failed to trigger job');
    } finally {
      setTriggeringId(null);
    }
  };

  // Total tokens used across all runs
  const totalTokens = runs.reduce((sum, r) => sum + (r.tokensUsed ?? 0), 0);
  const activeJobs = jobs.filter((j) => j.status === 'active').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <Zap className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{activeJobs}/{jobs.length}</p>
            <p className="text-[10px] text-muted-foreground">Active Jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <Clock className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-lg font-bold">{runs.length}</p>
            <p className="text-[10px] text-muted-foreground">Recent Runs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <BarChart3 className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold">{totalTokens.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Tokens Used</p>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Autonomous Jobs</CardTitle>
              <CardDescription className="text-xs">Configure which AI jobs run automatically</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh
              </Button>
              {jobs.length === 0 && (
                <Button size="sm" onClick={handleInitialize} disabled={initializing}>
                  {initializing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Zap className="h-3.5 w-3.5 mr-1" />}
                  Initialize Jobs
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Zap className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No autonomous jobs configured</p>
              <p className="text-xs mt-1">Click "Initialize Jobs" to set up default schedules</p>
            </div>
          ) : (
            jobs.map((job) => {
              const config = JOB_CONFIG[job.jobType];
              const Icon = config?.icon ?? Zap;
              return (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon className={cn('h-5 w-5 flex-shrink-0', config?.color ?? 'text-muted-foreground')} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{config?.label ?? job.jobType}</span>
                        <Badge variant="outline" className="text-[9px] font-mono">{job.schedule}</Badge>
                        {job.status === 'failed' && (
                          <Badge variant="destructive" className="text-[9px]">Failed</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{config?.description ?? ''}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>Last: {formatDate(job.lastRun)}</span>
                        <span>Runs: {job.runCount}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleTrigger(job)}
                      disabled={triggeringId === job.id}
                    >
                      {triggeringId === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                      Run
                    </Button>
                    <Switch
                      checked={job.status === 'active'}
                      onCheckedChange={() => handleToggle(job)}
                      disabled={togglingId === job.id}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Run History */}
      {runs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Run History</CardTitle>
            <CardDescription className="text-xs">Recent autonomous job executions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {runs.map((run) => {
                const config = JOB_CONFIG[run.jobType];
                return (
                  <div key={run.id} className="flex items-center justify-between px-3 py-2 rounded-md border border-border text-xs">
                    <div className="flex items-center gap-2">
                      {run.status === 'completed' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : run.status === 'failed' ? (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      ) : (
                        <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                      )}
                      <span className="font-medium">{config?.label ?? run.jobType}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span>{formatDuration(run.duration)}</span>
                      {run.tokensUsed != null && <span>{run.tokensUsed} tok</span>}
                      <span>{formatDate(run.startedAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
