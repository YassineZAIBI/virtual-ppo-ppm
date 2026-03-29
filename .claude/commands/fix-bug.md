---
description: Systematic bug investigation and fix for Azmyra. Pass the bug description or error message as argument.
allowed-tools: Read, Grep, Glob, Bash(git:*), Bash(npm:*)
---

# /fix-bug — Systematic Debug Workflow

**Bug:** `$ARGUMENTS`

## Phase 1 — Reproduce (understand before touching code)

1. State the bug in one sentence: what happens vs what should happen
2. Identify the surface: API route / component / service / agent / DB query
3. Find the relevant files via grep on the error message or function name
4. Read those files — do not guess

## Phase 2 — Isolate

Check in order:
- **Prisma JSON fields** — is `.map()` / `.length` called on a raw string? → `JSON.parse()` needed
- **Auth** — is `getServerSession()` returning null unexpectedly?
- **LLM config** — is it missing from request body?
- **Type mismatch** — run `npx tsc --noEmit 2>&1 | head -30`
- **Import** — is a relative import used instead of `@/`?
- **Async** — is an `await` missing on a Prisma call?

## Phase 3 — Fix

State exactly what you will change and why. Wait for confirmation if the fix touches more than 2 files.

Make the minimal change that fixes the issue. Do not refactor unrelated code.

## Phase 4 — Verify

- Run: `npx tsc --noEmit` — must have 0 errors
- Run: `npm run test -- --related` — must pass
- Describe how to manually verify the fix in the browser

## Phase 5 — Report

```
BUG: [one-sentence description]
ROOT CAUSE: [what was actually wrong]
FIX: [what was changed]
FILES CHANGED: [list]
VERIFIED BY: [how]
```
