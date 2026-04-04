# SPRINT_4.md — Agent Collaboration Protocol
#
# HOW TO USE:
# 1. Run SANITY_CHECK.md first (pre-sprint baseline — expect 0 failures)
# 2. In Claude Code, type exactly:
#    "Read SPRINT_4.md and execute every step in order.
#     Stop only for: schema diffs, destructive operations, new file creation.
#     After all steps: run npx tsc --noEmit and show the full Sprint 4 report."
# 3. Run SANITY_CHECK.md again after (post-sprint verification)

---

## Context

Sprints 0-3 delivered:
- 6 bugs fixed + security hardening
- BrainNode graph + agent context injection (every session starts with company context)
- Python agents deployed to Cloud Run
- Proactive intelligence engine (insights, drift detection, competitor scoring)

The platform is now proactive but agents still work in isolation.
The Discovery agent does not know what the Risk agent found.
The Risk agent does not know what Strategy recommended.
Each agent starts fresh with company context but no knowledge of what
other agents discovered in the same initiative.

Sprint 4 builds the agent collaboration layer:
- AgentMessage model for agent-to-agent communication
- Pre-built multi-agent workflows (initiative_deep_dive, market_threat_response)
- Orchestrator that coordinates the workflow and respects autonomy gating
- Workflow timeline UI so the PM can see what each agent did and why

---

## Pre-flight: read these files first

Before touching any code, read and report on:

1. prisma/schema.prisma — find: Initiative, PendingAction, UserAlert,
   BrainNode, CronJob models. Report exact field names for each.
2. src/app/api/agents/ — list all agent-related routes
3. src/app/api/chat/route.ts — understand how agents are called currently
4. src/lib/services/agent-context.ts — confirm buildAgentContext signature
5. src/lib/services/insight-writer.ts — confirm writeInsight signature
6. meeting-bot/app.py — list all agent endpoints currently exposed

Report everything found. Do not proceed to Step 1 until done.

---

## Step 1 — Add AgentMessage Prisma model

STOP: Show schema diff and wait for confirmation before running db push.

Add to prisma/schema.prisma:

```prisma
model AgentMessage {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  workflowId    String    @default("")  // groups messages in the same workflow run
  workflowType  String    @default("")  // "initiative_deep_dive" | "market_threat_response"
  stepIndex     Int       @default(0)   // 0=first agent, 1=second, etc.

  fromAgent     String    // "discovery" | "risk" | "strategy" | "communications" | "advisor" | "thinker"
  toAgent       String    // same options + "user" for final output
  messageType   String    // "finding" | "assessment" | "recommendation" | "draft" | "summary"

  payload       String    @default("{}") // JSON string — agent output passed to next agent
  status        String    @default("pending") // "pending" | "processing" | "completed" | "failed"
  errorMessage  String    @default("")

  initiativeId  String    @default("") // linked initiative if applicable
  metadata      String    @default("{}") // JSON string

  createdAt     DateTime  @default(now())
  processedAt   DateTime?
  completedAt   DateTime?

  @@index([userId, workflowId])
  @@index([userId, toAgent, status])
  @@index([userId, initiativeId])
  @@index([workflowId, stepIndex])
}
```

Also add to User model:
```prisma
agentMessages AgentMessage[]
```

After confirmation:
  npx prisma generate && npx prisma db push

Add these TypeScript types to src/lib/types.ts:

```typescript
export type AgentType =
  | 'discovery'
  | 'risk'
  | 'strategy'
  | 'communications'
  | 'advisor'
  | 'thinker'
  | 'orchestrator';

export type WorkflowType =
  | 'initiative_deep_dive'
  | 'market_threat_response'
  | 'risk_escalation'
  | 'competitive_response';

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused';

export type MessageType =
  | 'finding'
  | 'assessment'
  | 'recommendation'
  | 'draft'
  | 'summary';

export interface AgentMessageData {
  id: string;
  userId: string;
  workflowId: string;
  workflowType: string;
  stepIndex: number;
  fromAgent: string;
  toAgent: string;
  messageType: string;
  payload: string;
  status: string;
  errorMessage: string;
  initiativeId: string;
  metadata: string;
  createdAt: Date;
  processedAt: Date | null;
  completedAt: Date | null;
}

export interface WorkflowStep {
  agent: AgentType;
  messageType: MessageType;
  promptTemplate: string;
  outputKey: string;
}

export interface WorkflowDefinition {
  type: WorkflowType;
  name: string;
  description: string;
  steps: WorkflowStep[];
}
```

