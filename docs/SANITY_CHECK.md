# SANITY_CHECK.md — Azmyra Full Functionality Verification
# Version: 6 (updated after Sprint 6)
#
# HOW TO USE:
# "Read SANITY_CHECK.md and run every check in order.
#  Label each result: PASS / FAIL / SKIP (with reason).
#  At the end, output the full Sanity Report in the format specified."
#
# IMPORTANT: Never fix during a sanity check. Record only. Fix with /fix-bug.

---

## Context

Azmyra — Next.js 16 + Python FastAPI PM SaaS.
Live: https://ai.theproductowner.org | GCP: theproductowner-8620d

Sprint status (update before each run):
- Sprint 0: COMPLETE  - Sprint 1: COMPLETE  - Sprint 2: COMPLETE
- Sprint 3: COMPLETE  - Sprint 4: COMPLETE  - Sprint 5: COMPLETE
- Sprint 6: IN PROGRESS (Meeting Bot VM + Faster-Whisper)

---

## PRE-CHECK

1. grep -c "^model " prisma/schema.prisma
2. ls src/lib/services/ | sort
3. git status && git log --oneline -3
4. npm run build 2>&1 | tail -5

---

## BLOCK 1 — TypeScript & Build Health

### CHECK 1.1 — TypeScript compilation
Command: npx tsc --noEmit 2>&1
PASS: 0 new errors  FAIL: New errors introduced

### CHECK 1.2 — Production build
Command: npm run build 2>&1 | tail -30
PASS: Clean exit  FAIL: New errors

### CHECK 1.3 — No relative imports
Command: grep -rn "from '\.\." src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test." | head -20
PASS: Zero  FAIL: Any found

### CHECK 1.4 — No direct PrismaClient imports
Command: grep -rn "new PrismaClient\|from '@prisma/client'" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "lib/db.ts"
PASS: Zero  FAIL: Any found

### CHECK 1.5 — No unguarded JSON field access
Command: grep -rn "\.extractedFacts\.\|\.metadata\.\|\.payload\.\|\.transcriptChunks\.\|\.autoActionItems\." src/ --include="*.ts" --include="*.tsx" | grep -v "JSON.parse\|JSON.stringify\|parseJSON\|includes\|split\|replace\|length\|default" | head -10
PASS: Zero  FAIL: Any found

---

## BLOCK 2 — Authentication & Security

### CHECK 2.1 — All API routes have auth guards
Command: grep -rL "getServerSession" src/app/api/ --include="*.ts" | grep -v node_modules | head -20
PASS: All unprotected routes explicitly public (transcript uses BOT_SECRET)
FAIL: Unguarded routes without justification

### CHECK 2.2 — No secrets in source code
Command: grep -rn "sk-\|AKIA\|AIza\|ghp_\|xoxb-\|secret_\|lin_api_" src/ --include="*.ts" --include="*.tsx" | grep -v ".env\|node_modules\|test\|mock\|example\|placeholder"
PASS: Zero  FAIL: Hardcoded tokens found

### CHECK 2.3 — SSRF protection in vision extract
Command: grep -n "private\|169.254\|isPrivate\|validateUrl\|blockPrivate" src/app/api/vision/extract/route.ts
PASS: Validation present  FAIL: Missing

### CHECK 2.4 — Credentials use encryption
Command: grep -rn "notionAccessToken\|linearApiKey\|githubAccessToken\|jiraApiToken\|slackBotToken" src/ --include="*.ts" | grep -v "encrypt\|decrypt\|encryption\|middleware\|test\|node_modules\|schema\|types\|SKILL\|prisma"
PASS: Zero unencrypted access  FAIL: Raw access found

### CHECK 2.5 — Transcript callback uses BOT_SECRET not session (Sprint 6)
Command: grep -n "BOT_SECRET\|x-bot-secret" src/app/api/meetings/bot/transcript/route.ts
PASS: BOT_SECRET validation found
FAIL: Missing — VM can call transcript without any auth
SKIP: Sprint 6 not complete

### CHECK 2.6 — Cron routes have secret validation
Command: grep -rn "x-cron-secret\|CRON_SECRET" src/app/api/cron/ --include="*.ts"
PASS: All validated  FAIL: Any missing

