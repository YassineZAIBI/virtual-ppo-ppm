# Virtual PPO/PPM - Product Status & Functionalities

> **Version:** 2.1.0
> **Last Updated:** 2026-02-14
> **Status:** Production-Ready MVP

---

## Overview

Virtual PPO/PPM is an AI-powered Proxy Product Owner / Product Portfolio Manager designed for Data & AI product teams. It combines traditional product management workflows with intelligent AI assistance to automate and streamline the product lifecycle - from idea inception through discovery, validation, definition, and approval.

---

## Architecture

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Server/Client Components) |
| **Language** | TypeScript 5 |
| **Database** | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
| **Authentication** | NextAuth.js v4 (JWT strategy, Credentials provider) |
| **State Management** | Zustand with localStorage persistence |
| **UI Components** | shadcn/ui (40+ Radix UI primitives) |
| **Styling** | Tailwind CSS v4 with dark/light mode |
| **AI Integration** | Multi-provider LLM (Z-AI, OpenAI, Anthropic, Azure, Ollama) |
| **Integrations** | Jira, Slack, Confluence, Email (REST APIs + MCP) |
| **Security** | bcryptjs passwords, AES-256-GCM credential encryption, JWT auth |

### Hybrid Integration Architecture

```
UI-Driven Features          AI-Driven Features
(Direct REST APIs)          (MCP Tool Calling)
       |                           |
  Dashboards                 AI Chat Assistant
  Kanban boards              decides which tools
  Settings UI                to call dynamically
  Discovery Workspace              |
       |                           v
       v                    MCP Client (9 tools)
  Service Layer (jira.ts, slack.ts, confluence.ts, email.ts)
       |
       v
  External APIs (Jira, Slack, Confluence, SMTP)
```

---

## Modules & Functionalities (12 Modules)

### 1. Authentication & User Management
- **Status:** Implemented
- **Route:** `/auth/signin`
- JWT-based authentication with NextAuth.js
- User registration with email/password
- bcrypt password hashing (12 rounds)
- Middleware-based route protection (all routes require login)
- Session management with role-based access (admin/user)
- User avatar and logout in sidebar
- Demo account: `demo@virtualppo.com` / `demo123`

### 2. Dashboard
- **Status:** Implemented
- **Route:** `/`
- Real-time stats cards (initiatives, meetings, risks, action items)
- Attention items requiring action
- Quick actions panel (AI-powered suggestions)
- Recent initiatives overview
- Risk summary with severity indicators

### 3. AI Chat Assistant
- **Status:** Implemented
- **Route:** `/chat`
- Multi-provider LLM support (switch between 5 providers)
- Contextual product management conversations
- Markdown-rendered responses
- Conversation history (last 10 messages for context)
- System prompt optimized for PM tasks:
  - Product strategy & planning
  - Meeting management
  - Initiative evaluation
  - Documentation generation
  - Stakeholder communication
- MCP tool calling for external service interactions

### 4. Meetings Intelligence
- **Status:** Implemented
- **Route:** `/meetings`
- Meeting transcript upload and AI-powered analysis
- Automatic extraction of:
  - Meeting summary
  - Action items with assignees
  - Key decisions
  - Identified challenges
- AI agent meeting attendance mode
- Meeting history with status tracking (scheduled/completed/processing/summarized)

### 5. Product Roadmap (Quarterly Timeline)
- **Status:** Implemented
- **Route:** `/roadmap`
- **4-column quarterly layout** (Q1-Q4) with color-coded headers (blue, emerald, amber, purple)
- Year selector with prev/next navigation
- Current quarter highlighted with ring indicator
- Assign initiatives to quarters via dropdown selectors
- Unassigned initiative pool at bottom
- Color-coded status indicators per item
- Business value indicators (high/medium/low)
- Risk tooltips on items with identified risks
- Export roadmap as structured JSON
- Stats row: Total, Approved, In Progress, At Risk, Assigned
- Expandable details (stakeholders, risks, dependencies, tags)
- Quarter assignments persist to localStorage

### 6. Initiatives Pipeline
- **Status:** Implemented
- **Route:** `/initiatives`
- 5-stage Kanban board: Idea > Discovery > Validation > Definition > Approved
- Forward/backward movement between stages
- Create, edit, delete initiatives
- **Business Case Questions on every initiative card:**
  - Why do you need this initiative?
  - What if this initiative is not approved or we don't have a solution?
  - Expected Business Value (mandays, revenue, time saved)
  - Expected Time to Market