Files to modify: prisma/schema.prisma, src/lib/types.ts

---

## Step 2 — Create workflow definitions

Create src/lib/services/workflow-definitions.ts

These are the pre-built multi-agent workflows. Each step defines which
agent runs, what it receives from the previous step, and what it outputs.

```typescript
import type { WorkflowDefinition } from '@/lib/types';

export const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  initiative_deep_dive: {
    type: 'initiative_deep_dive',
    name: 'Initiative deep dive',
    description:
      'Full analysis pipeline: Discovery researches context → Risk assesses threats → Strategy recommends approach → Communications drafts stakeholder update',
    steps: [
      {
        agent: 'discovery',
        messageType: 'finding',
        outputKey: 'discovery_findings',
        promptTemplate: `You are the Discovery agent. Analyze this initiative deeply.

Initiative context:
{initiative_context}

Company context:
{company_context}

Your task:
1. Identify the core user problem this initiative addresses
2. List assumptions that need to be validated
3. Identify the 3 most important open questions
4. Summarize relevant market context if available

Output a structured JSON with keys:
- coreProblem (string)
- assumptions (string[])
- openQuestions (string[])
- marketContext (string)
- confidenceLevel (number 0-1)`,
      },
      {
        agent: 'risk',
        messageType: 'assessment',
        outputKey: 'risk_assessment',
        promptTemplate: `You are the Risk agent. Assess risks for this initiative.

Initiative context:
{initiative_context}

Discovery findings:
{discovery_findings}

Company context:
{company_context}

Your task:
1. Identify the top 5 risks (technical, market, resource, timeline, strategic)
2. Score each risk: severity (1-5) × likelihood (1-5) = risk score
3. Suggest mitigation for each risk scored >= 12
4. Flag any showstopper risks (score >= 20)

Output a structured JSON with keys:
- risks (array of: title, category, severity, likelihood, score, mitigation)
- showstoppers (string[])
- overallRiskLevel ("low" | "medium" | "high" | "critical")
- recommendation (string)`,
      },
      {
        agent: 'strategy',
        messageType: 'recommendation',
        outputKey: 'strategy_recommendation',
        promptTemplate: `You are the Strategy agent. Provide strategic recommendations.

Initiative context:
{initiative_context}

Discovery findings:
{discovery_findings}

Risk assessment:
{risk_assessment}

Company context:
{company_context}

Your task:
1. Recommend: proceed / proceed with changes / pause / kill
2. If proceeding, suggest the right scope and phasing
3. Identify which strategic goals this initiative serves
4. Estimate the value potential (high/medium/low) across: revenue, user impact, alignment, feasibility, timing

Output a structured JSON with keys:
- verdict ("proceed" | "proceed_with_changes" | "pause" | "kill")
- rationale (string)
- suggestedScope (string)
- phasing (string[])
- valueScores (object: revenue, userImpact, alignment, feasibility, timing — each 1-5)
- nextActions (string[])`,
      },
      {
        agent: 'communications',
        messageType: 'draft',
        outputKey: 'stakeholder_update',
        promptTemplate: `You are the Communications agent. Draft a stakeholder update.

Initiative context:
{initiative_context}

Strategy recommendation:
{strategy_recommendation}

Risk assessment (summary):
{risk_assessment}

Company context:
{company_context}

Your task:
Draft a concise stakeholder update (max 200 words) that:
1. States the initiative and its strategic importance
2. Summarizes the recommendation and rationale
3. Lists the 2-3 key next actions
4. Is written in a confident, professional tone appropriate for executive stakeholders