---

## BLOCK 3 — Database & Schema Health

### CHECK 3.1 — Schema model count
Command: grep -c "^model " prisma/schema.prisma
PASS: Count >= 42 (40 Sprint 5 + BotSession + any Sprint 6 additions)
FAIL: Lower than expected

### CHECK 3.2 — BrainNode unique constraint
Command: grep "userId_type_title" prisma/schema.prisma
PASS: @@unique with name "userId_type_title"  FAIL: Missing

### CHECK 3.3 — ProactiveInsight model
Command: grep -c "ProactiveInsight" prisma/schema.prisma
PASS: Count >= 2  FAIL: Missing  SKIP: Sprint 3 not complete

### CHECK 3.4 — AgentMessage model
Command: grep -c "AgentMessage" prisma/schema.prisma
PASS: Count >= 2  FAIL: Missing  SKIP: Sprint 4 not complete

### CHECK 3.5 — IntegrationConnection model
Command: grep "userId_integrationType" prisma/schema.prisma
PASS: @@unique found  FAIL: Missing  SKIP: Sprint 5 not complete

### CHECK 3.6 — BotSession model (Sprint 6)
Command: grep -A6 "model BotSession" prisma/schema.prisma
PASS: Model with platform, status, vmSessionId, transcriptChunks
FAIL: Missing  SKIP: Sprint 6 not complete

### CHECK 3.7 — Meeting model has bot fields (Sprint 6)
Command: grep -n "botStatus\|botPlatform\|rawTranscript\|autoSummary\|autoActionItems" prisma/schema.prisma
PASS: All 5 fields found in Meeting model
FAIL: Missing  SKIP: Sprint 6 not complete

### CHECK 3.8 — Prisma client current
Command: npx prisma generate 2>&1 | tail -5
PASS: No errors  FAIL: Generation failed

### CHECK 3.9 — No schema drift
Command: npx prisma db push --dry-run 2>&1 | tail -10
PASS: No unexpected changes  FAIL: Drift detected

---

## BLOCK 4 — Core Sprint 1 Features

### CHECK 4.1 — buildAgentContext service
Command: grep "export.*buildAgentContext" src/lib/services/agent-context.ts
PASS: Exported  FAIL: Missing

### CHECK 4.2 — writeAgentMemory uses upsert
Command: grep "db.brainNode.upsert\|db.brainNode.create" src/lib/services/agent-memory-writer.ts
PASS: Only upsert  FAIL: create found

### CHECK 4.3 — writeAgentMemory is fire-and-forget
Command: grep -n "writeAgentMemory" src/app/api/chat/route.ts
PASS: .catch() present, no await on call line  FAIL: await found

### CHECK 4.4 — Chat route injects brain context
Command: grep "buildAgentContext\|brainContext" src/app/api/chat/route.ts
PASS: Import and usage found  FAIL: Missing

### CHECK 4.5 — Chat route has fallback LLM path
Command: grep -n "fallback\|AGENT_SERVICE_URL\|catch" src/app/api/chat/route.ts | head -10
PASS: Both present  FAIL: No fallback

### CHECK 4.6 — All 5 onboarding routes write BrainNodes
Commands (all must find the file):
  grep -l "brainNode.upsert\|brainNode.create" src/app/api/vision/north-star/route.ts
  grep -l "brainNode.upsert\|brainNode.create" src/app/api/vision/business-goals/route.ts
  grep -l "brainNode.upsert\|brainNode.create" src/app/api/vision/target-groups/route.ts
  grep -l "brainNode.upsert\|brainNode.create" src/app/api/vision/needs/route.ts
  grep -l "brainNode.upsert\|brainNode.create" src/app/api/vision/products/route.ts
PASS: All 5  FAIL: Any missing

---

## BLOCK 5 — Sprint 0 Regressions

### CHECK 5.1 — ENTITY_ROUTE_MAP uses entity IDs
Command: grep -A12 "ENTITY_ROUTE_MAP" src/components/alerts/AlertPanel.tsx | grep "id =>"
PASS: id used  FAIL: id ignored

