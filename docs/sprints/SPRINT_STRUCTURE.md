# SPRINT_STRUCTURE.md — Project Structure Optimization
#
# HOW TO USE:
# 1. Run SANITY_CHECK.md first (pre-sprint baseline)
# 2. In Claude Code:
#    "Read SPRINT_STRUCTURE.md and execute every step in order.
#     Stop only for: file moves that break imports, deletions.
#     After all steps: run npx tsc --noEmit && npm run build and show report."
# 3. Run SANITY_CHECK.md after

---

## Context

The project hierarchy reveals several structural issues accumulated
over 6 sprints. This sprint cleans them without changing any behavior.
Every change is a move, rename, delete, or consolidation — no new features.

---

## Pre-flight: read these files first

1. Run: ls *.md — count root-level markdown files
2. Run: cat src/lib/prisma-encryption-middleware.ts | head -10
3. Run: ls src/lib/auth/
4. Run: ls scripts/
5. Run: grep -rn "prisma-encryption-middleware" src/ --include="*.ts" | head -10
6. Run: ls __tests__/ | wc -l
7. git status — confirm clean working tree before starting

Report all findings. Do not proceed until confirmed.

---

## Step 1 — Clean root-level document clutter

The root directory has 10+ markdown files. Only CLAUDE.md belongs at root.
Everything else moves to docs/.

Create docs/sprints/ directory.
Move these files INTO docs/sprints/:
  SPRINT_2.md → docs/sprints/SPRINT_2.md
  SPRINT_3.md → docs/sprints/SPRINT_3.md
  SPRINT_4.md → docs/sprints/SPRINT_4.md
  SPRINT_5.md → docs/sprints/SPRINT_5.md
  SPRINT_6.md → docs/sprints/SPRINT_6.md
  SPRINT_STRUCTURE.md → docs/sprints/SPRINT_STRUCTURE.md (this file, after reading)
  SPRINT_TESTING.md → docs/sprints/SPRINT_TESTING.md
  SPRINT_UI.md → docs/sprints/SPRINT_UI.md

Move these to docs/:
  AZMYRA_3.0_REFACTORING_SPEC.md → docs/AZMYRA_3.0_REFACTORING_SPEC.md
  PLAN.md → docs/PLAN.md
  STATUS.md → docs/STATUS.md
  PROJECT_STATUS.md → docs/PROJECT_STATUS.md
  PROJECT_SUMMARY.md → docs/PROJECT_SUMMARY.md
  SANITY_CHECK.md → docs/SANITY_CHECK.md

Keep at root (these must stay):
  CLAUDE.md ← auto-loaded by Claude Code
  README.md ← GitHub convention
  SETUP.md ← new developer setup
  LICENSE

After moving, update CLAUDE.md to reflect new docs/ location:
  Add a line: "Sprint specs: docs/sprints/ · Sanity check: docs/SANITY_CHECK.md"

---

## Step 2 — Remove legacy encryption middleware

Read src/lib/prisma-encryption-middleware.ts.
Read src/lib/db.ts to confirm it uses $extends not the old middleware.

If db.ts does NOT import prisma-encryption-middleware.ts:
  Delete src/lib/prisma-encryption-middleware.ts
  Confirm: grep -rn "prisma-encryption-middleware" src/ → zero results

If db.ts still imports it:
  Show me the import line and stop — do not delete until confirmed safe.

---

## Step 3 — Clean empty directories

Run: ls src/lib/auth/
If empty: rmdir src/lib/auth/
Update any import that references @/lib/auth/ (should be @/lib/auth.ts directly)

Run: grep -rn "from '@/lib/auth/'" src/ --include="*.ts" --include="*.tsx"
If any results found: fix each to import from '@/lib/auth' (no trailing slash)

---

## Step 4 — Move root utility scripts

Move these files from root to scripts/:
  insert_snapshot.ps1 → scripts/insert_snapshot.ps1
  test-adapters.ts → scripts/test-adapters.ts

Add to .gitignore:
  dev-error.log
  dev-output.log

Delete if present: dev-error.log, dev-output.log

---

## Step 5 — Clean prisma/dev.db

