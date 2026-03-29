# Azmyra — Solution Architecture

## Overview

Azmyra is an AI-powered Product Management platform deployed on GCP Cloud Run. It combines multi-agent AI assistants, enterprise integrations, and a market intelligence pipeline to help PM teams manage initiatives, conduct research, and make data-driven decisions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4 |
| UI Components | shadcn/ui (Radix UI), Recharts, Lucide icons |
| State Management | Zustand with persist middleware (localStorage) |
| Auth | NextAuth.js v4, JWT strategy, PrismaAdapter (Google + Azure AD OAuth) |
| Database | PostgreSQL (Cloud SQL), Prisma ORM 6 |
| AI Agents | Python FastAPI service with 6 specialized agents |
| LLM Providers | OpenAI, Anthropic, Google Gemini, Groq, Z-AI, Azure, Ollama |
| Integrations | Jira, Confluence, Slack, Email (SMTP) via MCP tools |
| Knowledge | URL scraping, file upload (PDF/DOCX/CSV), RAG retrieval |
| Deployment | GCP Cloud Run, Cloud Build, Cloudflare (DNS + Turnstile CAPTCHA) |
| Domain | https://ai.theproductowner.org |

## Architecture Diagram

```
                    ┌──────────────────────────────────┐
                    │         Cloudflare CDN            │
                    │   (DNS, Turnstile CAPTCHA)        │
                    └──────────────┬───────────────────┘
                                   │
                    ┌──────────────▼───────────────────┐
                    │       GCP Cloud Run               │
                    │  ┌─────────────────────────────┐  │
                    │  │    Next.js 16 App            │  │
                    │  │  ┌──────────────────────┐   │  │
                    │  │  │   React 19 Frontend  │   │  │
                    │  │  │  (Views, Components) │   │  │
                    │  │  └──────────┬───────────┘   │  │
                    │  │             │                │  │
                    │  │  ┌──────────▼───────────┐   │  │
                    │  │  │   Next.js API Routes │   │  │
                    │  │  │  /api/chat            │   │  │
                    │  │  │  /api/knowledge       │   │  │
                    │  │  │  /api/integrations    │   │  │
                    │  │  │  /api/market-research │   │  │
                    │  │  │  /api/data-pipeline   │   │  │
                    │  │  └──────┬──────┬────────┘   │  │
                    │  └─────────┼──────┼────────────┘  │
                    └────────────┼──────┼───────────────┘
                                 │      │
              ┌──────────────────┘      └──────────────────┐
              │                                            │
   ┌──────────▼──────────┐                  ┌──────────────▼─────────┐
   │  Python Agent Svc   │                  │    PostgreSQL (Cloud   │
   │  (FastAPI :8100)    │                  │    SQL)                │
   │                     │                  │                        │
   │  6 Agents:          │                  │  Users, Initiatives,   │
   │  - Strategy         │                  │  Meetings, Risks,      │
   │  - Discovery        │                  │  Chat, Knowledge,      │
   │  - Risk             │                  │  MarketResearch,       │
   │  - Communications   │                  │  DataPoints, Jobs,     │
   │  - Expert Advisor   │                  │  WatchTopics, Alerts   │
   │  - Thinker          │                  │  Competitors, etc.     │
   │                     │                  └────────────────────────┘
   │  + RAG Pipeline     │
   │  + MCP Tool Client  │
   │  + Autonomy Gating  │
   └─────────────────────┘
```

## Directory Structure

