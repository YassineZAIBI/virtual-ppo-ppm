# Azmyra - AI-Powered Product Management Platform

## Overview

Azmyra is a comprehensive AI-powered Product Management Platform designed for autonomous management of product initiatives, market research, risk assessment, roadmapping, and stakeholder communications. It features a multi-agent AI system, integrated workflows with enterprise tools (Jira, Confluence, Slack), an extensible market intelligence data pipeline, and LLM-powered insights across 7 specialized AI agents.

**Version:** 2.0.0
**Live URL:** https://ai.theproductowner.org
**Deployment:** Google Cloud Run + Cloud SQL (PostgreSQL)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS 4, shadcn/ui (Radix UI primitives) |
| **State Management** | Zustand with localStorage persistence |
| **Authentication** | NextAuth.js 4 (Credentials, Google OAuth, Azure AD) |
| **Database** | PostgreSQL 16 via Prisma ORM 6 |
| **Agent Service** | Python FastAPI (multi-agent orchestration) |
| **LLM Providers** | OpenAI, Anthropic, Azure, Gemini, Groq, Z-AI, Ollama |
| **Integrations** | Jira, Confluence, Slack, Email (SMTP) |
| **Charts** | Recharts |
| **Markdown** | react-markdown + remark-gfm |
| **Icons** | Lucide React |
| **Deployment** | Docker, Google Cloud Build, Cloud Run |
| **Testing** | Vitest |

---

## Architecture

```
                    +--------------------+
                    |   Browser (React)  |
                    |   Zustand Store    |
                    +--------+-----------+
                             |
                    +--------v-----------+
                    |   Next.js 16 App   |
                    |   API Routes       |
                    |   Server Actions   |
                    +---+--------+-------+
                        |        |
          +-------------+        +-------------+
          |                                     |
+---------v----------+            +-------------v-----------+
|  PostgreSQL (Cloud |            |  Python FastAPI Agent   |
|  SQL / Prisma ORM) |            |  Service (port 8100)    |
+--------------------+            +---+-----+-----+---------+
                                      |     |     |
                              +-------+  +--+--+  +--------+
                              |          |     |           |
                         +----v---+ +----v--+ +v--------+  |
                         | LLM    | | RAG   | | MCP     |  |
                         | Router | | Search| | Client  |  |
                         +--------+ +-------+ +---------+  |
                                                            |
                    +---------------------------------------+
                    |  External Services                    |
                    |  Jira | Confluence | Slack | Email    |
                    +---------------------------------------+
```

### Multi-Agent System

Six specialized AI agents, each with distinct capabilities:

| Agent | Purpose | Temperature | Tools |
|-------|---------|-------------|-------|
| **Strategy** | Prioritization, roadmapping, Jira operations | 0.3 | Jira CRUD, Confluence search |
| **Discovery** | Market research, customer needs analysis | 0.5 | Jira search, Confluence search |
| **Risk** | Risk assessment, mitigation planning | 0.3 | Jira CRUD, Confluence search |
| **Communications** | Emails, Slack messages, status updates | 0.5 | Email, Slack, Jira comment |
| **Advisor** | Best practices, methodology guidance | 0.7 | None (advisory only) |
| **Thinker** | Big-picture synthesis, gap analysis | 0.4 | Jira search, Confluence, Slack |

**Routing:** Two-tier system — keyword matching (no LLM cost) then LLM classification for ambiguous requests.

**Autonomy Levels:**
- **Full:** Agent executes all tools automatically
- **Oversight:** Sensitive tools require human approval
- **Advisory:** Agent only recommends actions
- **Manual:** User executes all actions manually

### Data Pipeline (Market Intelligence)

Extensible adapter pattern — adding a new data source = adding one file.

```
DataAdapter Interface
├── fetch(query, options) → DataResult[]
├── testConnection(config) → { ok, error? }
└── metadata: { name, icon, category, rateLimit, capabilities }

Registry
├── register(adapter)    // auto-register on import
├── get(key)
├── list()
└── listByCategory()
```

**Built-in Adapters (10):**

