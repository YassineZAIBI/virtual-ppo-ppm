# SPRINT_BUGFIX.md — Data Integrity & Functional Bug Fixes
# Priority: CRITICAL — run before SPRINT_PERSONA, SPRINT_ARCHITECTURE, SPRINT_INTELLIGENCE
#
# HOW TO USE:
# 1. Run SANITY_CHECK.md first
# 2. In Claude Code:
#    "Read SPRINT_BUGFIX.md and execute every step in order.
#     Stop for: any schema diff, any deletion of existing data.
#     After all steps: run npx tsc --noEmit and show full report."
# 3. Run SANITY_CHECK.md after

---

## Issues addressed

1. Two default target groups appear for every new user
2. AI-generated target groups from business goals not reflected in TargetGroups section
3. Chat history showing for brand-new accounts
4. Integration section duplicates the Settings > Integrations sub-section

---

## Pre-flight

Read and report before touching anything:
1. prisma/schema.prisma — find TargetGroup model, list all fields
2. prisma/seed.ts — check if TargetGroup seed data exists
3. src/app/api/vision/target-groups/ — list all routes
4. src/app/api/vision/business-goals/ — list all routes
5. src/app/api/chat/ — check ChatMessage query for userId scoping
6. src/components/views/SettingsView.tsx — find integrations sub-section
7. src/app/integrations/page.tsx — confirm it exists (Sprint 5)
8. src/components/layout/Sidebar.tsx — find Integrations nav item

---

## Step 1 — Fix default target groups (seed data bug)

Read prisma/seed.ts in full.

If seed.ts creates any TargetGroup records for a default/demo user:
  Remove those records from the seed
  Only keep Initiative, Risk, Meeting seed records if they exist
  Do NOT delete user seed data

Also check: does the TargetGroup component/view have hardcoded fallback data?
  grep -rn "targetGroups.*=.*\[" src/components/ --include="*.tsx" | head -10
  If any hardcoded array literals with target group objects found:
    Remove them — return empty array [] as default

After fixing:
  Run: npm run db:seed on dev to confirm no default groups created
  Report: zero TargetGroup records for new users

Files to possibly modify: prisma/seed.ts, affected view/component

---

## Step 2 — Sync AI-generated target groups from business goals

When AI generates business goals, it sometimes creates target group references
in the goal descriptions or in the AI response. These need to be written to
the actual TargetGroup model.

Read src/app/api/vision/business-goals/route.ts — find the AI generation path.

The fix: after AI generates a business goal that references a target group,
extract the target group references and upsert them to TargetGroup:

```typescript
// After saving the business goal with AI-generated content
// Extract target groups mentioned in the goal's targetAudience or related fields
if (parsedGoal.targetAudience || parsedGoal.relatedPersonas) {
  const audiences = parsedGoal.targetAudience
    ? [parsedGoal.targetAudience].flat()
    : parsedGoal.relatedPersonas || [];

  for (const audience of audiences) {
    if (!audience?.name) continue;
    await db.targetGroup.upsert({
      where: { userId_name: { userId: session.user.id, name: audience.name } },
      create: {
        userId: session.user.id,
        name: audience.name,
        description: audience.description || '',
        role: audience.role || '',
        goals: JSON.stringify(audience.goals || []),
        painPoints: JSON.stringify(audience.painPoints || []),
        source: 'ai_generated',  // add this field — see Step 2b
      },
      update: {
        description: audience.description || '',
      },
    }).catch(console.error); // fire-and-forget, never break goal save
  }
}
```

### Step 2a — Check @@unique on TargetGroup

Read prisma/schema.prisma for TargetGroup.
If there is NO @@unique([userId, name]):
  STOP — show schema diff for adding it, wait for confirmation
  Then: npx prisma generate && npx prisma db push

### Step 2b — Add source field to TargetGroup

Add to TargetGroup model (if not present):
  source String @default("manual")
  // "manual" | "ai_generated" | "onboarding"

STOP: Show schema diff and wait for confirmation before db push.

### Step 2c — Update TargetGroupsView to show all sources

Read the TargetGroups view component.
Confirm it queries ALL target groups for the user regardless of source.
If it filters by source or has hardcoded conditions that exclude ai_generated:
  Remove the filter — show all groups.

Files to modify: business-goals route.ts, prisma/schema.prisma,
                 possibly TargetGroups view

---

## Step 3 — Fix chat history for new accounts

This is a userId scoping bug. Chat sessions or messages are being returned
without proper user isolation.

Read src/app/api/chat/route.ts — find ChatSession and ChatMessage queries.
Read src/app/api/chat/sessions/ or equivalent route.

Check each query:
  grep -n "chatSession\|chatMessage\|ChatSession\|ChatMessage" src/app/api/chat/ -r | head -20

For every findMany / findFirst call on ChatSession or ChatMessage:
  Confirm: where clause includes `userId: session.user.id`
  If missing: add it

Also check: does the chat UI component initialize with a default/demo session?
  grep -rn "defaultSession\|initialSession\|demoSession" src/components/ | head -10
  If found: remove the initialization — start with empty state

After fix: sign up as a new test user, open chat → zero history shown.

Files to modify: chat API routes, possibly chat view component

---

## Step 4 — Fix integration section duplication

Sprint 5 created a full Integrations Hub at /integrations.
Settings has a sub-section for integrations too.

Strategy: keep /integrations as the canonical page.
In Settings, replace the full integration UI with a summary card + link.

Read src/components/views/SettingsView.tsx — find the integrations section.
Read src/app/integrations/page.tsx — confirm it has the full hub.

In SettingsView.tsx, replace the full integrations section with:

```tsx
{/* Integrations — managed from dedicated page */}
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-sm font-medium">Integrations</CardTitle>
    <p className="text-xs text-muted-foreground">
      Connect Notion, Linear, GitHub, Jira, Slack and more
    </p>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between">
      <ConnectionStatusSummary />
      <Button variant="outline" size="sm" asChild>
        <a href="/integrations">Manage integrations →</a>
      </Button>
    </div>
  </CardContent>
</Card>
```

Create a small ConnectionStatusSummary component that:
  - Fetches GET /api/integrations/status
  - Shows N connected badges (e.g. "3 connected")
  - Returns null on error (non-critical)

Remove the full credential forms and connection UI from SettingsView.
The /integrations page is the single source of truth.

Files to modify: src/components/views/SettingsView.tsx
Files to create: src/components/settings/ConnectionStatusSummary.tsx

---

## Step 5 — TypeScript check and report

Run: npx tsc --noEmit

```
SPRINT BUGFIX REPORT

ISSUE 1 — Default target groups:
  Root cause: [seed data / hardcoded fallback / other]
  Fix: [what was removed/changed]
  Verified: [how]

ISSUE 2 — AI target group sync:
  Root cause: [AI response not written back to TargetGroup model]
  Schema change: [@@unique added / source field added]
  Fix: [which route was updated]
  Verified: [test scenario]

ISSUE 3 — Chat history for new users:
  Root cause: [missing userId scope / demo session initialization]
  Fix: [which query/component was fixed]
  Verified: [new account test]

ISSUE 4 — Integration duplication:
  Fix: [SettingsView now shows summary + link]
  Canonical page: /integrations
  Verified: [settings shows summary, /integrations shows full hub]

TYPESCRIPT: [0 new errors]

FILES CHANGED:
  [list]
```

---

## Commit

git add -A
git commit -m "fix: target group defaults, AI sync, chat history scope, integration dedup"
