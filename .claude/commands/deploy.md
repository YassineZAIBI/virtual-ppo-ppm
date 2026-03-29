---
description: Prepare and execute a production deployment to GCP Cloud Run. Runs pre-deploy checks before triggering build.
allowed-tools: Bash(git:*), Bash(npm:*), Bash(npx:*), Read
---

# /deploy — Production Deployment to Cloud Run

## Pre-Deploy Checklist

### 1. Build integrity
```bash
npm run build 2>&1 | tail -20
```
Must exit 0. Fix any errors before continuing.

### 2. Type check
```bash
npx tsc --noEmit 2>&1 | head -20
```
Must have 0 errors.

### 3. Git state
- Current branch: !`git branch --show-current`
- Uncommitted changes: !`git status --short`
- Last 5 commits: !`git log --oneline -5`

If there are uncommitted changes, stop and ask the user to commit first.

### 4. Prisma schema sync check
Read `prisma/schema.prisma` — confirm no pending unapplied changes exist.

## Deploy

If all checks pass, output the deploy commands for the user to run manually:

```bash
# Windows (Cloud SDK path)
C:\Users\yassi\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd builds submit \
  --config cloudbuild.yaml \
  --project theproductowner-8620d

# After build completes:
C:\Users\yassi\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd run deploy azmyra-app \
  --image gcr.io/theproductowner-8620d/azmyra-app:latest \
  --region us-central1 \
  --project theproductowner-8620d
```

## Post-Deploy Verification

After the user confirms deployment:
1. Check https://ai.theproductowner.org is responding
2. Verify the last feature deployed works end-to-end

## Important Notes
- `start.sh` runs `prisma db push --accept-data-loss` automatically on container start
- Python agent service is NOT on Cloud Run — runs via docker-compose locally
- Cron jobs need Cloud Scheduler trigger — they do not self-trigger on Cloud Run
