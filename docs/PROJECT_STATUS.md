# Azmyra — AI-Powered Product Management Platform

## Project Status Summary

**Version:** 2.0.0
**Live URL:** https://ai.theproductowner.org
**Last Updated:** 2026-03-28

---

## 1. Platform Overview

Azmyra is a comprehensive AI-powered Product Management platform that provides autonomous management of product initiatives, market research, risk assessment, roadmapping, and stakeholder communications. It combines a Next.js frontend with a Python FastAPI multi-agent backend, PostgreSQL database, and an extensible market intelligence pipeline with 33 data source adapters.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + React 19 + TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui (50+ Radix components) |
| State | Zustand (localStorage persistence) |
| Auth | NextAuth.js 4 (Credentials, Google OAuth, Azure AD) |
| Database | PostgreSQL 16 + Prisma ORM 6 |
| AI Agents | Python FastAPI (6 specialized agents) |
| LLM Providers | OpenAI, Anthropic, Azure OpenAI, Google Gemini, Groq, Z-AI, Ollama |
| Integrations | Jira, Confluence, Slack, SMTP Email, Zoom, Teams |
| Deployment | Docker → GCP Cloud Build → Cloud Run (us-central1) |
| Security | AES-256-GCM encryption, Cloudflare Turnstile CAPTCHA |

---

## 3. Architecture

```
                    Cloudflare CDN
                  ai.theproductowner.org
                         │
              ┌──────────▼──────────┐
              │    GCP Cloud Run    │
              │                     │
              │  ┌───────────────┐  │
              │  │  Next.js 16   │  │
              │  │  React 19 SPA │  │
              │  │  93 API routes│  │
              │  └──────┬────────┘  │
              └─────────┼───────────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
   ┌──────▼──────┐ ┌───▼────┐ ┌─────▼──────┐
   │ Python      │ │Cloud   │ │ Meeting    │
   │ FastAPI     │ │SQL     │ │ Bot (VM)   │
   │ 6 AI Agents │ │Postgres│ │ Playwright │
   │ :8100       │ │Prisma  │ │ + Whisper  │
   └─────────────┘ └────────┘ └────────────┘
```

---

## 4. Features — Current Status

### Core PM Features (Complete)
- **Initiative Pipeline** — Kanban board with 5 stages (idea → discovery → validation → definition → approved), drag-and-drop
- **Meeting Management** — Transcript upload, AI summarization, action item extraction, decision logging
- **Risk Center** — Risk identification, severity scoring, AI-powered assessment and mitigation plans
- **Roadmap** — Quarterly planning with color-coded status and scheduling
- **Value Meter** — 5-dimensional scoring (revenue, user impact, alignment, feasibility, timing)
- **User Journey** — Persona management linked to initiatives
- **Discovery Workspace** — Multi-tab workspace (AI prep, docs, interviews, market research, impact)

### Vision Pillar — Azmyra 3.0 (Complete)
- **North Star** — Company mission statement with confidence scoring
- **Business Goals** — Strategic objectives linked to North Star
- **Target Groups** — Detailed user personas (roles, demographics, goals, pain points)
- **Needs Mapping** — User needs ranked by severity
- **Product Mapping** — Link needs to product solutions
- **Vision Alignment Score (VAS)** — Weighted scoring: North Star 35%, Goals 25%, Audience 20%, Needs 20%
- **Vision Pyramid** — Visual hierarchy

### AI & Autonomy (Complete)
- **6 Specialized Agents** — Strategy, Discovery, Risk, Communications, Advisor, Thinker
- **Autonomy Levels** — Full, Oversight, Advisory, Manual
- **Tool Execution** — Jira, Confluence, Slack, Email via MCP protocol
- **Pending Actions** — User approval workflow for sensitive operations
- **Knowledge Base (RAG)** — File upload (PDF/DOCX/CSV) + URL scraping

### Market Intelligence (Complete)
- **33 Data Source Adapters** — DuckDuckGo, Reddit, HN, Wikipedia, arXiv, Semantic Scholar, World Bank, FRED, BLS, Google Trends, G2, Capterra, ProductHunt, Crunchbase, Glassdoor, TechCrunch, StackOverflow, App Store, Play Store, LinkedIn Jobs, Google Patents, Statista, and more
- **Parallel Data Gathering** — Fan-out to multiple sources concurrently
- **Rate Limiting** — Per-adapter token bucket
- **Result Caching** — TTL-based with key invalidation
- **AI Synthesis** — LLM report generation with source attribution
- **Version History** — Track edits and changes

### Competitor Intelligence (Complete)
- **Competitor Tracking** — Profile competitors with website, market analysis
- **Feed System** — News, updates, pricing changes, hiring signals
- **Market Analysis** — LLM-powered analysis from scraped data
- **Competitive Radar** — Visual positioning chart

### Autonomous AI System (Complete)
- **Cron Job Scheduler** — competitor_scan, strategy_eval, risk_reassess, market_pulse, portfolio_review
- **Job Queue** — Database-backed async execution
- **Alert System** — Competitor moves, alignment drift, market shifts, action required
- **Execution Logging** — Track runs with results/errors

