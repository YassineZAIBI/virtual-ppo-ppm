# SPRINT_TESTING.md — Full Functionality Test Coverage
#
# HOW TO USE:
# 1. Run SANITY_CHECK.md first
# 2. In Claude Code:
#    "Read SPRINT_TESTING.md and execute every step in order.
#     Stop only for: writing new test files (confirm before creating).
#     After all steps: run npm run test and show full report."
# 3. Run SANITY_CHECK.md after

---

## Context

The project has 18 test files covering specific areas but significant gaps:
- 105 API routes → only ~20% have explicit tests
- 18 view components → UI tests exist for generic cases only
- Sprint 1-5 services (agent-context, insight-writer, orchestrator, etc.) → untested
- Security flows (encryption middleware, auth guards) → partially tested

This sprint closes the critical gaps without changing any production code.

---

## Pre-flight: understand current coverage

Run: npm run test 2>&1 | tail -30
Run: ls __tests__/
Run: grep -rn "describe\|it(" __tests__/ --include="*.ts" --include="*.tsx" | wc -l

Report: total test count, passing, failing. Then proceed.

---

## Step 1 — Fix any currently failing tests

Run: npm run test 2>&1 | grep "FAIL\|Error" | head -20

For each failing test:
  Read the test file
  Read the corresponding source file
  Apply minimal fix to make it pass
  Do NOT rewrite passing tests — only fix red ones

After fixing: npm run test must be fully green before continuing to Step 2.

---

## Step 2 — API route coverage audit

Run this grep to find all route files:
  find src/app/api -name "route.ts" | sort

Compare against existing tests in __tests__/api-routes.test.ts.

Identify untested routes. Priority order:

