---
description: Deep orientation into any Azmyra feature area before starting work. Use at the start of every session.
allowed-tools: Read, Glob, Grep, Bash(git:*)
---

# /onboard — Session Orientation

Your task: orient yourself on `$ARGUMENTS` before any code is written.

## Steps

1. **Current state**
   - Recent commits: !`git log --oneline -10`
   - Modified files: !`git status --short`
   - Current branch: !`git branch --show-current`

2. **Feature area scan**
   - Find all files related to `$ARGUMENTS` in `src/`
   - Read the most relevant view component and its API route(s)
   - Check `src/lib/types.ts` for related types
   - Check `prisma/schema.prisma` for related models

3. **Output a session brief**
   ```
   WORKING ON: [feature]
   BRANCH: [current branch]
   
   KEY FILES:
   - [file] — [what it does]
   
   RELATED MODELS: [model names]
   RELATED TYPES: [type names]
   
   OPEN QUESTIONS (if any):
   - [anything unclear before starting]
   
   READY TO: [what you can now do]
   ```

Do not write any code. Output the brief only.
