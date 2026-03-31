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
