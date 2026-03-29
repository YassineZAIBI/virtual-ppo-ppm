---
name: ai-agents
description: Use when working on Azmyra's 6 Python FastAPI AI agents, autonomy level gating, MCP tool execution, pending actions workflow, or the cron job scheduler.
allowed-tools: Read, Grep, Glob
---

# AI Agents — Azmyra Agent System

## Architecture

```
Next.js API route
      │
      ▼
POST /api/agents/[agentType]
      │  { message, llmConfig, context, autonomyLevel }
      ▼
Python FastAPI :8100
      │
      ├─ Strategy Agent    — roadmap, initiative scoring, portfolio analysis
      ├─ Discovery Agent   — user research synthesis, insight extraction
      ├─ Risk Agent        — risk identification, severity scoring, mitigation
      ├─ Communications Agent — stakeholder updates, meeting summaries
      ├─ Advisor Agent     — recommendations, guidance on PM decisions
      └─ Thinker Agent     — deep analysis, scenario modeling
```

## Calling an Agent from Next.js

```typescript
// src/app/api/agents/[agentType]/route.ts
const agentResponse = await fetch(`${process.env.AGENT_SERVICE_URL}/agent/${agentType}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    llmConfig,           // from request body — never from DB
    context: {
      userId: session.user.id,
      initiativeId,
      // relevant context for the agent
    },
    autonomyLevel,       // 'full' | 'oversight' | 'advisory' | 'manual'
  }),
});
```

## Autonomy Level Gating

Before any write operation in an agent, check autonomy level:

```typescript
// src/lib/tools/ — MCP tool execution
async function executeWriteTool(tool: string, params: any, context: AgentContext) {
  if (context.autonomyLevel === 'oversight') {
    // Create a pending action for user approval
    await db.pendingAction.create({
      data: {
        userId: context.userId,
        tool,
        params: JSON.stringify(params),
        description: `Agent wants to: ${tool} — ${JSON.stringify(params).slice(0, 100)}`,
        status: 'pending',
      },
    });
    return { queued: true, message: 'Action queued for approval' };
  }

  if (context.autonomyLevel === 'advisory' || context.autonomyLevel === 'manual') {
    return { blocked: true, message: 'Write operations require Full or Oversight autonomy' };
  }

  // Full autonomy — execute
  return executeTool(tool, params);
}
```

## Pending Actions Flow

1. Agent generates a write action (Jira ticket, Slack message, email)
2. Autonomy check → `oversight` → creates `PendingAction` record
3. User sees it in the Pending Actions UI
4. User approves → action executed → `PendingAction.status = 'approved'`
5. User rejects → `PendingAction.status = 'rejected'`

## Cron Job System

Scheduled jobs: `competitor_scan`, `strategy_eval`, `risk_reassess`, `market_pulse`, `portfolio_review`

**Critical:** Cloud Run scales to zero. Cron jobs MUST be triggered by an external Cloud Scheduler HTTP call — they will never self-trigger. The job queue is DB-backed via `CronJob` and `CronRun` models.

```typescript
// Trigger pattern (from Cloud Scheduler → POST /api/cron/[jobType])
const session = await getServerSession(authOptions);
// OR use a shared secret header for Cloud Scheduler auth
const authHeader = req.headers.get('x-cron-secret');
if (authHeader !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

## MCP Tools Available to Agents

| Tool | Capability |
|------|-----------|
| Jira | Create/update issues, search projects |
| Confluence | Search and embed documents |
| Slack | Send messages to channels |
| Email | Send via SMTP |
| Zoom | Server-to-Server OAuth, bot join |
| Teams | Azure AD auth (requires M365 Business) |

## Gotchas

- **`AGENT_SERVICE_URL` is not set in production Cloud Run** — the Python service runs locally via docker-compose only. Don't assume it's reachable in prod.
- **Always pass `llmConfig` from the request body** — the agent service does not have access to user LLM settings.
- **Teams bot requires M365 Business** — personal Teams accounts will never work. Don't try to fix this at the API level.
- **Alert system** — `UserAlert` records are created by agents for market shifts, competitor moves, alignment drift. Check the schema before adding new alert types.
