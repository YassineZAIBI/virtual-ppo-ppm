# Azmyra 3.0 — Full Refactoring Specification

**Purpose:** This document is the single source of truth for refactoring Azmyra 2.0 into Azmyra 3.0. It is designed to be consumed by Claude Code in sequential task batches. Each phase is self-contained with clear inputs, outputs, and acceptance criteria.

**Version:** 3.0.0
**Base:** Azmyra 2.0 (Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma 6, PostgreSQL 16, Python FastAPI agents)
**Principle:** Refactor, don't rebuild. Maximize reuse of existing code. Every change must be backward-compatible or migration-scripted.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Three-Pillar Information Architecture](#2-three-pillar-information-architecture)
3. [Phase 0: Pre-Flight — Schema & Infrastructure](#3-phase-0-pre-flight)
4. [Phase 1: Vision Pillar](#4-phase-1-vision-pillar)
5. [Phase 2: Strategy Pillar Refactor](#5-phase-2-strategy-pillar-refactor)
6. [Phase 3: AI Backbone — Autonomous Engine](#6-phase-3-ai-backbone)
7. [Phase 4: Competitors Eye](#7-phase-4-competitors-eye)
8. [Phase 5: User Profile, Security & Session Continuity](#8-phase-5-user-profile-security)
9. [Phase 6: Tactics Pillar (Coming Soon Scaffold)](#9-phase-6-tactics-pillar)
10. [Phase 7: Navigation & UX Overhaul](#10-phase-7-navigation-ux)
11. [Phase 8: Smart Onboarding Refactor](#11-phase-8-smart-onboarding)
12. [Phase 9: Testing & Quality Gates](#12-phase-9-testing)
13. [Coding Standards & Conventions](#13-coding-standards)
14. [File Structure (Target State)](#14-file-structure)
15. [Migration Checklist](#15-migration-checklist)

---

## 1. Architecture Overview

### 1.1 Core Thesis

Every entity in Azmyra 3.0 lives inside a three-pillar hierarchy:

```
VISION (WHY)  →  STRATEGY (WHAT & WHEN)  →  TACTICS (HOW)
```

Every strategic element carries a **Vision Alignment Score** that traces back to the North Star. AI agents are **transversal** — they read across all pillars simultaneously. The platform runs **autonomous background cycles** without user input.

### 1.2 System Architecture (Target)

```
                    +--------------------+
                    |   Browser (React)  |
                    |   Zustand Store    |
                    +--------+-----------+
                             |
                    +--------v-----------+
                    |   Next.js 16 App   |
                    |   API Routes       |
                    |   Server Actions   |
                    +---+--------+-------+
                        |        |
          +-------------+        +-------------+
          |                                     |
+---------v----------+            +-------------v-----------+
|  PostgreSQL 16     |            |  Python FastAPI Agent   |
|  (Prisma ORM 6)   |            |  Service (port 8100)    |
|                    |            +---+-----+-----+---------+
|  + CronJob table   |                |     |     |
|  + VisionPyramid   |        +-------+  +--+--+  +--------+
|  + CompetitorFeed  |        |          |     |           |
|  + AlignmentScore  |   +----v---+ +----v--+ +v--------+  |
|  + SessionHistory  |   | LLM    | | RAG   | | MCP     |  |
+--------------------+   | Router | | Search| | Client  |  |
                          +--------+ +-------+ +---------+  |
                                                             |
         +--------------------------------------------------+
         |  External Services                               |
         |  Jira | Confluence | Slack | Email               |
         +--------------------------------------------------+
                          |
         +----------------v---------------------------------+
         |  CRON SCHEDULER (new)                            |
         |  - Daily: CompetitorScan, StrategyEval, RiskScan |
         |  - Weekly: FullPortfolioReview                    |
         |  - On-demand: user-triggered tasks               |
         +--------------------------------------------------+
```

### 1.3 What Stays, What Changes

| Component | Action | Notes |
|-----------|--------|-------|
| Next.js 16 + React 19 + TypeScript | **Keep** | No framework changes |
| Tailwind CSS 4 + shadcn/ui | **Keep** | Extend with new components |
| Zustand store | **Refactor** | Add pillar-scoped slices, remove localStorage for sensitive data |
| NextAuth.js 4 | **Keep** | Add session continuity hooks |
| Prisma ORM 6 + PostgreSQL 16 | **Extend** | New models, migration scripts |
| Python FastAPI agents | **Refactor** | Add transversal context, cron scheduler, new agents |
| 10 data adapters | **Keep + Extend** | Add competitor-specific adapters |
| Jira/Confluence/Slack/Email | **Keep** | Move Jira to Tactics pillar scope |
| Recharts | **Keep** | New chart types for alignment scores |
| Docker + Cloud Run | **Keep** | Add cron sidecar container |

---

## 2. Three-Pillar Information Architecture

### 2.1 Vision Pillar (WHY)

The Vision Pillar is a hierarchical pyramid. Every account MUST have this configured before any other pillar is usable.

```
Level 0: North Star       — 1 sentence, the singular purpose
Level 1: Business Goals   — 3-7 measurable objectives (revenue, growth, retention)
Level 2: Target Groups    — Personas with demographics, behaviors, needs
Level 3: Needs            — Pain points and jobs-to-be-done per target group
Level 4: Products         — Solutions/offerings mapped to needs
```

**Vision Alignment Score (VAS):** Every entity in Strategy and Tactics gets a 0-100 score computed against the North Star. The formula:

```
VAS = weighted_average(
  north_star_relevance: 0.35,      // AI-scored: does this serve the North Star?
  business_goal_coverage: 0.25,    // How many business goals does it advance?
  target_group_impact: 0.20,       // How many target groups benefit?
  need_fulfillment: 0.20           // How directly does it solve identified needs?
)
```

### 2.2 Strategy Pillar (WHAT & WHEN)

Operates at **Solution / Epic / Idea** level ONLY. No features, no stories, no tickets.

Contains:
- Strategic Portfolio (refactored Initiatives Pipeline)
- Strategic Roadmap (refactored Roadmap — quarterly, solution-level)
- Discovery Workspace (kept as-is, linked to strategic items)
- AI Strategy Evaluator (new — weekly autonomous re-evaluation)
- Business Impact Calculator (new — ROI, revenue, market share per item)
- Competitive Rank Matrix (new — position vs competitors)
- Risk Center (enhanced from dashboard risks)

### 2.3 Tactics Pillar (HOW) — Phase 2, Scaffold Only

Coming soon. For 3.0 launch, render as a locked section with preview content.

Will contain:
- Execution Orchestrator (Strategy → Jira epics → team work)
- Team Capacity Planner
- Delivery Dashboard
- Methodology Engine (Scrum/Kanban/SAFe)

---

## 3. Phase 0: Pre-Flight — Schema & Infrastructure

**Goal:** Extend the database, set up cron infrastructure, prepare migration scripts. No UI changes.

### Task 0.1: Prisma Schema Extensions

Add these models to `prisma/schema.prisma`. Do NOT modify existing models — only add new ones and add optional relations to existing ones.

```prisma
// ============================================
// VISION PILLAR MODELS
// ============================================

model NorthStar {
  id          String   @id @default(cuid())
  userId      String
  statement   String   // The single North Star sentence
  context     String?  @db.Text // AI-extracted context from documents
  confidence  Float    @default(0) // AI confidence in extraction (0-1)
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  businessGoals BusinessGoal[]

  @@unique([userId]) // One North Star per user/account
  @@index([userId])
}

model BusinessGoal {
  id          String   @id @default(cuid())
  userId      String
  northStarId String
  title       String
  description String?  @db.Text
  metric      String?  // e.g., "ARR", "NPS", "DAU"
  target      String?  // e.g., "$10M", ">50", "100K"
  deadline    DateTime?
  priority    Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  northStar   NorthStar    @relation(fields: [northStarId], references: [id], onDelete: Cascade)
  targetGroups TargetGroup[]

  @@index([userId])
  @@index([northStarId])
}

model TargetGroup {
  id             String   @id @default(cuid())
  userId         String
  businessGoalId String
  name           String
  role           String?
  demographics   String?  @db.Text // JSON: age, location, industry, etc.
  behaviors      String?  @db.Text // JSON: usage patterns, preferences
  goals          String?  @db.Text
  painPoints     String?  @db.Text
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  businessGoal BusinessGoal  @relation(fields: [businessGoalId], references: [id], onDelete: Cascade)
  needs        Need[]

  @@index([userId])
  @@index([businessGoalId])
}

model Need {
  id            String   @id @default(cuid())
  userId        String
  targetGroupId String
  title         String
  description   String?  @db.Text
  severity      Int      @default(5) // 1-10
  frequency     String?  // daily, weekly, monthly, rare
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  targetGroup TargetGroup  @relation(fields: [targetGroupId], references: [id], onDelete: Cascade)
  products    ProductMapping[]

  @@index([userId])
  @@index([targetGroupId])
}

model ProductMapping {
  id        String   @id @default(cuid())
  userId    String
  needId    String
  name      String   // Product or solution name
  type      String   // "existing" | "planned" | "idea"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  need Need @relation(fields: [needId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([needId])
}

// ============================================
// COMPETITORS EYE MODELS
// ============================================

model Competitor {
  id          String   @id @default(cuid())
  userId      String
  name        String
  website     String?
  description String?  @db.Text
  tags        String?  // JSON array: ["direct", "indirect", "emerging"]
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user  User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  feeds CompetitorFeed[]

  @@index([userId])
}

model CompetitorFeed {
  id           String   @id @default(cuid())
  userId       String
  competitorId String
  type         String   // "news" | "product_update" | "vision_shift" | "rumor" | "pricing" | "hiring"
  title        String
  summary      String   @db.Text
  source       String?  // URL or adapter name
  sourceAdapter String? // which data adapter found this
  relevance    Float    @default(0.5) // AI-scored relevance (0-1)
  sentiment    String?  // "positive" | "negative" | "neutral"
  raw          String?  @db.Text // Raw data from adapter
  publishedAt  DateTime?
  createdAt    DateTime @default(now())

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  competitor Competitor @relation(fields: [competitorId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([competitorId])
  @@index([createdAt])
  @@index([type])
}

// ============================================
// VISION ALIGNMENT SCORING
// ============================================

model AlignmentScore {
  id                   String   @id @default(cuid())
  userId               String
  entityType           String   // "initiative" | "strategy_item" | "risk"
  entityId             String
  overallScore         Float    // 0-100 VAS
  northStarRelevance   Float    // 0-100
  businessGoalCoverage Float    // 0-100
  targetGroupImpact    Float    // 0-100
  needFulfillment      Float    // 0-100
  reasoning            String?  @db.Text // AI explanation
  computedBy           String   @default("ai") // "ai" | "manual"
  version              Int      @default(1)
  createdAt            DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([entityType, entityId])
  @@index([overallScore])
}

// ============================================
// BUSINESS IMPACT MODEL
// ============================================

model BusinessImpact {
  id               String   @id @default(cuid())
  userId           String
  entityType       String   // "initiative"
  entityId         String
  revenueEstimate  Float?   // $ value
  roiPercent       Float?
  timeToValueWeeks Int?
  marketShareDelta Float?   // percentage points
  confidenceLevel  String?  // "low" | "medium" | "high"
  assumptions      String?  @db.Text // JSON array of assumptions
  computedBy       String   @default("ai")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([entityType, entityId])
}

// ============================================
// AUTONOMOUS CRON SYSTEM
// ============================================

model CronJob {
  id          String    @id @default(cuid())
  userId      String
  jobType     String    // "competitor_scan" | "strategy_eval" | "risk_reassess" | "market_pulse" | "full_portfolio_review"
  schedule    String    // cron expression: "0 2 * * *" = daily 2am
  lastRun     DateTime?
  nextRun     DateTime?
  status      String    @default("active") // "active" | "paused" | "failed"
  lastResult  String?   @db.Text // JSON summary of last run
  lastError   String?   @db.Text
  runCount    Int       @default(0)
  config      String?   @db.Text // JSON: job-specific configuration
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([jobType])
  @@index([nextRun])
  @@index([status])
}

model CronRun {
  id        String   @id @default(cuid())
  userId    String
  jobType   String
  status    String   // "running" | "completed" | "failed"
  startedAt DateTime @default(now())
  endedAt   DateTime?
  result    String?  @db.Text // JSON
  error     String?  @db.Text
  duration  Int?     // milliseconds
  tokensUsed Int?    // LLM tokens consumed

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([jobType])
  @@index([startedAt])
}

// ============================================
// USER ALERTS (from autonomous AI)
// ============================================

model UserAlert {
  id          String    @id @default(cuid())
  userId      String
  type        String    // "competitor_move" | "strategy_risk" | "alignment_drift" | "market_shift" | "action_required"
  severity    String    // "info" | "warning" | "critical"
  title       String
  message     String    @db.Text
  source      String?   // which cron job or agent generated this
  entityType  String?   // optional link to entity
  entityId    String?
  isRead      Boolean   @default(false)
  isDismissed Boolean   @default(false)
  createdAt   DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@index([severity])
}

// ============================================
// SESSION CONTINUITY
// ============================================

model ChatSession {
  id        String   @id @default(cuid())
  userId    String
  title     String?  // AI-generated session title
  pillar    String?  // "vision" | "strategy" | "tactics" | "general"
  agent     String?  // last active agent
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages ChatMessage[] // existing model — add relation

  @@index([userId])
  @@index([isActive])
}
```

**Add optional fields to existing models:**

```prisma
// Add to existing Initiative model:
  level           String?  @default("idea") // "solution" | "epic" | "idea"
  pillar          String?  @default("strategy") // "vision" | "strategy" | "tactics"
  alignmentScore  Float?   // cached VAS (0-100)
  businessImpactId String? // link to BusinessImpact
  competitiveRank  Int?    // 1-N rank vs competitors

// Add to existing User model:
  northStar       NorthStar?
  businessGoals   BusinessGoal[]
  targetGroups    TargetGroup[]
  needs           Need[]
  productMappings ProductMapping[]
  competitors     Competitor[]
  competitorFeeds CompetitorFeed[]
  alignmentScores AlignmentScore[]
  businessImpacts BusinessImpact[]
  cronJobs        CronJob[]
  cronRuns        CronRun[]
  alerts          UserAlert[]
  chatSessions    ChatSession[]
  visionComplete  Boolean  @default(false) // gates access to Strategy
```

### Task 0.2: Migration Script

```bash
# Generate migration
npx prisma migrate dev --name azmyra_3_vision_strategy_autonomous

# Verify
npx prisma generate
```

**Acceptance criteria:**
- [ ] `npx prisma migrate dev` runs without errors
- [ ] `npx prisma generate` produces updated client
- [ ] Existing data is untouched (all new fields are optional or have defaults)
- [ ] `npx prisma studio` shows all new models

### Task 0.3: Cron Scheduler Infrastructure

Create the cron scheduler as a new module in the Python FastAPI service.

**File:** `python-agents/scheduler/`

```
python-agents/
├── scheduler/
│   ├── __init__.py
│   ├── runner.py          # Main scheduler loop (APScheduler or custom)
│   ├── jobs/
│   │   ├── __init__.py
│   │   ├── base.py        # Abstract CronJob class
│   │   ├── competitor_scan.py
│   │   ├── strategy_eval.py
│   │   ├── risk_reassess.py
│   │   ├── market_pulse.py
│   │   └── full_portfolio_review.py
│   └── registry.py        # Job type → handler mapping
```

**Implementation notes:**
- Use `APScheduler` with `AsyncIOScheduler` — it integrates cleanly with FastAPI's event loop.
- Each job reads its schedule from the `CronJob` DB table.
- Each run writes to `CronRun` with start/end times, token usage, result/error.
- Each job can generate `UserAlert` records when it finds something noteworthy.
- Jobs fetch the user's full context (North Star, strategies, competitors) before running.
- Add a `/scheduler/status` endpoint to the FastAPI service for health checks.
- Add a `/scheduler/trigger/{jobType}` endpoint for manual triggers.

**Dependencies to add:**
```
pip install apscheduler==3.10.4
```

**Acceptance criteria:**
- [ ] Scheduler starts with FastAPI service (via `@app.on_event("startup")`)
- [ ] Jobs are registered per-user from `CronJob` table
- [ ] `/scheduler/status` returns running jobs
- [ ] `/scheduler/trigger/competitor_scan` triggers a manual run
- [ ] `CronRun` records created for each execution

---

## 4. Phase 1: Vision Pillar

**Goal:** Build the entire Vision pillar — North Star Composer, Vision Pyramid, Vision Alignment Score, Target Groups (migrated from User Journey).

### Task 1.1: Vision API Routes

**File:** `src/app/api/vision/`

```
src/app/api/vision/
├── north-star/
│   └── route.ts          # GET (fetch), POST (create/update)
├── business-goals/
│   └── route.ts          # GET, POST
│   └── [id]/route.ts     # PATCH, DELETE
├── target-groups/
│   └── route.ts          # GET, POST
│   └── [id]/route.ts     # PATCH, DELETE
├── needs/
│   └── route.ts          # GET, POST
│   └── [id]/route.ts     # PATCH, DELETE
├── products/
│   └── route.ts          # GET, POST
│   └── [id]/route.ts     # PATCH, DELETE
├── alignment/
│   └── route.ts          # POST: compute VAS for an entity
│   └── batch/route.ts    # POST: recompute all scores for a user
├── extract/
│   └── route.ts          # POST: AI extraction from documents/URLs
└── pyramid/
    └── route.ts          # GET: full pyramid in one call (denormalized)
```

**Key route: `POST /api/vision/extract`**

This is the AI-powered vision extractor. It accepts:
```typescript
interface VisionExtractRequest {
  sources: Array<{
    type: "document" | "url" | "text";
    content: string; // file path, URL, or raw text
  }>;
}
```

Implementation:
1. For URLs: use the existing `KnowledgeDocument` scraping logic from `/api/knowledge/scrape`.
2. For documents: use the existing upload pipeline from `/api/knowledge/upload`.
3. Aggregate all content, send to LLM with a structured extraction prompt.
4. Return proposed: North Star, Business Goals, Target Groups, Needs, Products.
5. User reviews and confirms. Nothing is saved until user approves.

**LLM prompt pattern for extraction:**

```
You are a product strategy expert. Given the following company materials, extract:

1. NORTH STAR: A single sentence that captures the company's core purpose. 
   It should answer "Why does this company/product exist?"

2. BUSINESS GOALS: 3-7 measurable business objectives. For each:
   - Title, description, metric name, target value, deadline (if inferrable)

3. TARGET GROUPS: The key user/customer segments. For each:
   - Name, role, demographics, behaviors, goals, pain points

4. NEEDS: The core problems/needs for each target group. For each:
   - Title, description, severity (1-10), frequency

5. PRODUCTS: Existing or planned products/solutions mapped to needs.

Respond in JSON format only. If you cannot infer a field, use null.
Confidence scores (0-1) for each element.

Materials:
{aggregated_content}
```

**Acceptance criteria:**
- [ ] All CRUD endpoints work with proper userId filtering
- [ ] `/api/vision/pyramid` returns the full hierarchy in a single call
- [ ] `/api/vision/extract` accepts documents and URLs, returns structured proposal
- [ ] `/api/vision/alignment` computes VAS using the weighted formula
- [ ] `/api/vision/alignment/batch` recomputes all scores (used by cron)

### Task 1.2: Vision UI Components

**Files to create:**

```
src/components/views/VisionBoardView.tsx     # Main vision page
src/components/vision/
├── NorthStarComposer.tsx    # Guided North Star creation/editing
├── VisionPyramid.tsx        # Interactive hierarchy visualization
├── BusinessGoalCard.tsx     # Individual business goal card
├── TargetGroupCard.tsx      # Refactored from existing UserJourney persona card
├── NeedCard.tsx             # Need display with severity indicator
├── ProductMappingCard.tsx   # Product linked to needs
├── AlignmentBadge.tsx       # Reusable VAS badge (score + color)
├── VisionExtractor.tsx      # Upload/URL input → AI extraction flow
└── CompetitorsEyeWidget.tsx # Summary widget for Vision Board
```

**Refactor existing:**
- `UserJourneyView.tsx` → Content migrates into `TargetGroupCard.tsx`. The `/user-journey` route becomes a redirect to `/vision/audiences`.
- `ValueMeterView.tsx` → The scoring dimensions are replaced by Vision Alignment Score. The component is refactored into `AlignmentBadge.tsx` + a detail panel showing the 4 sub-scores.

**NorthStarComposer UX flow:**
1. Show empty state with prompt: "What is the one purpose of your product/company?"
2. Option to type directly OR trigger AI extraction (upload docs / paste URLs)
3. If AI extraction: show proposed statement with confidence score, allow editing
4. Save button stores to `NorthStar` model
5. Once saved, unlock the pyramid builder below

**VisionPyramid UX:**
- Vertical pyramid visualization (widest at bottom)
- Each level is expandable, shows cards for that level's items
- Click any card to edit inline
- Drag to reorder within a level
- AlignmentBadge shown on every card

### Task 1.3: Vision Zustand Slice

**File:** Add to `src/lib/store.ts` (or create `src/lib/store/vision-slice.ts` if the store is split)

```typescript
interface VisionSlice {
  northStar: NorthStar | null;
  businessGoals: BusinessGoal[];
  targetGroups: TargetGroup[];
  needs: Need[];
  products: ProductMapping[];
  pyramidLoading: boolean;
  visionComplete: boolean;

  fetchPyramid: () => Promise<void>;
  setNorthStar: (ns: NorthStar) => void;
  addBusinessGoal: (bg: BusinessGoal) => void;
  updateBusinessGoal: (id: string, data: Partial<BusinessGoal>) => void;
  deleteBusinessGoal: (id: string) => void;
  // ... same pattern for targetGroups, needs, products
}
```

**Acceptance criteria:**
- [ ] Vision Board renders at `/vision`
- [ ] North Star Composer works end-to-end (manual + AI extraction)
- [ ] Pyramid visualization shows all 5 levels
- [ ] Editing any element triggers VAS recomputation
- [ ] Old `/user-journey` route redirects to `/vision/audiences`
- [ ] Old `/value-meter` route redirects to `/vision` with alignment panel open

---

## 5. Phase 2: Strategy Pillar Refactor

**Goal:** Elevate existing Initiatives Pipeline and Roadmap to strategic level. Add Business Impact Calculator, Cross-Strategy Radar, Competitive Rank.

### Task 2.1: Refactor Initiative Model

**Do NOT delete existing fields.** Add new ones and migrate data.

Add to the Initiative model in Prisma (as specified in Task 0.1):
- `level`: "solution" | "epic" | "idea" (default: "idea")
- `pillar`: always "strategy" for now
- `alignmentScore`: cached VAS float
- `competitiveRank`: integer
- `businessImpactId`: relation to BusinessImpact

**Migration script** (run once): Set all existing initiatives to `level = "idea"`, `pillar = "strategy"`.

### Task 2.2: Refactor Initiatives Pipeline

**File:** `src/components/views/InitiativesPipeline.tsx`

Changes:
1. Add a **level filter** at the top: Solution | Epic | Idea | All
2. Each card now displays:
   - AlignmentBadge (VAS score)
   - Level badge (Solution/Epic/Idea)
   - Business Impact summary (if computed)
   - Competitive Rank indicator
3. Kanban stages stay the same: Idea → Discovery → Validation → Definition → Approved
4. Add "Compute Impact" button on each card → calls `/api/strategy/impact`
5. Add "Score Alignment" button → calls `/api/vision/alignment`

### Task 2.3: Refactor Roadmap

**File:** `src/components/views/RoadmapView.tsx`

Changes:
1. Filter to show only Solution and Epic level items (hide Ideas by default, toggle available)
2. Each roadmap item shows VAS badge + Business Impact summary
3. Color coding: use VAS score for color (green ≥80, blue ≥60, amber ≥40, red <40) instead of status

### Task 2.4: Strategy API Routes (New)

```
src/app/api/strategy/
├── impact/
│   └── route.ts            # POST: compute BusinessImpact for an initiative
├── competitive-rank/
│   └── route.ts            # POST: rank initiatives vs competitor moves
├── cross-radar/
│   └── route.ts            # GET: cross-strategy analysis (conflicts, synergies)
├── evaluate/
│   └── route.ts            # POST: trigger AI strategy evaluation
│   └── weekly/route.ts     # POST: trigger full weekly re-evaluation
└── portfolio/
    └── route.ts            # GET: full strategic portfolio with scores
```

**Key route: `POST /api/strategy/impact`**

```typescript
interface ImpactRequest {
  initiativeId: string;
}
// Returns: BusinessImpact computed by AI
```

LLM prompt pattern:
```
Given this strategic initiative and the company's vision context:

North Star: {northStar}
Business Goals: {businessGoals}
Initiative: {initiative}
Market context: {latest_market_data}
Competitor landscape: {competitor_summary}

Estimate:
1. Revenue impact ($ range)
2. ROI percentage
3. Time to value (weeks)
4. Market share delta (percentage points)
5. Confidence level (low/medium/high)
6. Key assumptions (list)

Respond in JSON format only.
```

### Task 2.5: Strategy Evaluator Agent

**File:** `python-agents/agents/registry.py` — Add new agent definition

Add a **VisionGuard** agent (7th agent):
- Purpose: Transversal vision alignment monitoring
- Temperature: 0.2 (precise, analytical)
- Tools: Read access to all Prisma models via API, AlignmentScore computation
- Trigger: Runs on cron AND on-demand when user asks about alignment

Modify existing agents to accept **full context injection:**

```python
# In python-agents/agents/prompts.py, add to every agent's system prompt:
TRANSVERSAL_CONTEXT = """
You have access to the complete account context:
- North Star: {north_star}
- Business Goals: {business_goals_summary}
- Active Strategies: {strategies_summary}
- Competitor Intelligence: {competitor_summary}
- Recent Alerts: {recent_alerts}
- Vision Alignment Scores: {alignment_summary}

Use this context to evaluate any request against the big picture.
Flag conflicts between strategies. Flag alignment drift. Flag competitive risks.
"""
```

**Acceptance criteria:**
- [ ] Initiatives Pipeline shows level filter and VAS badges
- [ ] Roadmap filters to Solution/Epic level by default
- [ ] Business Impact Calculator returns estimates via API
- [ ] Cross-Strategy Radar detects conflicts/synergies
- [ ] All 7 agents receive transversal context
- [ ] `/strategy/portfolio` returns complete scored portfolio

---

## 6. Phase 3: AI Backbone — Autonomous Engine

**Goal:** Make the platform work autonomously. Daily competitor scans, strategy re-evaluations, risk reassessments, proactive alerts — all without user input.

### Task 3.1: Implement Cron Jobs

Each job follows this pattern:

```python
# python-agents/scheduler/jobs/base.py
from abc import ABC, abstractmethod

class BaseCronJob(ABC):
    job_type: str

    async def execute(self, user_id: str, config: dict) -> dict:
        """Run the job. Returns result dict."""
        run = await self.create_run(user_id)
        try:
            result = await self.run(user_id, config)
            await self.complete_run(run.id, result)
            await self.generate_alerts(user_id, result)
            return result
        except Exception as e:
            await self.fail_run(run.id, str(e))
            raise

    @abstractmethod
    async def run(self, user_id: str, config: dict) -> dict:
        ...

    async def generate_alerts(self, user_id: str, result: dict):
        """Override to create UserAlert records from results."""
        pass
```

**Job implementations:**

| Job | Schedule | What it does |
|-----|----------|-------------|
| `competitor_scan` | Daily 2am | For each Competitor: query data adapters (DuckDuckGo, HN, Reddit) → AI synthesize → store CompetitorFeed → generate alerts for significant findings |
| `strategy_eval` | Daily 6am | For each Initiative: recompute VAS, check against latest competitor data, update competitive rank. Flag items where VAS dropped >10 points |
| `risk_reassess` | Daily 6am (after strategy_eval) | Recompute all Risk scores with fresh market/competitor data. Generate alerts for risks that escalated |
| `market_pulse` | Daily 8am | General market scan for user's industry (inferred from North Star + products). Store notable findings. Generate alerts |
| `full_portfolio_review` | Weekly Sunday 2am | Comprehensive: run all above + cross-strategy radar + portfolio rebalancing suggestions. Generate summary report stored as ContentVersion |

### Task 3.2: Alert System

**API routes:**
```
src/app/api/alerts/
├── route.ts              # GET: list alerts (paginated, filterable)
├── [id]/route.ts         # PATCH: mark read/dismissed
├── unread-count/route.ts # GET: count for badge
└── bulk/route.ts         # POST: mark multiple read/dismissed
```

**UI component:**
```
src/components/alerts/
├── AlertBell.tsx          # Navbar bell icon with unread count badge
├── AlertPanel.tsx         # Slide-over panel showing alerts
├── AlertCard.tsx          # Individual alert with severity color, actions
└── AlertSettings.tsx      # User preferences: which alert types, delivery channel
```

**Integration:** AlertBell goes in the top navbar. Polling every 60 seconds for unread count (or WebSocket if already using one).

### Task 3.3: Cron Dashboard (in Settings)

Add a new tab to Settings: "Autonomous AI"

Shows:
- List of active cron jobs with toggle (active/paused)
- Last run time, next run time, status
- Run history with expandable results
- Token usage per job (for cost awareness)
- Manual trigger button per job

**Acceptance criteria:**
- [ ] All 5 cron jobs run on schedule
- [ ] Competitor scan produces CompetitorFeed records
- [ ] Strategy eval updates VAS scores
- [ ] Alerts generated and visible in UI
- [ ] Alert bell shows unread count
- [ ] Cron dashboard in Settings shows job status
- [ ] Manual trigger works for each job
- [ ] Token usage tracked per run

---

## 7. Phase 4: Competitors Eye

**Goal:** Build the 24/7 competitive intelligence module. Lives under Vision pillar.

### Task 4.1: Competitor Management API

```
src/app/api/competitors/
├── route.ts              # GET (list), POST (add competitor)
├── [id]/route.ts         # GET, PATCH, DELETE
├── [id]/feed/route.ts    # GET: paginated feed for one competitor
├── feed/route.ts         # GET: aggregated feed across all competitors
├── suggest/route.ts      # POST: AI suggests competitors based on North Star + products
└── scan/route.ts         # POST: trigger manual scan for all competitors
```

**Key route: `POST /api/competitors/suggest`**

Uses the existing data pipeline to search for companies in the same space, then AI ranks them as direct/indirect/emerging competitors.

### Task 4.2: Competitors Eye UI

**Files:**
```
src/components/views/CompetitorsEyeView.tsx   # Main page at /vision/competitors
src/components/competitors/
├── CompetitorCard.tsx         # Competitor profile card
├── CompetitorFeedItem.tsx     # Individual feed item (news, update, rumor, etc.)
├── CompetitorFeedTimeline.tsx # Chronological feed with type filters
├── CompetitorAddDialog.tsx    # Add competitor (manual or AI-suggested)
├── CompetitorCompareView.tsx  # Side-by-side comparison
└── CompetitorRadar.tsx        # Radar/spider chart comparing competitive position
```

**Feed item types with visual indicators:**
- `news` — teal dot
- `product_update` — purple dot
- `vision_shift` — red dot
- `rumor` — amber dot
- `pricing` — green dot
- `hiring` — blue dot

### Task 4.3: Extend Data Adapters for Competitor Scanning

The existing 10 adapters work as-is. Add competitor-specific query builders:

**File:** `src/lib/services/data-pipeline/competitor-queries.ts`

```typescript
export function buildCompetitorQueries(competitor: Competitor): string[] {
  const queries: string[] = [];
  queries.push(`"${competitor.name}" news`);
  queries.push(`"${competitor.name}" product launch`);
  queries.push(`"${competitor.name}" funding OR acquisition`);
  queries.push(`"${competitor.name}" pricing`);
  if (competitor.website) {
    queries.push(`site:${competitor.website}`);
  }
  return queries;
}
```

The `competitor_scan` cron job calls the existing pipeline with these queries, then sends raw results to the LLM for classification into feed item types.

**Acceptance criteria:**
- [ ] Competitors CRUD at `/api/competitors`
- [ ] AI competitor suggestion works
- [ ] Feed populated by cron job (and manual trigger)
- [ ] Timeline UI with type filters
- [ ] Widget on Vision Board shows latest competitor feed
- [ ] Competitor data feeds into Strategy Evaluator context

---

## 8. Phase 5: User Profile, Security & Session Continuity

**Goal:** User profile management, full data encryption, data export, account deletion, persistent chat sessions.

### Task 5.1: User Profile API

```
src/app/api/profile/
├── route.ts              # GET, PATCH (update profile)
├── export/route.ts       # POST: generate full data export (JSON + PDF)
├── delete/route.ts       # POST: request account deletion
├── delete/confirm/route.ts # POST: confirm deletion with verification code
└── encryption/route.ts   # GET: encryption status, POST: rotate encryption key
```

**Data export format:**
```json
{
  "exportDate": "ISO timestamp",
  "version": "3.0",
  "user": { /* profile data, no password hash */ },
  "vision": {
    "northStar": { ... },
    "businessGoals": [ ... ],
    "targetGroups": [ ... ],
    "needs": [ ... ],
    "products": [ ... ]
  },
  "strategy": {
    "initiatives": [ ... ],
    "risks": [ ... ],
    "alignmentScores": [ ... ],
    "businessImpacts": [ ... ]
  },
  "competitors": {
    "competitors": [ ... ],
    "feed": [ /* last 90 days */ ]
  },
  "conversations": [ /* all chat sessions + messages */ ],
  "documents": [ /* knowledge base */ ],
  "meetings": [ ... ]
}
```

### Task 5.2: Encryption Enhancement

**Current state:** `src/lib/encryption.ts` handles AES-256 for integration credentials only.

**Target state:** Extend to encrypt:
- All `@db.Text` fields in Vision models (North Star statement, descriptions, etc.)
- Competitor names and intelligence data
- Chat message content
- Meeting transcripts

**Implementation:** Use Prisma middleware for transparent encrypt/decrypt:

```typescript
// src/lib/prisma-encryption-middleware.ts
import { encrypt, decrypt } from './encryption';

const ENCRYPTED_FIELDS: Record<string, string[]> = {
  NorthStar: ['statement', 'context'],
  BusinessGoal: ['description'],
  TargetGroup: ['demographics', 'behaviors', 'goals', 'painPoints'],
  Competitor: ['description'],
  CompetitorFeed: ['summary', 'raw'],
  ChatMessage: ['content'],
  Meeting: ['transcript', 'summary'],
};

export function encryptionMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    // Encrypt on create/update
    if (['create', 'update', 'upsert'].includes(params.action)) {
      const fields = ENCRYPTED_FIELDS[params.model];
      if (fields) {
        for (const field of fields) {
          if (params.args.data?.[field]) {
            params.args.data[field] = encrypt(params.args.data[field]);
          }
        }
      }
    }

    const result = await next(params);

    // Decrypt on read
    if (result && ENCRYPTED_FIELDS[params.model]) {
      const fields = ENCRYPTED_FIELDS[params.model];
      const decryptRecord = (record: any) => {
        for (const field of fields) {
          if (record[field]) {
            try { record[field] = decrypt(record[field]); } catch {}
          }
        }
        return record;
      };

      if (Array.isArray(result)) return result.map(decryptRecord);
      if (typeof result === 'object') return decryptRecord(result);
    }

    return result;
  };
}
```

Register in `src/lib/db.ts`:
```typescript
prisma.$use(encryptionMiddleware());
```

### Task 5.3: Session Continuity

**Refactor chat to use persistent sessions.**

Changes to `src/components/views/ChatInterface.tsx`:
1. On page load: fetch `ChatSession` list for user (sidebar of past sessions)
2. Clicking a session loads its `ChatMessage[]` history
3. New chat creates a new `ChatSession`
4. AI generates session title after the 2nd message (like ChatGPT)
5. Sessions tagged with pillar context (vision/strategy/general)

Changes to `/api/chat/route.ts`:
1. Accept `sessionId` parameter
2. Store messages with `chatSessionId` foreign key
3. On first message without sessionId: create new ChatSession, return its id

### Task 5.4: User Profile UI

**File:** `src/components/views/ProfileView.tsx`

Sections:
- Profile info (name, email, avatar)
- Security (change password, 2FA placeholder, encryption key rotation)
- Data management (export all data, view storage usage)
- Account deletion (with verification flow)

**Route:** `/profile`

**Acceptance criteria:**
- [ ] Profile page renders at `/profile`
- [ ] Data export generates downloadable JSON
- [ ] Account deletion with email verification code
- [ ] Encryption middleware transparent on all specified fields
- [ ] Chat sessions persist across page reloads
- [ ] Session list in chat sidebar with history
- [ ] AI-generated session titles

---

## 9. Phase 6: Tactics Pillar (Coming Soon Scaffold)

**Goal:** Render a locked section with preview content. No functional code yet.

### Task 6.1: Tactics Coming Soon Page

**File:** `src/components/views/TacticsView.tsx`

A visually polished "Coming Soon" page that shows:
- Brief description of what Tactics will contain
- Preview cards for: Execution Orchestrator, Team Capacity Planner, Delivery Dashboard, Methodology Engine
- "Notify me" email capture (store in `UserSettingsRecord` or simple flag)
- Visual connection to Strategy pillar: "Your strategies will flow into tactical execution here"

**Route:** `/tactics`

**Acceptance criteria:**
- [ ] `/tactics` renders the coming soon page
- [ ] No functional backend for Tactics features
- [ ] Page clearly communicates future capability

---

## 10. Phase 7: Navigation & UX Overhaul

**Goal:** Reorganize sidebar into three pillars + platform utilities. Smooth transitions.

### Task 7.1: Refactor Sidebar

**File:** `src/components/layout/Sidebar.tsx`

New navigation structure:

```
┌─────────────────────────┐
│  ◇ AZMYRA 3.0           │
├─────────────────────────┤
│                         │
│  VISION (WHY)           │
│  ├── Vision Board       │  /vision
│  ├── Competitors Eye    │  /vision/competitors
│  └── Target Groups      │  /vision/audiences
│                         │
│  STRATEGY (WHAT)        │
│  ├── Portfolio          │  /strategy
│  ├── Roadmap            │  /strategy/roadmap
│  ├── Discovery          │  /strategy/discovery
│  ├── AI Evaluator       │  /strategy/evaluator
│  └── Risk Center        │  /strategy/risks
│                         │
│  TACTICS (HOW)          │
│  └── Coming Soon...     │  /tactics
│                         │
├─────────────────────────┤
│  PLATFORM               │
│  ├── AI Assistant       │  /chat
│  ├── Meetings           │  /meetings
│  ├── Dashboard          │  /dashboard
│  └── Settings           │  /settings
│                         │
├─────────────────────────┤
│  ◉ Profile & Security   │  /profile
│  🔔 Alerts (3)          │  opens AlertPanel
└─────────────────────────┘
```

**Visual design:**
- Each pillar section gets its brand color (Vision: gold, Strategy: teal, Tactics: purple)
- Active item has colored left border
- Collapsed state on mobile
- Pillar sections collapsible

### Task 7.2: Route Redirects

Create redirects for old routes:

```typescript
// src/middleware.ts — add redirect rules
const REDIRECTS: Record<string, string> = {
  '/initiatives': '/strategy',
  '/roadmap': '/strategy/roadmap',
  '/discovery': '/strategy/discovery',
  '/user-journey': '/vision/audiences',
  '/value-meter': '/vision',
};
```

### Task 7.3: Dashboard Refactor

**File:** `src/components/views/DashboardView.tsx`

The dashboard becomes a **three-pillar overview:**
- Vision section: North Star statement, VAS average, competitor alert count
- Strategy section: portfolio health (count by stage), top-scoring initiatives, latest evaluator results
- Alerts section: recent unread alerts
- Quick actions: same as before but reorganized by pillar

### Task 7.4: Vision Gate

If `user.visionComplete === false`, show a banner on every Strategy page: "Complete your Vision setup to unlock full strategy features" with link to `/vision`.

Strategy features remain accessible (backward compat for existing users) but VAS badges show "Not scored — set up Vision first."

**Acceptance criteria:**
- [ ] Sidebar renders three-pillar navigation
- [ ] Old routes redirect properly
- [ ] Dashboard shows pillar-organized overview
- [ ] Vision gate banner shows when vision incomplete
- [ ] Mobile sidebar works with collapsed sections

---

## 11. Phase 8: Smart Onboarding Refactor

**Goal:** Replace the 4-step wizard with a 5-step Vision-First onboarding.

### Task 8.1: Refactor Onboarding Wizard

**File:** `src/components/views/OnboardingWizard.tsx` (refactor existing)

**New steps:**

| Step | Title | What happens |
|------|-------|-------------|
| 1 | Identity | Company name, upload docs (pitch decks, about pages), paste URLs. Reuse `KnowledgeUploader.tsx` component. |
| 2 | North Star | AI extracts proposed North Star from Step 1 inputs. User refines. Calls `/api/vision/extract`. |
| 3 | Vision Build | AI proposes Business Goals, Target Groups, Needs, Products. User validates and edits. Pyramid takes shape. |
| 4 | Competitors | AI suggests competitors via `/api/competitors/suggest`. User confirms/adds. Competitors Eye activated. |
| 5 | Integrations | Same as current Step 2+3: Jira, Confluence, Slack setup + initial sync. |

**Existing components to reuse:**
- `WelcomeStep.tsx` → refactored into Identity step
- `IntegrationStep.tsx` → moved to Step 5
- `SyncStep.tsx` → merged into Step 5
- `CompletionStep.tsx` → replaced with "Your Azmyra is ready" showing the completed pyramid

**On completion:** Set `user.visionComplete = true`. Redirect to `/vision`.

**Acceptance criteria:**
- [ ] 5-step wizard works end-to-end
- [ ] AI extraction triggers on Step 2
- [ ] Pyramid builds interactively in Step 3
- [ ] Competitors suggested in Step 4
- [ ] Integrations work in Step 5
- [ ] `visionComplete` flag set on finish

---

## 12. Phase 9: Testing & Quality Gates

### Task 9.1: Unit Tests

Add/extend tests in `__tests__/`:

```
__tests__/
├── vision/
│   ├── vision-api.test.ts          # CRUD for all Vision models
│   ├── alignment-score.test.ts     # VAS computation logic
│   └── vision-extraction.test.ts   # AI extraction mocking
├── strategy/
│   ├── initiative-refactor.test.ts # Level filter, VAS integration
│   ├── business-impact.test.ts     # Impact calculation
│   └── cross-radar.test.ts         # Conflict/synergy detection
├── competitors/
│   ├── competitor-api.test.ts      # CRUD
│   ├── competitor-scan.test.ts     # Scan job logic
│   └── feed-aggregation.test.ts    # Feed timeline logic
├── autonomous/
│   ├── cron-scheduler.test.ts      # Job scheduling
│   ├── alert-generation.test.ts    # Alert creation from job results
│   └── cron-run-tracking.test.ts   # Run history
├── security/
│   ├── encryption-middleware.test.ts # Encrypt/decrypt roundtrip
│   ├── data-export.test.ts          # Export format validation
│   └── account-deletion.test.ts     # Cascading delete verification
└── session/
    ├── chat-session.test.ts         # Session persistence
    └── session-continuity.test.ts   # Cross-session message retrieval
```

**Testing patterns:**
- Use Vitest (already configured)
- Mock Prisma with `@prisma/client/testing` or jest-mock-extended
- Mock LLM calls — never call real APIs in tests
- Use factory functions for test data (avoid magic strings)
- Each test file should be self-contained (no shared state between tests)

### Task 9.2: Integration Tests

```
__tests__/integration/
├── vision-flow.test.ts        # Full flow: extract → build pyramid → compute VAS
├── strategy-evaluation.test.ts # Evaluate initiative with full context
├── competitor-scan-flow.test.ts # Scan → classify → store → alert
└── onboarding-flow.test.ts     # 5-step wizard end-to-end
```

### Task 9.3: Python Agent Tests

```
python-agents/tests/
├── test_scheduler.py          # APScheduler lifecycle
├── test_cron_jobs.py          # Each job with mocked LLM + DB
├── test_transversal_context.py # Context injection into agent prompts
└── test_vision_guard_agent.py  # New agent behavior
```

**Acceptance criteria:**
- [ ] All unit tests pass: `npx vitest run`
- [ ] All integration tests pass
- [ ] All Python tests pass: `pytest python-agents/tests/`
- [ ] Coverage >80% on new code
- [ ] No regressions on existing tests

---

## 13. Coding Standards & Conventions

### TypeScript

```typescript
// File naming: kebab-case
// Component naming: PascalCase
// Hook naming: use-kebab-case.ts → export function useKebabCase

// API route handler pattern:
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await prisma.modelName.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API_ROUTE_NAME]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

**Rules:**
- Always filter by `userId` — no exceptions.
- Always wrap DB calls in try/catch.
- Always validate input with zod schemas before processing.
- Never expose internal error details to the client.
- Use `console.error` with route-specific tags for debugging.
- Return consistent error shape: `{ error: string, details?: string }`.

### Python

```python
# File naming: snake_case
# Class naming: PascalCase
# Follow existing patterns in python-agents/

# Every async function should have timeout:
import asyncio

async def with_timeout(coro, timeout_seconds=30):
    return await asyncio.wait_for(coro, timeout=timeout_seconds)
```

**Rules:**
- Type hints on all function signatures.
- Docstrings on all public functions.
- Async everywhere — no blocking calls.
- Structured logging with `structlog` or `logging` with JSON format.

### Component Architecture

```
- Smart components (views) in src/components/views/
- Dumb components (UI) in src/components/{feature}/
- Shared primitives in src/components/ui/ (shadcn)
- All data fetching in Zustand actions or React Server Components
- No direct fetch() in components — use store actions or API utilities
```

### Token Optimization for LLM Calls

```
- Every LLM call MUST specify max_tokens appropriate to the task.
- Summary/classification tasks: max_tokens 500-1000
- Full analysis tasks: max_tokens 2000-4000
- Never send more context than needed — trim irrelevant fields from objects.
- Cache LLM results when input hasn't changed (use ContentVersion pattern).
- Track token usage per CronRun for cost monitoring.
- Use temperature 0.2-0.3 for analytical tasks, 0.5+ only for creative tasks.
```

---

## 14. File Structure (Target State)

```
virtual-ppo-ppm/
├── prisma/
│   ├── schema.prisma              # Extended with 3.0 models
│   ├── seed.ts                    # Updated seed data
│   └── migrations/                # 3.0 migration files
│
├── python-agents/
│   ├── main.py                    # FastAPI + scheduler startup
│   ├── config.py
│   ├── agents/
│   │   ├── registry.py            # 7 agents (added VisionGuard)
│   │   ├── orchestrator.py        # + transversal context injection
│   │   ├── loop.py
│   │   ├── prompts.py             # + TRANSVERSAL_CONTEXT template
│   │   ├── autonomy.py
│   │   └── types.py
│   ├── knowledge/
│   │   ├── rag.py
│   │   ├── chunker.py
│   │   └── ingest.py
│   ├── providers/
│   │   └── llm.py
│   ├── scheduler/                 # NEW
│   │   ├── __init__.py
│   │   ├── runner.py
│   │   ├── jobs/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── competitor_scan.py
│   │   │   ├── strategy_eval.py
│   │   │   ├── risk_reassess.py
│   │   │   ├── market_pulse.py
│   │   │   └── full_portfolio_review.py
│   │   └── registry.py
│   ├── tools/
│   │   └── mcp_client.py
│   └── tests/                     # NEW
│       ├── test_scheduler.py
│       ├── test_cron_jobs.py
│       ├── test_transversal_context.py
│       └── test_vision_guard_agent.py
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Redirects to /dashboard or /onboarding
│   │   ├── globals.css
│   │   ├── auth/signin/
│   │   ├── dashboard/             # Refactored from root page
│   │   │   └── page.tsx
│   │   ├── vision/                # NEW
│   │   │   ├── page.tsx           # Vision Board
│   │   │   ├── competitors/
│   │   │   │   └── page.tsx       # Competitors Eye
│   │   │   └── audiences/
│   │   │       └── page.tsx       # Target Groups (migrated)
│   │   ├── strategy/              # REFACTORED from /initiatives
│   │   │   ├── page.tsx           # Strategic Portfolio
│   │   │   ├── roadmap/
│   │   │   │   └── page.tsx
│   │   │   ├── discovery/
│   │   │   │   └── page.tsx
│   │   │   ├── evaluator/
│   │   │   │   └── page.tsx       # NEW: AI Evaluator
│   │   │   └── risks/
│   │   │       └── page.tsx       # NEW: Risk Center
│   │   ├── tactics/               # NEW (coming soon)
│   │   │   └── page.tsx
│   │   ├── chat/
│   │   ├── meetings/
│   │   ├── profile/               # NEW
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   ├── onboarding/            # Refactored: 5-step
│   │   ├── share/[token]/
│   │   ├── guide/
│   │   ├── swagger/
│   │   │
│   │   │── api/
│   │   │   ├── auth/
│   │   │   ├── chat/
│   │   │   ├── agents/actions/
│   │   │   ├── vision/            # NEW: all vision CRUD + extract + alignment
│   │   │   ├── strategy/          # NEW: impact, competitive-rank, cross-radar, evaluate
│   │   │   ├── competitors/       # NEW: CRUD + feed + suggest + scan
│   │   │   ├── alerts/            # NEW: list, read, dismiss
│   │   │   ├── profile/           # NEW: export, delete, encryption
│   │   │   ├── integrations/
│   │   │   ├── knowledge/
│   │   │   ├── market-research/
│   │   │   ├── data-pipeline/
│   │   │   ├── connectors/
│   │   │   ├── content-versions/
│   │   │   ├── meetings/
│   │   │   ├── onboarding/
│   │   │   ├── share/
│   │   │   └── llm/test/
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn (unchanged)
│   │   ├── views/
│   │   │   ├── DashboardView.tsx       # Refactored: 3-pillar overview
│   │   │   ├── VisionBoardView.tsx     # NEW
│   │   │   ├── CompetitorsEyeView.tsx  # NEW
│   │   │   ├── ChatInterface.tsx       # Refactored: session continuity
│   │   │   ├── InitiativesPipeline.tsx # Refactored: level filter, VAS
│   │   │   ├── RoadmapView.tsx         # Refactored: solution-level focus
│   │   │   ├── DiscoveryView.tsx       # Kept
│   │   │   ├── MeetingsView.tsx        # Kept
│   │   │   ├── SettingsView.tsx        # Extended: cron dashboard tab
│   │   │   ├── ProfileView.tsx         # NEW
│   │   │   ├── TacticsView.tsx         # NEW (coming soon)
│   │   │   ├── StrategyEvaluatorView.tsx # NEW
│   │   │   ├── RiskCenterView.tsx      # NEW
│   │   │   ├── OnboardingWizard.tsx    # Refactored: 5-step
│   │   │   ├── GettingStartedGuide.tsx # Updated
│   │   │   └── SwaggerView.tsx         # Kept
│   │   ├── vision/                # NEW
│   │   │   ├── NorthStarComposer.tsx
│   │   │   ├── VisionPyramid.tsx
│   │   │   ├── BusinessGoalCard.tsx
│   │   │   ├── TargetGroupCard.tsx
│   │   │   ├── NeedCard.tsx
│   │   │   ├── ProductMappingCard.tsx
│   │   │   ├── AlignmentBadge.tsx
│   │   │   ├── VisionExtractor.tsx
│   │   │   └── CompetitorsEyeWidget.tsx
│   │   ├── competitors/           # NEW
│   │   │   ├── CompetitorCard.tsx
│   │   │   ├── CompetitorFeedItem.tsx
│   │   │   ├── CompetitorFeedTimeline.tsx
│   │   │   ├── CompetitorAddDialog.tsx
│   │   │   ├── CompetitorCompareView.tsx
│   │   │   └── CompetitorRadar.tsx
│   │   ├── strategy/              # NEW
│   │   │   ├── BusinessImpactCard.tsx
│   │   │   ├── CompetitiveRankBadge.tsx
│   │   │   ├── CrossStrategyRadar.tsx
│   │   │   └── StrategyEvalCard.tsx
│   │   ├── alerts/                # NEW
│   │   │   ├── AlertBell.tsx
│   │   │   ├── AlertPanel.tsx
│   │   │   ├── AlertCard.tsx
│   │   │   └── AlertSettings.tsx
│   │   ├── profile/               # NEW
│   │   │   ├── DataExportButton.tsx
│   │   │   ├── AccountDeletion.tsx
│   │   │   └── EncryptionStatus.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx        # Refactored: 3-pillar nav
│   │   │   └── ErrorBoundary.tsx
│   │   ├── market-research/       # Kept
│   │   ├── editing/               # Kept
│   │   ├── knowledge/             # Kept
│   │   ├── landing/               # Kept
│   │   ├── onboarding/
│   │   │   ├── IdentityStep.tsx   # NEW (replaces WelcomeStep)
│   │   │   ├── NorthStarStep.tsx  # NEW
│   │   │   ├── VisionBuildStep.tsx # NEW
│   │   │   ├── CompetitorStep.tsx  # NEW
│   │   │   └── IntegrationStep.tsx # Kept (moved to Step 5)
│   │   ├── share/                 # Kept
│   │   └── providers/             # Kept
│   │
│   ├── lib/
│   │   ├── types.ts               # Extended with 3.0 types
│   │   ├── store.ts               # Extended with vision/strategy/alert slices
│   │   ├── auth.ts
│   │   ├── db.ts                  # + encryption middleware registration
│   │   ├── encryption.ts          # Extended: model-level encryption
│   │   ├── prisma-encryption-middleware.ts # NEW
│   │   ├── utils.ts
│   │   ├── sample-data.ts
│   │   ├── agents/
│   │   ├── mcp/
│   │   ├── tools/
│   │   └── services/
│   │       ├── llm.ts
│   │       ├── market-research.ts
│   │       ├── jira.ts
│   │       ├── confluence.ts
│   │       ├── slack.ts
│   │       ├── email.ts
│   │       ├── sync-agent.ts
│   │       ├── vision-alignment.ts     # NEW: VAS computation
│   │       ├── competitor-intelligence.ts # NEW: competitor query builder
│   │       └── data-pipeline/          # Kept + extended
│   │
│   ├── hooks/
│   │   ├── use-mobile.ts
│   │   ├── use-toast.ts
│   │   ├── use-alerts.ts         # NEW: alert polling
│   │   └── use-vision-gate.ts    # NEW: checks visionComplete
│   │
│   └── middleware.ts              # Extended: redirects + vision gate
│
├── __tests__/                     # Extended
│   ├── adapters-and-services.test.ts
│   ├── api-routes.test.ts
│   ├── data-pipeline.test.ts
│   ├── ui-components.test.tsx
│   ├── vision/                    # NEW
│   ├── strategy/                  # NEW
│   ├── competitors/               # NEW
│   ├── autonomous/                # NEW
│   ├── security/                  # NEW
│   ├── session/                   # NEW
│   └── integration/               # NEW
│
├── Dockerfile
├── docker-compose.yml             # + scheduler sidecar
├── cloudbuild.yaml
├── start.sh
├── next.config.ts
├── tailwind.config.ts
├── vitest.config.ts
├── tsconfig.json
├── components.json
└── package.json
```

---

## 15. Migration Checklist

Execute phases in order. Each phase has its own branch. Merge to main only after acceptance criteria pass.

```
Phase 0: Pre-Flight
  □ Prisma schema extended
  □ Migration runs clean
  □ Cron scheduler infrastructure in Python service
  □ All existing tests still pass

Phase 1: Vision Pillar
  □ Vision API routes (all CRUD + extract + alignment)
  □ Vision UI (NorthStarComposer, VisionPyramid, all cards)
  □ Zustand vision slice
  □ /user-journey → /vision/audiences redirect
  □ /value-meter → /vision redirect
  □ Vision tests pass

Phase 2: Strategy Pillar Refactor
  □ Initiative model extended (level, alignmentScore, competitiveRank)
  □ Initiatives Pipeline refactored (level filter, VAS badges)
  □ Roadmap refactored (solution-level focus)
  □ Strategy API routes (impact, competitive-rank, cross-radar, evaluate)
  □ VisionGuard agent added
  □ Transversal context injection in all agents
  □ Strategy tests pass

Phase 3: AI Backbone
  □ All 5 cron jobs implemented
  □ Alert system (API + UI)
  □ Cron dashboard in Settings
  □ Manual trigger endpoints
  □ Token tracking per run
  □ Autonomous tests pass

Phase 4: Competitors Eye
  □ Competitor CRUD API
  □ AI competitor suggestion
  □ Feed populated by cron
  □ Timeline UI with filters
  □ Widget on Vision Board
  □ Competitor tests pass

Phase 5: User Profile & Security
  □ Profile page with export/deletion
  □ Encryption middleware on all specified fields
  □ Chat session continuity
  □ Security tests pass

Phase 6: Tactics Scaffold
  □ Coming soon page at /tactics
  □ No backend needed

Phase 7: Navigation & UX
  □ Sidebar refactored to 3 pillars
  □ Route redirects working
  □ Dashboard 3-pillar overview
  □ Vision gate banner
  □ Mobile responsive

Phase 8: Smart Onboarding
  □ 5-step wizard works end-to-end
  □ AI extraction in Step 2
  □ Pyramid building in Step 3
  □ Competitor suggestion in Step 4
  □ visionComplete flag set

Phase 9: Testing & QA
  □ All unit tests pass
  □ All integration tests pass
  □ All Python tests pass
  □ Coverage >80% on new code
  □ No regressions
  □ Manual smoke test on staging
```

---

## Appendix A: Environment Variables (New)

Add to `.env`:

```env
# Existing (no changes)
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ENCRYPTION_KEY=

# New for 3.0
SCHEDULER_ENABLED=true              # Toggle cron scheduler
SCHEDULER_DEFAULT_TIMEZONE=UTC      # Cron timezone
COMPETITOR_SCAN_CRON=0 2 * * *      # Default: daily 2am
STRATEGY_EVAL_CRON=0 6 * * *        # Default: daily 6am
RISK_REASSESS_CRON=0 6 * * *        # Default: daily 6am
MARKET_PULSE_CRON=0 8 * * *         # Default: daily 8am
PORTFOLIO_REVIEW_CRON=0 2 * * 0     # Default: Sunday 2am
ALERT_POLL_INTERVAL_MS=60000        # Frontend alert polling
MAX_TOKENS_PER_CRON_RUN=10000       # Safety cap per job run
```

## Appendix B: Docker Compose (Updated)

```yaml
version: '3.8'
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: vppo
      POSTGRES_USER: vppo
      POSTGRES_PASSWORD: vppo
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://vppo:vppo@db:5432/vppo
      AGENT_SERVICE_URL: http://agents:8100
    depends_on:
      - db
      - agents

  agents:
    build:
      context: ./python-agents
    ports:
      - "8100:8100"
    environment:
      DATABASE_URL: postgresql://vppo:vppo@db:5432/vppo
      SCHEDULER_ENABLED: "true"
    depends_on:
      - db

volumes:
  pgdata:
```

**Note:** The scheduler runs inside the `agents` container — no separate sidecar needed unless you want to scale them independently.
