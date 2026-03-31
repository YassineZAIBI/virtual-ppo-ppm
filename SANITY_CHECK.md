# SANITY_CHECK.md — Azmyra Full Functionality Verification
#
# HOW TO USE:
# Run BEFORE a sprint:  establishes baseline, flags pre-existing issues
# Run AFTER a sprint:   confirms nothing broke, verifies new features work
#
# In Claude Code, type exactly:
# "Read SANITY_CHECK.md and run every check in order.
#  Label each result: PASS / FAIL / SKIP (with reason).
#  At the end, output the full Sanity Report in the format specified."
#
# IMPORTANT: Never fix issues during a sanity check run.
# Record failures only. Fix in a separate session.

---

## Context

Azmyra is a Next.js 16 + Python FastAPI PM SaaS.
Live URL: https://ai.theproductowner.org
GCP Project: theproductowner-8620d

Sprint completion status (update this before each run):
- Sprint 0: COMPLETE (6 bugs + security fixes)
- Sprint 1: COMPLETE (BrainNode graph + agent memory)
- Sprint 2: IN PROGRESS (Python agents to Cloud Run)
- Sprint 3: NOT STARTED

---

## PRE-CHECK: Read these files before running any checks

1. prisma/schema.prisma — count total models
2. src/app/api/ — count total route files
3. package.json — confirm Next.js version
4. Run: git status (confirm no uncommitted changes that could affect results)
5. Run: git log --oneline -3 (record last 3 commits)

Report findings. Then proceed to checks.

---

## BLOCK 1 — TypeScript & Build Health

### CHECK 1.1 — TypeScript compilation
Command: npx tsc --noEmit 2>&1
PASS: Output contains "0 errors" or only pre-existing errors
FAIL: Any NEW TypeScript errors not present before this sprint
Record: exact error count and list of new errors if any

### CHECK 1.2 — Production build
Command: npm run build 2>&1 | tail -30
PASS: Build completes with "✓ Compiled successfully" or equivalent
FAIL: Build fails or has new errors
Record: last 30 lines of build output

### CHECK 1.3 — No relative imports
Command: grep -rn "from '\.\." src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test." | head -20
PASS: Zero results (all imports use @/ alias)
FAIL: Any results found
Record: list of files with relative imports

### CHECK 1.4 — No direct PrismaClient imports
Command: grep -rn "new PrismaClient\|from '@prisma/client'" src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "lib/db.ts"
PASS: Zero results outside of lib/db.ts
FAIL: Any results found outside lib/db.ts
Record: list of violations

### CHECK 1.5 — No unguarded JSON field access
Command: grep -rn "\.extractedFacts\.\|\.metadata\.\|\.reportMetadata\.\|\.discovery\." src/ --include="*.ts" --include="*.tsx" | grep -v "JSON.parse\|JSON.stringify\|parseJSON" | head -10
PASS: Zero results (all JSON fields accessed after parse)
FAIL: Direct property access on JSON string fields found
Record: list of violations

---

## BLOCK 2 — Authentication & Security

### CHECK 2.1 — All API routes have auth guards
Command: grep -rL "getServerSession" src/app/api/ --include="*.ts" | grep -v "\[" | head -20
Then manually check: do any results lack auth for a valid reason?
PASS: All routes either have getServerSession or are explicitly public
FAIL: Routes missing auth without justification
Record: list of unprotected routes

### CHECK 2.2 — No secrets in source code
Command: grep -rn "sk-\|AKIA\|AIza\|ghp_\|xoxb-" src/ --include="*.ts" --include="*.tsx" | grep -v ".env\|node_modules"
PASS: Zero results
FAIL: Any hardcoded API keys or secrets found
Record: file locations (do not log the key values)

### CHECK 2.3 — SSRF protection in vision extract route
Command: cat src/app/api/vision/extract/route.ts | grep -A5 "private\|169.254\|isPrivate\|validateUrl"
PASS: SSRF validation code found (added in Sprint 0)
FAIL: No URL validation found
Record: relevant lines found

### CHECK 2.4 — Encryption used for credentials
Command: grep -rn "jiraApiToken\|smtpPassword\|slackBotToken\|zoomClientSecret" src/ --include="*.ts" | grep -v "encrypt\|decrypt\|encryption"
PASS: Zero results (all credential fields go through encryption.ts)
FAIL: Raw credential access without encryption
Record: list of violations

---

## BLOCK 3 — Database & Schema Health

### CHECK 3.1 — Schema model count
Command: grep -c "^model " prisma/schema.prisma
Record: exact count. Expected: 36+ (grows with each sprint)
PASS: Count matches or exceeds expected for current sprint
FAIL: Count lower than expected (model may have been accidentally deleted)

### CHECK 3.2 — BrainNode unique constraint (Sprint 1)
Command: grep -A2 "userId_type_title" prisma/schema.prisma
PASS: @@unique([userId, type, title]) found with name "userId_type_title"
FAIL: Constraint missing
SKIP: If Sprint 1 not yet complete

