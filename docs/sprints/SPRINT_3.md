# SPRINT_3.md — Proactive Intelligence Engine
#
# HOW TO USE:
# 1. Run SANITY_CHECK.md first (pre-sprint baseline)
# 2. In Claude Code, type exactly:
#    "Read SPRINT_3.md and execute every step in order.
#     Stop only for: schema diffs, destructive operations, new file creation.
#     After all steps: run npx tsc --noEmit and show the full Sprint 3 report."
# 3. Run SANITY_CHECK.md again after (post-sprint verification)

---

## Context

The platform is currently reactive — agents only respond when asked.
The vision requires proactive agents that monitor continuously and surface
insights before the PM asks.

Sprint 2 deployed the Python agent service to Cloud Run.
Sprint 1 built the BrainNode graph with company context.

This sprint wires them together into a proactive loop:
- Cron jobs run on schedule → agents analyze → insights written to DB
- PM logs in → sees "Today's insights" without asking anything
- Competitor moves are scored and escalated automatically
- North Star drift is detected and flagged before it becomes a problem
- WatchTopics are monitored and market signals flow into the brain

---

## Pre-flight: read these files first

Before touching any code, read and report on:

1. prisma/schema.prisma — find: CronJob, CronRun, UserAlert, WatchTopic, 
   CompetitorFeed, AlignmentScore models. Report their exact field names.
2. src/app/api/cron/ — list all route files and their current logic
3. src/components/views/DashboardView.tsx — understand current dashboard structure
4. src/lib/services/agent-context.ts — confirm buildAgentContext exists from Sprint 1
5. src/app/api/alerts/ — list all alert routes

Report everything found. Do not proceed to Step 1 until this is done.

---

## Step 1 — Add ProactiveInsight Prisma model

STOP: Show me the schema diff and wait for confirmation before running
prisma db push.

Add this model to prisma/schema.prisma:

```prisma
model ProactiveInsight {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  agentType   String   // "strategy" | "risk" | "discovery" | "market" | "competitor"
  title       String
  content     String   @db.Text
  summary     String   @default("")
  priority    String   @default("medium") // "high" | "medium" | "low"
  status      String   @default("new")    // "new" | "read" | "dismissed" | "actioned"
  sourceType  String   @default("")       // "drift" | "competitor" | "market" | "risk"
  sourceId    String   @default("")       // ID of related record if any
  metadata    String   @default("{}")     // JSON string for extra data
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId, status])
  @@index([userId, priority])
  @@index([userId, agentType])
  @@index([userId, createdAt])
}
```

Also add to User model in schema.prisma:
```prisma
proactiveInsights ProactiveInsight[]
```

After confirmation, run:
  npx prisma generate && npx prisma db push

Then add these TypeScript types to src/lib/types.ts:

```typescript
export type InsightPriority = 'high' | 'medium' | 'low';
export type InsightStatus = 'new' | 'read' | 'dismissed' | 'actioned';
export type InsightSourceType = 'drift' | 'competitor' | 'market' | 'risk' | 'strategy';

export interface ProactiveInsightData {
  id: string;
  userId: string;
  agentType: string;
  title: string;
  content: string;
  summary: string;
  priority: InsightPriority;
  status: InsightStatus;
  sourceType: InsightSourceType | string;
  sourceId: string;
  metadata: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Files to modify: prisma/schema.prisma, src/lib/types.ts

---

## Step 2 — Create the insight writer service

Create src/lib/services/insight-writer.ts

```typescript
import { db } from '@/lib/db';

interface InsightPayload {
  userId: string;
  agentType: string;
  title: string;
  content: string;
  summary?: string;
  priority?: 'high' | 'medium' | 'low';
  sourceType?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write a proactive insight to the database.
 * Deduplicates by userId + agentType + title within the last 24 hours.
 * Never throws — safe to fire-and-forget.
 */
export async function writeInsight(payload: InsightPayload): Promise<void> {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Deduplicate: skip if same title written in last 24h
    const existing = await db.proactiveInsight.findFirst({
      where: {
        userId: payload.userId,
        agentType: payload.agentType,
        title: payload.title,
        createdAt: { gte: yesterday },
      },
      select: { id: true },
    });

    if (existing) return; // Already written today, skip

    await db.proactiveInsight.create({
      data: {
        userId: payload.userId,
        agentType: payload.agentType,
        title: payload.title,
        content: payload.content,
        summary: payload.summary ?? payload.content.slice(0, 120),
        priority: payload.priority ?? 'medium',
        sourceType: payload.sourceType ?? '',
        sourceId: payload.sourceId ?? '',
        metadata: JSON.stringify(payload.metadata ?? {}),
      },
    });
  } catch (err) {
    console.error('[insight-writer] Failed to write insight:', err);
  }
}

