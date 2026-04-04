# SPRINT_6.md — Meeting Bot VM + Faster-Whisper
#
# HOW TO USE:
# 1. Run SANITY_CHECK.md first (pre-sprint baseline)
# 2. In Claude Code:
#    "Read SPRINT_6.md and execute every step in order.
#     Stop only for: schema diffs, destructive operations, new file creation.
#     After all steps: run npx tsc --noEmit and show the full Sprint 6 report."
# 3. Run SANITY_CHECK.md again after
#
# NOTE: This sprint has manual GCP terminal steps at the bottom.
# Claude Code handles all code. You handle VM provisioning.

---

## Context

Sprints 0-5 delivered: company brain, proactive agents, multi-agent
workflows, Python agents on Cloud Run, full integration depth.

Meeting intelligence is the highest-frequency PM touchpoint.
Every standup, discovery call, and stakeholder review generates
context that should flow into the company brain automatically.

Current meeting-bot uses Zoom SDK — requires admin setup, Zoom only.
Sprint 6 replaces it with headless Playwright:
- Any platform (Teams, Zoom, Google Meet, Webex, GoTo)
- No admin consent, no platform accounts needed
- Joins as "Azmyra Bot" guest
- Faster-Whisper large-v3: 100+ languages, self-hosted, free
- Cost: ~$28/month flat, unlimited meetings

Architecture:
  Next.js → POST /api/meetings/bot/join
           → GCE VM bot service (:8200)
             → Playwright Chrome headless joins as guest
             → captures audio
             → Faster-Whisper transcribes
             → POSTs chunks to /api/meetings/bot/transcript
           → Communications agent generates summary + action items
           → BrainNode records (type: "decision", source: "meeting")

---

## Pre-flight: read these files first

1. meeting-bot/app.py — full current implementation
2. meeting-bot/ — list all files
3. prisma/schema.prisma — find Meeting model, list all fields exactly
4. src/app/api/meetings/ — list all route files
5. src/components/views/ — find meeting management view file
6. Dockerfile.agents — current state

Report everything. Do not proceed until done.

---

## Step 1 — Update Meeting model + add BotSession model

STOP: Show schema diff and wait for confirmation before db push.

Add to the existing Meeting model in prisma/schema.prisma
(only fields that do not already exist):

  botStatus           String   @default("idle")
  botPlatform         String   @default("")
  botJoinedAt         DateTime?
  botLeftAt           DateTime?
  botError            String   @default("")
  rawTranscript       String   @default("") @db.Text
  transcriptSegments  String   @default("[]")
  meetingUrl          String   @default("")
  recordingDuration   Int      @default(0)
  autoSummary         String   @default("") @db.Text
  autoActionItems     String   @default("[]")
  autoDecisions       String   @default("[]")

Add new model BotSession:

  model BotSession {
    id               String    @id @default(cuid())
    userId           String
    user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
    meetingId        String?
    meeting          Meeting?  @relation(fields: [meetingId], references: [id], onDelete: SetNull)
    platform         String    @default("unknown")
    meetingUrl       String    @default("")
    status           String    @default("pending")
    vmSessionId      String    @default("")
    wsUrl            String    @default("")
    transcriptChunks String    @default("[]") @db.Text
    errorMessage     String    @default("")
    startedAt        DateTime  @default(now())
    joinedAt         DateTime?
    endedAt          DateTime?
    createdAt        DateTime  @default(now())
    updatedAt        DateTime  @updatedAt

    @@index([userId, status])
    @@index([meetingId])
  }

Add to User model:   botSessions BotSession[]
Add to Meeting model: botSessions BotSession[]

After confirmation: npx prisma generate && npx prisma db push

Add to src/lib/types.ts:

  export type BotPlatform = 'zoom'|'teams'|'meet'|'webex'|'goto'|'unknown';
  export type BotStatus = 'idle'|'joining'|'recording'|'transcribing'|'completed'|'failed';
  export type BotSessionStatus = 'pending'|'joining'|'recording'|'processing'|'completed'|'failed';

  export interface TranscriptSegment {
    speaker: string; text: string; startTime: number; endTime: number;
  }

  export interface BotSessionData {
    id: string; userId: string; meetingId: string | null;
    platform: BotPlatform; meetingUrl: string; status: BotSessionStatus;
    vmSessionId: string; wsUrl: string; transcriptChunks: string;
    errorMessage: string; startedAt: Date; joinedAt: Date | null;
    endedAt: Date | null; createdAt: Date; updatedAt: Date;
  }

