# Azmyra — AI-Powered Product Management Platform

An intelligent product management SaaS that connects strategy to execution. Define your vision, organize your portfolio, assess risks, monitor competitors, and let AI agents handle the heavy lifting.

**Live:** [ai.theproductowner.org](https://ai.theproductowner.org)

---

## Features

### Company Brain
Interactive strategy canvas that visualizes your entire product organization — vision, verticals, initiatives, risks, and competitors — as a connected knowledge graph.

### Vision & Strategy
- **North Star** — Define your guiding vision statement
- **Business Goals** — Set measurable objectives with progress tracking
- **Target Personas** — Build detailed audience profiles with needs mapping
- **Product Mapping** — Map features to personas and business goals

### Portfolio Management
- **Product Verticals** — Organize initiatives into logical product lines
- **Initiative Pipeline** — Kanban workflow from idea through discovery, validation, definition, to approved
- **Alignment Scoring** — AI-powered scoring of how well initiatives align with your vision
- **Vertical Selector** — Filter and manage work across verticals

### Assessment & Discovery
- **Risk Center** — Track, categorize, and AI-assess risks across your portfolio
- **Strategy Evaluator** — AI evaluation of strategic fit and market readiness
- **Market Discovery** — Research market opportunities with 30+ data adapters
- **Competitor Intelligence** — Website monitoring, news tracking, and AI-synthesized insights

### Landscape & Market Intelligence
- **Competitor Monitoring** — Automated website change detection and freshness scoring
- **News Feed** — Aggregated competitor and market news
- **Data Pipeline** — 30+ adapters (Google Trends, G2, Capterra, Glassdoor, LinkedIn Jobs, Product Hunt, Hacker News, Reddit, and more)

### AI Assistant
- **6 Specialized Agents** — Strategy, risk, discovery, vision guard, market pulse, and portfolio review
- **Auto-routing** — Questions automatically directed to the right agent
- **Autonomy Levels** — Full, oversight, advisory, or manual control
- **Pending Actions** — Review and approve AI-proposed changes before they take effect

### Meeting Intelligence
- **Transcript Analysis** — Upload or paste meeting notes for AI extraction
- **Meeting Bot** — Headless browser bot joins Teams, Zoom, Meet, and Webex via link
- **Action Items** — Automatic extraction of decisions, action items, and follow-ups

### Execution
- **Sprint Boards** — Track delivery with boards synced to Jira/Linear
- **Roadmap Timeline** — Visual timeline of initiatives and milestones

### Integrations
- **Jira** — Import projects and sync issues as initiatives
- **Confluence** — Import documentation and product specs
- **Slack** — Channel analysis and notifications
- **Linear** — GraphQL-based issue sync
- **GitHub** — Repository and issue tracking via PAT
- **Notion** — Page and database import
- **Email** — SMTP-based automated notifications
- **Zoom & Teams** — Meeting scheduling and bot join

### Onboarding
Role-based setup that gets each user type to value fast:
- **Solo PM / Startup** (~3 min) — Describe product, AI generates vision
- **Head of Product** (~10 min) — Connect tools, AI organizes backlog
- **VP / Director** (~15 min) — Full top-down strategic setup
- **Just Exploring** (~1 min) — Quick feature tour

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui (50+ Radix components) |
| State | Zustand (localStorage persist) |
| Auth | NextAuth.js (Credentials, Google, Azure AD) |
| Database | PostgreSQL + Prisma 6 (43 models) |
| AI Backend | Python FastAPI — 6 specialized agents |
| Validation | Zod |
| Charts | Recharts |
| Testing | Vitest + React Testing Library |

---

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Python 3.11+ (for AI agents)

### Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL, NEXTAUTH_SECRET, etc.

# Initialize database
npx prisma db push
npx prisma generate

# (Optional) Seed demo data
npm run db:seed

# Start dev server
npm run dev
```

### Configure AI

1. Go to **Settings > LLM Provider**
2. Select your provider (Groq, OpenAI, Anthropic, Azure OpenAI, Ollama)
3. Enter your API key
4. Test connection

### LLM Providers Supported
- **Groq** — Fast inference with Llama models
- **OpenAI** — GPT-4o, GPT-4, GPT-3.5
- **Anthropic** — Claude Sonnet, Opus, Haiku
- **Azure OpenAI** — Enterprise GPT deployments
- **Ollama** — Self-hosted local models (Qwen, Llama, Mistral)

---

## Deployment

Deployed on **Google Cloud Run** with Cloud SQL (PostgreSQL).

```bash
# Build and push image
gcloud builds submit --config cloudbuild.yaml

# Deploy to Cloud Run
gcloud run deploy azmyra-app \
  --image gcr.io/PROJECT_ID/azmyra-app \
  --region us-central1 \
  --allow-unauthenticated
```

The Docker image uses a multi-stage build with standalone Next.js output. `start.sh` runs `prisma db push` before starting the server to apply any schema changes.

---

## Security

- **AES-256-GCM encryption** for all integration credentials stored in the database
- **LLM API keys** stored client-side only (Zustand/localStorage) — never in the database
- **Session isolation** — Zustand store cleared on user switch to prevent data leaks
- **Auth guards** on every API route via `getServerSession`
- **Zod validation** on all POST request bodies
- **Turnstile CAPTCHA** on registration (configurable)
- **Password strength** enforcement (uppercase, lowercase, digit, special char, 8+ chars)

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages + API routes (114 routes)
│   ├── api/               # REST API endpoints
│   ├── brain/             # Company Brain canvas
│   ├── portfolio/         # Portfolio management
│   ├── assessment/        # Risk & strategy assessment
│   ├── landscape/         # Market intelligence
│   └── vision/            # Vision & strategy
├── components/
│   ├── brain/             # Brain canvas components
│   ├── layout/            # Sidebar, ErrorBoundary
│   ├── onboarding/        # Role-based onboarding steps
│   ├── portfolio/         # Portfolio-specific components
│   ├── ui/                # shadcn/ui primitives (50+)
│   ├── views/             # Page-level view components (19)
│   └── vision/            # Vision pyramid, goal cards
├── lib/
│   ├── services/          # Business logic (21 services)
│   │   └── data-pipeline/ # Market data adapters (30+)
│   ├── store.ts           # Zustand state management
│   ├── types.ts           # TypeScript types (960+ lines)
│   ├── auth.ts            # NextAuth configuration
│   └── db.ts              # Prisma client + encryption middleware
├── hooks/                 # Custom React hooks
└── python-agents/         # FastAPI AI agent service
    ├── agents/            # 6 specialized agents
    ├── scheduler/         # Cron job runner
    └── knowledge/         # RAG + document ingestion
```

---

## License

MIT License — See [LICENSE](LICENSE) for details.
