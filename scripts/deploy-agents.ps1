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