- Business case indicators visible on Kanban cards (color-coded icons)
- "Explore" button on Discovery-stage cards linking to Discovery Workspace
- Fields: title, description, business value, effort, stakeholders, tags, risks, dependencies
- Color-coded value/effort indicators

### 7. Discovery Workspace
- **Status:** Implemented
- **Route:** `/discovery?id=<initiative-id>`
- **Dedicated discovery section** accessible from Initiatives Pipeline
- **Left navigation panel** listing all discovery-stage initiatives with status indicators
- **5 discovery tabs:**
  - **AI Preparation** - AI generates comprehensive discovery plan (goals, hypotheses, research plan, timeline, risk mitigation)
  - **Documentation** - PRD outlines, technical requirements, user stories, acceptance criteria (manual + AI-generated)
  - **Interviews** - Interview guides, target personas, sample questions, synthesis framework (manual + AI-generated)
  - **Market Research** - Competitive landscape, market sizing, TAM/SAM/SOM, trend analysis (manual + AI-generated)
  - **Impact Analysis** - Impact dimensions, measurement metrics, ROI framework, sensitivity analysis (manual + AI-generated)
- Each tab supports:
  - Manual note creation (Markdown)
  - AI content generation per section
  - Note management (create/delete)
  - AI-generated badge indicators
- Business case summary cards at top (Why Needed, Expected Value, Time to Market)
- Discovery data persists with initiative in Zustand store

### 8. Value Meter (AI Value Assessment)
- **Status:** Implemented
- **Route:** `/value-meter`
- AI-powered initiative challenge and value estimation
- Automated value proposition scoring across 5 dimensions:
  - Revenue Impact
  - User Impact
  - Strategic Alignment
  - Technical Feasibility
  - Market Timing
- Overall value score (0-100) with color grading
- AI-generated strengths, weaknesses, and recommendations
- **AI Challenge** - provocative question pushing back on assumptions
- "Assess All" button for batch processing
- Individual re-assessment capability
- Fallback local assessment when AI is unavailable
- Mini dimension bars in collapsed view, full bars in expanded
- Assessments persist to localStorage

### 9. Swagger / API Testing
- **Status:** Implemented
- **Route:** `/swagger`
- API endpoint documentation with method badges (GET/POST)
- AI-powered test case generation
- Fallback to local template generation
- Expandable endpoint details
- Test execution interface

### 10. User Journey Mapping
- **Status:** Implemented
- **Route:** `/user-journey`
- Persona management (create/delete)
- Journey step visualization per persona
- Step types with emoji indicators
- Add/remove journey steps

### 11. Settings & Configuration
- **Status:** Implemented
- **Route:** `/settings`
- **LLM Provider Config:** Switch between Z-AI, OpenAI, Anthropic, Azure OpenAI, Ollama
- **Integration Settings:**
  - Jira: URL, email, API token + connection test
  - Slack: Bot token, channel ID + connection test
  - Confluence: URL, email, API token + connection test
  - Email: SMTP config (host, port, credentials) + validation
- **Preferences:** Autonomy level, notifications, auto-actions, theme
- Server-side AES-256-GCM encrypted credential storage

### 12. Sidebar Navigation
- Collapsible sidebar with 10 navigation items
- Active route highlighting
- Autonomous Mode status badge
- User avatar with name/email display
- Logout button with redirect to sign-in
- Auto-hidden on authentication pages

---

## Initiative Lifecycle

```
Idea --> Discovery --> Validation --> Definition --> Approved
  |          |
  |          v
  |    Discovery Workspace
  |    (AI Prep, Docs, Interviews, Market Research, Impact)
  |
  v
Business Case Questions:
  - Why needed?
  - What if not approved?
  - Expected business value?
  - Time to market?
```

Each initiative carries 4 business case fields plus optional discovery data through its entire lifecycle.

---

## Integration Services

### Jira (REST API v3)
| Capability | Endpoint |
|-----------|----------|
| Get projects | `GET /api/integrations/jira?action=projects` |
| Search issues (JQL) | `GET /api/integrations/jira?action=issues&jql=...` |
| Get issue details | `GET /api/integrations/jira?action=issue&issueKey=...` |
| Create issue | `POST /api/integrations/jira` (action: create) |
| Update issue | `POST /api/integrations/jira` (action: update) |
| Add comment | `POST /api/integrations/jira` (action: comment) |
| Transition issue | `POST /api/integrations/jira` (action: transition) |
| Test connection | `GET /api/integrations/jira/test` |

