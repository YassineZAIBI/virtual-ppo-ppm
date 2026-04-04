# SPRINT_UI.md — UI Audit + Enhancement
#
# HOW TO USE:
# 1. Run SANITY_CHECK.md first
# 2. In Claude Code:
#    "Read SPRINT_UI.md and execute every step in order.
#     Stop only for: new component creation, significant refactoring.
#     After all steps: run npx tsc --noEmit and show full report."
# 3. Run SANITY_CHECK.md after

---

## Context

18 views + 35+ feature components built across 6 sprints.
Some views built under time pressure lack: loading states, error handling,
empty states, mobile responsiveness, or consistent spacing.

This sprint audits every view systematically, fixes gaps, and updates
the UI SKILL.md with the patterns that work best for Azmyra.

Priority order based on user journey:
  1. Onboarding (first impression)
  2. Dashboard (daily landing)
  3. Portfolio/Initiatives (core value)
  4. Vision board (core value)
  5. All other views

---

## Pre-flight

Run /ui-audit command in Claude Code first.
That generates the audit table. Use it as your source of truth for Step 1.

Also read:
  .claude/skills/ui-components/SKILL.md — current patterns
  src/components/views/DashboardView.tsx — understand current dashboard
  src/components/views/OnboardingWizard.tsx — understand onboarding

---

## Step 1 — UI audit (run /ui-audit command)

This step IS the /ui-audit command. It reads every view and reports:

For each of the 18 views:
  Loading state: PASS / FAIL (Skeleton or spinner visible on mount)
  Error state: PASS / FAIL (error message + retry button)
  Empty state: PASS / FAIL (helpful CTA when list is empty)
  Toast: PASS / FAIL (success + error toasts on all mutations)
  Mobile: PASS / FAIL (no horizontal scroll on 375px viewport)
  Dark mode: PASS / FAIL (no hardcoded colors, uses CSS vars)

Output the audit table then stop. Wait for review before Step 2.

---

## Step 2 — Fix onboarding (highest priority)

Read src/components/views/OnboardingWizard.tsx and all step components in
src/components/onboarding/.

Issues to fix:

### NorthStarStep.tsx
  - After URL submission, show a loading spinner for the extraction duration
  - If extraction fails (400 or network error), show inline error with retry
  - Do not clear the form on error — preserve what the user typed

### CompetitorsStep.tsx
  - "Suggest competitors" button: if no North Star set, show a tooltip
    "Complete your North Star first" instead of a disabled button
  - Loading state while suggestions are being generated

### IntegrationStep.tsx
  - After successful connection, show checkmark badge on the integration card
  - If connection fails, show specific error message not generic "failed"

### CompletionStep.tsx
  - After completion, if brain context write fails, do NOT block the user
  - Show a dismissible warning: "Company brain setup will retry in background"

### General onboarding
  - Progress is saved to localStorage. On page reload, restore to the correct step.
  - Add step progress bar at top (steps 1/7, 2/7, etc.)

---

## Step 3 — Fix Dashboard

Read src/components/views/DashboardView.tsx.

Issues to fix:
  - InsightsPanel: if API returns empty, render nothing (already handles this — verify)
  - Each dashboard card must show Skeleton on initial load
  - "Recent initiatives" section: show empty state with CTA if no initiatives
  - Alerts bell: badge count must not render "0" — hide when zero
  - Dashboard should load data in parallel (Promise.all) not sequentially

Pattern to apply:
```typescript
const [initiatives, alerts, insights] = await Promise.all([
  fetch('/api/initiatives?limit=5').then(r => r.json()),
  fetch('/api/alerts?status=unread&limit=5').then(r => r.json()),
  fetch('/api/insights?status=new&limit=5').then(r => r.json()),
])
```

---

## Step 4 — Fix Portfolio / InitiativesPipeline

Read src/components/views/InitiativesPipeline.tsx.

Issues to fix:
  - Drag and drop between columns: confirm it persists to DB immediately
    (not just Zustand state). If optimistic update fails, toast + rollback.
  - Column headers: show count badge per column (e.g. "Discovery (3)")
  - Empty column: show "Drop initiatives here" placeholder
  - Initiative card: on click, open detail panel without full page navigation
  - Status filter: add "All" option to show all stages at once

---

## Step 5 — Fix Vision Board

Read src/components/views/VisionBoardView.tsx and src/components/vision/.

Issues to fix:
  - VisionPyramid: show loading state while pyramid is generating
  - If Generate Pyramid clicked with incomplete data, show specific message:
    "Add at least one North Star, Goal, and Target Group to generate"
  - AlignmentBadge: show tooltip explaining the score (what 85% means)
  - BusinessGoalCard: inline edit on double-click (avoid full dialog for quick edits)
  - Product Verticals section rename: confirm it shows "Product Verticals" not
    "Product & Solutions" (was a known bug from earlier discussion)