### CHECK 5.2 — parseTags in utils
Command: grep "export.*parseTags" src/lib/utils.ts
PASS: Exported  FAIL: Missing

### CHECK 5.3 — Rollback error shows toast
Command: grep -n "toast\|setError" src/components/views/InitiativesPipeline.tsx | grep -i "rollback\|refetch\|catch" | head -5
PASS: Toast found  FAIL: Silent catch

### CHECK 5.4 — No error leakage in competitors route
Command: grep -n "error.message\|err.message" src/app/api/competitors/route.ts
PASS: Zero  FAIL: Raw message returned

---

## BLOCK 6 — Sprint 3: Proactive Intelligence

Skip if Sprint 3 not complete.

### CHECK 6.1 — ProactiveInsight API routes
Command: ls src/app/api/insights/
PASS: route.ts and [id]/route.ts present  FAIL: Missing

### CHECK 6.2 — Insight writer deduplication
Command: grep -n "findFirst\|yesterday\|24.*60.*60" src/lib/services/insight-writer.ts
PASS: Logic found  FAIL: Missing

### CHECK 6.3 — Insight writer never throws
Command: grep -n "try\|catch" src/lib/services/insight-writer.ts
PASS: try/catch found  FAIL: Missing

### CHECK 6.4 — Competitor scorer threshold = 4
Command: grep "ESCALATION_THRESHOLD" src/lib/services/competitor-scorer.ts
PASS: = 4  FAIL: Wrong

### CHECK 6.5 — Drift detector thresholds 65 and 50
Command: grep "DRIFT_THRESHOLD\|SEVERE_DRIFT_THRESHOLD" src/lib/services/drift-detector.ts
PASS: 65 and 50  FAIL: Wrong

### CHECK 6.6 — Cron routes wired
Commands:
  grep -l "processCompetitorFeed" src/app/api/cron/competitor-scan/route.ts 2>/dev/null || echo "MISSING"
  grep -l "processDriftDetection" src/app/api/cron/strategy-eval/route.ts 2>/dev/null || echo "MISSING"
  grep -l "processWatchTopics" src/app/api/cron/market-pulse/route.ts 2>/dev/null || echo "MISSING"
PASS: All 3  FAIL: Any MISSING

### CHECK 6.7 — InsightsPanel on dashboard
Command: grep "InsightsPanel" src/components/views/DashboardView.tsx
PASS: Used  FAIL: Missing

---

## BLOCK 7 — Sprint 4: Agent Collaboration

Skip if Sprint 4 not complete.

### CHECK 7.1 — AgentMessage fields complete
Command: grep -A5 "model AgentMessage" prisma/schema.prisma
PASS: workflowId, fromAgent, toAgent, stepIndex, payload present
FAIL: Missing fields

### CHECK 7.2 — Workflow definitions exported
Command: grep "export const WORKFLOW_DEFINITIONS" src/lib/services/workflow-definitions.ts
PASS: Exported  FAIL: Missing

### CHECK 7.3 — Correct workflow step count
Command: grep -c "promptTemplate" src/lib/services/workflow-definitions.ts
PASS: Count = 7  FAIL: Wrong

### CHECK 7.4 — Orchestrator exports runWorkflow
Command: grep "export.*runWorkflow" src/lib/services/agent-orchestrator.ts
PASS: Exported  FAIL: Missing

### CHECK 7.5 — Autonomy gating in orchestrator
Command: grep -n "autonomyLevel\|oversight\|manual\|PendingAction" src/lib/services/agent-orchestrator.ts
PASS: All 4 levels handled  FAIL: No gating

### CHECK 7.6 — Workflow API routes exist
Commands:
  grep "export async function POST" src/app/api/agents/workflow/route.ts
  grep "export async function GET" src/app/api/agents/workflow/history/route.ts
PASS: Both found  FAIL: Missing

### CHECK 7.7 — WorkflowLauncher in initiative view
Command: grep -r "WorkflowLauncher" src/components/ --include="*.tsx" | grep -v "WorkflowLauncher.tsx"
PASS: Used  FAIL: Never added to UI

---

## BLOCK 8 — Sprint 5: Integration Depth

