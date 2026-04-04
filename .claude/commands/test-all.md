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
