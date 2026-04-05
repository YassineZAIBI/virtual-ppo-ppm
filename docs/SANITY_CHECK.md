# SANITY_CHECK.md — Azmyra Full Functionality Verification
# Version: 7 (updated after functional testing — Sprints BUGFIX, PERSONA, ARCHITECTURE, INTELLIGENCE)
#
# HOW TO USE:
# Run BEFORE a sprint:  baseline — expect 0 failures
# Run AFTER a sprint:   confirm nothing broke, new features work
#
# In Claude Code:
# "Read docs/SANITY_CHECK.md and run every check in order.
#  Label each: PASS / FAIL / SKIP (with reason).
#  Output the full Sanity Report at the end."
#
# NEVER fix during a sanity run. Record only. Fix with /fix-bug.

---

## Sprint status

- Sprint 0:            COMPLETE — 6 bugs + security fixes
- Sprint 1:            COMPLETE — BrainNode + agent memory
- Sprint 2:            COMPLETE — Python agents Cloud Run + cron
- Sprint 3:            COMPLETE — proactive intelligence
- Sprint 4:            COMPLETE — agent collaboration
- Sprint 5:            COMPLETE — integration depth
- Sprint Structure:    COMPLETE — project cleanup
- Sprint Bugfix:       COMPLETE — target group sync, chat scope, integration dedup
- Sprint Testing:      COMPLETE — 27 test files, 447 tests
- Sprint UI:           COMPLETE — loading/error/empty states, mobile, dark mode
- Sprint Persona:      COMPLETE — rich personas (JTBD, empathy, behavior), vision preview
- Sprint Architecture: COMPLETE — product verticals, vision-portfolio sync, Jira/Linear discovery
- Sprint Intelligence: QUEUED
- Sprint 6:            PARKED — meeting bot
- Sprint 7:            PARKED — self-hosted LLM

---

## PRE-CHECK

Run first, report before any checks:
1. grep -c "^model " prisma/schema.prisma
2. ls src/lib/services/ | sort
3. git status
4. git log --oneline -3
5. npm run build 2>&1 | tail -5

---

## BLOCK 1 — TypeScript & Build Health

### CHECK 1.1 — TypeScript compilation
Command: npx tsc --noEmit 2>&1
PASS: 0 new errors

### CHECK 1.2 — Production build
Command: npm run build 2>&1 | tail -30
PASS: Clean exit

### CHECK 1.3 — No relative imports
Command: grep -rn "from '\.\." src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test." | head -20
PASS: Zero results

### CHECK 1.4 — No direct PrismaClient
Command: grep -rn "new PrismaClient\|from '@prisma/client'" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "lib/db.ts"
PASS: Zero outside lib/db.ts

### CHECK 1.5 — No unguarded JSON access
Command: grep -rn "\.extractedFacts\.\|\.metadata\.\|\.payload\.\|\.reportMetadata\." src/ --include="*.ts" --include="*.tsx" | grep -v "JSON.parse\|JSON.stringify\|parseJSON\|includes\|split\|replace\|length\|default" | head -10
PASS: Zero

---

## BLOCK 2 — Authentication & Security

### CHECK 2.1 — All API routes have auth guards
Command: grep -rL "getServerSession" src/app/api/ --include="*.ts" | grep -v node_modules | head -20
PASS: transcript-callback is legitimately public (uses BOT_SECRET instead)

### CHECK 2.2 — No secrets in source
Command: grep -rn "sk-\|AKIA\|AIza\|ghp_\|xoxb-\|secret_\|lin_api_" src/ --include="*.ts" --include="*.tsx" | grep -v ".env\|node_modules\|test\|mock\|example\|placeholder"
PASS: Zero

### CHECK 2.3 — SSRF protection in vision extract
Command: grep -n "private\|169.254\|isPrivate\|validateUrl\|blockPrivate" src/app/api/vision/extract/route.ts
PASS: Validation present

### CHECK 2.4 — Credentials use encryption
Command: grep -rn "notionAccessToken\|linearApiKey\|githubAccessToken\|mixpanelSecret\|amplitudeApiKey\|jiraApiToken" src/ --include="*.ts" | grep -v "encrypt\|decrypt\|encryption\|middleware\|test\|node_modules\|schema\|types\|prisma\|SKILL"
PASS: Zero unencrypted access

### CHECK 2.5 — Cron routes validated
Command: grep -rn "x-cron-secret\|CRON_SECRET" src/app/api/cron/ --include="*.ts"
PASS: All cron routes validate secret

---

## BLOCK 3 — Database & Schema Health

### CHECK 3.1 — Schema model count
Command: grep -c "^model " prisma/schema.prisma
Record exact number. PASS: >= 40

