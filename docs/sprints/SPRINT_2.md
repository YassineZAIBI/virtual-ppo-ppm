# SPRINT_2.md — Deploy Python Agents to Cloud Run
# 
# HOW TO USE:
# In Claude Code, type exactly:
# "Read SPRINT_2.md and execute every step in order.
#  Stop only for: schema diffs, destructive operations.
#  After all steps: run npx tsc --noEmit and show full report."

---

## Context

Azmyra's Python FastAPI agent service (6 AI agents) runs only via
docker-compose locally. It is not deployed to Cloud Run. Every agent
call in production currently falls back to a direct LLM call because
AGENT_SERVICE_URL is unreachable.

This sprint deploys the agent service as a second Cloud Run service
alongside the existing azmyra-app, and wires Cloud Scheduler to
trigger all cron jobs.

GCP project: theproductowner-8620d
Region: us-central1
Existing service: azmyra-app
New service: azmyra-agents

---

## Pre-flight: read these files first

Before touching any code, read:
1. meeting-bot/app.py — understand the current FastAPI structure
2. Dockerfile.agents — understand the current container setup
3. cloudbuild.yaml — understand the existing build pattern
4. src/app/api/cron/ — list all cron route files
5. src/app/api/chat/route.ts lines around AGENT_SERVICE_URL usage

Report what you find before proceeding to Step 1.

---

## Step 1 — Fix meeting-bot/app.py for Cloud Run

Cloud Run injects PORT env var. The service must respect it.

Make these changes to meeting-bot/app.py:

### 1a — Add health endpoint

Find the FastAPI app instance (likely `app = FastAPI()`).
Add this endpoint immediately after app initialization:

```python
@app.get("/health")
async def health():
    return {"status": "ok", "service": "azmyra-agents"}
```

### 1b — Fix port binding

Find the uvicorn.run() call or the if __name__ == "__main__" block.
Replace hardcoded port with:

```python
import os

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8100))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

If there is no __main__ block and the service is started via CMD in
Dockerfile, skip this — we will fix it in Step 2 instead.

### 1c — Verify no other hardcoded ports

Search meeting-bot/app.py for any hardcoded "8100". Replace each with
os.environ.get("PORT", "8100").

Files to modify: meeting-bot/app.py
Run after: nothing yet — Step 2 updates the Dockerfile

---

## Step 2 — Update Dockerfile.agents for Cloud Run

Show me the current Dockerfile.agents content first.
Then apply these changes:

Requirements for the updated Dockerfile.agents:
- Base image: python:3.11-slim (lighter than full python)
- WORKDIR /app
- Copy meeting-bot/requirements.txt first (for Docker layer caching)
- RUN pip install --no-cache-dir -r requirements.txt
- Copy meeting-bot/ directory contents into /app
- ENV PORT 8080
- EXPOSE 8080
- CMD: uvicorn app:app --host 0.0.0.0 --port $PORT

If meeting-bot/requirements.txt does not exist, check for any
requirements file in the meeting-bot directory and use that.
If none exists, create meeting-bot/requirements.txt with:
  fastapi>=0.104.0
  uvicorn>=0.24.0
  httpx>=0.25.0
  python-dotenv>=1.0.0

Show the full updated Dockerfile.agents before applying.
Wait for my confirmation.

Files to modify: Dockerfile.agents, possibly meeting-bot/requirements.txt

---

## Step 3 — Create cloudbuild-agents.yaml

Create a new file at project root: cloudbuild-agents.yaml

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'gcr.io/theproductowner-8620d/azmyra-agents:$COMMIT_SHA'
      - '-t'
      - 'gcr.io/theproductowner-8620d/azmyra-agents:latest'
      - '-f'
      - 'Dockerfile.agents'
      - '.'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/theproductowner-8620d/azmyra-agents:$COMMIT_SHA'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'gcr.io/theproductowner-8620d/azmyra-agents:latest'

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'azmyra-agents'
      - '--image'
      - 'gcr.io/theproductowner-8620d/azmyra-agents:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--port'
      - '8080'
      - '--memory'
      - '2Gi'
      - '--cpu'
      - '2'
      - '--min-instances'
      - '0'
      - '--max-instances'
      - '3'
      - '--timeout'
      - '300'

images:
  - 'gcr.io/theproductowner-8620d/azmyra-agents:$COMMIT_SHA'
  - 'gcr.io/theproductowner-8620d/azmyra-agents:latest'
```

Files to create: cloudbuild-agents.yaml

---

## Step 4 — Add CRON_SECRET validation to all cron routes

