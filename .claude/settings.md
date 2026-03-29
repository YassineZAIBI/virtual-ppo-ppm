# Azmyra Hook Documentation

## Active Hooks

### PreToolUse — Edit|Write|MultiEdit
**Purpose:** Block direct commits to `main` branch.
**Behavior:** If current branch is `main`, blocks the edit with an explanatory message.
**Override:** Switch to a feature branch: `git checkout -b feat/your-feature`

### PreToolUse — Bash
**Purpose:** Guard against destructive shell commands.
**Script:** `.claude/hooks/guard-destructive.js`
**Blocks:** `DROP TABLE`, `DELETE FROM` without WHERE, `rm -rf /`, `prisma migrate reset` in production.

### PostToolUse — Edit|Write|MultiEdit (TypeScript)
**Purpose:** Run `tsc --noEmit` after any `.ts` / `.tsx` edit.
**Behavior:** Non-blocking — outputs type errors to Claude's context so it can fix them.
**Timeout:** 30s

### PostToolUse — Edit|Write (ESLint)
**Purpose:** Auto-fix ESLint issues after each edit.
**Behavior:** Runs `eslint --fix --quiet` on the modified file. Non-blocking.
**Timeout:** 15s

### PostToolUse — Edit|Write (Prisma reminder)
**Purpose:** Remind Claude to regenerate Prisma client after schema changes.
**Trigger:** Any write to `prisma/schema.prisma`
**Behavior:** Non-blocking feedback message.

### UserPromptSubmit — Skill evaluation
**Purpose:** Analyze every prompt and suggest relevant `.claude/skills/` to activate.
**Script:** `.claude/hooks/skill-eval.sh` → `.claude/hooks/skill-eval.js`
**Config:** `.claude/hooks/skill-rules.json`

---

## Hook Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success — continue |
| 2 | Block — PreToolUse only; stops the tool call |
| Other | Non-blocking error — Claude sees it but continues |

---

## Disabling Hooks (local only)

Add to `.claude/settings.local.json` (gitignored):
```json
{ "disableAllHooks": true }
```