This SQLite file should not be committed (it is a development artifact).

Check: git ls-files prisma/dev.db
If tracked by git:
  git rm --cached prisma/dev.db
  Add to .gitignore: prisma/dev.db

---

## Step 6 — Add missing Claude Code slash commands

The project now has testing and UI sprints but no corresponding commands.
Add these to .claude/commands/:

### .claude/commands/test-all.md
```markdown
---
description: Run the full Azmyra test suite and report coverage gaps.
allowed-tools: Bash(npm:*), Read, Grep, Glob
---
# /test-all — Full Test Suite Runner

Run: npm run test 2>&1

Report:
1. Total tests: passing / failing / skipped
2. Any new failures vs baseline
3. Coverage gaps — list of API routes in src/app/api/ with no corresponding test
4. Coverage gaps — list of view components with no test

Do NOT fix failures during this command — report only.
```

### .claude/commands/ui-audit.md
```markdown
---
description: Audit all Azmyra views for missing loading, error, and empty states. Check mobile responsiveness and dark mode.
allowed-tools: Read, Grep, Glob
---
# /ui-audit — UI Completeness Audit

Read .claude/skills/ui-components/SKILL.md first.

For each view in src/components/views/:
1. Check: loading state (Skeleton or spinner)
2. Check: error state with retry action
3. Check: empty state with call-to-action
4. Check: uses cn() not string concatenation
5. Check: Radix dialogs use inline style not Tailwind grid
6. Check: toast for all mutation success/error

Output as a table:
| View | Loading | Error | Empty | Notes |
|------|---------|-------|-------|-------|

Flag views that need work. Do NOT fix during audit — report only.
```

---

## Step 7 — Consolidate duplicate type definitions

Read src/lib/types.ts and src/lib/agents/types.ts.

Check: are any types in agents/types.ts already defined in types.ts?
If yes: move them to types.ts (the canonical location) and update the import.
If agents/types.ts becomes empty after moving: delete it.

Update any imports that referenced @/lib/agents/types to @/lib/types.

---

## Step 8 — Update CLAUDE.md scale context

The CLAUDE.md Scale Context table is outdated. Update it to reflect current state:

| Metric | Count | Action Required |
|--------|-------|----------------|
| API routes | 105 | Check existing before creating |
| Prisma models | 40 | Check schema.prisma before any DB change |
| Data adapters | 33 | Check adapters/index.ts before adding |
| Python agents | 6 | See python-agents/ directory |
| TypeScript types | 700+ lines | Check types.ts before creating new types |
| shadcn/ui components | 50+ | Check components/ui/ before adding |
| Services | 20 | Check services/ before creating new |
| Integration services | 4 | notion.ts, linear.ts, github.ts, jira.ts |
| Integration API routes | 4 | connect, disconnect, status, notion/ingest |
| Test files | 18 | See __tests__/ |
| View components | 18 | See components/views/ |

Also update Known Fragile Areas to remove outdated entries:
- Remove "Meeting bot: Zoom SDK only" (it now uses Playwright via app.py)
- Keep all others

---

## Step 9 — TypeScript check + build

Run: npx tsc --noEmit
Run: npm run build

Both must exit clean (or with only pre-existing errors).
If any new errors from file moves: fix each import path before declaring done.

---

## Step 10 — Full report

```
SPRINT STRUCTURE REPORT

FILES MOVED:
- [original path] → [new path]

FILES DELETED:
- [file] — reason

DIRECTORIES REMOVED:
- [dir] — reason

COMMANDS ADDED:
- .claude/commands/test-all.md
- .claude/commands/ui-audit.md

TYPES CONSOLIDATED:
- [what moved and from where to where]

CLAUDE.md UPDATED:
- Scale Context: [what changed]
- Known Fragile Areas: [what changed]
- Sprint location: docs/sprints/

TYPESCRIPT: [0 new errors / list any]
BUILD: [PASS / FAIL]

WHAT DID NOT CHANGE:
- Zero behavior changes
- Zero API route changes
- Zero schema changes
- Zero component logic changes
```

---

## Commit

git add -A
git commit -m "refactor: project structure cleanup — docs/, removed legacy files, added commands"