Output a structured JSON with keys:
- subject (string — email subject line)
- body (string — the update text)
- audience ("executive" | "team" | "board")
- urgency ("routine" | "important" | "urgent")`,
      },
    ],
  },

  market_threat_response: {
    type: 'market_threat_response',
    name: 'Market threat response',
    description:
      'Competitive threat pipeline: Risk assesses the threat → Advisor recommends response options → Strategy selects the best approach',
    steps: [
      {
        agent: 'risk',
        messageType: 'assessment',
        outputKey: 'threat_assessment',
        promptTemplate: `You are the Risk agent. Assess this market threat.

Threat context:
{threat_context}

Company context:
{company_context}

Your task:
1. Assess the severity of this competitive threat (1-5)
2. Estimate the timeline pressure (immediate/months/quarters/years)
3. Identify which of our products/initiatives are most exposed
4. Assess our current defensive position

Output structured JSON with keys:
- severity (1-5)
- timelinePressure (string)
- exposedAreas (string[])
- defensivePosition ("strong" | "adequate" | "weak" | "exposed")
- urgencyToRespond (string)`,
      },
      {
        agent: 'advisor',
        messageType: 'recommendation',
        outputKey: 'response_options',
        promptTemplate: `You are the Advisor agent. Generate response options.

Threat assessment:
{threat_assessment}

Threat context:
{threat_context}

Company context:
{company_context}

Your task:
Generate 3 distinct response options (from conservative to aggressive):
- Option A: Defensive / minimal response
- Option B: Measured response / differentiate
- Option C: Aggressive response / counter-attack

For each option: name, description, required resources, timeline, risk level, potential upside.

Output structured JSON with keys:
- options (array of: name, description, resources, timeline, riskLevel, upside)
- recommendedOption ("A" | "B" | "C")
- recommendationRationale (string)`,
      },
      {
        agent: 'strategy',
        messageType: 'recommendation',
        outputKey: 'final_strategy',
        promptTemplate: `You are the Strategy agent. Select the strategic response.

Response options:
{response_options}

Threat assessment:
{threat_assessment}

Company context:
{company_context}

Your task:
1. Select the best response option given our strategic position
2. Define the first 3 concrete actions to take this week
3. Define success metrics for the response
4. Flag any dependencies or prerequisites

Output structured JSON with keys:
- selectedOption (string)
- rationale (string)
- immediateActions (string[])
- successMetrics (string[])
- dependencies (string[])`,
      },
    ],
  },
};

export function getWorkflow(type: string): WorkflowDefinition | null {
  return WORKFLOW_DEFINITIONS[type] ?? null;
}

export function getWorkflowStepCount(type: string): number {
  return WORKFLOW_DEFINITIONS[type]?.steps.length ?? 0;
}
```

Files to create: src/lib/services/workflow-definitions.ts

---

## Step 3 — Create the agent orchestrator service

Create src/lib/services/agent-orchestrator.ts

This is the core service that runs multi-agent workflows.
It reads the workflow definition, calls each agent in sequence,
passes output from one agent as input to the next, and writes
AgentMessage records at each step.