### Slack (Web API)
| Capability | Endpoint |
|-----------|----------|
| Post message | `POST /api/integrations/slack` (action: message) |
| Meeting summary (Block Kit) | `POST /api/integrations/slack` (action: meeting-summary) |
| Initiative update | `POST /api/integrations/slack` (action: initiative-update) |
| Channel history | `POST /api/integrations/slack` (action: history) |
| Test connection | `GET /api/integrations/slack/test` |

### Confluence (REST API v2)
| Capability | Endpoint |
|-----------|----------|
| Get spaces | `GET /api/integrations/confluence?action=spaces` |
| Get pages | `GET /api/integrations/confluence?action=pages` |
| Search content | `GET /api/integrations/confluence?action=search&q=...` |
| Create page | `POST /api/integrations/confluence` (action: create-page) |
| Meeting notes page | `POST /api/integrations/confluence` (action: meeting-notes) |
| Test connection | `GET /api/integrations/confluence/test` |

### Email (Nodemailer/SMTP)
| Capability | Endpoint |
|-----------|----------|
| Send email | `POST /api/integrations/email` (action: send) |
| Meeting follow-up | `POST /api/integrations/email` (action: meeting-followup) |
| Initiative notification | `POST /api/integrations/email` (action: initiative-notification) |
| Weekly digest | `POST /api/integrations/email` (action: weekly-digest) |
| Config validation | `GET /api/integrations/email/test` |

---

## MCP Tools (AI-Callable)

The AI assistant can dynamically call these tools during conversations:

| Tool | Description |
|------|------------|
| `jira_search_issues` | Search Jira via JQL |
| `jira_create_issue` | Create Story/Task/Bug/Epic |
| `jira_get_issue` | Get issue by key |
| `jira_add_comment` | Comment on issue |
| `slack_post_message` | Send Slack message |
| `slack_send_meeting_summary` | Post formatted meeting summary |
| `confluence_search` | Search Confluence pages |
| `confluence_create_page` | Create Confluence page |
| `email_send` | Send email notification |

---

## Database Schema (12 Tables)

| Table | Purpose |
|-------|---------|
| `User` | User accounts with email, password hash, role |
| `Account` | OAuth provider accounts (NextAuth) |
| `Session` | Active sessions (NextAuth) |
| `VerificationToken` | Email verification tokens |
| `UserSettingsRecord` | Encrypted integration credentials per user |
| `Initiative` | Product initiatives with full metadata |
| `Meeting` | Meetings with summaries, action items, decisions |
| `Risk` | Risk register with severity, probability, impact |
| `ChatMessage` | AI conversation history |
| `Document` | PRDs, specs, decision logs, meeting notes |

---

## API Routes (15 endpoints)

| Route | Methods | Description |
|-------|---------|------------|
| `/api` | GET | Health check (version, status) |
| `/api/auth/[...nextauth]` | GET, POST | NextAuth handler |
| `/api/auth/register` | POST | User registration |
| `/api/chat` | POST | AI chat with multi-provider LLM |
| `/api/meetings` | POST | Meeting transcript analysis |
| `/api/integrations/jira` | GET, POST | Jira operations |
| `/api/integrations/jira/test` | GET | Jira connection test |
| `/api/integrations/slack` | POST | Slack operations |
| `/api/integrations/slack/test` | GET | Slack connection test |
| `/api/integrations/confluence` | GET, POST | Confluence operations |
| `/api/integrations/confluence/test` | GET | Confluence connection test |
| `/api/integrations/email` | POST | Email operations |
| `/api/integrations/email/test` | GET | Email config validation |

---

## Page Routes (12 pages)

| Route | Component | Description |
|-------|-----------|------------|
| `/` | DashboardView | Main dashboard with stats and overview |
| `/auth/signin` | SignInPage | Login and registration |
| `/chat` | ChatInterface | AI assistant conversation |
| `/meetings` | MeetingsView | Meeting management and AI analysis |
| `/roadmap` | RoadmapView | Quarterly product roadmap (Q1-Q4) |
| `/initiatives` | InitiativesPipeline | 5-stage Kanban pipeline with business case |
| `/discovery` | DiscoveryView | Discovery workspace with AI-assisted research |
| `/value-meter` | ValueMeterView | AI value assessment for initiatives |
| `/swagger` | SwaggerView | API documentation and testing |
| `/user-journey` | UserJourneyView | Persona journey mapping |
| `/settings` | SettingsView | App configuration |