CRITICAL (test these first — they handle user data):
  /api/auth/* — sign in, sign out, session
  /api/profile — read and update
  /api/chat/route.ts — agent entry point
  /api/integrations/connect — credential saving
  /api/integrations/disconnect — credential clearing

HIGH (core PM features):
  /api/initiatives/[id] — CRUD
  /api/vision/north-star — create + update
  /api/vision/business-goals — CRUD
  /api/risks — create + update + AI assessment
  /api/meetings — create + list
  /api/insights — list + PATCH status

MEDIUM (Sprint 3/4/5 features):
  /api/agents/workflow — POST launch + GET history
  /api/integrations/status — list connections
  /api/integrations/notion/ingest — fire-and-forget
  /api/cron/* — secret validation

---

## Step 3 — Write critical API tests

For each CRITICAL route above, add tests to __tests__/api-routes.test.ts
(or create __tests__/api-[feature].test.ts if the file gets too large).

Standard test pattern for each route:
```typescript
describe('[METHOD] /api/[route]', () => {
  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    // call handler
    expect(res.status).toBe(401)
  })

  it('returns [expected] for valid authenticated request', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    vi.mocked(db.[model].[method]).mockResolvedValue([mockData])
    // call handler
    expect(res.status).toBe(200)
    expect(data.[field]).toBeDefined()
  })

  it('scopes results to authenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession)
    // call handler
    // verify db call included where: { userId: mockSession.user.id }
    expect(vi.mocked(db.[model].findMany)).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-1' }) })
    )
  })
})
```

Mock pattern:
```typescript
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/db', () => ({
  db: {
    [model]: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() }
  }
}))
```

---

## Step 4 — Sprint 1 service tests

Create __tests__/sprint1-services.test.ts

### buildAgentContext
  - Returns empty string when no BrainNodes exist for user
  - Returns formatted company context when nodes exist (vision, goal, persona)
  - Separates company context from agent_learning nodes
  - JSON.parse failures on malformed content are handled gracefully

### writeAgentMemory
  - Calls db.brainNode.upsert (not create)
  - Fire-and-forget — does not throw
  - Catches and logs errors without propagating

### writeInsight
  - Deduplicates: does not create if same title within 24h
  - Creates with correct userId, agentType, priority
  - Catches errors silently (never throws)

---

## Step 5 — Sprint 3 service tests

Create __tests__/sprint3-services.test.ts

### processCompetitorFeed
  - Returns {processed:0, escalated:0} when no feed items
  - Scores items correctly (pricing_change=5, blog_post=1)
  - Creates UserAlert only for items with score >= 4
  - Does not create duplicate UserAlerts for same item

### processDriftDetection
  - Does nothing when VAS score >= 65
  - Creates ProactiveInsight when score < 65
  - Creates high-priority insight when score < 50
  - Catches DB errors without throwing

### writeInsight deduplication
  - Skips write when same userId+agentType+title exists in last 24h
  - Writes when same title exists but older than 24h

---

## Step 6 — Sprint 4 service tests

Create __tests__/sprint4-services.test.ts

### runWorkflow
  - Returns {status:"paused"} when autonomyLevel === "manual"
  - Returns {status:"paused", pendingActionId} when autonomyLevel === "oversight"
  - Calls agents in sequence (step 0 before step 1)
  - Returns {status:"failed"} when any step throws
  - Writes BrainNode for "finding" and "assessment" steps
  - Writes ProactiveInsight on successful completion

### getWorkflow
  - Returns null for unknown workflow type
  - Returns correct step count for initiative_deep_dive (4 steps)
  - Returns correct step count for market_threat_response (3 steps)

---

## Step 7 — Encryption middleware test

Create __tests__/security/encryption-round-trip.test.ts

  - encrypt(value) output is not equal to input
  - decrypt(encrypt(value)) === value
  - encrypt produces different ciphertext on each call (different IVs)
  - decrypt throws on malformed iv:authTag:encrypted format
  - decrypt throws on wrong key (tampered data)

---

## Step 8 — Integration connection tests

Create __tests__/integrations.test.ts

### POST /api/integrations/connect
  - Returns 401 when not authenticated
  - Returns 400 for invalid integrationType
  - Saves credentials via UserSettingsRecord upsert
  - Creates IntegrationConnection with status="connected"

### POST /api/integrations/disconnect
  - Returns 401 when not authenticated
  - Clears correct credential fields per integrationType
  - Updates IntegrationConnection status to "disconnected"

### GET /api/integrations/status
  - Returns empty array when no connections
  - Returns all connections for authenticated user
  - Does NOT return connections for other users

---

## Step 9 — Cron route secret validation tests

Create __tests__/cron-security.test.ts

For each cron route (competitor-scan, strategy-eval, risk-reassess, market-pulse, portfolio-review):

  - Returns 401 when x-cron-secret header is missing
  - Returns 401 when x-cron-secret header is wrong value
  - Returns 200 when correct CRON_SECRET is provided
  - Does NOT call any DB or service when secret is wrong

```typescript
process.env.CRON_SECRET = 'test-secret-value'
// Call with no header → 401
// Call with wrong header → 401
// Call with correct header → 200
```

---

## Step 10 — View component smoke tests

Extend __tests__/ui-components.test.tsx

For each view in src/components/views/:
  Add a basic smoke test:
  ```typescript
  it('renders without crashing', () => {
    render(<[ViewName] />)
    // Should not throw
  })

  it('shows loading skeleton on mount', () => {
    // Mock fetch to never resolve
    global.fetch = vi.fn(() => new Promise(() => {}))
    render(<[ViewName] />)
    // Check for Skeleton or animate-pulse element
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })
  ```

Views to cover (check each exists in __tests__ first):
  DashboardView, InitiativesPipeline, RiskCenterView, RoadmapView,
  MarketResearchView, CompetitorView, VisionBoardView, InsightsView,
  MeetingsView, SettingsView, IntegrationsHubView

---

## Step 11 — Test script improvements

Add to package.json scripts:
```json
"test:coverage": "vitest run --coverage",
"test:api": "vitest run __tests__/api-routes.test.ts __tests__/api-*.test.ts",
"test:services": "vitest run __tests__/sprint*.test.ts",
"test:security": "vitest run __tests__/security/",
"test:ui": "vitest run __tests__/ui-components.test.tsx"
```

---

## Step 12 — Final report

Run: npm run test 2>&1 | tail -20

```
SPRINT TESTING REPORT

BASELINE (before this sprint):
  Total tests: [N]
  Passing: [N]
  Failing: [N]

AFTER THIS SPRINT:
  Total tests: [N]
  Passing: [N]
  Failing: [N] ← must be 0

NEW TEST FILES CREATED:
  - __tests__/sprint1-services.test.ts ([N] tests)
  - __tests__/sprint3-services.test.ts ([N] tests)
  - __tests__/sprint4-services.test.ts ([N] tests)
  - __tests__/integrations.test.ts ([N] tests)
  - __tests__/cron-security.test.ts ([N] tests)
  - __tests__/security/encryption-round-trip.test.ts ([N] tests)

ROUTES STILL WITHOUT TESTS:
  [list of routes — acceptable gaps documented]

COVERAGE IMPROVEMENT:
  API routes covered: [N/105]
  Services covered: [N/20]
  Views smoke-tested: [N/18]
```

---

## Commit

git add -A
git commit -m "test: Sprint testing — coverage for Sprint 1-5 services, API routes, security, integrations"