Skip if Sprint 5 not complete.

### CHECK 8.1 — IntegrationConnection model
Command: grep -A8 "model IntegrationConnection" prisma/schema.prisma
PASS: integrationType, status, lastSyncAt present  FAIL: Missing

### CHECK 8.2 — New credential fields in UserSettingsRecord
Command: grep "notionAccessToken\|linearApiKey\|githubAccessToken\|mixpanelSecret\|amplitudeApiKey" prisma/schema.prisma
PASS: All 5  FAIL: Any missing

### CHECK 8.3 — Notion service exports
Command: grep "export.*searchNotion\|export.*ingestNotionPages\|export.*createNotionPage" src/lib/services/notion.ts
PASS: All 3  FAIL: Missing

### CHECK 8.4 — Notion timeouts
Command: grep -c "AbortSignal.timeout" src/lib/services/notion.ts
PASS: Count >= 3  FAIL: Missing — calls can hang

### CHECK 8.5 — Linear service exports
Command: grep "export.*searchLinearIssues\|export.*createLinearIssue\|export.*getLinearTeams" src/lib/services/linear.ts
PASS: All 3  FAIL: Missing

### CHECK 8.6 — GitHub service exports
Command: grep "export.*getGitHubRepos\|export.*createGitHubIssue\|export.*getGitHubPRs" src/lib/services/github.ts
PASS: All 3  FAIL: Missing

### CHECK 8.7 — Jira bidirectional write functions
Command: grep "export.*createJiraIssue\|export.*transitionJiraIssue\|export.*addJiraComment\|export.*closeJiraIssue" src/lib/services/jira.ts
PASS: All 4  FAIL: Jira still read-only

### CHECK 8.8 — Integration API routes
Commands:
  grep "export async function POST" src/app/api/integrations/connect/route.ts
  grep "export async function GET" src/app/api/integrations/status/route.ts
  grep "export async function POST" src/app/api/integrations/disconnect/route.ts
  grep "export async function POST" src/app/api/integrations/notion/ingest/route.ts
PASS: All 4  FAIL: Any missing

### CHECK 8.9 — IntegrationsHubView and page
Commands:
  grep "export function IntegrationsHubView" src/components/views/IntegrationsHubView.tsx
  cat src/app/integrations/page.tsx | head -3
PASS: Both present  FAIL: Missing

### CHECK 8.10 — Integrations in sidebar
Command: grep -r "integrations\|Integrations" src/components/layout/ --include="*.tsx" | grep -v node_modules | head -5
PASS: Nav item found  FAIL: Not added

### CHECK 8.11 — Connect route uses Zod
Command: grep "z.enum\|safeParse" src/app/api/integrations/connect/route.ts
PASS: Zod found  FAIL: No validation

---

## BLOCK 9 — Sprint 6: Meeting Bot

Skip this block if Sprint 6 is not complete.

### CHECK 9.1 — BotSession model in schema
Command: grep -A6 "model BotSession" prisma/schema.prisma
PASS: platform, status, vmSessionId, transcriptChunks all present
FAIL: Missing or incomplete

### CHECK 9.2 — Meeting model has bot fields
Command: grep -c "botStatus\|botPlatform\|rawTranscript\|autoSummary\|autoActionItems\|autoDecisions" prisma/schema.prisma
PASS: Count >= 6
FAIL: Missing fields — transcript processing has nowhere to write

### CHECK 9.3 — bot-service.ts exports all 5 functions
Command: grep "export.*joinMeeting\|export.*leaveMeeting\|export.*getBotStatus\|export.*checkBotHealth\|export.*detectPlatform" src/lib/services/bot-service.ts
PASS: All 5 exported
FAIL: Any missing

### CHECK 9.4 — checkBotHealth never throws
Command: grep -A8 "checkBotHealth" src/lib/services/bot-service.ts | grep "try\|catch\|false"
PASS: try/catch with return false found
FAIL: Missing — one unreachable bot URL breaks the join flow

### CHECK 9.5 — Bot join route validates with Zod
Command: grep "z.string\|safeParse" src/app/api/meetings/bot/join/route.ts
PASS: Zod validation found
FAIL: No validation