```
virtual-ppo-ppm/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (dashboard)/page.tsx          # Main dashboard
│   │   ├── api/
│   │   │   ├── chat/route.ts             # AI chat endpoint (LLM fallback)
│   │   │   ├── agents/actions/           # Pending action approval
│   │   │   ├── knowledge/               # Upload, scrape, list, delete
│   │   │   ├── integrations/            # Jira, Confluence, Slack, Email
│   │   │   ├── market-research/         # [NEW] Market research CRUD + gather + synthesize
│   │   │   ├── data-pipeline/           # [NEW] Adapter listing, job polling
│   │   │   ├── connectors/              # [NEW] User data connector configs
│   │   │   ├── monitoring/              # [NEW] Watch topics, alerts, cron
│   │   │   ├── activity/                # [FUTURE] Activity connectors, events, needs
│   │   │   ├── competitive/             # [FUTURE] Competitors, matrix, changes
│   │   │   ├── predictions/             # [FUTURE] Prediction engine
│   │   │   ├── content-versions/        # [NEW] Version history
│   │   │   ├── llm/test/               # LLM connection testing
│   │   │   ├── meetings/               # Meeting CRUD
│   │   │   ├── onboarding/             # Setup wizard
│   │   │   ├── share/                  # Share links
│   │   │   └── auth/                   # NextAuth
│   │   ├── chat/                        # Chat page
│   │   ├── discovery/                   # Discovery page
│   │   ├── monitoring/                  # [NEW] Market monitor page
│   │   ├── activity/                    # [FUTURE] Activity intelligence page
│   │   ├── competitive/                 # [FUTURE] Competitive intel page
│   │   ├── predictions/                 # [FUTURE] Predictions page
│   │   ├── settings/                    # Settings page
│   │   └── layout.tsx                   # Root layout with auth
│   │
│   ├── components/
│   │   ├── views/                       # Main view components
│   │   │   ├── DashboardView.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── DiscoveryView.tsx
│   │   │   ├── InitiativesPipeline.tsx
│   │   │   ├── RoadmapView.tsx
│   │   │   ├── MeetingsView.tsx
│   │   │   ├── ValueMeterView.tsx
│   │   │   ├── UserJourneyView.tsx
│   │   │   ├── SettingsView.tsx
│   │   │   ├── SwaggerView.tsx
│   │   │   ├── OnboardingWizard.tsx
│   │   │   └── GettingStartedGuide.tsx
│   │   ├── market-research/             # [NEW] Market research components
│   │   │   ├── MarketResearchPanel.tsx
│   │   │   ├── DataPointCard.tsx
│   │   │   ├── SourceAttribution.tsx
│   │   │   ├── AdapterSelector.tsx
│   │   │   └── JobProgress.tsx
│   │   ├── editing/                     # [NEW] Editable content
│   │   │   └── EditableMarkdown.tsx
│   │   ├── connectors/                  # [NEW] Data connector management
│   │   │   ├── ConnectorManager.tsx
│   │   │   └── CustomConnectorForm.tsx
│   │   ├── monitoring/                  # [NEW] Market monitoring
│   │   │   ├── WatchTopicManager.tsx
│   │   │   ├── MarketAlertsList.tsx
│   │   │   └── MonitoringWidget.tsx
│   │   ├── knowledge/                   # Knowledge uploader
│   │   ├── layout/                      # Sidebar, ErrorBoundary
│   │   ├── onboarding/                  # Onboarding steps
│   │   ├── share/                       # Sharing components
│   │   └── ui/                          # shadcn/ui primitives
│   │
│   ├── lib/
│   │   ├── services/
│   │   │   ├── data-pipeline/           # [NEW] Extensible data pipeline
│   │   │   │   ├── types.ts             # DataAdapter interface, DataResult, Zod schemas
│   │   │   │   ├── registry.ts          # DataAdapterRegistry singleton
│   │   │   │   ├── rate-limiter.ts      # Per-adapter rate limiting
│   │   │   │   ├── cache.ts             # Result cache with TTL
│   │   │   │   ├── pipeline.ts          # Parallel fetch orchestrator
│   │   │   │   ├── job-queue.ts         # Async job management
│   │   │   │   └── adapters/            # One file per data source
│   │   │   │       ├── duckduckgo.ts
│   │   │   │       ├── hackernews.ts
│   │   │   │       ├── reddit.ts
│   │   │   │       ├── wikipedia.ts
│   │   │   │       ├── arxiv.ts
│   │   │   │       ├── semantic-scholar.ts
│   │   │   │       ├── crossref.ts
│   │   │   │       ├── openalex.ts
│   │   │   │       ├── bls.ts
│   │   │   │       ├── worldbank.ts
│   │   │   │       ├── fred.ts
│   │   │   │       ├── mcp-confluence.ts
│   │   │   │       └── mcp-jira.ts
│   │   │   ├── market-research.ts       # [NEW] Research orchestration
│   │   │   ├── content-versioning.ts    # [NEW] Version tracking
│   │   │   ├── llm.ts                   # LLMService (multi-provider)
│   │   │   ├── jira.ts                  # JiraService
│   │   │   ├── confluence.ts
│   │   │   ├── slack.ts
│   │   │   ├── email.ts
│   │   │   └── sync-agent.ts
│   │   ├── tools/
│   │   │   ├── registry.ts              # MCP tool definitions
│   │   │   ├── executor.ts              # Tool execution
│   │   │   ├── parser.ts                # LLM response tool call parser
│   │   │   ├── prompt-builder.ts        # System prompt builder
│   │   │   └── stage-advisor.ts         # Pipeline stage guidance
│   │   ├── agents/types.ts              # Agent type definitions
│   │   ├── types.ts                     # Core TypeScript types
│   │   ├── store.ts                     # Zustand store
│   │   ├── db.ts                        # Prisma client singleton
│   │   ├── auth.ts                      # NextAuth config
│   │   └── utils.ts                     # Utilities
│   │
│   └── middleware.ts                    # Auth + onboarding middleware
│
├── python-agents/                       # FastAPI agent service
│   ├── main.py                          # Service entry point
│   ├── config.py                        # Configuration
│   ├── agents/
│   │   ├── registry.py                  # 6 agent definitions
│   │   ├── orchestrator.py              # Message → agent routing
│   │   ├── loop.py                      # Agentic iteration with tool calling
│   │   ├── prompts.py                   # System prompt builder
│   │   ├── autonomy.py                  # Tool gating by autonomy level
│   │   └── types.py                     # Pydantic models
│   ├── knowledge/
│   │   ├── rag.py                       # RAG retrieval (Confluence + KB + Research)
│   │   ├── ingest.py                    # File/URL ingestion
│   │   └── chunker.py                   # Text chunking
│   ├── providers/
│   │   └── llm.py                       # Multi-provider LLM client
│   ├── tools/
│   │   └── mcp_client.py               # MCP tool bridge (Python → Next.js API)
│   └── requirements.txt
│
├── prisma/
│   ├── schema.prisma                    # Database schema (PostgreSQL)
│   ├── migrations/                      # Migration history
│   └── seed.ts                          # Sample data seeder
│
├── docs/                                # [NEW] Documentation
│   ├── ARCHITECTURE.md                  # This file
│   └── MARKET_INTELLIGENCE_PLAN.md      # Implementation plan
│
├── Dockerfile                           # Next.js production image
├── Dockerfile.agents                    # Python agent service image
├── cloudbuild.yaml                      # GCP Cloud Build config
├── docker-compose.yml                   # Local dev (PostgreSQL)
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

## Key Data Flows

### 1. Chat Flow
```
User → ChatInterface → POST /api/chat → Python Agent Service (/agent/chat)
                                          ├─ Orchestrator routes to agent
                                          ├─ RAG retrieves context (Confluence + KB + Research)
                                          ├─ Agent loop: LLM → tool calls → results → repeat
                                          ├─ Read-only tools auto-execute
                                          └─ Write ops → PendingAction (user approval)
                                       ↓ fallback if Python service unavailable
                                       Direct LLM call with data context injection
