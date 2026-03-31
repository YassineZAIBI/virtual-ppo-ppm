'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AgentMessageData } from '@/lib/types';

const AGENT_COLORS: Record<string, string> = {
  discovery: 'bg-blue-50 border-blue-200 text-blue-800',
  risk: 'bg-red-50 border-red-200 text-red-800',
  strategy: 'bg-purple-50 border-purple-200 text-purple-800',
  communications: 'bg-teal-50 border-teal-200 text-teal-800',
  advisor: 'bg-amber-50 border-amber-200 text-amber-800',
  thinker: 'bg-gray-50 border-gray-200 text-gray-800',
  orchestrator: 'bg-green-50 border-green-200 text-green-800',
};

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  processing: 'bg-blue-100 text-blue-800',
  pending: 'bg-gray-100 text-gray-600',
};

interface WorkflowRun {
  workflowId: string;
  workflowType: string;
  steps: AgentMessageData[];
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
}

interface WorkflowTimelineProps {
  workflow: WorkflowRun;
  compact?: boolean;
}

export function WorkflowTimeline({ workflow, compact = false }: WorkflowTimelineProps) {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  function parsePayload(payload: string): Record<string, unknown> {
    try {
      return JSON.parse(payload);
    } catch {
      return { raw: payload };
    }
  }

  function formatWorkflowType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function formatDuration(start: Date | null, end: Date | null): string {
    if (!start || !end) return '';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">
              {formatWorkflowType(workflow.workflowType)}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {workflow.steps.length} agents
              {workflow.startedAt && workflow.completedAt && (
                <> &middot; {formatDuration(workflow.startedAt, workflow.completedAt)}</>
              )}
            </p>
          </div>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              STATUS_BADGE[workflow.status] ?? STATUS_BADGE.pending
            )}
          >
            {workflow.status}
          </span>
        </div>
      </CardHeader>

      {!compact && (
        <CardContent>
          <div className="space-y-2">
            {workflow.steps.map((step, idx) => {
              const payload = parsePayload(step.payload);
              const isExpanded = expandedStep === step.id;
              const isLast = idx === workflow.steps.length - 1;

              return (
                <div key={step.id} className="relative">
                  {/* Connector line */}
                  {!isLast && (
                    <div className="absolute left-4 top-10 w-px h-4 bg-border" />
                  )}

                  <div
                    className={cn(
                      'rounded-lg border p-3 text-sm transition-all',
                      AGENT_COLORS[step.toAgent] ?? AGENT_COLORS.orchestrator
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-white/60 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-medium capitalize">{step.toAgent}</span>
                          <span className="text-xs opacity-70 ml-2">{step.messageType}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn('text-xs', STATUS_BADGE[step.status])}
                        >
                          {step.status}
                        </Badge>
                        {Object.keys(payload).length > 0 && step.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                          >
                            {isExpanded ? 'Hide' : 'View output'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-current/10">
                        <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-48 font-mono opacity-80">
                          {JSON.stringify(payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