| Adapter | Source | Category | Rate Limit |
|---------|--------|----------|------------|
| `duckduckgo` | DuckDuckGo HTML search | search | 30 req/min |
| `hackernews` | HN Algolia API | social | 10k req/hr |
| `reddit` | Reddit public JSON API | social | 60 req/min |
| `wikipedia` | MediaWiki REST API | search | Unlimited |
| `arxiv` | arXiv REST API | research | 3 req/sec |
| `semantic-scholar` | Semantic Scholar Graph API | research | 100 req/5min |
| `crossref` | Crossref DOI API | research | 50 req/sec |
| `openalex` | OpenAlex API | research | Unlimited |
| `worldbank` | World Bank REST API | government | Unlimited |
| `bls` | Bureau of Labor Statistics | government | 25 req/day |

**Pipeline Features:**
- Parallel fan-out with `Promise.allSettled`
- Per-adapter rate limiting (token bucket)
- Result caching with TTL
- Resilient fetch with retry on 429/5xx, exponential backoff
- 30-second timeout per adapter
- Async job queue (DB-backed progress tracking)

---

## Features & Views

### 1. Dashboard (`/`)
- Executive overview with stat cards (active initiatives, pending approvals, critical risks, meetings)
- Items requiring attention (risks + definition-stage initiatives)
- Quick actions (generate PRD, prep interviews, draft OKRs, sync Jira)
- Recent initiatives and active risks

### 2. AI Assistant (`/chat`)
- Multi-agent conversational interface
- Agent selector (Auto, Strategy, Discovery, Risk, Communications, Advisor, Thinker)
- Tool execution inspection (expandable tool cards)
- Pending action approval/rejection workflow
- Source attribution display
- Knowledge base upload (files + URLs)
- Markdown-rendered responses

### 3. Initiatives Pipeline (`/initiatives`)
- Kanban board with 5 stages: Idea → Discovery → Validation → Definition → Approved
- Drag-and-drop stage transitions
- Full initiative editor (title, description, business value, effort, stakeholders, tags, risks, dependencies)
- Bulk selection mode
- Launch discovery workspace per initiative

### 4. Discovery (`/discovery`)
- Structured product discovery workspace per initiative
- 5 tabs: AI Preparation, Documentation, Interviews, Market Research, Impact Analysis
- AI-generated content for each section
- Manual note-taking
- Market Research panel with real data gathering and AI synthesis

### 5. Roadmap (`/roadmap`)
- Quarterly planning view (Q1-Q4) across years
- Color-coded status indicators
- Drag-and-drop initiative scheduling
- Unassigned items panel

### 6. Value Meter (`/value-meter`)
- Multi-dimensional value assessment (5 dimensions scored 0-100)
- Revenue Impact, User Impact, Strategic Alignment, Technical Feasibility, Market Timing
- AI-generated assessment with strengths/weaknesses/recommendations
- Color-coded scoring (green ≥80, blue ≥60, amber ≥40, red <40)

### 7. User Journey (`/user-journey`)
- Persona management (name, role, goals, pain points)
- Link personas to initiatives
- Multi-select persona assignment

### 8. Meetings (`/meetings`)
- Meeting transcript upload
- AI-powered summarization
- Extracts: summary, action items, decisions, challenges
- Status tracking (scheduled → completed → processing → summarized)

### 9. Market Research (within Discovery)
- Run research: select data adapters → gather real data → view raw data/sources
- AI synthesis: generates attributed report with citations
- Progress tracking with real-time job polling
- Report/Raw Data/Sources tabs
- Editable markdown reports with version history

### 10. Settings (`/settings`)
- LLM provider configuration (7 providers)
- Integration setup (Jira, Confluence, Slack, Email)
- Autonomy level preference
- Theme selection (light/dark/system)
- Notification preferences

### 11. Sharing
- Generate shareable links for any resource
- Guest access with read-only view
- Comment system for stakeholder feedback

### 12. Onboarding (`/onboarding`)
- 4-step wizard: Welcome → Integrations → Sync → Complete
- Integration connection testing
- Initial data sync from Jira/Confluence

---

## Database Models (Prisma)

### Authentication & Users
- `User` — email, password hash, role (admin/member/viewer)
- `Account` — OAuth provider linking
- `Session` — JWT token sessions
- `UserSettingsRecord` — encrypted LLM/integration credentials

### Product Management
- `Initiative` — pipeline stages, business value, effort, risks, dependencies
- `Meeting` — transcripts with AI-generated summaries, action items, decisions
- `Risk` — severity/probability/impact assessment with mitigation plans
- `ChatMessage` — agent responses with tool execution metadata

### Knowledge & Content
- `Document` — PRDs, specs, decision logs
- `KnowledgeDocument` — uploaded files and scraped URLs
- `ContentVersion` — audit trail for AI vs user edits