/**
 * Write multiple insights in parallel. Never throws.
 */
export async function writeInsights(payloads: InsightPayload[]): Promise<void> {
  await Promise.allSettled(payloads.map(writeInsight));
}
```

Files to create: src/lib/services/insight-writer.ts

---

## Step 3 — Create the competitor signal scorer

Create src/lib/services/competitor-scorer.ts

This service scores competitor feed items by threat level and decides
whether to escalate to a UserAlert and/or ProactiveInsight.

```typescript
import { db } from '@/lib/db';
import { writeInsight } from './insight-writer';

// Threat scores by feed item type
const THREAT_SCORES: Record<string, number> = {
  pricing_change: 5,
  new_feature: 4,
  product_launch: 5,
  acquisition: 5,
  funding: 4,
  hiring_surge: 3,
  partnership: 3,
  blog_post: 1,
  social_media: 1,
  news: 2,
};

const ESCALATION_THRESHOLD = 4; // Score >= this creates a UserAlert

interface ScoredFeedItem {
  id: string;
  competitorId: string;
  competitorName: string;
  type: string;
  title: string;
  content: string;
  score: number;
  shouldEscalate: boolean;
}

export function scoreFeedItem(item: {
  id: string;
  type: string;
  title: string;
  content: string;
  competitorId: string;
  competitor?: { name: string };
}): ScoredFeedItem {
  const score = THREAT_SCORES[item.type] ?? 2;
  return {
    id: item.id,
    competitorId: item.competitorId,
    competitorName: item.competitor?.name ?? 'Unknown competitor',
    type: item.type,
    title: item.title,
    content: item.content,
    score,
    shouldEscalate: score >= ESCALATION_THRESHOLD,
  };
}

/**
 * Process unscored competitor feed items for a user.
 * Creates UserAlert and ProactiveInsight for high-threat items.
 * Called by the competitor_scan cron job.
 */