### CHECK 9.6 — Bot join checks health before proceeding
Command: grep "checkBotHealth" src/app/api/meetings/bot/join/route.ts
PASS: Health check called, returns 503 if unhealthy
FAIL: Missing — join attempt on dead VM gives cryptic error

### CHECK 9.7 — Transcript callback validated by BOT_SECRET
Command: grep "BOT_SECRET\|x-bot-secret" src/app/api/meetings/bot/transcript/route.ts
PASS: Secret validation present
FAIL: Missing — anyone can POST fake transcripts

### CHECK 9.8 — Transcript route has NO user session auth
Command: grep "getServerSession" src/app/api/meetings/bot/transcript/route.ts
PASS: getServerSession NOT found (VM has no user session)
FAIL: Session auth present — VM cannot call this route

### CHECK 9.9 — processMeetingTranscript is fire-and-forget
Command: grep -n "processMeetingTranscript" src/app/api/meetings/bot/transcript/route.ts
PASS: Called with .catch() and no await
FAIL: await found — blocks transcript callback response

### CHECK 9.10 — Decisions written to BrainNode in transcript processor
Command: grep "brainNode.upsert\|brainNode.create" src/app/api/meetings/bot/transcript/route.ts
PASS: BrainNode upsert found (type: "decision", source: "meeting")
FAIL: Missing — meeting decisions not stored in company brain

### CHECK 9.11 — Bot leave route exists
Command: grep "export async function POST" src/app/api/meetings/bot/leave/route.ts
PASS: POST handler found
FAIL: Missing — bot cannot be stopped from UI

### CHECK 9.12 — Bot status route exists
Command: grep "export async function GET" src/app/api/meetings/bot/status/[sessionId]/route.ts 2>/dev/null || grep "export async function GET" "src/app/api/meetings/bot/status/[sessionId]/route.ts" 2>/dev/null || echo "CHECK MANUALLY"
PASS: GET handler found
FAIL: Missing — UI cannot poll bot status

### CHECK 9.13 — Bot Join UI added to meeting view
Command: grep -r "handleBotJoin\|botSessionId\|Join with bot" src/components/ --include="*.tsx" | head -5
PASS: Bot join logic found in a component
FAIL: UI never added — feature unusable

### CHECK 9.14 — meeting-bot/app.py uses Playwright not Zoom SDK
Command: grep -n "playwright\|Playwright\|ZoomSDK\|zoom_sdk\|zoomsdk" meeting-bot/app.py | head -10
PASS: playwright import found, no Zoom SDK reference
FAIL: Still uses Zoom SDK OR no playwright reference

### CHECK 9.15 — meeting-bot/app.py has all 4 endpoints
Commands:
  grep "@app.get.*health" meeting-bot/app.py
  grep "@app.post.*join" meeting-bot/app.py
  grep "@app.post.*leave" meeting-bot/app.py
  grep "@app.get.*status" meeting-bot/app.py
PASS: All 4 found
FAIL: Any missing

### CHECK 9.16 — Dockerfile.bot exists
Command: cat Dockerfile.bot | head -3
PASS: File exists with FROM python base
FAIL: Missing — cannot build bot container

### CHECK 9.17 — BOT_SERVICE_URL and BOT_SECRET in .env.example
Command: grep "BOT_SERVICE_URL\|BOT_SECRET" .env.example
PASS: Both documented
FAIL: Missing — devs won't know these are needed

### CHECK 9.18 — bot-service.ts has timeout on all fetch calls
Command: grep -c "AbortSignal.timeout" src/lib/services/bot-service.ts
PASS: Count >= 3 (one per fetch call)
FAIL: Missing — hung VM request blocks the API route indefinitely

---

## BLOCK 10 — File Structure & Configuration

### CHECK 10.1 — CLAUDE.md at project root
Command: cat CLAUDE.md | head -5
PASS: Exists  FAIL: Missing

### CHECK 10.2 — .claude/ directory complete
Command: ls .claude/agents/ .claude/commands/ .claude/hooks/ .claude/skills/
PASS: All 4 with files  FAIL: Any missing

