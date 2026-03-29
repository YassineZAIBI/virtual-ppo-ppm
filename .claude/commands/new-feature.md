---
description: Scaffold a complete new Azmyra feature. Pass the feature name and brief description as argument.
allowed-tools: Read, Glob, Grep, Bash(npx:*)
---

# /new-feature — Full Feature Scaffolding

**Feature:** `$ARGUMENTS`

## Step 1 — Pre-flight checks (read only)

1. Check `src/lib/types.ts` — do relevant types already exist?
2. Check `prisma/schema.prisma` — do relevant models already exist?
3. Check `src/app/api/` — is there an existing route to extend?
4. Check `src/components/views/` — is there a similar feature to reference?
5. List the 17 existing views: !`ls src/components/views/`

## Step 2 — Propose (output a plan, wait for approval)

```
FEATURE PLAN: [name]

WHAT IT DOES:
[2-sentence description]

NEW FILES TO CREATE:
- prisma/schema.prisma (changes: ...)
- src/lib/types.ts (add: ...)
- src/app/api/[feature]/route.ts
- src/components/views/[Feature]View.tsx
- src/app/[feature]/page.tsx

FILES TO MODIFY:
- src/components/layout/Sidebar.tsx (add nav item)
- [others if needed]

ESTIMATED SCOPE: [S / M / L]
READY TO PROCEED? (confirm before I write any code)
```

## Step 3 — Implement (only after approval)

Build in this order:
1. Schema changes → `npx prisma generate`
2. Types in `src/lib/types.ts`
3. API route(s) — auth guard → db → response
4. View component — loading / error / empty states required
5. Page file — server component + ErrorBoundary
6. Sidebar nav item (if user-facing)

## Step 4 — Handoff

```
IMPLEMENTED: [feature]
FILES CREATED: [list]
FILES MODIFIED: [list]
TO TEST: [manual test steps]
PRISMA: [run npx prisma generate if schema changed]
```