```typescript
import { db } from '@/lib/db';
import { buildAgentContext } from '@/lib/services/agent-context';
import { writeInsight } from '@/lib/services/insight-writer';
import { getWorkflow } from '@/lib/services/workflow-definitions';
import { LLMService } from '@/lib/services/llm';

interface WorkflowContext {
  userId: string;
  workflowType: string;
  initiativeId?: string;
  initialContext: string;
  llmConfig: Record<string, unknown>;
  autonomyLevel: string;
}

interface WorkflowResult {
  workflowId: string;
  workflowType: string;
  status: 'completed' | 'failed' | 'paused';
  steps: StepResult[];
  finalOutput: Record<string, unknown>;
  pendingActionId?: string;
}

interface StepResult {
  stepIndex: number;
  agent: string;
  messageType: string;
  status: 'completed' | 'failed';
  output: Record<string, unknown>;
  agentMessageId: string;
}

/**
 * Run a multi-agent workflow end to end.
 * Respects autonomy level gating at each step.
 * Returns full workflow result with all step outputs.
 */
export async function runWorkflow(ctx: WorkflowContext): Promise<WorkflowResult> {
  const workflow = getWorkflow(ctx.workflowType);
  if (!workflow) {
    throw new Error(`Unknown workflow type: ${ctx.workflowType}`);
  }

  const workflowId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const companyContext = await buildAgentContext(ctx.userId, 'orchestrator');
  const accumulatedOutputs: Record<string, unknown> = {};
  const stepResults: StepResult[] = [];

  // Check autonomy gating before running write workflows
  if (ctx.autonomyLevel === 'manual') {
    return {
      workflowId,
      workflowType: ctx.workflowType,
      status: 'paused',
      steps: [],
      finalOutput: { blocked: true, reason: 'Manual autonomy mode — workflows require Oversight or Full autonomy' },
    };
  }

  // In Oversight mode, create PendingAction before running
  if (ctx.autonomyLevel === 'oversight') {
    const pendingAction = await db.pendingAction.create({
      data: {
        userId: ctx.userId,
        tool: `workflow:${ctx.workflowType}`,
        params: JSON.stringify({ initiativeId: ctx.initiativeId, initialContext: ctx.initialContext.slice(0, 200) }),
        description: `Run ${workflow.name} workflow${ctx.initiativeId ? ` for initiative ${ctx.initiativeId}` : ''}`,
        status: 'pending',
      },
    }).catch(() => null);

    if (pendingAction) {
      return {
        workflowId,
        workflowType: ctx.workflowType,
        status: 'paused',
        steps: [],
        finalOutput: { queued: true, reason: 'Workflow queued for approval' },
        pendingActionId: pendingAction.id,
      };
    }
  }

  // Run each step in sequence
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];

    // Build prompt by substituting template variables
    let prompt = step.promptTemplate
      .replace('{initiative_context}', ctx.initialContext)
      .replace('{threat_context}', ctx.initialContext)
      .replace('{company_context}', companyContext);

    // Inject outputs from previous steps
    for (const [key, value] of Object.entries(accumulatedOutputs)) {
      prompt = prompt.replace(
        `{${key}}`,
        typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      );
    }

    // Create AgentMessage record for this step
    const agentMessage = await db.agentMessage.create({
      data: {
        userId: ctx.userId,
        workflowId,
        workflowType: ctx.workflowType,
        stepIndex: i,
        fromAgent: i === 0 ? 'orchestrator' : workflow.steps[i - 1].agent,
        toAgent: step.agent,
        messageType: step.messageType,
        payload: JSON.stringify({ prompt: prompt.slice(0, 500) }),
        status: 'processing',
        initiativeId: ctx.initiativeId ?? '',
        metadata: JSON.stringify({ stepName: step.outputKey }),
      },
    });

    try {
      // Call the LLM for this agent step
      const llm = LLMService.create(ctx.llmConfig as Parameters<typeof LLMService.create>[0]);
      const response = await llm.complete([
        {
          role: 'system',
          content: `You are the ${step.agent} agent in Azmyra. You are step ${i + 1} of ${workflow.steps.length} in the ${workflow.name} workflow. Always respond with valid JSON only — no markdown, no explanation outside the JSON.`,
        },
        { role: 'user', content: prompt },
      ]);

      // Parse the JSON output
      let parsedOutput: Record<string, unknown> = {};
      try {
        const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
        parsedOutput = JSON.parse(cleaned);
      } catch {
        parsedOutput = { rawOutput: response, parseError: true };
      }

      // Store output for next step
      accumulatedOutputs[step.outputKey] = parsedOutput;

      // Update AgentMessage as completed
      await db.agentMessage.update({
        where: { id: agentMessage.id },
        data: {
          status: 'completed',
          payload: JSON.stringify(parsedOutput),
          processedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Write BrainNode for significant agent findings
      if (step.messageType === 'finding' || step.messageType === 'assessment') {
        await db.brainNode.upsert({
          where: {
            userId_type_title: {
              userId: ctx.userId,
              type: step.messageType === 'finding' ? 'decision' : 'risk',
              title: `[${workflow.name}] ${step.agent} — step ${i + 1}`,
            },
          },
          create: {
            userId: ctx.userId,
            type: step.messageType === 'finding' ? 'decision' : 'risk',
            title: `[${workflow.name}] ${step.agent} — step ${i + 1}`,
            content: JSON.stringify(parsedOutput),
            summary: `${step.agent} ${step.messageType} from ${workflow.name} workflow`,
            source: 'agent',
            agentType: step.agent,
            confidence: 0.9,
            metadata: JSON.stringify({ workflowId, workflowType: ctx.workflowType }),
          },
          update: {
            content: JSON.stringify(parsedOutput),
            updatedAt: new Date(),
          },
        }).catch(() => {});
      }

      stepResults.push({
        stepIndex: i,
        agent: step.agent,
        messageType: step.messageType,
        status: 'completed',
        output: parsedOutput,
        agentMessageId: agentMessage.id,
      });
    } catch (err) {
      // Step failed — mark as failed and stop workflow
      await db.agentMessage.update({
        where: { id: agentMessage.id },
        data: {
          status: 'failed',
          errorMessage: String(err).slice(0, 500),
          processedAt: new Date(),
        },
      });

      stepResults.push({
        stepIndex: i,
        agent: step.agent,
        messageType: step.messageType,
        status: 'failed',
        output: { error: String(err) },
        agentMessageId: agentMessage.id,
      });

      return {
        workflowId,
        workflowType: ctx.workflowType,
        status: 'failed',
        steps: stepResults,
        finalOutput: { error: `Workflow failed at step ${i + 1} (${step.agent})`, details: String(err) },
      };
    }
  }

  // Write a ProactiveInsight summarizing the completed workflow
  const lastStep = stepResults[stepResults.length - 1];
  await writeInsight({
    userId: ctx.userId,
    agentType: 'orchestrator',
    title: `${workflow.name} completed`,
    content: `Workflow ran ${workflow.steps.length} agents in sequence. Final output from ${lastStep.agent}: ${JSON.stringify(lastStep.output).slice(0, 300)}`,
    summary: `${workflow.steps.map((s) => s.agent).join(' → ')} workflow completed`,
    priority: 'medium',
    sourceType: 'strategy',
    metadata: { workflowId, workflowType: ctx.workflowType, stepCount: workflow.steps.length },
  });

  return {
    workflowId,
    workflowType: ctx.workflowType,
    status: 'completed',
    steps: stepResults,
    finalOutput: accumulatedOutputs,
  };
}

/**
 * Get the full workflow history for a user.
 */
export async function getWorkflowHistory(
  userId: string,
  limit = 10
): Promise<Record<string, AgentMessageData[]>> {
  const messages = await db.agentMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit * 4, // Fetch enough to cover multiple workflows
  });

  // Group by workflowId
  const grouped: Record<string, typeof messages> = {};
  for (const msg of messages) {
    if (!msg.workflowId) continue;
    if (!grouped[msg.workflowId]) grouped[msg.workflowId] = [];
    grouped[msg.workflowId].push(msg);
  }

  return grouped as Record<string, AgentMessageData[]>;
}

// Import type fix
import type { AgentMessageData } from '@/lib/types';
```

