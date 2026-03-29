---
description: Full pull request review before merge. Reviews diff, checks for regressions, validates conventions.
allowed-tools: Bash(git:*), Read, Grep
---

# /pr-review — Pull Request Review

## Step 1 — Diff overview
```bash
git diff main...HEAD --stat
git diff main...HEAD
```

## Step 2 — Apply review standards

Read `.claude/agents/code-reviewer.md` and apply its full checklist to every changed file.

## Step 3 — Check for regressions

- Does any change affect shared utilities in `src/lib/`?
- Does any change affect `prisma/schema.prisma`? If so — migration notes?
- Does any change affect the auth flow in `src/lib/auth.ts`?
- Does any change affect encryption in `src/lib/encryption.ts`?

## Step 4 — Output PR summary

```
## PR Summary

**Branch:** [branch name]
**Changes:** [X files, +Y -Z lines]

### What this PR does
[2-3 sentence description]

### Files changed
- `[file]` — [reason]

### Review result
[CRITICAL issues / WARNINGS / clean]

### Merge recommendation
✅ Ready to merge / ⚠️ Fix before merge / ❌ Needs rework
```