Files to modify: prisma/schema.prisma, src/lib/types.ts

---

## Step 2 — Rewrite meeting-bot/app.py for Playwright

STOP: Show full planned content and wait for confirmation.

Replace meeting-bot/app.py with a Playwright-based FastAPI service.

Requirements:
- FastAPI on PORT env var (default 8200)
- GET /health — returns status, playwright available, whisper available, active sessions
- POST /join — accepts meeting_url, meeting_title, user_id, meeting_id,
  callback_url, bot_name; returns session_id and status
- POST /leave/{session_id} — stops recording and closes browser
- GET /status/{session_id} — returns current session state

Platform-specific guest join logic for:
- Google Meet: fill name input, click "Ask to join" or "Join now"
- Teams: click "Continue on this browser", fill name, click "Join now"
- Zoom: click "join from your browser", fill name, click join
- Webex/GoTo/unknown: generic name fill + join button pattern

Audio capture: use Playwright's browser audio APIs or page.evaluate
to capture audio stream, write to temp WAV files every 15 seconds,
transcribe with Faster-Whisper, POST chunks to callback_url.

Transcription loop runs as asyncio background task.
When meeting ends or leave is called, send completion chunk to callback_url.

Error handling: if join fails, POST failure status to callback_url immediately.
All exceptions caught — never crash the FastAPI service.

Graceful fallback: if PLAYWRIGHT_AVAILABLE = False, return 503 on /join.
If WHISPER_AVAILABLE = False, transcription returns simulated text.

Imports wrapped in try/except for graceful degradation.
Whisper model loaded lazily on first use (not at startup).
WHISPER_MODEL env var controls model size (default: large-v3).

Files to modify: meeting-bot/app.py

---

## Step 3 — Update meeting-bot/requirements.txt

Replace or create meeting-bot/requirements.txt:

  fastapi>=0.104.0
  uvicorn[standard]>=0.24.0
  playwright>=1.40.0
  faster-whisper>=0.10.0
  httpx>=0.25.0
  python-dotenv>=1.0.0
  pydantic>=2.0.0

Files to modify: meeting-bot/requirements.txt

---

## Step 4 — Create Dockerfile.bot for GCE VM

Create Dockerfile.bot at project root.
This is separate from Dockerfile.agents — bot runs on VM not Cloud Run.

Base: python:3.11-slim
Install system deps: wget curl ffmpeg libsndfile1 libasound2 pulseaudio xvfb
and all Playwright system dependencies for Chromium.

Install Python deps from meeting-bot/requirements.txt.
Run: playwright install chromium && playwright install-deps chromium
Copy meeting-bot/ directory into /app.
ENV: PORT=8200, WHISPER_MODEL=large-v3, WHISPER_DEVICE=cpu, WHISPER_COMPUTE=int8
EXPOSE 8200
CMD: uvicorn app:app --host 0.0.0.0 --port 8200

Files to create: Dockerfile.bot

---

## Step 5 — Create src/lib/services/bot-service.ts

Create the Next.js client for talking to the VM bot service.