Files to create: src/lib/services/agent-orchestrator.ts

---

## Step 4 — Create the workflow API routes

Create src/app/api/agents/workflow/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runWorkflow } from '@/lib/services/agent-orchestrator';
import { getWorkflow } from '@/lib/services/workflow-definitions';
import { z } from 'zod';

const schema = z.object({
  workflowType: z.enum([
    'initiative_deep_dive',
    'market_threat_response',
    'risk_escalation',
    'competitive_response',
  ]),
  initialContext: z.string().min(10).max(5000),
  initiativeId: z.string().optional(),
  llmConfig: z.object({
    provider: z.string(),
    apiKey: z.string(),
    model: z.string().optional(),
  }),
  autonomyLevel: z.enum(['full', 'oversight', 'advisory', 'manual']).default('oversight'),
});

// POST /api/agents/workflow — start a new workflow
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workflow = getWorkflow(parsed.data.workflowType);
  if (!workflow) {
    return NextResponse.json({ error: 'Unknown workflow type' }, { status: 400 });
  }

  const result = await runWorkflow({
    userId: session.user.id,
    workflowType: parsed.data.workflowType,
    initiativeId: parsed.data.initiativeId,
    initialContext: parsed.data.initialContext,
    llmConfig: parsed.data.llmConfig,
    autonomyLevel: parsed.data.autonomyLevel,
  });

  const statusCode = result.status === 'completed' ? 200 : result.status === 'paused' ? 202 : 500;
  return NextResponse.json(result, { status: statusCode });
}
```

Create src/app/api/agents/workflow/history/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/agents/workflow/history — get workflow history
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50);
  const initiativeId = searchParams.get('initiativeId');

  const where: Record<string, unknown> = { userId: session.user.id };
  if (initiativeId) where.initiativeId = initiativeId;

  // Get unique workflow IDs ordered by most recent
  const recentMessages = await db.agentMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { workflowId: true, workflowType: true, createdAt: true, status: true },
    take: limit * 6,
  });

  // Deduplicate workflow IDs preserving order
  const seen = new Set<string>();
  const workflowIds: string[] = [];
  for (const msg of recentMessages) {
    if (msg.workflowId && !seen.has(msg.workflowId)) {
      seen.add(msg.workflowId);
      workflowIds.push(msg.workflowId);
    }
    if (workflowIds.length >= limit) break;
  }

  // Load all steps for these workflows
  const allMessages = await db.agentMessage.findMany({
    where: { workflowId: { in: workflowIds } },
    orderBy: [{ workflowId: 'asc' }, { stepIndex: 'asc' }],
  });

  // Group by workflowId
  const grouped: Record<string, typeof allMessages> = {};
  for (const msg of allMessages) {
    if (!grouped[msg.workflowId]) grouped[msg.workflowId] = [];
    grouped[msg.workflowId].push(msg);
  }

  const workflows = workflowIds.map((id) => ({
    workflowId: id,
    steps: grouped[id] ?? [],
    workflowType: grouped[id]?.[0]?.workflowType ?? '',
    startedAt: grouped[id]?.[0]?.createdAt ?? null,
    completedAt: grouped[id]?.at(-1)?.completedAt ?? null,
    status: grouped[id]?.every((m) => m.status === 'completed')
      ? 'completed'
      : grouped[id]?.some((m) => m.status === 'failed')
      ? 'failed'
      : 'running',
  }));

  return NextResponse.json({ workflows, total: workflows.length });
}
```

