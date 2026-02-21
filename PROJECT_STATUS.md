# Virtual PPO/PPM — Project Status & Deployment Guide

**Version**: 2.0.0
**Date**: February 14, 2026
**Stack**: Next.js 16 + React 19 + Python FastAPI (Hybrid Architecture)

---

## Table of Contents

1. [Product Overview](#product-overview)
2. [Architecture](#architecture)
3. [Feature Summary](#feature-summary)
4. [AI Agent System](#ai-agent-system)
5. [Database Schema](#database-schema)
6. [API Routes](#api-routes)
7. [Pages & UI Components](#pages--ui-components)
8. [Integration Services](#integration-services)
9. [Knowledge Base](#knowledge-base)
10. [Build Status](#build-status)
11. [Environment Variables](#environment-variables)
12. [Git Setup & Push](#git-setup--push)
13. [Docker Packaging](#docker-packaging)
14. [Cloud Deployment](#cloud-deployment)

---

## Product Overview

**Virtual PPO (Proxy Product Owner)** is an AI-powered Product Portfolio Management platform that acts as an autonomous product management assistant. It manages initiatives, meetings, risks, roadmaps, and stakeholder communications through 6 specialized AI agents that can read, analyze, and take action across Jira, Confluence, Slack, and email — all gated by configurable autonomy levels.

### Key Capabilities

- **Multi-Agent AI System**: 6 specialized agents (Strategy, Discovery, Risk, Communications, Expert Advisor, Thinker) with autonomous tool execution
- **Autonomy Control**: 4 levels (Full, Oversight, Advisory, Manual) controlling how independently agents act
- **Integration Hub**: Jira, Confluence, Slack, Email (SMTP) — full CRUD with test-connection flows
- **Knowledge Base**: File uploads (PDF, DOCX, TXT, MD, CSV, XLSX) + URL scraping with RAG retrieval
- **Onboarding Wizard**: 7-step guided setup (Welcome → Jira → Confluence → Slack → Sync → Context → Complete)
- **Share Links**: Temporary guest access with commenting for stakeholder review
- **Portfolio Views**: Dashboard, Initiatives, Roadmap, Meetings, Risk Register, Value Meter, Discovery, User Journey

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Browser (React 19)              │
│  Zustand Store ─── shadcn/ui ─── Tailwind CSS   │
└──────────────────────┬──────────────────────────┘
                       │ HTTP
┌──────────────────────▼──────────────────────────┐
│           Next.js 16 App Router (Port 3000)      │
│  ┌─────────────┐  ┌──────────┐  ┌────────────┐  │
│  │  13 Pages   │  │ 26 APIs  │  │  Prisma ORM │  │
│  └─────────────┘  └────┬─────┘  └──────┬─────┘  │
│                        │               │         │
│  ┌─────────────────────▼──┐    ┌───────▼──────┐  │
│  │  MCP Tool Client       │    │  SQLite(dev) │  │
│  │  (9 tool definitions)  │    │  Postgres    │  │
│  └─────────────────────┬──┘    │  (prod)      │  │
│                        │       └──────────────┘  │
└────────────────────────┼─────────────────────────┘
                         │ HTTP (fallback path)
┌────────────────────────▼─────────────────────────┐
│        Python FastAPI Service (Port 8100)         │
│  ┌────────────┐  ┌───────────┐  ┌─────────────┐  │
│  │ 6 Agents   │  │ Agentic   │  │ Knowledge   │  │
│  │ Registry   │  │ Loop      │  │ Ingestion   │  │
│  └────────────┘  └───────────┘  └─────────────┘  │
│  ┌────────────┐  ┌───────────┐  ┌─────────────┐  │
│  │ Orchestr.  │  │ Autonomy  │  │ RAG Search  │  │
│  │ (routing)  │  │ Gate      │  │             │  │
│  └────────────┘  └───────────┘  └─────────────┘  │
└──────────────────────────────────────────────────┘
         │
         ▼ HTTP
  ┌──────────────────────┐
  │  External Services   │
  │  • Jira REST API v3  │
  │  • Confluence API    │
  │  • Slack API         │
  │  • SMTP (Email)      │
  │  • LLM Providers     │
  │    (OpenAI/Anthropic │
  │     Gemini/Azure/    │
  │     Z-AI/Ollama)     │
  └──────────────────────┘
```

### Hybrid Architecture

| Layer | Technology | Port | Purpose |
|-------|-----------|------|---------|
| Frontend | React 19 + Zustand + shadcn/ui | 3000 | SPA with client-side state |
| Backend | Next.js 16 App Router | 3000 | API routes, SSR, auth, DB |
| Agent Service | Python FastAPI | 8100 | Agent orchestration, RAG, knowledge ingestion |
| Database | SQLite (dev) / PostgreSQL (prod) | — | Prisma ORM, 16 models |

**Fallback Mode**: If the Python service is unreachable, the Next.js API falls back to direct single-agent LLM calls without agent specialization.

---

## Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Dashboard | Complete | Portfolio overview with initiative status, risk matrix, recent meetings |
| AI Chat | Complete | Agent-aware chat with tool execution, source attribution, pending actions |
| Initiatives | Complete | CRUD for product initiatives with RICE scoring, status pipeline |
| Meetings | Complete | Meeting management with transcript processing, action items, summaries |
| Roadmap | Complete | Timeline view of roadmap items with drag-and-drop |
| Risk Register | Complete | Risk matrix (Probability × Impact), FMEA-style tracking |
| Value Meter | Complete | Business value scoring and prioritization dashboard |
| Discovery | Complete | Research & discovery tracking for product hypotheses |
| User Journey | Complete | Visual user journey mapping |
| Settings | Complete | LLM provider config, integration credentials, autonomy controls |
| Onboarding Wizard | Complete | 7-step setup: Welcome → Jira → Confluence → Slack → Sync → Context → Complete |
| Share Links | Complete | Temporary guest access with commenting for stakeholders |
| Knowledge Base | Complete | File upload (PDF/DOCX/TXT/MD/CSV/XLSX) + URL scraping with RAG |
| Multi-Agent System | Complete | 6 specialized agents with agentic loop and autonomy gating |
| Auth | Complete | NextAuth.js with credentials provider, registration, session management |
| API Documentation | Complete | Interactive Swagger/API explorer page |

---

## AI Agent System

### 6 Specialized Agents

| Agent | Role | Temperature | Tools | PM Frameworks |
|-------|------|------------|-------|---------------|
| **Strategy** | Prioritization & alignment | 0.3 | jira_search, jira_get, jira_create, confluence_search, confluence_create | RICE, WSJF, OKR alignment, Now/Next/Later |
| **Discovery** | Research & validation | 0.5 | confluence_search, confluence_create | JTBD, Porter's 5 Forces, Opportunity Solution Trees |
| **Risk** | Risk identification & mitigation | 0.3 | jira_search, slack_post, confluence_search | Risk matrix (P×I), FMEA, escalation rules |
| **Communications** | Stakeholder updates | 0.5 | ALL 9 tools | Stakeholder matrix, RACI, email templates |
| **Expert Advisor** | Strategic guidance | 0.7 | NONE (advisory only) | Agile/SAFe/Lean, unit economics, TAM/SAM/SOM |
| **Thinker** | Cross-source synthesis | 0.4 | Read tools + slack_post | Systems thinking, source attribution, gap analysis |

### Agentic Loop

```
User Message → Orchestrator (keyword match 80% / LLM classify 20%)
  → Selected Agent → LLM Call → Parse ```tool blocks
    → Autonomy Gate:
      - Full: auto-execute
      - Oversight: queue for approval (read-only tools auto-execute)
      - Advisory: describe what would happen
      - Manual: block all tools
    → Feed tool results back → Next iteration (max 5)
  → Response with: content, toolsExecuted[], pendingActions[], sources[]
```

### 9 MCP Tools

| Tool | Type | Description |
|------|------|-------------|
| `jira_search` | Read | Search Jira issues with JQL |
| `jira_get` | Read | Fetch single Jira issue details |
| `jira_create` | Write | Create new Jira issue |
| `jira_comment` | Write | Add comment to Jira issue |
| `confluence_search` | Read | Search Confluence pages |
| `confluence_create` | Write | Create Confluence page |
| `slack_post` | Write | Post message to Slack channel |
| `slack_meeting_summary` | Write | Post meeting summary to Slack |
| `email_send` | Write | Send email via SMTP |

---

## Database Schema

**16 Prisma models** across SQLite (dev) / PostgreSQL (prod):

| Model | Purpose |
|-------|---------|
| `User` | Authentication & user profile |
| `Account` | OAuth provider accounts |
| `Session` | Active sessions |
| `VerificationToken` | Email verification tokens |
| `UserSettingsRecord` | LLM config, integrations, autonomy level (encrypted credentials) |
| `Initiative` | Product initiatives with RICE scoring |
| `Meeting` | Meetings with transcripts, summaries, action items |
| `Risk` | Risk register entries (severity, probability, impact) |
| `ChatMessage` | Chat history with agent metadata and source attribution |
| `Document` | Uploaded/generated documents |
| `OnboardingProgress` | Per-user onboarding wizard state |
| `SyncRecord` | External sync tracking (Jira/Confluence/Slack imports) |
| `ShareLink` | Temporary guest access links |
| `ShareComment` | Guest comments on shared resources |
| `PendingAction` | Agent tool actions awaiting user approval |
| `KnowledgeDocument` | Uploaded files and scraped URLs for RAG |

---

## API Routes

### 26 API Endpoints

**Authentication** (2)
- `POST /api/auth/[...nextauth]` — NextAuth.js handler
- `POST /api/auth/register` — User registration

**Chat & Agents** (3)
- `POST /api/chat` — Main chat endpoint (orchestrator entry point)
- `GET/POST /api/agents/actions` — Pending actions CRUD
- `POST /api/llm/test` — Test LLM provider connection

**Integrations** (8)
- `GET/POST /api/integrations/jira` — Jira operations
- `POST /api/integrations/jira/test` — Test Jira connection
- `GET/POST /api/integrations/confluence` — Confluence operations
- `POST /api/integrations/confluence/test` — Test Confluence connection
- `GET/POST /api/integrations/slack` — Slack operations
- `POST /api/integrations/slack/test` — Test Slack connection
- `POST /api/integrations/email` — Send email
- `POST /api/integrations/email/test` — Test SMTP connection

**Onboarding** (4)
- `GET/PUT /api/onboarding/status` — Onboarding progress
- `POST /api/onboarding/test-connection` — Test integration during onboarding
- `POST /api/onboarding/sync` — Import data from connected services
- `POST /api/onboarding/complete` — Mark onboarding complete

**Share** (4)
- `POST /api/share` — Create share link
- `GET /api/share/[token]` — Access shared resource
- `POST /api/share/[token]/comments` — Add guest comment
- `POST /api/share/[token]/revoke` — Revoke share link

**Knowledge** (3)
- `GET/DELETE /api/knowledge` — List/delete knowledge documents
- `POST /api/knowledge/upload` — Upload file (multipart)
- `POST /api/knowledge/scrape` — Scrape URL content

**Other** (2)
- `GET /api` — Health check / API info
- `POST /api/meetings` — Meeting operations

---

## Pages & UI Components

### 13 Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Portfolio overview |
| `/auth/signin` | Sign In | Authentication page |
| `/chat` | AI Chat | Agent-aware chat interface |
| `/initiatives` | Initiatives | Initiative pipeline management |
| `/meetings` | Meetings | Meeting management |
| `/roadmap` | Roadmap | Timeline roadmap view |
| `/settings` | Settings | LLM, integrations, autonomy |
| `/swagger` | API Docs | Interactive API documentation |
| `/user-journey` | User Journey | Journey mapping |
| `/value-meter` | Value Meter | Business value scoring |
| `/discovery` | Discovery | Research & hypothesis tracking |
| `/onboarding` | Onboarding | 7-step setup wizard |
| `/share/[token]` | Guest View | Public shared resource view |

### 75 React Components

Organized under `src/components/`:
- `ui/` — 25+ shadcn/ui primitives (Button, Card, Dialog, Select, etc.)
- `views/` — Full-page view components (Dashboard, ChatInterface, Settings, etc.)
- `onboarding/` — WelcomeStep, IntegrationStep, SyncStep, CompletionStep
- `knowledge/` — KnowledgeUploader (reused in onboarding + chat)
- `share/` — ShareButton, ShareDialog, guest view components
- `layout/` — Sidebar, AppLayout, Providers

---

## Integration Services

### TypeScript Services (`src/lib/services/`)

| Service | File | Methods |
|---------|------|---------|
| **JiraService** | `jira.ts` | getProjects, getIssues, getIssue, createIssue, updateIssue, transitionIssue, getTransitions, addComment, searchIssues |
| **ConfluenceService** | `confluence.ts` | getSpaces, getPages, getPage, createPage, updatePage, searchContent |
| **SlackService** | `slack.ts` | postMessage, getChannelInfo, getChannelHistory, postMeetingSummary |
| **EmailService** | `email.ts` | sendEmail, sendMeetingFollowUp |
| **LLMService** | `llm.ts` | create (factory), chat — supports OpenAI, Anthropic, Gemini, Azure, Z-AI, Ollama |
| **SyncAgent** | `sync-agent.ts` | preview, execute — bulk import from Jira/Confluence/Slack |

### Python Services (`python-agents/`)

| Module | Files | Purpose |
|--------|-------|---------|
| `agents/` | types, registry, prompts, orchestrator, loop, autonomy | 6-agent system with routing and gating |
| `knowledge/` | ingest, chunker, rag | File parsing, URL scraping, RAG retrieval |
| `providers/` | llm | Multi-provider LLM client (OpenAI, Anthropic, Gemini, Azure, Z-AI, Ollama) |
| `tools/` | mcp_client | Tool definitions, execution, parsing |

---

## Knowledge Base

### Ingestion Paths

| Path | Supported Types | Limits |
|------|----------------|--------|
| **File Upload** | PDF, DOCX, TXT, MD, CSV, XLSX | Max 3 files, 5MB each |
| **URL Scraping** | Public HTML pages | Max 10 URLs, no auth required |

### Processing Pipeline

```
Input (file or URL)
  → Text extraction (pdf-parse, python-docx, cheerio)
  → Chunking (~500 words, 50-word overlap)
  → Store in KnowledgeDocument table
  → Available to all agents via RAG module
  → Source-attributed in responses: [File: report.pdf] or [URL: wiki.com/page]
```

---

## Build Status

```
✅ npm run build — 0 errors
✅ npx prisma generate — 16 models generated
✅ npx prisma db push — All tables created (SQLite)
✅ 36 routes compiled (13 pages + 26 API routes)
```

**Build output**: `.next/` directory with static + server-side rendered pages.

---

## Environment Variables

See `.env.example` for all required variables. Key groups:

| Group | Variables | Required |
|-------|----------|----------|
| NextAuth | `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Yes |
| Database | `DATABASE_URL` | Yes |
| LLM | `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` or others | At least one |
| Jira | `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` | Optional |
| Confluence | `CONFLUENCE_BASE_URL`, `CONFLUENCE_EMAIL`, `CONFLUENCE_API_TOKEN` | Optional |
| Slack | `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` | Optional |
| Email | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Optional |
| Security | `CREDENTIALS_ENCRYPTION_KEY` | Production |

---

## Git Setup & Push

### Initialize Repository

```bash
cd virtual-ppo-ppm

# Initialize git
git init

# Stage all files
git add .

# Initial commit
git commit -m "v2.0.0 — Virtual PPO/PPM with multi-agent autonomous system

- 6 specialized AI agents (Strategy, Discovery, Risk, Communications, Advisor, Thinker)
- Hybrid architecture: Next.js 16 + Python FastAPI
- Jira, Confluence, Slack, Email integrations
- Knowledge base with file upload + URL scraping
- 7-step onboarding wizard
- Share links with guest commenting
- 4-level autonomy control (Full/Oversight/Advisory/Manual)
- 16 Prisma models, 26 API endpoints, 13 pages"

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/virtual-ppo-ppm.git

# Push
git branch -M main
git push -u origin main
```

### Repository Structure

```
virtual-ppo-ppm/
├── src/
│   ├── app/                    # Next.js App Router (pages + API)
│   │   ├── api/                # 26 API route handlers
│   │   ├── auth/signin/        # Auth pages
│   │   ├── chat/               # AI chat page
│   │   ├── initiatives/        # Initiative management
│   │   ├── meetings/           # Meeting management
│   │   ├── roadmap/            # Roadmap view
│   │   ├── settings/           # Configuration
│   │   ├── onboarding/         # Setup wizard
│   │   ├── share/[token]/      # Guest access
│   │   └── ...                 # Other pages
│   ├── components/             # 75 React components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── views/              # Full-page views
│   │   ├── onboarding/         # Wizard steps
│   │   ├── knowledge/          # Knowledge uploader
│   │   └── share/              # Share components
│   └── lib/                    # Core libraries
│       ├── services/           # Jira, Confluence, Slack, Email, LLM
│       ├── agents/             # Agent types (TypeScript)
│       ├── mcp/                # MCP tool definitions + client
│       ├── store.ts            # Zustand state management
│       └── types.ts            # Shared types
├── python-agents/              # Python FastAPI service
│   ├── agents/                 # 6 agents + orchestrator + loop
│   ├── knowledge/              # Ingestion + RAG
│   ├── providers/              # Multi-provider LLM
│   ├── tools/                  # MCP tool execution
│   ├── main.py                 # FastAPI entry point
│   └── requirements.txt        # Python dependencies
├── prisma/
│   └── schema.prisma           # 16 database models
├── public/                     # Static assets
├── Dockerfile                  # Next.js container
├── Dockerfile.agents           # Python agents container
├── docker-compose.yml          # Full stack orchestration
├── .env.example                # Environment template
├── .gitignore                  # Git ignores
└── package.json                # Node.js dependencies
```

---

## Docker Packaging

### Three containers:

| Container | Base Image | Port | Purpose |
|-----------|-----------|------|---------|
| `app` | node:20-alpine | 3000 | Next.js application |
| `agents` | python:3.12-slim | 8100 | Python agent service |
| `db` | postgres:16-alpine | 5432 | PostgreSQL database |

See `Dockerfile`, `Dockerfile.agents`, and `docker-compose.yml` in the project root.

### Build & Run Locally

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

The app will be available at `http://localhost:3000`.

---

## Cloud Deployment

### Option 1: Railway (Recommended for Simplicity)

[Railway](https://railway.app) supports multi-service deployments with automatic builds.

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Deploy (auto-detects Dockerfile)
railway up
```

**Steps:**
1. Create a Railway project
2. Add a **PostgreSQL** service (built-in plugin)
3. Add a **Node.js** service pointing to `Dockerfile`
4. Add a **Python** service pointing to `Dockerfile.agents`
5. Set environment variables in Railway dashboard
6. Railway auto-assigns a public URL (e.g., `your-app.up.railway.app`)

**Cost**: ~$5/month for hobby tier.

### Option 2: Vercel + Railway (Frontend/Backend Split)

- **Vercel**: Deploy Next.js app (free tier, auto-builds from GitHub)
- **Railway**: Deploy Python agents + PostgreSQL

```bash
# Deploy Next.js to Vercel
npx vercel --prod

# Deploy Python agents to Railway
cd python-agents && railway up
```

Set `PYTHON_AGENTS_URL` in Vercel env to point to the Railway Python service.

### Option 3: AWS / GCP / Azure (Full Control)

Using **Docker Compose** on a VM:

```bash
# On your cloud VM (Ubuntu):
sudo apt update && sudo apt install docker.io docker-compose -y

# Clone repo
git clone https://github.com/YOUR_USERNAME/virtual-ppo-ppm.git
cd virtual-ppo-ppm

# Create .env from example
cp .env.example .env
# Edit .env with production values

# Start
docker-compose -f docker-compose.yml up -d
```

**Recommended specs**: 2 vCPU, 4GB RAM, 20GB disk.

For HTTPS, add an **nginx reverse proxy** with Let's Encrypt:

```bash
sudo apt install nginx certbot python3-certbot-nginx
# Configure nginx to proxy port 3000
# Run certbot for SSL
```

### Option 4: Fly.io (Container-Native)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Launch (auto-detects Dockerfile)
fly launch
fly deploy

# Add PostgreSQL
fly postgres create
fly postgres attach
```

### Production Checklist

| Item | Status | Notes |
|------|--------|-------|
| Switch DATABASE_URL to PostgreSQL | Required | `postgresql://user:pass@host:5432/vppo` |
| Set NEXTAUTH_SECRET | Required | Generate with `openssl rand -base64 32` |
| Set NEXTAUTH_URL | Required | Your production URL |
| Set CREDENTIALS_ENCRYPTION_KEY | Required | 32-byte key for encrypting stored credentials |
| Enable HTTPS | Required | SSL certificate for production |
| Set LLM API key | Required | At least one provider (OpenAI, Anthropic, etc.) |
| Configure integrations | Optional | Jira/Confluence/Slack/Email credentials |
| Run `prisma migrate deploy` | Required | Apply schema to production database |
| Set `NODE_ENV=production` | Required | Enables production optimizations |

---

## Tech Stack Summary

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19, Zustand 5, shadcn/ui, Tailwind CSS 4 |
| Backend | Next.js API Routes + Python FastAPI |
| Database | Prisma 6 + SQLite (dev) / PostgreSQL (prod) |
| Auth | NextAuth.js 4 |
| AI/LLM | 6-provider support (OpenAI, Anthropic, Gemini, Azure, Z-AI, Ollama) |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Validation | Zod 4 |
| Python | FastAPI, httpx, pdfplumber, python-docx, beautifulsoup4, openpyxl |

---

*Generated on February 14, 2026*
