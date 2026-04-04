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