export async function processCompetitorFeed(userId: string): Promise<{
  processed: number;
  escalated: number;
}> {
  try {
    // Get recent unprocessed feed items (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const feedItems = await db.competitorFeed.findMany({
      where: {
        competitor: { userId },
        createdAt: { gte: yesterday },
      },
      include: { competitor: { select: { name: true, id: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (feedItems.length === 0) return { processed: 0, escalated: 0 };

    const scored = feedItems.map(scoreFeedItem);
    const toEscalate = scored.filter((item) => item.shouldEscalate);

    // Create UserAlerts and ProactiveInsights for high-threat items
    const escalationTasks = toEscalate.map(async (item) => {
      // Create UserAlert
      await db.userAlert.create({
        data: {
          userId,
          type: 'competitor_move',
          title: `Competitor move: ${item.competitorName}`,
          message: item.title,
          severity: item.score >= 5 ? 'high' : 'medium',
          entityType: 'competitor',
          entityId: item.competitorId,
          metadata: JSON.stringify({ feedItemId: item.id, score: item.score, type: item.type }),
        },
      }).catch((err) => console.error('[competitor-scorer] Alert create failed:', err));

      // Create ProactiveInsight
      await writeInsight({
        userId,
        agentType: 'competitor',
        title: `${item.competitorName}: ${item.title}`,
        content: item.content || item.title,
        summary: `${item.competitorName} — ${item.type.replace(/_/g, ' ')} (threat score: ${item.score}/5)`,
        priority: item.score >= 5 ? 'high' : 'medium',
        sourceType: 'competitor',
        sourceId: item.competitorId,
        metadata: { feedItemId: item.id, score: item.score, type: item.type },
      });
    });

    await Promise.allSettled(escalationTasks);

    return { processed: feedItems.length, escalated: toEscalate.length };
  } catch (err) {
    console.error('[competitor-scorer] Processing failed:', err);
    return { processed: 0, escalated: 0 };
  }
}
```

Files to create: src/lib/services/competitor-scorer.ts

---

## Step 4 — Create the North Star drift detector

Create src/lib/services/drift-detector.ts

North Star drift = when the portfolio's actual VAS score drops below
the expected threshold, or when initiatives diverge from strategic goals.

```typescript
import { db } from '@/lib/db';
import { writeInsight } from './insight-writer';

const DRIFT_THRESHOLD = 65; // VAS score below this = drift alert
const SEVERE_DRIFT_THRESHOLD = 50; // Below this = high priority

interface DriftReport {
  hasDrift: boolean;
  currentScore: number;
  threshold: number;
  divergedInitiatives: string[];
  recommendation: string;
}

/**
 * Detect North Star alignment drift for a user.
 * Called by strategy_eval cron job.
 */
export async function detectNorthStarDrift(userId: string): Promise<DriftReport> {
  try {
    // Get latest alignment score
    const alignmentScore = await db.alignmentScore.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    const currentScore = alignmentScore?.score ?? 0;
    const hasDrift = currentScore < DRIFT_THRESHOLD && currentScore > 0;

    // Find initiatives with low alignment
    const initiatives = await db.initiative.findMany({
      where: { userId, status: { notIn: ['approved', 'archived'] } },
      select: { id: true, title: true, status: true },
      take: 20,
    });

    const divergedInitiatives = initiatives
      .filter(() => Math.random() < 0.3) // Placeholder — replace with real scoring
      .map((i) => i.title);

    const recommendation = hasDrift
      ? currentScore < SEVERE_DRIFT_THRESHOLD
        ? 'Critical misalignment detected. Immediate portfolio review recommended.'
        : 'Portfolio is drifting from North Star. Consider reviewing initiative priorities.'
      : 'Portfolio is aligned with strategic vision.';

    return { hasDrift, currentScore, threshold: DRIFT_THRESHOLD, divergedInitiatives, recommendation };
  } catch (err) {
    console.error('[drift-detector] Detection failed:', err);
    return { hasDrift: false, currentScore: 0, threshold: DRIFT_THRESHOLD, divergedInitiatives: [], recommendation: '' };
  }
}

/**
 * Run drift detection and write insights if drift found.
 * Called by strategy_eval cron.
 */
export async function processDriftDetection(userId: string): Promise<void> {
  const report = await detectNorthStarDrift(userId);

  if (!report.hasDrift) return;

  const priority = report.currentScore < SEVERE_DRIFT_THRESHOLD ? 'high' : 'medium';

  // Write ProactiveInsight
  await writeInsight({
    userId,
    agentType: 'strategy',
    title: `North Star alignment drift detected (${Math.round(report.currentScore)}% VAS)`,
    content: `${report.recommendation}\n\nCurrent VAS score: ${Math.round(report.currentScore)}%\nThreshold: ${report.threshold}%\n${report.divergedInitiatives.length > 0 ? `\nDiverged initiatives:\n${report.divergedInitiatives.map((i) => `- ${i}`).join('\n')}` : ''}`,
    summary: `VAS score ${Math.round(report.currentScore)}% — below ${report.threshold}% threshold`,
    priority,
    sourceType: 'drift',
    metadata: { score: report.currentScore, threshold: report.threshold },
  });

  // Write UserAlert
  await db.userAlert.create({
    data: {
      userId,
      type: 'alignment_drift',
      title: 'North Star alignment drift',
      message: `Portfolio VAS score dropped to ${Math.round(report.currentScore)}%. ${report.recommendation}`,
      severity: priority,
      entityType: 'alignment',
      entityId: userId,
      metadata: JSON.stringify({ score: report.currentScore }),
    },
  }).catch((err) => console.error('[drift-detector] Alert create failed:', err));
}
```

Note: The divergedInitiatives scoring uses a placeholder.
In a future sprint, replace it with actual per-initiative VAS scoring
against the BrainNode goals.

Files to create: src/lib/services/drift-detector.ts

---

## Step 5 — Create the WatchTopic processor

Create src/lib/services/watch-topic-processor.ts

WatchTopics are topics the user wants to monitor continuously.
The market_pulse cron scans data adapters for each topic and writes
findings as BrainNodes and ProactiveInsights.

```typescript
import { db } from '@/lib/db';
import { writeInsight } from './insight-writer';

/**
 * Process all WatchTopics for a user.
 * Queries the data pipeline for each topic and stores findings.
 * Called by market_pulse cron job.
 */
export async function processWatchTopics(userId: string): Promise<{
  topicsProcessed: number;
  insightsCreated: number;
}> {
  try {
    const watchTopics = await db.watchTopic.findMany({
      where: { userId, isActive: true },
      orderBy: { lastCheckedAt: 'asc' },
      take: 10, // Process max 10 topics per cron run
    });

    if (watchTopics.length === 0) return { topicsProcessed: 0, insightsCreated: 0 };

    let insightsCreated = 0;

    for (const topic of watchTopics) {
      try {
        // Call the data pipeline API to fetch results for this topic
        const results = await fetchTopicData(topic.query || topic.name);

        if (results.length === 0) continue;

        // Write top result as BrainNode
        const topResult = results[0];
        await db.brainNode.upsert({
          where: {
            userId_type_title: {
              userId,
              type: 'market_signal',
              title: `[${topic.name}] ${topResult.title.slice(0, 100)}`,
            },
          },
          create: {
            userId,
            type: 'market_signal',
            title: `[${topic.name}] ${topResult.title.slice(0, 100)}`,
            content: topResult.content || topResult.title,
            summary: topResult.title.slice(0, 120),
            source: 'agent',
            agentType: 'market',
            confidence: 0.8,
            sourceUrl: topResult.url || '',
            metadata: JSON.stringify({ topic: topic.name, query: topic.query }),
          },
          update: {
            content: topResult.content || topResult.title,
            summary: topResult.title.slice(0, 120),
            updatedAt: new Date(),
          },
        }).catch(() => {});

        // Write ProactiveInsight if results are significant
        if (results.length >= 3) {
          await writeInsight({
            userId,
            agentType: 'market',
            title: `Market update: ${topic.name}`,
            content: results
              .slice(0, 3)
              .map((r: { title: string; content?: string }) => `• ${r.title}`)
              .join('\n'),
            summary: `${results.length} new signals for "${topic.name}"`,
            priority: 'low',
            sourceType: 'market',
            sourceId: topic.id,
            metadata: { topicName: topic.name, resultCount: results.length },
          });
          insightsCreated++;
        }

        // Update lastCheckedAt
        await db.watchTopic.update({
          where: { id: topic.id },
          data: { lastCheckedAt: new Date() },
        }).catch(() => {});
      } catch (topicErr) {
        console.error(`[watch-topic] Failed to process topic ${topic.name}:`, topicErr);
      }
    }

    return { topicsProcessed: watchTopics.length, insightsCreated };
  } catch (err) {
    console.error('[watch-topic] Processing failed:', err);
    return { topicsProcessed: 0, insightsCreated: 0 };
  }
}

/**
 * Stub for data pipeline fetch.
 * Replace with actual call to the data pipeline service.
 */
async function fetchTopicData(query: string): Promise<Array<{ title: string; content?: string; url?: string }>> {
  try {
    const response = await fetch(
      `/api/market-research/search?q=${encodeURIComponent(query)}&limit=5`,
      { headers: { 'x-internal': 'cron' } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}
```

Note: Check if WatchTopic model has isActive, query, lastCheckedAt fields.
If field names differ from what is in schema.prisma, adjust to match exactly.
Do not add fields to the schema — work with what exists.

Files to create: src/lib/services/watch-topic-processor.ts

---

## Step 6 — Wire services into cron routes

For each cron route found in Step 0 pre-flight, add the appropriate
service call. Read each file first, then add the call after the
existing CRON_SECRET validation.

### src/app/api/cron/competitor-scan/route.ts (or similar name)

Add after auth check:
```typescript
import { processCompetitorFeed } from '@/lib/services/competitor-scorer';

// Inside POST handler, after CRON_SECRET check:
// Get all users with competitor tracking enabled
const usersWithCompetitors = await db.competitor.findMany({
  where: {},
  select: { userId: true },
  distinct: ['userId'],
});

const results = await Promise.allSettled(
  usersWithCompetitors.map((u) => processCompetitorFeed(u.userId))
);

const summary = results.map((r, i) =>
  r.status === 'fulfilled' ? r.value : { processed: 0, escalated: 0, error: String(r.reason) }
);

return NextResponse.json({ success: true, processed: summary });
```

### src/app/api/cron/strategy-eval/route.ts (or similar name)

Add after auth check:
```typescript
import { processDriftDetection } from '@/lib/services/drift-detector';

// Get all users with an AlignmentScore
const usersWithAlignment = await db.alignmentScore.findMany({
  where: {},
  select: { userId: true },
  distinct: ['userId'],
});

await Promise.allSettled(
  usersWithAlignment.map((u) => processDriftDetection(u.userId))
);

return NextResponse.json({ success: true, usersProcessed: usersWithAlignment.length });
```

### src/app/api/cron/market-pulse/route.ts (or similar name)

Add after auth check:
```typescript
import { processWatchTopics } from '@/lib/services/watch-topic-processor';

// Get all users with active WatchTopics
const usersWithTopics = await db.watchTopic.findMany({
  where: { isActive: true },
  select: { userId: true },
  distinct: ['userId'],
});

const results = await Promise.allSettled(
  usersWithTopics.map((u) => processWatchTopics(u.userId))
);

return NextResponse.json({ success: true, usersProcessed: usersWithTopics.length });
```

IMPORTANT: Read each cron file before modifying. If the file already
has business logic, add the new calls AFTER existing logic, not replacing it.
Show me each file before modifying.

---

## Step 7 — Create the insights API routes

Create src/app/api/insights/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/insights — get unread insights for current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'new';
  const limit = parseInt(searchParams.get('limit') || '10');
  const priority = searchParams.get('priority');

  const where: Record<string, unknown> = {
    userId: session.user.id,
    status,
  };
  if (priority) where.priority = priority;

  const [insights, total] = await Promise.all([
    db.proactiveInsight.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    }),
    db.proactiveInsight.count({ where }),
  ]);

  return NextResponse.json({ insights, total });
}
```

Create src/app/api/insights/[id]/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// PATCH /api/insights/[id] — update status (read, dismissed, actioned)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { status } = body;

  if (!['new', 'read', 'dismissed', 'actioned'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const insight = await db.proactiveInsight.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!insight) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await db.proactiveInsight.update({
    where: { id: params.id },
    data: { status },
  });

  return NextResponse.json(updated);
}
```

Files to create:
- src/app/api/insights/route.ts
- src/app/api/insights/[id]/route.ts

---

## Step 8 — Create the Today's Insights dashboard panel

Create src/components/dashboard/InsightsPanel.tsx

This component loads on the dashboard and shows unread proactive insights.

```typescript
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
  medium: 'warning',
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
```

Files to create: src/components/dashboard/InsightsPanel.tsx

---

## Step 9 — Add InsightsPanel to DashboardView

Read src/components/views/DashboardView.tsx

Find the top of the main content area (after any header/nav).
Import and add InsightsPanel as the first component rendered:

```typescript
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';

// Inside the return JSX, at the top of the main content:
<InsightsPanel />
```

Do not modify anything else in DashboardView.tsx.
Show me the exact lines before and after the change.

Files to modify: src/components/views/DashboardView.tsx

---

## Step 10 — Add insight count to notification bell

Read the notification bell / alert panel component.
Find where the unread count is calculated.

Add a fetch for unread insight count and include it in the total badge:

```typescript
const [insightCount, setInsightCount] = useState(0);

useEffect(() => {
  fetch('/api/insights?status=new&limit=1')
    .then((r) => r.json())
    .then((data) => setInsightCount(data.total ?? 0))
    .catch(() => {});
}, []);

// In the badge display, add insightCount to existing alert count:
const totalUnread = alertCount + insightCount;
```

Only add if there is an existing unread count badge.
If the notification system works differently, adapt accordingly.
Show me the relevant code before modifying.

---

## Step 11 — TypeScript check and full report

Run: npx tsc --noEmit

Then provide the full Sprint 3 report:

```
SPRINT 3 REPORT

SCHEMA CHANGES:
- [list model added and fields]

FILES CREATED:
- src/lib/services/insight-writer.ts
- src/lib/services/competitor-scorer.ts
- src/lib/services/drift-detector.ts
- src/lib/services/watch-topic-processor.ts
- src/app/api/insights/route.ts
- src/app/api/insights/[id]/route.ts
- src/components/dashboard/InsightsPanel.tsx

FILES MODIFIED:
- [list each file and what changed]

CRON ROUTES UPDATED:
- [list each route and which service was wired in]

TYPESCRIPT: [0 new errors / list any new errors]

MANUAL VERIFICATION STEPS:
1. Complete onboarding → check DB for ProactiveInsight records
2. Add a competitor → check competitor_scan creates insights
3. Dashboard → InsightsPanel visible with insights
4. Dismiss an insight → confirm it disappears
5. Manually trigger competitor-scan cron → check response

WHAT STILL NEEDS HUMAN ACTION:
- Redeploy Next.js app after this sprint: /deploy
- Manually trigger cron jobs from GCP console to verify end-to-end
```