### Integrations (Complete)
- **Jira** — Project/issue CRUD, schema discovery, advanced search
- **Confluence** — Document search and embedding
- **Slack** — Message sending, webhook callbacks
- **Email (SMTP)** — Send emails from agents
- **Zoom** — Server-to-Server OAuth (bot join ready)
- **Teams** — Azure AD auth, bot callback (requires M365 Business)

### Sharing & Collaboration (Complete)
- **Share Links** — Read-only URLs for any resource
- **Guest Comments** — Comment without login
- **Access Control** — View-only, comment, edit levels
- **Expiration** — Time-limited links

### Security (Complete)
- **AES-256-GCM Encryption** — All sensitive credentials encrypted at rest
- **Prisma Middleware** — Automatic encrypt/decrypt on sensitive fields
- **Cloudflare Turnstile** — CAPTCHA on registration
- **Password Strength Validation** — Enforced on signup
- **Role-Based Access** — Admin, Member, Viewer

---

## 5. Database Schema

**36 Prisma models** across 9 domains:

| Domain | Models | Purpose |
|--------|--------|---------|
| Authentication | User, Account, Session, VerificationToken, UserSettingsRecord | Auth + encrypted credentials |
| Initiatives | Initiative, Meeting, Risk, Document, OnboardingProgress | Core PM data |
| Chat & Knowledge | ChatMessage, ChatSession, KnowledgeDocument | AI assistant + RAG |
| Market Intelligence | MarketResearch, DataPoint, DataConnectorConfig, DataJob, ContentVersion, WatchTopic, MarketAlert | Data pipeline |
| Vision | NorthStar, BusinessGoal, TargetGroup, Need, ProductMapping, AlignmentScore | Vision pillar |
| Competitors | Competitor, CompetitorFeed, BusinessImpact | Competitive intelligence |
| Autonomous AI | CronJob, CronRun, UserAlert, PendingAction | Automation |
| Sharing | ShareLink, ShareComment, SyncRecord | Collaboration |

---

## 6. API Surface

**93 API route endpoints** covering:

- Authentication & Profile (5 routes)
- Chat & Agents (7 routes)
- Initiatives CRUD (4 routes)
- Meetings + Bot (7 routes)
- Risks + AI Assessment (4 routes)
- Market Research & Data Pipeline (12 routes)
- Integrations — Jira, Confluence, Slack, Email, Zoom, Teams (17 routes)
- Vision Pillar — North Star, Goals, Audiences, Needs, Products, Alignment (14 routes)
- Strategy Evaluation (7 routes)
- Competitor Intelligence (8 routes)
- Cron & Automation (8 routes)
- Alerts (5 routes)
- Sharing & Collaboration (5 routes)
- Knowledge Base (3 routes)
- Onboarding (4 routes)
- Content Versioning, LLM Testing, Bot Callback (3 routes)

---

## 7. Deployment Infrastructure

### Current (Production)
| Component | Service | Cost |
|-----------|---------|------|
| Next.js App | Cloud Run (`azmyra-app`) | ~$0-15/mo (scales to zero) |
| PostgreSQL | Cloud SQL | ~$10-15/mo |
| Docker Build | Cloud Build | ~$0-5/mo |
| DNS/CDN | Cloudflare | Free |
| **Total** | | **~$15-35/mo** |

### Deployment Flow
```
Code Push → Cloud Build (cloudbuild.yaml)
         → Docker multi-stage build
         → Push to GCR
         → gcloud run deploy (manual)
         → Live at ai.theproductowner.org
```

---

## 8. Known Limitations

1. **Teams Bot Join** — Graph Communications API requires Microsoft 365 Business/Enterprise licenses + same-tenant matching. Personal Teams meetings not supported via Graph API.
2. **Meeting Bot** — Currently Zoom SDK-based. Needs migration to headless browser (Playwright) for cross-platform guest join support (Teams, Zoom, Google Meet, Webex).
3. **LLM Config** — Stored client-side (Zustand/localStorage), not in DB. API routes receive config from request body.
4. **Cron Execution** — Cloud Run scales to zero, so cron jobs need external trigger (Cloud Scheduler or VM).
5. **Python Agent Service** — Not yet deployed to Cloud Run (runs locally or in Docker Compose).

---

## 9. Future Plan

### Phase 1: Meeting Bot VM (Next — ~$15/month)

Deploy a GCE VM running a headless browser bot that joins any meeting as a guest participant — no admin setup, no Microsoft/Zoom accounts required from the user.

| Component | Spec |
|-----------|------|
| VM | GCE e2-medium (2 vCPU, 4GB RAM) |
| Bot | Playwright + Chrome headless |
| Transcription | Faster-Whisper large-v3 (self-hosted, 100+ languages, fully private) |
| Supported Platforms | Teams, Zoom, Google Meet, Webex, GoTo Meeting |
| Cost | ~$15/month flat (unlimited meetings, zero per-minute charges) |