### CHECK 3.2 — BrainNode unique constraint
Command: grep "userId_type_title" prisma/schema.prisma
PASS: @@unique with name "userId_type_title"

### CHECK 3.3 — IntegrationConnection unique
Command: grep "userId_integrationType" prisma/schema.prisma
PASS: @@unique([userId, integrationType])
SKIP: Sprint 5 not complete

### CHECK 3.4 — Prisma client current
Command: npx prisma generate 2>&1 | tail -5
PASS: No errors

### CHECK 3.5 — No schema drift
Command: npx prisma db push --dry-run 2>&1 | tail -10
PASS: No unexpected changes

---

## BLOCK 4 — Sprint 0/1 Core Features

### CHECK 4.1 — writeAgentMemory uses upsert
Command: grep "db.brainNode.upsert\|db.brainNode.create" src/lib/services/agent-memory-writer.ts
PASS: Only upsert found

### CHECK 4.2 — writeAgentMemory fire-and-forget
Command: grep -n "writeAgentMemory" src/app/api/chat/route.ts
PASS: .catch() present, no await on same line

### CHECK 4.3 — Chat route injects brain context
Command: grep "buildAgentContext\|brainContext" src/app/api/chat/route.ts
PASS: Both import and usage found

### CHECK 4.4 — Chat route has LLM fallback
Command: grep -n "fallback\|AGENT_SERVICE_URL\|catch" src/app/api/chat/route.ts | head -10
PASS: Both present

### CHECK 4.5 — All 5 onboarding routes write BrainNodes
Commands (all 5):
  grep -l "brainNode.upsert\|brainNode.create" src/app/api/vision/north-star/route.ts
  grep -l "brainNode.upsert\|brainNode.create" src/app/api/vision/business-goals/route.ts
  grep -l "brainNode.upsert\|brainNode.create" src/app/api/vision/target-groups/route.ts
  grep -l "brainNode.upsert\|brainNode.create" src/app/api/vision/needs/route.ts
  grep -l "brainNode.upsert\|brainNode.create" src/app/api/vision/products/route.ts
PASS: All 5 found

### CHECK 4.6 — Sprint 0 security: no error leakage
Command: grep -n "error.message\|err.message" src/app/api/competitors/route.ts
PASS: Zero raw error messages returned

---

## BLOCK 5 — Sprint 3/4/5 Features

### CHECK 5.1 — Insight writer deduplicates
Command: grep -n "findFirst\|yesterday\|24.*60.*60" src/lib/services/insight-writer.ts
PASS: Deduplication logic present

### CHECK 5.2 — Cron routes wired
Commands:
  grep -l "processCompetitorFeed" src/app/api/cron/competitor-scan/route.ts 2>/dev/null || echo MISSING
  grep -l "processDriftDetection" src/app/api/cron/strategy-eval/route.ts 2>/dev/null || echo MISSING
  grep -l "processWatchTopics" src/app/api/cron/market-pulse/route.ts 2>/dev/null || echo MISSING
PASS: All 3 wired

### CHECK 5.3 — runWorkflow exported
Command: grep "export.*runWorkflow" src/lib/services/agent-orchestrator.ts
PASS: Exported

### CHECK 5.4 — Integration API routes exist
Commands:
  grep "export async function POST" src/app/api/integrations/connect/route.ts
  grep "export async function GET" src/app/api/integrations/status/route.ts
  grep "export async function POST" src/app/api/integrations/disconnect/route.ts
PASS: All 3 found

---

## BLOCK 6 — Sprint Bugfix Verification

SKIP if Sprint Bugfix not complete.

### CHECK 6.1 — No default target groups for new users
Command: grep -n "TargetGroup\|targetGroup" prisma/seed.ts
PASS: Zero TargetGroup records seeded
FAIL: Any TargetGroup seed data found

### CHECK 6.2 — TargetGroup has @@unique userId+name
Command: grep "userId_name" prisma/schema.prisma
PASS: @@unique([userId, name]) found in TargetGroup model
FAIL: Missing — upsert in business-goals route will fail

### CHECK 6.3 — TargetGroup has source field
Command: grep "source.*@default.*manual" prisma/schema.prisma
PASS: source field with @default("manual") found
FAIL: Missing

### CHECK 6.4 — Business goals route syncs target groups
Command: grep -n "targetGroup.upsert\|targetGroup.create" src/app/api/vision/business-goals/route.ts
PASS: Upsert found (not create — must be upsert)
FAIL: Missing sync