List all files in src/app/api/cron/.

For EACH cron route file found, add secret header validation
at the very top of the POST handler, immediately after the
opening of the function body:

```typescript
// Validate cron secret — rejects calls not from Cloud Scheduler
const cronSecret = req.headers.get('x-cron-secret');
if (cronSecret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Rules:
- Add AFTER any existing imports and INSIDE the handler function
- Do not remove any existing auth logic — add this BEFORE it
- Do not modify any other logic in the cron routes
- If a route already has cron secret validation, skip it

Show me the list of cron files found and confirm each one
was updated before proceeding.

Files to modify: all files in src/app/api/cron/

---

## Step 5 — Add CRON_SECRET to environment type definitions

Search the codebase for where environment variables are typed
or documented (likely .env.example or a types file).

Add CRON_SECRET to .env.example:
```
# Cron job secret — must match Cloud Scheduler header value
# Generate with: openssl rand -hex 32
CRON_SECRET=your-random-32-char-secret-here
```

Also add to the environment variables section of CLAUDE.md
under the Required section:
```
CRON_SECRET                   # Secret header for Cloud Scheduler auth
AGENT_SERVICE_URL             # Already exists — confirm it is listed
```

Files to modify: .env.example, CLAUDE.md

---

## Step 6 — Verify chat/route.ts handles agent service failure gracefully

Read src/app/api/chat/route.ts.

Confirm:
1. AGENT_SERVICE_URL is read from process.env
2. There is a try/catch around the fetch to the agent service
3. The fallback LLM path executes when agent service is unreachable
4. The timeout on the agent service fetch call is reasonable (suggest 30s)

If the fetch to AGENT_SERVICE_URL has no timeout, add one:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

const agentResponse = await fetch(`${AGENT_SERVICE_URL}/agent/chat`, {
  // ... existing options ...
  signal: controller.signal,
});

clearTimeout(timeoutId);
```

Only add the timeout if it does not already exist.
Do not change any other logic.

Files to possibly modify: src/app/api/chat/route.ts

---

## Step 7 — Create deployment helper script

Create a new file: scripts/deploy-agents.ps1

This script helps deploy the agent service manually from Windows PowerShell.

```powershell
# Azmyra Agent Service — Manual Deploy Script
# Run from project root: .\scripts\deploy-agents.ps1

$GCLOUD = "C:\Users\yassi\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$PROJECT = "theproductowner-8620d"
$REGION = "us-central1"
$SERVICE = "azmyra-agents"
$IMAGE = "gcr.io/$PROJECT/$SERVICE"

Write-Host "=== Building and deploying $SERVICE ===" -ForegroundColor Cyan

# Step 1: Submit build
Write-Host "`n[1/3] Submitting Cloud Build..." -ForegroundColor Yellow
& $GCLOUD builds submit `
  --config cloudbuild-agents.yaml `
  --project $PROJECT

if ($LASTEXITCODE -ne 0) {
  Write-Host "Build failed. Exiting." -ForegroundColor Red
  exit 1
}

# Step 2: Get service URL
Write-Host "`n[2/3] Getting service URL..." -ForegroundColor Yellow
$SERVICE_URL = & $GCLOUD run services describe $SERVICE `
  --region $REGION `
  --project $PROJECT `
  --format "value(status.url)"

Write-Host "Agent service URL: $SERVICE_URL" -ForegroundColor Green

# Step 3: Test health endpoint
Write-Host "`n[3/3] Testing health endpoint..." -ForegroundColor Yellow
try {
  $health = Invoke-WebRequest -Uri "$SERVICE_URL/health" -UseBasicParsing
  Write-Host "Health check: $($health.Content)" -ForegroundColor Green
} catch {
  Write-Host "Health check failed: $_" -ForegroundColor Red
  Write-Host "Service may be starting up. Try manually: $SERVICE_URL/health"
}

Write-Host "`n=== Next steps ===" -ForegroundColor Cyan
Write-Host "1. Set env vars on azmyra-agents:"
Write-Host "   $GCLOUD run services update $SERVICE --region $REGION --project $PROJECT --set-env-vars 'DATABASE_URL=...,CRON_SECRET=...'"
Write-Host ""
Write-Host "2. Set AGENT_SERVICE_URL on azmyra-app:"
Write-Host "   $GCLOUD run services update azmyra-app --region $REGION --project $PROJECT --set-env-vars 'AGENT_SERVICE_URL=$SERVICE_URL'"
Write-Host ""
Write-Host "3. Create Cloud Scheduler jobs (see SPRINT_2_SCHEDULER.md)"
```

Files to create: scripts/deploy-agents.ps1

---

## Step 8 — Create Cloud Scheduler setup script

Create a new file: scripts/setup-scheduler.ps1

```powershell
# Azmyra Cloud Scheduler Setup
# Run AFTER deploy-agents.ps1 and after setting env vars
# Usage: .\scripts\setup-scheduler.ps1 -AppUrl "https://your-app.run.app" -CronSecret "your-secret"

