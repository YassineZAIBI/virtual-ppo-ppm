'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { WorkflowTimeline } from '@/components/agents/WorkflowTimeline';
import { WORKFLOW_DEFINITIONS } from '@/lib/services/workflow-definitions';
import type { WorkflowType } from '@/lib/types';

interface WorkflowLauncherProps {
  initiativeId: string;
  initiativeTitle: string;
  initiativeContext: string;
}

export function WorkflowLauncher({
  initiativeId,
  initiativeTitle,
  initiativeContext,
}: WorkflowLauncherProps) {
  const { settings } = useAppStore();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<null | Record<string, unknown>>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType>('initiative_deep_dive');

  const workflows = Object.values(WORKFLOW_DEFINITIONS);

  async function handleRun() {
    if (!settings?.llm?.provider) {
      toast.error('LLM config required — set it in Settings');
      return;
    }

    setRunning(true);
    setResult(null);

    try {
      const res = await fetch('/api/agents/workflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowType: selectedWorkflow,
          initialContext: `Initiative: ${initiativeTitle}\n\n${initiativeContext}`,
          initiativeId,
          llmConfig: settings.llm,
          autonomyLevel: settings.preferences?.autonomyLevel ?? 'oversight',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Workflow failed');
        return;
      }

      if (data.status === 'paused') {
        toast.info(String(data.finalOutput?.reason ?? 'Workflow queued for approval'));
      } else if (data.status === 'completed') {
        toast.success('Workflow completed');
      }

      setResult(data);
    } catch {
      toast.error('Failed to run workflow');
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Run agent workflow
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent style={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
          <DialogHeader>
            <DialogTitle>Agent workflow — {initiativeTitle}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {/* Workflow selector */}
            {!result && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Select a workflow:</p>
                {workflows.map((wf) => (
                  <div
                    key={wf.type}
                    onClick={() => setSelectedWorkflow(wf.type)}
                    className={`rounded-lg border p-3 cursor-pointer transition-colors ${
                      selectedWorkflow === wf.type
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{wf.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {wf.steps.length} agents
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{wf.description}</p>
                    <div className="flex gap-1 mt-2">
                      {wf.steps.map((s, i) => (
                        <span
                          key={i}
                          className="text-xs px-1.5 py-0.5 bg-muted rounded capitalize"
                        >
                          {s.agent}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Result timeline */}
            {result && result.steps && (
              <WorkflowTimeline
                workflow={{
                  workflowId: result.workflowId as string,
                  workflowType: result.workflowType as string,
                  steps: (result.steps as Array<{ agentMessageId: string; agent: string; messageType: string; status: string; output: Record<string, unknown>; stepIndex: number }>).map((s) => ({
                    id: s.agentMessageId,
                    toAgent: s.agent,
                    messageType: s.messageType,
                    status: s.status,
                    payload: JSON.stringify(s.output),
                    workflowId: result.workflowId as string,
                    workflowType: result.workflowType as string,
                    stepIndex: s.stepIndex,
                    userId: '',
                    fromAgent: '',
                    errorMessage: '',
                    initiativeId: initiativeId,
                    metadata: '{}',
                    createdAt: new Date(),
                    processedAt: null,
                    completedAt: null,
                  })),
                  status: result.status as string,
                  startedAt: null,
                  completedAt: null,
                }}
              />
            )}

            {running && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-sm">Agents are collaborating...</span>
              </div>
            )}
          </div>

          <DialogFooter>
            {!result ? (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRun} disabled={running}>
                  {running ? 'Running...' : 'Run workflow'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setOpen(false)}>Done</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