### CHECK 6.5 — Chat sessions scoped to user
Command: grep -n "userId.*session.user.id" src/app/api/chat/ -r | grep "chatSession\|ChatSession" | head -5
PASS: userId scope found in all chat session queries
FAIL: Missing scope — history leaks across users

### CHECK 6.6 — Settings shows integration summary not duplicate form
Command: grep -n "IntegrationsHub\|ConnectionStatusSummary\|Manage integrations" src/components/views/SettingsView.tsx
PASS: Summary card found (not full form)
FAIL: Full credential forms still in Settings

---

## BLOCK 7 — Sprint Persona Verification

SKIP if Sprint Persona not complete.

### CHECK 7.1 — TargetGroup has JTBD fields
Command: grep -n "jtbdStatement\|jtbdFunctional\|jtbdEmotional" prisma/schema.prisma
PASS: All 3 found
FAIL: Missing — persona enrichment will fail silently

### CHECK 7.2 — TargetGroup has empathy map fields
Command: grep -n "empathyThinks\|empathySays\|empathyFeels\|empathyDoes" prisma/schema.prisma
PASS: All 4 found
FAIL: Missing

### CHECK 7.3 — TargetGroup has behavioral fields
Command: grep -n "triggers\|decisionDrivers\|currentWorkarounds\|dayInLife\|typicalQuote" prisma/schema.prisma
PASS: All 5 found
FAIL: Any missing

### CHECK 7.4 — persona-enricher service exported
Command: grep "export.*enrichPersona" src/lib/services/persona-enricher.ts
PASS: Exported
FAIL: Missing

### CHECK 7.5 — Enrich route exists and authenticated
Command: grep "export async function POST\|getServerSession" src/app/api/vision/target-groups/\[id\]/enrich/route.ts
PASS: Both found
FAIL: Missing or unauthenticated

### CHECK 7.6 — Vision preview route does NOT write to DB
Command: grep -n "db\.\|prisma\." src/app/api/vision/preview/route.ts
PASS: Zero DB writes — preview is read-only
FAIL: DB writes found — preview would corrupt data

### CHECK 7.7 — VisionPreviewModal component exists
Command: grep "export.*VisionPreviewModal" src/components/vision/VisionPreviewModal.tsx
PASS: Exported
FAIL: Missing

### CHECK 7.8 — TargetGroupCard has 4 tabs
Command: grep -n "JTBD\|Empathy\|Behavior\|Overview" src/components/vision/TargetGroupCard.tsx | head -5
PASS: All 4 tab labels found
FAIL: Missing tabs — still showing basic card

### CHECK 7.9 — JSON parse safety on new persona fields
Command: grep -n "jtbdFunctional\|empathyThinks\|triggers" src/components/vision/TargetGroupCard.tsx | grep -v "JSON.parse\|parseJSON" | head -5
PASS: Zero raw access (all via parseJSON or JSON.parse)
FAIL: Raw access found — will crash on empty string default

---

## BLOCK 8 — Sprint Architecture Verification

SKIP if Sprint Architecture not complete.

### CHECK 8.1 — ProductVertical model exists
Command: grep -A5 "model ProductVertical" prisma/schema.prisma
PASS: Model with userId, name, status, initiatives relation
FAIL: Missing

### CHECK 8.2 — ProductVertical @@unique userId+name
Command: grep "userId_name" prisma/schema.prisma
PASS: Found in ProductVertical (may also be in TargetGroup from Bugfix)
FAIL: Missing — vision sync upsert will fail

### CHECK 8.3 — Initiative has verticalId
Command: grep "verticalId" prisma/schema.prisma
PASS: Optional FK found in Initiative model
FAIL: Missing — verticals cannot contain initiatives

### CHECK 8.4 — Vision products route creates ProductVerticals
Command: grep -n "productVertical.upsert\|productVertical.create" src/app/api/vision/products/route.ts
PASS: Upsert found (fire-and-forget)
FAIL: Missing — Vision products never appear in Portfolio

### CHECK 8.5 — Verticals API routes exist
Commands:
  grep "export async function GET" src/app/api/verticals/route.ts
  grep "export async function POST" src/app/api/verticals/route.ts
PASS: Both found
FAIL: Missing

### CHECK 8.6 — Jira discovery route exists and authenticated
Command: grep "export async function POST\|getServerSession" src/app/api/integrations/jira/discover/route.ts
PASS: Both found
FAIL: Missing or unauthenticated

### CHECK 8.7 — ProductVerticalsView component exists
Command: grep "export function ProductVerticalsView" src/components/views/ProductVerticalsView.tsx
PASS: Exported
FAIL: Missing