### CHECK 3.3 — ProactiveInsight model (Sprint 3)
Command: grep -A10 "model ProactiveInsight" prisma/schema.prisma
PASS: Model exists with all required fields
FAIL: Model missing
SKIP: If Sprint 3 not yet complete

### CHECK 3.4 — Prisma client up to date
Command: npx prisma generate 2>&1 | tail -5
PASS: Generates without errors
FAIL: Errors during generation
Record: output

### CHECK 3.5 — No missing migrations
Command: npx prisma db push --dry-run 2>&1 | tail -10
PASS: "No schema changes detected" or expected pending changes listed
FAIL: Unexpected schema drift detected
Record: output

---

## BLOCK 4 — Core Features (always check these)

### CHECK 4.1 — North Star extraction endpoint exists
Command: cat src/app/api/vision/extract/route.ts | head -20
PASS: File exists and has POST handler
FAIL: File missing or no POST handler
Note: Fixed in Sprint 0 — should always pass after that

### CHECK 4.2 — Agent context service exists (Sprint 1)
Command: cat src/lib/services/agent-context.ts | grep "export.*buildAgentContext"
PASS: buildAgentContext exported function found
FAIL: Service missing or function not exported
SKIP: If Sprint 1 not yet complete

### CHECK 4.3 — Agent memory writer exists (Sprint 1)
Command: cat src/lib/services/agent-memory-writer.ts | grep "export.*writeAgentMemory"
PASS: writeAgentMemory exported function found
FAIL: Service missing
SKIP: If Sprint 1 not yet complete

### CHECK 4.4 — Agent memory writer uses upsert not create
Command: grep "db.brainNode.upsert\|db.brainNode.create" src/lib/services/agent-memory-writer.ts
PASS: Only upsert found (no create)
FAIL: create found — will break on duplicate keys
SKIP: If Sprint 1 not yet complete

### CHECK 4.5 — Chat route injects brain context (Sprint 1)
Command: grep "buildAgentContext\|brainContext\|companyContext" src/app/api/chat/route.ts
PASS: buildAgentContext imported and brainContext variable used
FAIL: Not found
SKIP: If Sprint 1 not yet complete

### CHECK 4.6 — Chat route has fallback LLM path
Command: grep -n "fallback\|AGENT_SERVICE_URL\|catch" src/app/api/chat/route.ts | head -10
PASS: Both AGENT_SERVICE_URL usage and fallback path found
FAIL: No fallback — if agent service goes down, chat breaks entirely
Record: relevant lines

### CHECK 4.7 — Cron routes have secret validation (Sprint 2)
Command: grep -rn "x-cron-secret\|CRON_SECRET" src/app/api/cron/ --include="*.ts"
PASS: All cron routes have secret validation
FAIL: Any cron route missing validation
SKIP: If Sprint 2 not yet complete
Record: list of cron files checked

### CHECK 4.8 — writeAgentMemory is fire-and-forget (Sprint 1)
Command: grep -n "writeAgentMemory" src/app/api/chat/route.ts
PASS: Call has .catch() and no await keyword on the same line
FAIL: await writeAgentMemory found — blocks response
Record: exact lines

---

## BLOCK 5 — Onboarding Flow Health

### CHECK 5.1 — All onboarding routes write BrainNodes (Sprint 1)
Commands (run each):
  grep -n "brainNode.upsert\|brainNode.create" src/app/api/vision/north-star/route.ts
  grep -n "brainNode.upsert\|brainNode.create" src/app/api/vision/business-goals/route.ts
  grep -n "brainNode.upsert\|brainNode.create" src/app/api/vision/target-groups/route.ts
  grep -n "brainNode.upsert\|brainNode.create" src/app/api/vision/needs/route.ts
  grep -n "brainNode.upsert\|brainNode.create" src/app/api/vision/products/route.ts
PASS: All 5 routes have BrainNode upsert calls
FAIL: Any missing
SKIP: If Sprint 1 not yet complete
Record: which routes have it and which do not

### CHECK 5.2 — BrainNode writes are fire-and-forget in onboarding
Command: grep -B2 "brainNode.upsert" src/app/api/vision/north-star/route.ts | grep "await"
PASS: The upsert is NOT preceded by await on the same logical path
      (it should be fire-and-forget with .catch())
FAIL: await brainNode.upsert found — failure blocks onboarding save
Note: Acceptable if wrapped in try/catch that does not rethrow

### CHECK 5.3 — parseTags shared utility exists (Sprint 0)
Command: grep -n "export.*parseTags" src/lib/utils.ts
PASS: parseTags found as export in utils.ts
FAIL: Not found — duplication may have regressed
Note: Fixed in Sprint 0

### CHECK 5.4 — ENTITY_ROUTE_MAP uses entity IDs (Sprint 0)
Command: grep -A10 "ENTITY_ROUTE_MAP" src/components/alerts/AlertPanel.tsx | grep "id =>"
PASS: Route functions use the id parameter (e.g. id => /initiatives/${id})
FAIL: Routes ignore id (navigates to list, not specific entity)
Note: Fixed in Sprint 0