```

### 2. Market Research Flow (NEW)
```
User → DiscoveryView → MarketResearchPanel → POST /api/market-research
  → Creates MarketResearch record
  → POST /api/market-research/[id]/gather
    → DataJob created (async)
    → pipeline.fetchFromSources() fans out to adapters in parallel:
      ├─ DuckDuckGo → scrape search results
      ├─ HackerNews → Algolia API
      ├─ Reddit → public JSON
      ├─ arXiv → REST API
      ├─ Semantic Scholar → REST API
      └─ ... (all selected adapters)
    → DataPoint records stored per result
  → POST /api/market-research/[id]/synthesize
    → LLM receives all raw data with attribution prompt
    → Generates report with [Source](URL) citations
    → ContentVersion saved
```

### 3. Initiative Pipeline Flow
```
Idea → Discovery → Validation → Definition → Approved
  │        │
  │        └─ DiscoveryView: AI prep, docs, interviews, market research, impact
  │
  └─ Can be created from: manual, prediction, chat agent, Jira sync
```

### 4. Autonomy Gating
```
Tool Call → Check Autonomy Level:
  FULL      → Execute all tools immediately
  OVERSIGHT → Execute read-only, gate write ops (→ PendingAction)
  ADVISORY  → Block all tool execution, suggest only
  MANUAL    → Block all, no suggestions