### CHECK 8.8 — Verticals in sidebar navigation
Command: grep -r "verticals\|Verticals\|Product Verticals" src/components/layout/Sidebar.tsx
PASS: Nav item found
FAIL: Not added — users cannot navigate to verticals

---

## BLOCK 9 — Sprint Intelligence Verification

SKIP if Sprint Intelligence not complete.

### CHECK 9.1 — DataPoint has freshness fields
Command: grep -n "freshnessScore\|publishedAt\|compositeScore\|isNew\|changeType" src/lib/services/data-pipeline/types.ts
PASS: All 5 fields found in DataPoint interface
FAIL: Any missing — freshness scoring silently skipped

### CHECK 9.2 — freshness.ts exists and exports
Command: grep "export.*calculateFreshness\|export.*SOURCE_QUALITY_TIERS\|export.*calculateCompositeScore" src/lib/services/data-pipeline/freshness.ts
PASS: All 3 exports found
FAIL: Missing

### CHECK 9.3 — DuckDuckGo adapter supports date range
Command: grep -n "dateRange\|df=m\|df=w\|df=y" src/lib/services/data-pipeline/adapters/duckduckgo.ts
PASS: dateRange parameter and df= URL param found
FAIL: Missing — adapter still returns decade-old results

### CHECK 9.4 — Competitor queries are year-qualified
Command: grep -n "currentYear\|new Date().getFullYear\|${.*Year}" src/lib/services/data-pipeline/competitor-queries.ts
PASS: Year injection found
FAIL: Missing — queries return stale results

### CHECK 9.5 — Cache TTL reduced for competitor data
Command: grep -n "3600\|7200\|competitor" src/lib/services/data-pipeline/cache.ts
PASS: 3600 or 7200 found for competitor-related cache keys
FAIL: Only 86400 found — competitor data cached for 24h

### CHECK 9.6 — Competitor-site adapter has change detection
Command: grep -n "hashContent\|isNew\|changeType\|HIGH_SIGNAL_PATHS" src/lib/services/data-pipeline/adapters/competitor-site.ts
PASS: Change detection logic found
FAIL: Missing — no delta between scans

### CHECK 9.7 — Competitor feed UI shows freshness badge
Command: grep -n "freshnessScore\|freshness.*badge\|isNew\|changeType" src/components/competitors/CompetitorFeedItem.tsx
PASS: Freshness display found
FAIL: Missing — users see no age indicator on results

### CHECK 9.8 — Feed default filter is "last month" not "all time"
Command: grep -n "month.*default\|default.*month\|dateRange.*month" src/components/competitors/ -r
PASS: Default date filter is "month" or "last month"
FAIL: Default is "all" — old results dominate on first load

---

## BLOCK 10 — File Structure (Sprint Structure)

### CHECK 10.1 — Sprint files moved to docs/sprints/
Command: ls docs/sprints/ | head -10
PASS: Sprint files found in docs/sprints/
FAIL: Sprint files still at project root

### CHECK 10.2 — CLAUDE.md sprint location documented
Command: grep "docs/sprints" CLAUDE.md
PASS: Location reference found
FAIL: Missing

### CHECK 10.3 — Legacy middleware removed
Command: ls src/lib/prisma-encryption-middleware.ts 2>/dev/null && echo "EXISTS" || echo "REMOVED"
PASS: REMOVED
FAIL: EXISTS — legacy file still present

### CHECK 10.4 — /test-all command exists
Command: cat .claude/commands/test-all.md | head -3
PASS: File exists
FAIL: Missing

### CHECK 10.5 — /ui-audit command exists
Command: cat .claude/commands/ui-audit.md | head -3
PASS: File exists
FAIL: Missing

---

## SANITY REPORT FORMAT

```
═══════════════════════════════════════════════════════════
AZMYRA SANITY REPORT
Run type:     PRE-SPRINT [name] / POST-SPRINT [name]
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
TypeScript:    [0 new / N new errors]
Build:         [PASS / FAIL]
Schema models: [N]

FAILURES  (fix all before proceeding)
───────────────────────────────────────────────────────────
[CHECK X.X] [name]
  Found:   [exact output]
  Fix:     [one-line description]
  Command: /fix-bug [description]

SPRINT READINESS
───────────────────────────────────────────────────────────
PRE-SPRINT:   [✅ READY / ❌ BLOCKED — fix: list]
POST-SPRINT:  [✅ READY TO DEPLOY / ❌ BLOCKED — fix: list]
```

---

## REGRESSION FAST-CHECK (2 minutes, pre-deploy only)

Run only: CHECK 1.1, CHECK 1.2, CHECK 2.1, CHECK 4.2, CHECK 4.4
Report PASS/FAIL. Stop if any FAIL.