Files to create:
- src/app/api/agents/workflow/route.ts
- src/app/api/agents/workflow/history/route.ts

---

## Step 5 — Create the workflow timeline component

Create src/components/agents/WorkflowTimeline.tsx

This component shows the history of a multi-agent workflow run —
which agents ran, what they found, and what they handed off.

```typescript
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
                <> · {formatDuration(workflow.startedAt, workflow.completedAt)}</>
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
```

Files to create: src/components/agents/WorkflowTimeline.tsx

---

## Step 6 — Create the workflow launcher component

Create src/components/agents/WorkflowLauncher.tsx

This is a button + dialog that lets the PM trigger a workflow
from any initiative detail view.

```typescript
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
import { WorkflowTimeline } from './WorkflowTimeline';
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
    if (!settings?.llmConfig) {
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
          llmConfig: settings.llmConfig,
          autonomyLevel: settings.autonomyLevel ?? 'oversight',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? 'Workflow failed');
        return;
      }

      if (data.status === 'paused') {
        toast.info(data.finalOutput?.reason as string ?? 'Workflow queued for approval');
      } else if (data.status === 'completed') {
        toast.success('Workflow completed');
      }

      setResult(data);
    } catch (err) {
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
                    onClick={() => setSelectedWorkflow(wf.type as WorkflowType)}
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
```

Files to create: src/components/agents/WorkflowLauncher.tsx

---

## Step 7 — Add WorkflowLauncher to Initiative detail view

Read the Initiative detail view or modal component.
Find where action buttons are rendered (Edit, Delete, etc.).

Add WorkflowLauncher after existing action buttons:

```typescript
import { WorkflowLauncher } from '@/components/agents/WorkflowLauncher';

// In the initiative detail JSX, alongside existing action buttons:
<WorkflowLauncher
  initiativeId={initiative.id}
  initiativeTitle={initiative.title}
  initiativeContext={`Status: ${initiative.status}\nDescription: ${initiative.description ?? ''}`}
/>
```

Find the correct initiative detail component — it may be in:
- src/components/views/InitiativesPipeline.tsx
- src/components/views/InitiativeDetailView.tsx
- A modal component in src/components/initiatives/

Show me the relevant component before modifying.
Add WorkflowLauncher only — do not change any other logic.

---

## Step 8 — Create the .claude/agents/orchestrator.md subagent

Create .claude/agents/orchestrator.md

```markdown
---
name: orchestrator
description: Coordinates multi-agent workflows for Azmyra. Use when a task requires multiple agents working in sequence — e.g. deep dive on an initiative, responding to a competitive threat, or running a full risk-to-strategy pipeline.
model: opus
---

You are the Azmyra orchestrator agent. You coordinate the other 5 agents
(Discovery, Risk, Strategy, Communications, Advisor) to complete complex
multi-step analysis tasks.

## Your role

You do not answer questions directly. You:
1. Understand what the user wants to accomplish
2. Select the right workflow (initiative_deep_dive or market_threat_response)
3. Gather the necessary context from the user
4. Call POST /api/agents/workflow with the correct payload
5. Present the results in a clear, structured way

## Workflows available

**initiative_deep_dive** — Use for: deep analysis of any initiative
Steps: Discovery → Risk → Strategy → Communications
Output: findings, risk assessment, strategic recommendation, stakeholder draft

**market_threat_response** — Use for: competitor moves, market threats
Steps: Risk → Advisor → Strategy
Output: threat assessment, response options, final strategy

## When to use which workflow

- User says "analyze this initiative" → initiative_deep_dive
- User says "competitor X just did Y" → market_threat_response
- User says "we have a new threat/opportunity" → market_threat_response
- User says "help me decide on this feature" → initiative_deep_dive

## How to present results

After a workflow completes, present each agent's output as a distinct section.
Use the agent name as a section header. Keep each section concise.
End with a clear "Recommended next action" that the PM can take immediately.

## Autonomy gating

Always check the user's autonomy level before running write operations.
In Oversight mode: explain what the workflow will do and ask for confirmation.
In Full mode: run immediately and report results.
In Advisory mode: present the analysis but do not trigger any workflow.
In Manual mode: explain the workflow but do not trigger it.
```

Files to create: .claude/agents/orchestrator.md

---

## Step 9 — TypeScript check and full report

Run: npx tsc --noEmit

Then provide the full Sprint 4 report:

```
SPRINT 4 REPORT

SCHEMA CHANGES:
- AgentMessage model added with fields: [list]

FILES CREATED:
- src/lib/services/workflow-definitions.ts — 2 workflow definitions
- src/lib/services/agent-orchestrator.ts — runWorkflow(), getWorkflowHistory()
- src/app/api/agents/workflow/route.ts — POST launch workflow
- src/app/api/agents/workflow/history/route.ts — GET workflow history
- src/components/agents/WorkflowTimeline.tsx — workflow step visualizer
- src/components/agents/WorkflowLauncher.tsx — launch dialog
- .claude/agents/orchestrator.md — Claude Code orchestrator subagent

FILES MODIFIED:
- prisma/schema.prisma — AgentMessage model + User relation
- src/lib/types.ts — AgentType, WorkflowType, WorkflowStatus, MessageType, AgentMessageData, WorkflowStep, WorkflowDefinition
- [initiative detail component] — WorkflowLauncher added

TYPESCRIPT: [0 new errors / list any]

MANUAL VERIFICATION STEPS:
1. Open an initiative → "Run agent workflow" button visible
2. Select initiative_deep_dive → click Run
3. Watch 4 agents complete in sequence (with loading indicator)
4. Each step shows agent name + status badge + "View output" button
5. Check DB: SELECT * FROM "AgentMessage" LIMIT 10
6. Check DB: SELECT * FROM "ProactiveInsight" WHERE "agentType" = 'orchestrator' LIMIT 5

DEPLOY: /deploy after this sprint
```