---

## Step 6 — Fix all remaining views (systematic pass)

For each view not covered above, apply the standard pattern:

Loading state (if missing):
```typescript
if (loading) return (
  <div className="p-6 space-y-4">
    {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
  </div>
)
```

Error state (if missing):
```typescript
if (error) return (
  <div className="flex flex-col items-center justify-center p-12 gap-4 text-center">
    <p className="text-sm text-destructive">{error}</p>
    <Button variant="outline" size="sm" onClick={fetchData}>Try again</Button>
  </div>
)
```

Empty state (if missing):
```typescript
if (items.length === 0) return (
  <div className="flex flex-col items-center justify-center p-12 gap-3 text-center">
    <p className="text-sm text-muted-foreground">No [items] yet</p>
    <Button size="sm" onClick={handleCreate}>Create your first [item]</Button>
  </div>
)
```

Toast on mutation (if missing):
```typescript
// On success:
toast.success('[Action] saved')
// On error:
toast.error('Failed to [action]. Please try again.')
```

Views to check: RiskCenterView, RoadmapView, MarketResearchView,
CompetitorView, MeetingsView, SettingsView, IntegrationsHubView,
UserJourneyView, ValueMeterView, TacticsView, BigPictureView

---

## Step 7 — Mobile responsiveness pass

For each view, check for these specific issues:

Tables: add horizontal scroll wrapper
```typescript
<div className="overflow-x-auto">
  <table>...</table>
</div>
```

Wide cards: ensure grid collapses to single column on mobile
```typescript
// Replace: grid-cols-3
// With: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```

Sidebar: confirm it collapses properly on mobile (Sidebar component handles this,
but verify no view overflows behind it)

Dialogs: confirm max-width on mobile
```typescript
<DialogContent className="max-w-[95vw] sm:max-w-lg" ...>
```

---

## Step 8 — Dark mode audit

Run this grep to find hardcoded colors:
```
grep -rn "text-gray-\|bg-gray-\|text-black\|bg-white\|border-gray-" \
  src/components/ --include="*.tsx" | grep -v "ui/" | head -20
```

For each result:
  Replace hardcoded colors with semantic CSS vars:
    text-gray-500 → text-muted-foreground
    text-gray-900 → text-foreground
    bg-white → bg-background
    border-gray-200 → border
    text-black → text-foreground

---

## Step 9 — Notification routing final verification

Confirm AlertPanel.tsx ENTITY_ROUTE_MAP includes all alert types:
  competitor_move → /competitors/[id]
  alignment_drift → /vision
  market_shift → /market-research
  action_required → /settings/cron (or pending actions)
  risk_escalation → /risks/[id]  ← new from Sprint 3
  workflow_complete → /initiatives/[id] ← new from Sprint 4

Add any missing alert types. Each route must use the entity id parameter.

---

## Step 10 — Update UI SKILL.md

Read current .claude/skills/ui-components/SKILL.md.
The skill was written before Sprint 3-5. Update it with:

  - InsightsPanel pattern (fire-and-forget, returns null when empty)
  - WorkflowLauncher pattern (dialog with multi-step state)
  - IntegrationCard pattern (connect/disconnect with status badge)
  - ProactiveInsight card pattern (priority color coding)
  - Standard loading/error/empty state templates (from this sprint)
  - Mobile-first grid patterns (grid-cols-1 sm: lg:)
  - AlertPanel routing pattern (ENTITY_ROUTE_MAP)

Also add a "Gotchas" section:
  - Radix Dialog uses grid — use inline flex style
  - Don't use text-gray-* — use semantic tokens
  - InsightsPanel must return null not empty div (affects layout)
  - Toast.promise() for async mutations (cleaner than separate toasts)
  - Skeleton count should match expected item count (3 for lists, 1 for detail)

---

## Step 11 — Final report

```
SPRINT UI REPORT

AUDIT RESULTS:
  Views with all 3 states (loading/error/empty): [N/18]
  Views with toast on mutations: [N/18]
  Views mobile-safe: [N/18]
  Views dark-mode clean: [N/18]

FIXES APPLIED:
  [View] — [what was fixed]

FILES MODIFIED:
  [list]

UI SKILL.md:
  [summary of what was added]

TYPESCRIPT: [0 new errors]

WHAT WAS NOT CHANGED:
  - No API routes modified
  - No schema changes
  - No Zustand store changes
  - No business logic changes — UI layer only
```

---

## Commit

git add -A
git commit -m "ui: Sprint UI — loading/error/empty states, mobile, dark mode, SKILL.md update"