param(
  [Parameter(Mandatory=$true)]
  [string]$AppUrl,
  
  [Parameter(Mandatory=$true)]
  [string]$CronSecret
)

$GCLOUD = "C:\Users\yassi\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
$PROJECT = "theproductowner-8620d"
$LOCATION = "us-central1"
$HEADERS = "x-cron-secret=$CronSecret,Content-Type=application/json"

function Create-Job {
  param($Name, $Schedule, $Path)
  
  Write-Host "Creating job: $Name ($Schedule)" -ForegroundColor Yellow
  
  & $GCLOUD scheduler jobs create http $Name `
    --location $LOCATION `
    --project $PROJECT `
    --schedule $Schedule `
    --uri "$AppUrl/api/cron/$Path" `
    --http-method POST `
    --headers $HEADERS `
    --message-body "{}" `
    --time-zone "UTC" `
    --attempt-deadline 300s `
    2>&1
    
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  Created successfully" -ForegroundColor Green
  } else {
    Write-Host "  May already exist — updating instead" -ForegroundColor Yellow
    & $GCLOUD scheduler jobs update http $Name `
      --location $LOCATION `
      --project $PROJECT `
      --schedule $Schedule `
      --uri "$AppUrl/api/cron/$Path" `
      --http-method POST `
      --headers $HEADERS `
      --message-body "{}" `
      --time-zone "UTC" `
      --attempt-deadline 300s
  }
}

Write-Host "=== Setting up Cloud Scheduler jobs ===" -ForegroundColor Cyan

Create-Job "azmyra-competitor-scan"  "0 */6 * * *"  "competitor-scan"
Create-Job "azmyra-strategy-eval"    "0 8 * * *"    "strategy-eval"
Create-Job "azmyra-risk-reassess"    "0 9 * * *"    "risk-reassess"
Create-Job "azmyra-market-pulse"     "0 */12 * * *" "market-pulse"
Create-Job "azmyra-portfolio-review" "0 7 * * 1"    "portfolio-review"

Write-Host "`n=== All scheduler jobs created ===" -ForegroundColor Cyan
Write-Host "View in console: https://console.cloud.google.com/cloudscheduler?project=$PROJECT"
Write-Host ""
Write-Host "To manually trigger a job:"
Write-Host "  $GCLOUD scheduler jobs run azmyra-competitor-scan --location $LOCATION --project $PROJECT"
```

Files to create: scripts/setup-scheduler.ps1

---

## Step 9 — TypeScript check and final report

Run: npx tsc --noEmit

Then provide a complete Sprint 2 report:

```
SPRINT 2 REPORT

FILES MODIFIED:
- [list each file and what changed]

FILES CREATED:
- [list each new file and its purpose]

MANUAL STEPS REQUIRED (cannot be automated):
1. Run: .\scripts\deploy-agents.ps1
2. Set env vars on azmyra-agents (DATABASE_URL, CREDENTIALS_ENCRYPTION_KEY, CRON_SECRET)
3. Set AGENT_SERVICE_URL on azmyra-app
4. Run: .\scripts\setup-scheduler.ps1 -AppUrl "https://..." -CronSecret "..."

VERIFICATION STEPS:
1. curl https://[agent-service-url]/health → should return {"status":"ok"}
2. Send chat message → check Cloud Run logs → should show Python agent handling it
3. Trigger scheduler job manually → check cron route returns 200

TYPESCRIPT: [0 errors / N pre-existing errors]
```

---

## What Claude Code cannot do (you must run these manually)

These require your GCP credentials and cannot be executed by Claude Code:

1. gcloud builds submit (Step 4a in the manual plan)
2. gcloud run services update --set-env-vars (Step 4b, 4d)
3. gcloud scheduler jobs create (Step 5)

The scripts/deploy-agents.ps1 and scripts/setup-scheduler.ps1 files
created in Steps 7 and 8 wrap all of these into runnable PowerShell scripts.

After Claude Code completes Steps 1-8, you run two PowerShell scripts
and Sprint 2 is deployed.