---

## BLOCK 6 — Sprint 3 Specific Checks

Skip this entire block if Sprint 3 is not yet complete.

### CHECK 6.1 — ProactiveInsight API routes exist
Command: ls src/app/api/insights/
PASS: route.ts and [id]/route.ts both found
FAIL: Missing

### CHECK 6.2 — InsightsPanel component exists
Command: cat src/components/dashboard/InsightsPanel.tsx | grep "export function InsightsPanel"
PASS: Component exported
FAIL: Missing

### CHECK 6.3 — InsightsPanel added to DashboardView
Command: grep "InsightsPanel" src/components/views/DashboardView.tsx
PASS: InsightsPanel imported and used in DashboardView
FAIL: Not added to dashboard

### CHECK 6.4 — Competitor scorer uses threshold correctly
Command: grep -n "ESCALATION_THRESHOLD\|shouldEscalate" src/lib/services/competitor-scorer.ts
PASS: ESCALATION_THRESHOLD = 4 and shouldEscalate logic found
FAIL: Missing or threshold set to 0 (would escalate everything)

### CHECK 6.5 — Drift detector threshold set correctly
Command: grep -n "DRIFT_THRESHOLD\|SEVERE_DRIFT_THRESHOLD" src/lib/services/drift-detector.ts
PASS: DRIFT_THRESHOLD = 65 and SEVERE_DRIFT_THRESHOLD = 50
FAIL: Missing or set to 0 (would always trigger)

### CHECK 6.6 — Insight writer uses deduplication
Command: grep -n "yesterday\|24.*60.*60\|findFirst" src/lib/services/insight-writer.ts
PASS: Deduplication logic found (checks for existing insight in last 24h)
FAIL: No deduplication — same insight written every cron run

### CHECK 6.7 — Cron routes wired to Sprint 3 services
Commands:
  grep -n "processCompetitorFeed\|competitor-scorer" src/app/api/cron/competitor-scan/route.ts
  grep -n "processDriftDetection\|drift-detector" src/app/api/cron/strategy-eval/route.ts
  grep -n "processWatchTopics\|watch-topic" src/app/api/cron/market-pulse/route.ts
PASS: Each cron route imports and calls the correct service
FAIL: Services not wired into cron routes

---

## BLOCK 7 — File Structure Integrity

### CHECK 7.1 — CLAUDE.md exists at project root
Command: cat CLAUDE.md | head -5
PASS: File exists with project header
FAIL: Missing — Claude Code sessions start without context

### CHECK 7.2 — .claude/ directory structure
Command: ls .claude/
PASS: agents/, commands/, hooks/, skills/ all present
FAIL: Any directory missing

### CHECK 7.3 — skill-eval hook is executable
Command: ls -la .claude/hooks/skill-eval.sh
PASS: File has execute permission (-rwxr-xr-x or similar with x bit)
FAIL: Not executable — skill suggestions won't fire

### CHECK 7.4 — .mcp.json exists
Command: cat .mcp.json | head -5
PASS: File exists with mcpServers configuration
FAIL: Missing

### CHECK 7.5 — .env.example is up to date
Command: grep -c "=" .env.example
Record: count of env vars documented
PASS: Count >= 10 (should grow with each sprint)
Note: Check that CRON_SECRET and AGENT_SERVICE_URL are listed (Sprint 2+)

---

## SANITY REPORT FORMAT

After running all checks, output this exact format:

```
═══════════════════════════════════════════════
AZMYRA SANITY REPORT
Run type: PRE-SPRINT [N] / POST-SPRINT [N]
Date: [today]
Last commit: [git log --oneline -1 output]
═══════════════════════════════════════════════

SUMMARY
-------
Total checks run:    [N]
PASS:                [N]
FAIL:                [N]  ← These need fixing
SKIP:                [N]  (sprint not yet complete)

BUILD HEALTH
------------
TypeScript errors:   [N new / N pre-existing]
Build status:        [PASS/FAIL]
Schema model count:  [N]

FAILURES (fix before continuing)
---------------------------------
[CHECK X.X] [check name]
  → [exact error or output]
  → Suggested fix: [one-line fix description]

[repeat for each failure]

WARNINGS (not blocking but worth noting)
-----------------------------------------
[any SKIP items that are overdue]
[any partial passes]

PRE-EXISTING ISSUES (known, not new)
--------------------------------------
[list any known failures that existed before this sprint]

SPRINT READINESS
-----------------
PRE-SPRINT:  [READY TO START / BLOCKED BY: list failures]
POST-SPRINT: [READY TO DEPLOY / BLOCKED BY: list failures]
```

---

## QUICK RE-RUN (after fixing failures)

To re-run only failed checks without running the full suite,
prefix your Claude Code prompt with:

"Re-run only these checks from SANITY_CHECK.md: [CHECK X.X, CHECK Y.Y]
 Report PASS/FAIL for each."