```

## Database Models (Current + New)

### Existing Models
- `User`, `Account`, `Session`, `VerificationToken` (Auth)
- `UserSettingsRecord` (Encrypted credentials)
- `Initiative`, `Meeting`, `Risk`, `Document` (PM data)
- `ChatMessage`, `PendingAction` (AI chat)
- `KnowledgeDocument` (RAG knowledge base)
- `OnboardingProgress`, `SyncRecord` (Setup)
- `ShareLink`, `ShareComment` (Sharing)

### New Models (Phase 1)
- `MarketResearch` (Research reports with AI synthesis)
- `DataPoint` (Raw data from adapters)
- `ContentVersion` (Edit history for AI content)
- `DataConnectorConfig` (User connector configurations)
- `DataJob` (Async job queue)

### Future Models (Phases 2-5)
- `WatchTopic`, `MonitoringScan`, `MarketAlert` (Monitoring)
- `ActivityConnector`, `UserActivityEvent`, `UserNeedMapping`, `ActivitySyncLog` (Activity)
- `Competitor`, `CompetitorFeature`, `CompetitorChangeEvent`, `FeatureComparisonMatrix` (Competitive)
- `Prediction`, `PredictionRun` (Predictions)

## Deployment

| Component | Platform | Config |
|-----------|----------|--------|
| Next.js App | GCP Cloud Run | `cloudbuild.yaml` → `gcr.io/theproductowner-8620d/azmyra-app` |
| PostgreSQL | GCP Cloud SQL | Via `DATABASE_URL` env var |
| Python Agents | GCP Cloud Run | `Dockerfile.agents` |
| DNS + CDN | Cloudflare | `ai.theproductowner.org` |
| CAPTCHA | Cloudflare Turnstile | Build-time site key |
| Cron Jobs | GCP Cloud Scheduler | Monitoring scans every 6h |

## Environment Variables

```
DATABASE_URL              # PostgreSQL connection string
NEXTAUTH_SECRET          # JWT signing secret
NEXTAUTH_URL             # App URL (https://ai.theproductowner.org)
GOOGLE_CLIENT_ID         # Google OAuth
GOOGLE_CLIENT_SECRET
AZURE_AD_CLIENT_ID       # Microsoft OAuth
AZURE_AD_CLIENT_SECRET
AZURE_AD_TENANT_ID
AGENT_SERVICE_URL        # Python agent service (http://localhost:8100)
NEXT_PUBLIC_TURNSTILE_SITE_KEY  # Cloudflare Turnstile
CRON_API_KEY             # [NEW] Cloud Scheduler auth token
```