**How it works:** User pastes meeting link → bot opens it in headless Chrome → joins as "Azmyra Bot" guest → captures audio → transcribes with Faster-Whisper → streams transcript back to the platform.

### Phase 2: Self-Hosted LLM — Freemium Model

**Business Model:**

| Plan | LLM | Cost to User |
|------|-----|-------------|
| **Free** | Bring Your Own Key (OpenAI, Anthropic, Groq, etc.) | $0/mo platform + own API costs |
| **Premium** | Azmyra AI — fine-tuned for Product Management | $29-49/user/month |

**Recommended base model: Qwen 2.5 7B**
- 100+ languages (multilingual)
- Fine-tuned with QLoRA on PM domain tasks (meeting summaries, PRDs, strategy, risk assessment)
- Full data privacy — nothing leaves the server
- Training cost: ~$5-10 one-time (2-4 hours on rented A100)

**Infrastructure scaling:**

| Tier | VM Spec | Concurrent Users | Monthly Cost |
|------|---------|-------------------|-------------|
| Tier 1 (Start) | e2-standard-4 (4 vCPU, 16GB) — CPU | 5-10 | ~$30/mo |
| Tier 2 (Growth) | n1-standard-4 + T4 GPU (16GB VRAM) | 20-50 | ~$190/mo |
| Tier 3 (Scale) | n1-standard-8 + A100 (40GB VRAM) | 50-200 | ~$800/mo |

**Unit economics:**

| Premium Users | Revenue | Infrastructure Cost | Margin |
|--------------|---------|-------------------|--------|
| 5 | $145-245/mo | $30/mo | 79-88% |
| 20 | $580-980/mo | $190/mo | 67-81% |
| 50 | $1,450-2,450/mo | $190/mo | 87-92% |

### Phase 3: Market Monitoring (Automated)
- WatchTopic + MonitoringScan models (already in schema)
- Automated daily market scanning via cron on VM
- Alert generation for market shifts, competitor moves

### Phase 4: Activity Intelligence
- Integration with internal analytics (Mixpanel, Amplitude, GA)
- User behavior → Need correlation
- Data-driven initiative prioritization

### Phase 5: Predictive Intelligence
- Market trend prediction
- Growth forecasting
- Risk probability modeling

---

## 10. Project Structure

```
virtual-ppo-ppm/
├── src/
│   ├── app/                    # Next.js App Router (17 pages + 93 API routes)
│   ├── components/
│   │   ├── views/              # 17 main view components
│   │   ├── ui/                 # 50+ shadcn/ui components
│   │   ├── competitors/        # Competitor intelligence UI
│   │   ├── vision/             # Vision pillar UI
│   │   ├── market-research/    # Market research UI
│   │   ├── onboarding/         # 8-step onboarding wizard
│   │   ├── share/              # Sharing & collaboration
│   │   ├── alerts/             # Notification system
│   │   └── layout/             # Sidebar, ErrorBoundary
│   ├── lib/
│   │   ├── services/
│   │   │   ├── data-pipeline/  # 33 data source adapters
│   │   │   ├── llm.ts          # Multi-provider LLM service
│   │   │   ├── teams-bot.ts    # Teams integration
│   │   │   ├── jira.ts         # Jira API client
│   │   │   ├── confluence.ts   # Confluence API client
│   │   │   ├── slack.ts        # Slack API client
│   │   │   └── email.ts        # SMTP email
│   │   ├── tools/              # MCP tool system
│   │   ├── auth.ts             # NextAuth config
│   │   ├── db.ts               # Prisma client
│   │   ├── encryption.ts       # AES-256-GCM
│   │   ├── store.ts            # Zustand state
│   │   └── types.ts            # TypeScript types (657 lines)
│   └── middleware.ts           # Auth + onboarding guard
├── meeting-bot/                # Python FastAPI meeting bot
├── prisma/
│   └── schema.prisma           # 36 models (739 lines)
├── Dockerfile                  # Multi-stage Next.js production build
├── Dockerfile.agents           # Python agent service
├── docker-compose.yml          # Full local dev stack
├── cloudbuild.yaml             # GCP Cloud Build
└── package.json
```

---

## 11. Key Architectural Decisions

1. **LLM Config = Client-Side** — Stored in Zustand, passed in API request body. Enables per-user LLM provider without server-side storage.
2. **Prisma JSON as String** — Fields like `extractedFacts`, `metadata` stored as `String @default("{}")`. Always `JSON.parse()` on frontend.
3. **Data Adapter Pattern** — Extensible registry with auto-registration, rate limiting, caching. Add new sources by implementing the `DataAdapter` interface.
4. **Autonomy Gating** — Agent actions checked against user-selected autonomy level. Write operations require approval in Oversight mode.
5. **Encryption Middleware** — Prisma middleware auto-encrypts/decrypts sensitive fields (API keys, tokens, passwords).
6. **Standalone Next.js Output** — Docker builds with isolated Prisma CLI stage for schema sync at startup.
7. **Meeting Bot as Guest** — Headless browser approach joins meetings as guest participant, bypassing all platform-specific API complexity.