BOT_SERVICE_URL from process.env (default http://localhost:8200).
All fetch calls use AbortSignal.timeout (30s for join, 10s for others).

Export:
  joinMeeting(request: BotJoinRequest): Promise<BotJoinResponse>
    — POST /join with snake_case body, returns camelCase response

  leaveMeeting(sessionId: string): Promise<void>
    — POST /leave/{sessionId}

  getBotStatus(sessionId: string): Promise<BotStatusResponse>
    — GET /status/{sessionId}

  checkBotHealth(): Promise<boolean>
    — GET /health, returns true if reachable and ok, false on any error

  detectPlatform(url: string): string
    — client-side helper, mirrors Python detect_platform logic
    — returns: 'teams'|'zoom'|'meet'|'webex'|'goto'|'unknown'

All functions throw descriptive errors on non-ok responses.
checkBotHealth never throws — returns false on any failure.

Files to create: src/lib/services/bot-service.ts

---

## Step 6 — Create bot API routes

Create these 4 route files:

### src/app/api/meetings/bot/join/route.ts — POST
- Auth: getServerSession required
- Zod validation: meetingUrl (URL), meetingTitle (string), meetingId (optional string)
- Call checkBotHealth() — return 503 if unhealthy
- Detect platform from URL
- Build callbackUrl: process.env.NEXTAUTH_URL + /api/meetings/bot/transcript
- Create BotSession record in DB (status: pending)
- Call joinMeeting() from bot-service.ts
- Update BotSession with vmSessionId and status: joining
- Update Meeting record botStatus if meetingId provided
- Return: { success, botSessionId, vmSessionId, platform, status, message }
- On error: update BotSession status to failed, return 500

### src/app/api/meetings/bot/transcript/route.ts — POST
- NO user auth — called by VM bot service
- Validate BOT_SECRET header if process.env.BOT_SECRET is set
- Find BotSession by vmSessionId + userId from body
- If status === "completed":
    - Assemble full transcript from accumulated chunks
    - Fire-and-forget: call processMeetingTranscript()
- If status === "failed": update BotSession status to failed
- If text chunk: append to BotSession.transcriptChunks JSON array
- Always return { success: true }

processMeetingTranscript (internal async function):
  - Assemble and sort chunks by index
  - Build system prompt using buildAgentContext(userId, 'communications')
  - Call LLM with Communications agent prompt to extract:
    summary, actionItems[], decisions[], topics[]
  - Use OPENAI_API_KEY env var as fallback if no user LLM config
  - Update Meeting record: rawTranscript, autoSummary, autoActionItems, autoDecisions
  - Write each decision as BrainNode (type: "decision", source: "meeting")
  - Write ProactiveInsight if actionItems.length > 0
  - Update BotSession status to completed
  - All DB writes wrapped in .catch(() => {})

### src/app/api/meetings/bot/leave/route.ts — POST
- Auth: getServerSession required
- Zod: { botSessionId: string }
- Find BotSession owned by current user
- Call leaveMeeting(vmSessionId) — ignore errors
- Update BotSession: status completed, endedAt now
- Return { success: true }

### src/app/api/meetings/bot/status/[sessionId]/route.ts — GET
- Auth: getServerSession required
- Find BotSession by id + userId
- Parse transcriptChunks, sort by index
- Return BotSession data + transcriptText (chunks joined) + chunkCount

Files to create (4 files):
- src/app/api/meetings/bot/join/route.ts
- src/app/api/meetings/bot/transcript/route.ts
- src/app/api/meetings/bot/leave/route.ts
- src/app/api/meetings/bot/status/[sessionId]/route.ts

---

## Step 7 — Add Bot Join UI to Meeting Management view

Read the meeting management view. Show it before modifying.

Add to the view component:
- State: botSessionId, botStatus, meetingUrlInput, isPolling
- handleBotJoin(meeting): POST to /api/meetings/bot/join,
  set botSessionId, start polling /api/meetings/bot/status/[id] every 5s
  until status is completed or failed, then stop polling
- handleBotLeave(): POST to /api/meetings/bot/leave with botSessionId

UI additions per meeting card/row:
- URL input (if meeting.meetingUrl is empty)
- "Join with bot" button (shown when botStatus is idle or not this meeting)
- Status indicator: Joining... / Recording... / Processing... / Done
- "Leave" button (shown only when botStatus === 'recording')
- After completion: show link to view transcript/summary

Do not modify any other logic in the view.
Show exactly what you will change before applying.

---

## Step 8 — Add env vars and update CLAUDE.md

Add to .env.example:
  BOT_SERVICE_URL=http://YOUR_VM_IP:8200
  BOT_SECRET=your-random-secret-32-chars

Add to CLAUDE.md Known Fragile Areas table:
  Bot service — runs on GCE VM only, never Cloud Run (needs persistent process)
  Bot transcript route — validated by BOT_SECRET header not NextAuth session
  Whisper load time — first request after VM restart takes 30-60s (model loading)
  Platform join flows — guest join selectors change frequently; update join_as_guest if bot fails

Files to modify: .env.example, CLAUDE.md

---

## Step 9 — TypeScript check and full Sprint 6 report

Run: npx tsc --noEmit

Produce Sprint 6 report:

  SCHEMA CHANGES: Meeting fields added, BotSession model added
  FILES CREATED: list all new files
  FILES MODIFIED: list all changed files
  TYPESCRIPT: [0 new / list any new errors]

  MANUAL STEPS REQUIRED (run after this report — see MANUAL STEPS section):
  M1 Provision GCE e2-medium VM
  M2 Open firewall port 8200
  M3 SSH in and install Python + Playwright + Whisper model
  M4 Start systemd service
  M5 Set BOT_SERVICE_URL on Cloud Run
  M6 Test health endpoint
  M7 End-to-end test with a live Google Meet link

---

## MANUAL STEPS — Run in terminal after Claude Code finishes

### M1 — Provision GCE VM

```powershell
$GCLOUD = "C:\Users\yassi\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"

& $GCLOUD compute instances create azmyra-bot `
  --project=theproductowner-8620d `
  --zone=us-central1-a `
  --machine-type=e2-medium `
  --boot-disk-size=30GB `
  --boot-disk-type=pd-standard `
  --image-family=debian-12 `
  --image-project=debian-cloud `
  --tags=azmyra-bot
```

### M2 — Open firewall port 8200

```powershell
& $GCLOUD compute firewall-rules create azmyra-bot-8200 `
  --project=theproductowner-8620d `
  --allow=tcp:8200 `
  --target-tags=azmyra-bot `
  --source-ranges=0.0.0.0/0
```

### M3 — Get VM external IP (save this)

```powershell
& $GCLOUD compute instances describe azmyra-bot `
  --project=theproductowner-8620d `
  --zone=us-central1-a `
  --format="value(networkInterfaces[0].accessConfigs[0].natIP)"
```

### M4 — SSH and set up VM

```powershell
& $GCLOUD compute ssh azmyra-bot --project=theproductowner-8620d --zone=us-central1-a
```

Inside the VM:

```bash
# Update system and install base deps
sudo apt-get update && sudo apt-get install -y python3-pip python3-venv git ffmpeg libsndfile1

# Install Python packages
pip3 install fastapi uvicorn playwright faster-whisper httpx python-dotenv pydantic

# Install Playwright + Chromium (2-3 min)
python3 -m playwright install chromium
python3 -m playwright install-deps chromium

# Download Whisper large-v3 model (5-10 min, ~3GB)
python3 -c "from faster_whisper import WhisperModel; WhisperModel('large-v3'); print('Model ready')"

# Get your meeting-bot code onto the VM — choose one:
# Option A: clone from GitHub
git clone https://YOUR_REPO_URL.git && cd virtual-ppo-ppm/meeting-bot

# Option B: copy via gcloud scp (run from your LOCAL machine)
# gcloud compute scp meeting-bot/app.py azmyra-bot:~/app.py --zone=us-central1-a --project=theproductowner-8620d
```

### M5 — Create systemd service on VM

```bash
sudo tee /etc/systemd/system/azmyra-bot.service > /dev/null << 'EOF'
[Unit]
Description=Azmyra Bot Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/meeting-bot
Environment=PORT=8200
Environment=WHISPER_MODEL=large-v3
Environment=WHISPER_DEVICE=cpu
Environment=WHISPER_COMPUTE=int8
ExecStart=/usr/bin/python3 -m uvicorn app:app --host 0.0.0.0 --port 8200
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable azmyra-bot
sudo systemctl start azmyra-bot
sudo systemctl status azmyra-bot
```

### M6 — Test health endpoint

```bash
curl http://VM_IP:8200/health
# Expected: {"status":"ok","service":"azmyra-bot","playwright":true,"whisper":true,"active_sessions":0}
```

### M7 — Set env vars on Cloud Run

```powershell
& $GCLOUD run services update azmyra-app `
  --region us-central1 `
  --project theproductowner-8620d `
  --set-env-vars "BOT_SERVICE_URL=http://VM_IP:8200,BOT_SECRET=your-random-secret"
```

### M8 — End-to-end test

1. Go to meet.google.com — start a free meeting (no account needed as host)
2. Copy the meeting link
3. In Azmyra Meeting Management → paste link → "Join with bot"
4. Watch status change: Joining → Recording
5. Speak for 30 seconds
6. End the meeting
7. Check DB: SELECT "rawTranscript", "autoSummary" FROM "Meeting" LIMIT 1;

---

## Cost summary

  GCE e2-medium (2 vCPU, 4GB RAM, 24/7):  ~$26/mo
  Boot disk 30GB pd-standard:               ~$1.20/mo
  Network egress:                            ~$1/mo
  Total:                                     ~$28/mo flat, unlimited meetings