### Integration & Autonomy
- `OnboardingProgress` — wizard state
- `SyncRecord` — external system sync tracking
- `PendingAction` — agent-proposed tool calls awaiting approval
- `ShareLink` + `ShareComment` — sharing and guest comments

### Market Intelligence
- `MarketResearch` — research projects (pending/gathering/synthesizing/completed)
- `DataPoint` — individual results from data adapters
- `DataConnectorConfig` — user data source configurations
- `DataJob` — async job queue (progress tracking, status)

---

## API Routes

### Authentication
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth/[...nextauth]` | * | NextAuth handlers |
| `/api/auth/register` | POST | User registration |

### Chat & Agents
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/chat` | POST | Multi-agent chat (proxies to Python service) |
| `/api/agents/actions` | POST | Approve/reject pending agent actions |

### Integrations
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/integrations/jira` | GET, POST | Jira operations (search, create, update) |
| `/api/integrations/confluence` | GET, POST | Confluence search and page creation |
| `/api/integrations/slack` | POST | Slack message posting |
| `/api/integrations/email` | POST | Email sending via SMTP |
| `/api/integrations/*/test` | POST | Connection testing |

### Knowledge Base
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/knowledge` | GET | List knowledge documents |
| `/api/knowledge/upload` | POST | Upload files (PDF, DOCX, TXT, CSV) |
| `/api/knowledge/scrape` | POST | Scrape URL content |

### Market Research
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/market-research` | GET, POST | List/create research |
| `/api/market-research/[id]` | GET, PATCH, DELETE | Single research CRUD |
| `/api/market-research/[id]/gather` | POST | Trigger data gathering (async) |
| `/api/market-research/[id]/synthesize` | POST | Trigger AI synthesis |
| `/api/data-pipeline/adapters` | GET | List available data adapters |
| `/api/data-pipeline/adapters/[key]/test` | POST | Test adapter connection |
| `/api/data-pipeline/jobs/[id]` | GET | Poll job status/progress |

### Connectors & Content
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/connectors` | GET, POST | User connector configs |
| `/api/connectors/[id]` | GET, PATCH, DELETE | Single connector |
| `/api/content-versions` | GET, POST | Content version history |

### Onboarding & Sharing
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/onboarding/*` | GET, POST | Onboarding flow endpoints |
| `/api/share` | GET, POST | Create/list share links |
| `/api/share/[token]` | GET | Access shared resource |
| `/api/share/[token]/comments` | GET, POST | Guest comments |

### Utilities
| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/llm/test` | POST | Test LLM provider connection |
| `/api/meetings` | POST | Process meeting transcripts |

---

## File Structure

```
virtual-ppo-ppm/
├── prisma/
│   ├── schema.prisma              # Database schema (18+ models)
│   └── seed.ts                    # Database seed data
│
├── python-agents/                 # Python FastAPI Agent Service
│   ├── main.py                    # Entry point, /agent/chat endpoint
│   ├── config.py                  # Environment configuration
│   ├── agents/
│   │   ├── registry.py            # 6 agent definitions
│   │   ├── orchestrator.py        # Message routing (keyword + LLM)
│   │   ├── loop.py                # Agent execution loop
│   │   ├── prompts.py             # System prompt builder
│   │   ├── autonomy.py            # Autonomy gating logic
│   │   └── types.py               # Python type definitions
│   ├── knowledge/
│   │   ├── rag.py                 # RAG retrieval pipeline
│   │   ├── chunker.py             # Document chunking
│   │   └── ingest.py              # File/URL ingestion
│   ├── providers/
│   │   └── llm.py                 # Multi-provider LLM client
│   └── tools/
│       └── mcp_client.py          # Tool execution (MCP protocol)
│
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── layout.tsx             # Root layout (Providers, Sidebar)
│   │   ├── page.tsx               # Dashboard
│   │   ├── globals.css            # Global styles + CSS variables
│   │   ├── auth/signin/           # Login page
│   │   ├── chat/                  # AI Assistant page
│   │   ├── discovery/             # Discovery workspace page
│   │   ├── guide/                 # Getting started guide
│   │   ├── initiatives/           # Initiatives pipeline page
│   │   ├── meetings/              # Meetings page
│   │   ├── onboarding/            # Onboarding wizard
│   │   ├── roadmap/               # Roadmap planning page
│   │   ├── settings/              # Settings page
│   │   ├── share/[token]/         # Guest shared view
│   │   ├── swagger/               # API documentation
│   │   ├── user-journey/          # Personas page
│   │   ├── value-meter/           # Value assessment page
│   │   └── api/                   # API Routes (30+ endpoints)
│   │       ├── auth/              # Authentication
│   │       ├── chat/              # Agent chat proxy
│   │       ├── agents/actions/    # Pending action management
│   │       ├── integrations/      # Jira, Confluence, Slack, Email
│   │       ├── knowledge/         # Knowledge base operations
│   │       ├── market-research/   # Market research CRUD + gather + synthesize
│   │       ├── data-pipeline/     # Adapter listing + testing + job polling
│   │       ├── connectors/        # Data connector configs
│   │       ├── content-versions/  # Version history
│   │       ├── meetings/          # Transcript processing
│   │       ├── onboarding/        # Onboarding flow
│   │       ├── share/             # Sharing system
│   │       └── llm/test/          # LLM connection test
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components (40+ primitives)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── styled-markdown.tsx
│   │   │   └── ... (40+ files)
│   │   ├── views/                 # Main application views
│   │   │   ├── DashboardView.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── DiscoveryView.tsx
│   │   │   ├── InitiativesPipeline.tsx
│   │   │   ├── RoadmapView.tsx
│   │   │   ├── ValueMeterView.tsx
│   │   │   ├── UserJourneyView.tsx
│   │   │   ├── MeetingsView.tsx
│   │   │   ├── SettingsView.tsx
│   │   │   ├── GettingStartedGuide.tsx
│   │   │   ├── SwaggerView.tsx
│   │   │   └── OnboardingWizard.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx        # Main navigation
│   │   │   └── ErrorBoundary.tsx
│   │   ├── market-research/       # Market intelligence components
│   │   │   ├── MarketResearchPanel.tsx
│   │   │   ├── AdapterSelector.tsx
│   │   │   ├── DataPointCard.tsx
│   │   │   ├── SourceAttribution.tsx
│   │   │   └── JobProgress.tsx
│   │   ├── editing/
│   │   │   └── EditableMarkdown.tsx
│   │   ├── knowledge/
│   │   │   └── KnowledgeUploader.tsx
│   │   ├── landing/
│   │   │   └── LandingPage.tsx
│   │   ├── onboarding/
│   │   │   ├── WelcomeStep.tsx
│   │   │   ├── IntegrationStep.tsx
│   │   │   ├── SyncStep.tsx
│   │   │   └── CompletionStep.tsx
│   │   ├── share/
│   │   │   ├── ShareButton.tsx
│   │   │   ├── ShareDialog.tsx
│   │   │   ├── GuestHeader.tsx
│   │   │   └── SharedCommentSection.tsx
│   │   └── providers/
│   │       └── Providers.tsx      # NextAuth + Theme + Zustand
│   │
│   ├── lib/
│   │   ├── types.ts               # All TypeScript type definitions
│   │   ├── store.ts               # Zustand state management
│   │   ├── auth.ts                # NextAuth configuration
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── encryption.ts          # AES encryption for credentials
│   │   ├── utils.ts               # Utility functions (cn, etc.)
│   │   ├── sample-data.ts         # Demo data for learning
│   │   ├── agents/
│   │   │   └── types.ts           # Agent system type definitions
│   │   ├── mcp/
│   │   │   └── client.ts          # MCP client utilities
│   │   ├── tools/
│   │   │   ├── registry.ts        # Tool definitions (Jira, Initiative)
│   │   │   ├── executor.ts        # Tool execution logic
│   │   │   ├── parser.ts          # Tool response parsing
│   │   │   ├── prompt-builder.ts  # System prompt construction
│   │   │   └── stage-advisor.ts   # Initiative stage recommendations
│   │   └── services/
│   │       ├── llm.ts             # Multi-provider LLM service
│   │       ├── market-research.ts # Data gathering + AI synthesis
│   │       ├── jira.ts            # Jira REST API client
│   │       ├── confluence.ts      # Confluence REST API client
│   │       ├── slack.ts           # Slack Bot API client
│   │       ├── email.ts           # SMTP email service
│   │       ├── sync-agent.ts      # Integration sync logic
│   │       └── data-pipeline/     # Market Intelligence Pipeline
│   │           ├── types.ts       # DataAdapter, DataResult, resilientFetch
│   │           ├── registry.ts    # DataAdapterRegistry singleton
│   │           ├── pipeline.ts    # Orchestrator (parallel fan-out)
│   │           ├── rate-limiter.ts# Per-adapter token bucket
│   │           ├── cache.ts       # Result cache with TTL
│   │           ├── job-queue.ts   # Async job management (DB-backed)
│   │           └── adapters/      # 10 data source adapters
│   │               ├── index.ts   # Barrel import (auto-registration)
│   │               ├── duckduckgo.ts
│   │               ├── hackernews.ts
│   │               ├── reddit.ts
│   │               ├── wikipedia.ts
│   │               ├── arxiv.ts
│   │               ├── semantic-scholar.ts
│   │               ├── crossref.ts
│   │               ├── openalex.ts
│   │               ├── worldbank.ts
│   │               └── bls.ts
│   │
│   ├── hooks/
│   │   ├── use-mobile.ts         # Mobile breakpoint hook
│   │   └── use-toast.ts          # Toast notification hook
│   │
│   └── middleware.ts              # Route protection middleware
│
├── __tests__/                     # Test suites
│   ├── adapters-and-services.test.ts
│   ├── api-routes.test.ts
│   ├── data-pipeline.test.ts
│   └── ui-components.test.tsx
│
├── Dockerfile                     # Multi-stage production build
├── docker-compose.yml             # Full stack (PostgreSQL + Agents + App)
├── cloudbuild.yaml                # Google Cloud Build CI
├── start.sh                       # Production startup (Prisma push + server)
├── next.config.ts                 # Next.js configuration (standalone output)
├── tailwind.config.ts             # Tailwind CSS configuration
├── vitest.config.ts               # Test configuration
├── tsconfig.json                  # TypeScript configuration
├── components.json                # shadcn/ui configuration
└── package.json                   # Dependencies and scripts
```

---

## Deployment Architecture

### Development
```bash
docker-compose up --build
# PostgreSQL: localhost:5432
# Next.js App: localhost:3000
# Agent Service: localhost:8100
```

### Production (Google Cloud)
```
Cloud Build → Container Registry → Cloud Run
                                      ├── azmyra-app (Next.js + Prisma)
                                      └── agent-service (Python FastAPI)
Cloud SQL (PostgreSQL)
```

**Build:** `gcloud builds submit --config cloudbuild.yaml`
**Deploy:** `gcloud run deploy azmyra-app --image gcr.io/PROJECT/azmyra-app --region us-central1`

### Docker Build Stages
1. **deps** — npm ci, Prisma generate
2. **builder** — Next.js production build (standalone output)
3. **prisma-cli** — Isolated Prisma CLI for runtime schema sync
4. **runner** — Lean Alpine image with start.sh (db push + server)

---

## Security

- **Password Hashing:** bcryptjs
- **Credential Encryption:** AES-256 (encryption key in environment)
- **JWT Sessions:** NextAuth secure tokens
- **User Isolation:** All DB queries filtered by userId
- **CORS:** Restricted origins
- **Rate Limiting:** Per-adapter token bucket in data pipeline
- **Resilient Fetch:** Retry on 429/5xx with exponential backoff
- **Non-root Container:** nextjs user (UID 1001)

---

## Key Design Patterns

1. **Multi-Agent Routing** — Keyword matching (Tier 1, free) + LLM classification (Tier 2, paid)
2. **Autonomy Gating** — Tool approval workflow based on user preference
3. **Adapter Registry** — Pluggable data sources (add one file = new source)
4. **Async Job Queue** — DB-backed progress tracking for long operations
5. **Content Versioning** — Track AI vs user edits with full audit trail
6. **RAG Pipeline** — Confluence + Knowledge Base retrieval injected into agent prompts
7. **Agent Handoffs** — Single-depth delegation between specialized agents
8. **Resilient External Calls** — Retry, timeout, circuit breaker patterns
9. **Schema-First** — Prisma schema as single source of truth for data models
10. **Store Snapshot** — Frontend sends relevant state to agents for context-aware responses

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/vppo

# Authentication
NEXTAUTH_SECRET=<secret>
NEXTAUTH_URL=http://localhost:3000

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=

# LLM Providers
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Agent Service
AGENT_SERVICE_URL=http://localhost:8100

# Encryption
ENCRYPTION_KEY=<32-char-key>

# Integrations (configured per-user in Settings)
# Jira, Confluence, Slack, Email credentials stored encrypted in DB
```
