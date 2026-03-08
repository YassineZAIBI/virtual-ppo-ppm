'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import type { DataJobStatus } from '@/lib/types';

interface JobProgressProps {
  jobId: string;
  onComplete?: () => void;
  onFail?: (error: string) => void;
}

const STATUS_CONFIG: Record<
  string,
  { icon: typeof Clock; label: string; color: string }
> = {
  pending: { icon: Clock, label: 'Pending', color: 'text-muted-foreground' },
  running: { icon: Loader2, label: 'Running', color: 'text-blue-500 dark:text-blue-400' },
  completed: { icon: CheckCircle2, label: 'Completed', color: 'text-green-500 dark:text-green-400' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-red-500 dark:text-red-400' },
};

export function JobProgress({ jobId, onComplete, onFail }: JobProgressProps) {
  const [job, setJob] = useState<DataJobStatus | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completedRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/data-pipeline/jobs/${jobId}`);
      if (!res.ok) return;
      const data: DataJobStatus = await res.json();
      setJob(data);

      if (data.status === 'completed' && !completedRef.current) {
        completedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        onComplete?.();
      } else if (data.status === 'failed' && !completedRef.current) {
        completedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        onFail?.(data.error || 'Job failed');
      }
    } catch {
      // silently retry on next interval
    }
  }, [jobId, onComplete, onFail]);

  useEffect(() => {
    completedRef.current = false;
    poll();
    intervalRef.current = setInterval(poll, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [poll]);

  const status = job?.status || 'pending';
  const progress = job?.progress ?? 0;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={`h-4 w-4 ${config.color} ${status === 'running' ? 'animate-spin' : ''}`}
          />
          <span className="text-sm font-medium text-foreground">{config.label}</span>
        </div>
        <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
      </div>

      <Progress value={progress} className="h-2" />

      {status === 'failed' && job?.error && (
        <p className="text-xs text-red-500 dark:text-red-400">{job.error}</p>
      )}
    </div>
  );
}