### CHECK 10.3 — All agent files present
Command: ls .claude/agents/
PASS: code-reviewer.md, feature-builder.md, db-migration.md, orchestrator.md
FAIL: Any missing

### CHECK 10.4 — skill-eval hook executable
Command: ls -la .claude/hooks/skill-eval.sh
PASS: Execute bit set  FAIL: Not executable

### CHECK 10.5 — .env.example up to date
Command: grep -c "=" .env.example
PASS: Count >= 17 (grows each sprint: BOT_SERVICE_URL + BOT_SECRET added)
Record: exact count

---

## BLOCK 11 — Services Health Inventory

### CHECK 11.1 — Sprint 1 services
Commands:
  grep "export.*buildAgentContext" src/lib/services/agent-context.ts
  grep "export.*writeAgentMemory" src/lib/services/agent-memory-writer.ts
  grep "export.*saveCompanyBrain\|loadCompanyBrain" src/lib/services/company-brain.ts
PASS: All 3

### CHECK 11.2 — Sprint 3 services
Commands:
  grep "export.*writeInsight" src/lib/services/insight-writer.ts
  grep "export.*processCompetitorFeed" src/lib/services/competitor-scorer.ts
  grep "export.*processDriftDetection" src/lib/services/drift-detector.ts
  grep "export.*processWatchTopics" src/lib/services/watch-topic-processor.ts
PASS: All 4  SKIP: Sprint 3 not complete

### CHECK 11.3 — Sprint 4 services
Commands:
  grep "export.*runWorkflow" src/lib/services/agent-orchestrator.ts
  grep "export const WORKFLOW_DEFINITIONS" src/lib/services/workflow-definitions.ts
PASS: Both  SKIP: Sprint 4 not complete

### CHECK 11.4 — Sprint 5 services
Commands:
  grep "export.*ingestNotionPages" src/lib/services/notion.ts
  grep "export.*createLinearIssue" src/lib/services/linear.ts
  grep "export.*createGitHubIssue" src/lib/services/github.ts
  grep "export.*createJiraIssue" src/lib/services/jira.ts
PASS: All 4  SKIP: Sprint 5 not complete

### CHECK 11.5 — Sprint 6 services (Sprint 6)
Commands:
  grep "export.*joinMeeting\|export.*checkBotHealth" src/lib/services/bot-service.ts
PASS: Exported  FAIL: Missing  SKIP: Sprint 6 not complete

---

## SANITY REPORT FORMAT

```
═══════════════════════════════════════════════════════════
AZMYRA SANITY REPORT
Run type:     PRE-SPRINT [N] / POST-SPRINT [N]
Date:         [today]
Last commit:  [git log --oneline -1]
Schema count: [N models]
Services:     [N files in src/lib/services/]
═══════════════════════════════════════════════════════════

SUMMARY
───────────────────────────────────────────────────────────
Total checks:  [N]
PASS:          [N]
FAIL:          [N]   ← must be 0 before starting sprint
SKIP:          [N]

BUILD HEALTH
───────────────────────────────────────────────────────────
TypeScript:    [0 new / N new]
Build:         [PASS / FAIL]
Schema models: [N]

FAILURES  (fix all before proceeding)
───────────────────────────────────────────────────────────
[CHECK X.X] [name]
  Found:   [exact output]
  Fix:     [one-line]
  Command: /fix-bug [description]

WARNINGS  SKIPPED  PRE-EXISTING
───────────────────────────────────────────────────────────
[list each category]

SPRINT READINESS
───────────────────────────────────────────────────────────
PRE-SPRINT:   [✅ READY / ❌ BLOCKED]
POST-SPRINT:  [✅ READY TO DEPLOY / ❌ BLOCKED]
```

---

## REGRESSION FAST-CHECK (pre-deploy, 2 minutes)

```
Run only the regression fast-check from SANITY_CHECK.md:
CHECK 1.1, CHECK 1.2, CHECK 2.1, CHECK 4.3, CHECK 4.5, CHECK 5.1
Report PASS/FAIL. Stop if any FAIL.
```

## TARGETED RE-RUN

```
Re-run only these checks from SANITY_CHECK.md and report PASS/FAIL:
CHECK X.X, CHECK Y.Y
```