---

## Security Features

- **Authentication:** JWT tokens with NextAuth.js, session expiry
- **Login Gate:** Middleware redirects unauthenticated users to `/auth/signin`
- **Password Security:** bcrypt hashing with 12 salt rounds
- **Credential Encryption:** AES-256-GCM for stored API keys/tokens
- **Route Protection:** Middleware-based auth gate on all non-public routes
- **Public Routes:** Only `/auth/signin` and `/api/*` are accessible without login
- **Input Validation:** Server-side validation on all API endpoints
- **Environment Isolation:** Secrets in `.env` files (gitignored)

---

## Tech Stack Summary

**Frontend:**
- React 19 with Server Components
- Tailwind CSS v4 + shadcn/ui (40+ components)
- Zustand (client state) + React Hook Form
- Lucide icons + Recharts
- react-markdown (AI response rendering)
- next-themes (dark/light mode)
- Sonner (toast notifications)

**Backend:**
- Next.js API Routes (Edge-compatible)
- Prisma ORM + SQLite/PostgreSQL
- NextAuth.js + bcryptjs
- Nodemailer (SMTP)
- z-ai-web-dev-sdk

**DevOps:**
- TypeScript 5 strict mode
- ESLint + Next.js config
- Prisma migrations
- Environment-based configuration

---

## Getting Started

```bash
# Install dependencies
npm install --legacy-peer-deps

# Setup database
npx prisma generate
npx prisma db push

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

**Demo credentials:** `demo@virtualppo.com` / `demo123`

---

## File Structure

```
virtual-ppo-ppm/
├── prisma/
│   ├── schema.prisma          # Database schema (12 tables)
│   ├── seed.ts                # Demo data seeder
│   └── dev.db                 # SQLite database
├── src/
│   ├── app/                   # Next.js App Router (12 page routes)
│   │   ├── layout.tsx         # Root layout (Sidebar + Providers)
│   │   ├── page.tsx           # Dashboard
│   │   ├── auth/signin/       # Authentication page
│   │   ├── chat/              # AI Assistant
│   │   ├── meetings/          # Meetings Intelligence
│   │   ├── roadmap/           # Quarterly Roadmap
│   │   ├── initiatives/       # Pipeline Kanban
│   │   ├── discovery/         # Discovery Workspace
│   │   ├── value-meter/       # AI Value Assessment
│   │   ├── swagger/           # API Documentation
│   │   ├── user-journey/      # Journey Mapping
│   │   ├── settings/          # Configuration
│   │   └── api/               # Backend API routes (15 endpoints)
│   ├── components/
│   │   ├── layout/            # Sidebar, ErrorBoundary
│   │   ├── providers/         # SessionProvider, ThemeProvider
│   │   ├── views/             # Feature view components (10 views)
│   │   │   ├── DashboardView.tsx
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MeetingsView.tsx
│   │   │   ├── RoadmapView.tsx
│   │   │   ├── InitiativesPipeline.tsx
│   │   │   ├── DiscoveryView.tsx
│   │   │   ├── ValueMeterView.tsx
│   │   │   ├── SwaggerView.tsx
│   │   │   ├── UserJourneyView.tsx
│   │   │   └── SettingsView.tsx
│   │   └── ui/                # shadcn/ui components (40+)
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── encryption.ts      # AES-256-GCM encryption
│   │   ├── store.ts           # Zustand state store
│   │   ├── types.ts           # TypeScript types (Initiative, DiscoveryData, etc.)
│   │   ├── utils.ts           # Utility functions
│   │   ├── mcp/client.ts      # MCP tool definitions (9 tools)
│   │   └── services/          # Integration services
│   │       ├── llm.ts         # Multi-provider LLM service
│   │       ├── jira.ts        # Jira REST API v3
│   │       ├── slack.ts       # Slack Web API
│   │       ├── confluence.ts  # Confluence REST API v2
│   │       └── email.ts       # Nodemailer SMTP
│   └── middleware.ts          # Auth route protection
├── .env.example               # Environment template
├── package.json               # Dependencies & scripts
└── STATUS.md                  # This file
```

---

## Build Status

```
✓ Compiled successfully (0 errors)
✓ 25 routes (12 pages + 13 API endpoints)
✓ Middleware active (auth gate)
✓ All routes tested and verified
```
