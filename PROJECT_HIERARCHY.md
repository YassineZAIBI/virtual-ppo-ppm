# Azmyra — Full Project Hierarchy

> Generated: 2026-04-04
> Excludes: node_modules/, .next/, .git/, prisma/generated/

---

## Root

```
virtual-ppo-ppm/
├── CLAUDE.md                          # Claude Code codebase guide (auto-loaded)
├── SANITY_CHECK.md                    # Full functionality verification (v6)
├── PROJECT_STATUS.md                  # Project status overview
├── PROJECT_SUMMARY.md                 # Project summary
├── README.md                          # Repo readme
├── SETUP.md                           # Setup instructions
├── LICENSE
│
├── SPRINT_2.md                        # Sprint specs (historical + current)
├── SPRINT_3.md
├── SPRINT_4.md
├── SPRINT_5.md
├── SPRINT_6.md
├── AZMYRA_3.0_REFACTORING_SPEC.md
├── PLAN.md
├── STATUS.md
│
├── package.json                       # Node dependencies
├── package-lock.json
├── tsconfig.json                      # TypeScript config
├── tsconfig.tsbuildinfo
├── next.config.ts                     # Next.js 16 config (turbopack root)
├── tailwind.config.ts                 # Tailwind CSS 4
├── postcss.config.mjs
├── vitest.config.ts                   # Test runner config
├── components.json                    # shadcn/ui config
├── next-env.d.ts
│
├── .env                               # Environment variables
├── .env.local                         # Local overrides
├── .env.example                       # Template for new devs
├── .gitignore
├── .gcloudignore
├── .mcp.json                          # MCP server config (Jira, GitHub, Postgres, Slack, Notion, Linear)
│
├── Dockerfile                         # Production container (multi-stage)
├── Dockerfile.agents                  # Python agents container
├── docker-compose.yml                 # Local dev orchestration
├── cloudbuild.yaml                    # GCP Cloud Build (app)
├── cloudbuild-agents.yaml             # GCP Cloud Build (agents)
├── start.sh                           # Container entrypoint (prisma db push + node server.js)
│
├── insert_snapshot.ps1                # PowerShell utility
├── test-adapters.ts                   # Adapter test utility
├── dev-error.log
└── dev-output.log
```

---

## .claude/ — Claude Code Configuration

```
.claude/
├── settings.json
├── settings.md
├── .gitignore
│
├── agents/
│   ├── code-reviewer.md               # PR code review agent
│   ├── db-migration.md                # Database migration agent
│   ├── feature-builder.md             # Feature implementation agent
│   └── orchestrator.md                # Multi-agent workflow orchestrator
│
├── commands/
│   ├── add-adapter.md                 # /add-adapter slash command
│   ├── deploy.md                      # /deploy slash command
│   ├── fix-bug.md                     # /fix-bug slash command
│   ├── new-feature.md                 # /new-feature slash command
│   ├── onboard.md                     # /onboard slash command
│   └── pr-review.md                   # /pr-review slash command
│
├── hooks/
│   ├── guard-destructive.js           # Blocks destructive git ops
│   ├── skill-eval.js                  # Skill evaluation hook
│   ├── skill-eval.sh                  # Skill evaluation shell script
│   └── skill-rules.json               # Skill routing rules
│
├── rules/
│   ├── code-style.md                  # Always-active code style rules
│   └── security.md                    # Always-active security rules
│
└── skills/
    ├── README.md
    ├── ai-agents/SKILL.md
    ├── api-routes/SKILL.md
    ├── data-adapters/SKILL.md
    ├── debugging/SKILL.md
    ├── prisma-patterns/SKILL.md
    ├── security/SKILL.md
    ├── testing-patterns/SKILL.md
    └── ui-components/SKILL.md
```

---

## .github/ — CI/CD Workflows

```
.github/
└── workflows/
    ├── pr-claude-code-review.yml       # Auto PR review
    ├── scheduled-claude-code-dependency-audit.yml
    ├── scheduled-claude-code-docs-sync.yml
    └── scheduled-claude-code-quality.yml
```

---

## prisma/ — Database Schema & Migrations

```
prisma/
├── schema.prisma                      # 40 models (PostgreSQL)
├── seed.ts                            # Sample data seeder
├── dev.db                             # Local SQLite fallback
└── migrations/
    ├── migration_lock.toml
    ├── 20260309155348_init/
    │   └── migration.sql
    └── 20260310123918_add_discovery_to_initiative/
        └── migration.sql
```

---

## public/ — Static Assets

```
public/
├── logo.svg
└── robots.txt
```

---

## docs/ — Documentation

```
docs/
├── ARCHITECTURE.md
└── MARKET_INTELLIGENCE_PLAN.md
```

---

## scripts/ — Deployment Scripts

```
scripts/
├── deploy-agents.ps1                  # Deploy Python agents to Cloud Run
└── setup-scheduler.ps1                # Configure Cloud Scheduler cron jobs
```

---

## meeting-bot/ — Meeting Bot Service (Python)

```
meeting-bot/
├── Dockerfile
├── app.py                             # FastAPI: /health, /join, /leave, /status
└── requirements.txt
```

---

## python-agents/ — AI Agent Service (Python FastAPI)

```
python-agents/
├── main.py                            # FastAPI entrypoint (:8100)
├── config.py
├── requirements.txt
│
├── agents/
│   ├── __init__.py
│   ├── autonomy.py                    # Autonomy level gating
│   ├── loop.py                        # Agent execution loop
│   ├── orchestrator.py                # Multi-agent orchestration
│   ├── prompts.py                     # Agent prompt templates
│   ├── registry.py                    # Agent type registry
│   ├── types.py                       # Agent type definitions
│   └── vision_guard.py               # Vision alignment guard
│
├── context/
│   ├── __init__.py
│   └── transversal.py                # Cross-agent context sharing
│
├── knowledge/
│   ├── __init__.py
│   ├── chunker.py                     # Document chunking
│   ├── ingest.py                      # Knowledge base ingestion
│   └── rag.py                         # RAG retrieval
│
├── providers/
│   ├── __init__.py
│   └── llm.py                         # LLM provider abstraction
│
├── scheduler/
│   ├── __init__.py
│   ├── registry.py                    # Job registry
│   ├── runner.py                      # Job runner
│   └── jobs/
│       ├── __init__.py
│       ├── base.py                    # Base job class
│       ├── competitor_scan.py
│       ├── full_portfolio_review.py
│       ├── market_pulse.py
│       ├── risk_reassess.py
│       ├── strategy_eval.py
│       └── vision_guard.py
│
└── tools/
    ├── __init__.py
    └── mcp_client.py                  # MCP tool client
```

---

## python-scraper/ — Web Scraper Service (Python)

```
python-scraper/
├── Dockerfile
├── main.py
├── config.py
├── extractors.py
├── fetchers.py
└── requirements.txt
```

---

## __tests__/ — Test Suite

```
__tests__/
├── adapters-and-services.test.ts
├── api-routes.test.ts
├── data-pipeline.test.ts
├── ui-components.test.tsx
│
├── autonomous/
│   ├── alert-generation.test.ts
│   ├── cron-run-tracking.test.ts
│   └── cron-scheduler.test.ts
│
├── competitors/
│   ├── competitor-api.test.ts
│   ├── competitor-scan.test.ts
│   └── feed-aggregation.test.ts
│
├── integration/
│   └── vision-flow.test.ts
│
├── security/
│   ├── account-deletion.test.ts
│   ├── data-export.test.ts
│   └── encryption-middleware.test.ts
│
├── session/
│   ├── chat-session.test.ts
│   └── session-continuity.test.ts
│
├── strategy/
│   ├── business-impact.test.ts
│   ├── cross-radar.test.ts
│   └── initiative-refactor.test.ts
│
└── vision/
    ├── alignment-score.test.ts
    ├── vision-api.test.ts
    └── vision-extraction.test.ts
```

---

## src/app/ — Next.js App Router (Pages + API)

### Pages (22 routes)

```
src/app/
├── page.tsx                           # Landing / redirect
├── layout.tsx                         # Root layout
├── globals.css                        # Global styles
│
├── auth/signin/page.tsx               # Sign in
├── chat/page.tsx                      # AI Chat
├── dashboard/page.tsx                 # Main dashboard
├── discovery/page.tsx                 # Market discovery
├── guide/page.tsx                     # Getting started guide
├── initiatives/page.tsx               # Initiative pipeline
├── integrations/page.tsx              # Integrations hub (Sprint 5)
├── meetings/page.tsx                  # Meetings
├── onboarding/
│   ├── layout.tsx
│   └── page.tsx                       # Onboarding wizard
├── profile/page.tsx                   # User profile
├── roadmap/page.tsx                   # Roadmap
├── settings/page.tsx                  # Settings
├── swagger/page.tsx                   # API docs
├── tactics/page.tsx                   # Tactics
├── user-journey/page.tsx              # User journey mapping
├── value-meter/page.tsx               # Value meter
│
├── share/[token]/
│   ├── layout.tsx
│   └── page.tsx                       # Public share view
│
├── strategy/
│   ├── page.tsx                       # Strategy overview
│   ├── discovery/page.tsx
│   ├── evaluator/page.tsx
│   ├── risks/page.tsx
│   └── roadmap/page.tsx
│
└── vision/
    ├── page.tsx                       # Vision board
    ├── audiences/page.tsx
    └── competitors/page.tsx
```

### API Routes (105 routes)

```
src/app/api/
├── route.ts                           # Health check
│
├── agents/
│   ├── actions/route.ts               # Pending actions CRUD
│   └── workflow/
│       ├── route.ts                   # POST: launch workflow
│       └── history/route.ts           # GET: workflow history
│
├── alerts/
│   ├── route.ts                       # List alerts
│   ├── [id]/route.ts                  # Single alert
│   ├── bulk/route.ts                  # Bulk operations
│   └── unread-count/route.ts          # Badge count
│
├── auth/
│   ├── [...nextauth]/route.ts         # NextAuth handler
│   └── register/route.ts             # User registration
│
├── bot/callback/route.ts             # Bot OAuth callback
│
├── chat/
│   ├── route.ts                       # Chat completions (→ Python agents)
│   └── sessions/
│       ├── route.ts                   # List sessions
│       └── [id]/route.ts             # Single session
│
├── competitors/
│   ├── route.ts                       # CRUD competitors
│   ├── [id]/
│   │   ├── route.ts                   # Single competitor
│   │   └── feed/route.ts            # Competitor feed
│   ├── feed/route.ts                 # Global feed
│   ├── market-analysis/route.ts
│   ├── radar/route.ts
│   ├── scan/route.ts
│   └── suggest/route.ts
│
├── connectors/
│   ├── route.ts
│   └── [id]/route.ts
│
├── content-versions/route.ts
│
├── cron/
│   ├── competitor-scan/route.ts       # Cloud Scheduler target
│   ├── initialize/route.ts
│   ├── market-pulse/route.ts          # Cloud Scheduler target
│   ├── strategy-eval/route.ts         # Cloud Scheduler target
│   ├── jobs/
│   │   ├── route.ts
│   │   ├── due/route.ts
│   │   └── [id]/
│   │       ├── route.ts
│   │       └── trigger/route.ts
│   └── runs/
│       ├── route.ts
│       └── [id]/route.ts
│
├── data-pipeline/
│   ├── adapters/
│   │   ├── route.ts                   # List all adapters
│   │   └── [key]/test/route.ts       # Test single adapter
│   └── jobs/[id]/route.ts
│
├── initiatives/
│   ├── route.ts                       # CRUD initiatives
│   └── [id]/route.ts
│
├── insights/
│   ├── route.ts                       # Proactive insights
│   └── [id]/route.ts
│
├── integrations/
│   ├── connect/route.ts               # POST: connect integration (Sprint 5)
│   ├── disconnect/route.ts            # POST: disconnect integration (Sprint 5)
│   ├── status/route.ts                # GET: all integration statuses (Sprint 5)
│   ├── notion/ingest/route.ts         # POST: ingest Notion pages (Sprint 5)
│   ├── confluence/
│   │   ├── route.ts
│   │   └── test/route.ts
│   ├── email/
│   │   ├── route.ts
│   │   └── test/route.ts
│   ├── jira/
│   │   ├── route.ts
│   │   └── test/route.ts
│   ├── slack/
│   │   ├── route.ts
│   │   └── test/route.ts
│   ├── teams/test/route.ts
│   └── zoom/test/route.ts
│
├── knowledge/
│   ├── route.ts
│   ├── scrape/route.ts
│   └── upload/route.ts
│
├── llm/test/route.ts
│
├── market-research/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       ├── gather/route.ts
│       └── synthesize/route.ts
│
├── meetings/
│   ├── route.ts
│   ├── [id]/route.ts
│   └── bot/
│       ├── join/route.ts
│       ├── leave/route.ts
│       ├── status/[id]/route.ts
│       └── transcript-chunk/route.ts
│
├── onboarding/
│   ├── complete/route.ts
│   ├── status/route.ts
│   ├── sync/route.ts
│   └── test-connection/route.ts
│
├── profile/
│   ├── route.ts
│   ├── delete/route.ts
│   └── export/route.ts
│
├── risks/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── assess/route.ts
│
├── settings/                          # (empty — settings in Zustand)
│
├── share/
│   ├── route.ts
│   └── [token]/
│       ├── route.ts
│       ├── comments/route.ts
│       └── revoke/route.ts
│
├── strategy/
│   ├── competitive-rank/route.ts
│   ├── cross-radar/route.ts
│   ├── evaluate/
│   │   ├── route.ts
│   │   └── weekly/route.ts
│   ├── impact/route.ts
│   └── portfolio/route.ts
│
└── vision/
    ├── route.ts
    ├── alignment/
    │   ├── route.ts
    │   └── batch/route.ts
    ├── business-goals/
    │   ├── route.ts
    │   └── [id]/route.ts
    ├── extract/route.ts
    ├── needs/
    │   ├── route.ts
    │   └── [id]/route.ts
    ├── north-star/route.ts
    ├── products/
    │   ├── route.ts
    │   └── [id]/route.ts
    ├── pyramid/
    │   ├── route.ts
    │   └── generate/route.ts
    └── target-groups/
        ├── route.ts
        └── [id]/route.ts
```

---

## src/components/ — React Components

### Views (18 view components)

```
src/components/views/
├── ChatInterface.tsx                  # AI chat UI
├── CompetitorsEyeView.tsx            # Competitor radar + feed
├── DashboardView.tsx                  # Main dashboard
├── DiscoveryView.tsx                  # Market discovery
├── EvaluatorView.tsx                  # Strategy evaluator
├── GettingStartedGuide.tsx           # Onboarding guide
├── InitiativesPipeline.tsx           # Kanban pipeline
├── IntegrationsHubView.tsx           # Integration cards (Sprint 5)
├── MeetingsView.tsx                   # Meetings list + bot join
├── OnboardingWizard.tsx              # 7-step onboarding
├── ProfileView.tsx                    # User profile + data export/delete
├── RiskCenterView.tsx                # Risk management
├── RoadmapView.tsx                    # Timeline roadmap
├── SettingsView.tsx                   # Settings (LLM, integrations, prefs)
├── SwaggerView.tsx                    # API documentation
├── TacticsView.tsx                    # Tactics board
├── UserJourneyView.tsx               # User journey mapping
└── ValueMeterView.tsx                # Value delivery meter
```

### Feature Components

```
src/components/
├── agents/
│   ├── WorkflowLauncher.tsx           # Launch multi-agent workflow (Sprint 4)
│   └── WorkflowTimeline.tsx           # Workflow step history (Sprint 4)
│
├── alerts/
│   ├── AlertBell.tsx                  # Header notification bell
│   └── AlertPanel.tsx                 # Alert list + routing
│
├── competitors/
│   ├── CompetitorAddDialog.tsx
│   ├── CompetitorCard.tsx
│   ├── CompetitorFeedItem.tsx
│   ├── CompetitorFeedTimeline.tsx
│   └── CompetitorRadarView.tsx
│
├── connectors/
│   └── ConnectorManager.tsx
│
├── dashboard/
│   └── InsightsPanel.tsx              # Proactive insights widget (Sprint 3)
│
├── editing/
│   └── EditableMarkdown.tsx
│
├── knowledge/
│   └── KnowledgeUploader.tsx
│
├── landing/
│   └── LandingPage.tsx
│
├── layout/
│   ├── ErrorBoundary.tsx
│   ├── Sidebar.tsx                    # Main navigation sidebar
│   └── VisionGateBanner.tsx
│
├── market-research/
│   ├── AdapterSelector.tsx
│   ├── DataPointCard.tsx
│   ├── JobProgress.tsx
│   ├── MarketResearchPanel.tsx
│   └── SourceAttribution.tsx
│
├── onboarding/
│   ├── CompetitorsStep.tsx
│   ├── CompletionStep.tsx
│   ├── IdentityStep.tsx
│   ├── IntegrationStep.tsx
│   ├── NorthStarStep.tsx
│   ├── SyncStep.tsx
│   ├── VisionBuildStep.tsx
│   └── WelcomeStep.tsx
│
├── providers/
│   └── Providers.tsx                  # NextAuth + Theme + Toast
│
├── settings/
│   └── CronDashboard.tsx
│
├── share/
│   ├── GuestHeader.tsx
│   ├── ShareButton.tsx
│   ├── ShareDialog.tsx
│   └── SharedCommentSection.tsx
│
├── vision/
│   ├── AlignmentBadge.tsx
│   ├── BusinessGoalCard.tsx
│   ├── NeedCard.tsx
│   ├── NorthStarComposer.tsx
│   ├── TargetGroupCard.tsx
│   ├── VisionBoardView.tsx
│   └── VisionPyramid.tsx
│
└── ui/                                # 50+ shadcn/ui primitives
    ├── accordion.tsx
    ├── alert-dialog.tsx
    ├── alert.tsx
    ├── aspect-ratio.tsx
    ├── avatar.tsx
    ├── badge.tsx
    ├── breadcrumb.tsx
    ├── button.tsx
    ├── calendar.tsx
    ├── card.tsx
    ├── carousel.tsx
    ├── chart.tsx
    ├── checkbox.tsx
    ├── collapsible.tsx
    ├── command.tsx
    ├── context-menu.tsx
    ├── dialog.tsx
    ├── drawer.tsx
    ├── dropdown-menu.tsx
    ├── example-badge.tsx
    ├── form.tsx
    ├── hover-card.tsx
    ├── input-otp.tsx
    ├── input.tsx
    ├── label.tsx
    ├── menubar.tsx
    ├── navigation-menu.tsx
    ├── pagination.tsx
    ├── popover.tsx
    ├── progress.tsx
    ├── radio-group.tsx
    ├── resizable.tsx
    ├── scroll-area.tsx
    ├── select.tsx
    ├── separator.tsx
    ├── sheet.tsx
    ├── sidebar.tsx
    ├── skeleton.tsx
    ├── slider.tsx
    ├── sonner.tsx
    ├── styled-markdown.tsx
    ├── switch.tsx
    ├── table.tsx
    ├── tabs.tsx
    ├── textarea.tsx
    ├── toast.tsx
    ├── toaster.tsx
    ├── toggle-group.tsx
    ├── toggle.tsx
    └── tooltip.tsx
```

---

## src/lib/ — Core Libraries

```
src/lib/
├── auth.ts                            # NextAuth config (Credentials, Google, Azure AD)
├── db.ts                              # Prisma client singleton + encryption $extends
├── encryption.ts                      # AES-256-GCM encrypt/decrypt
├── prisma-encryption-middleware.ts     # Legacy middleware (replaced by $extends)
├── sample-data.ts                     # Sample data for seeding
├── store.ts                           # Zustand store (LLM config, preferences)
├── types.ts                           # 700+ lines of TypeScript interfaces
├── utils.ts                           # cn(), parseTags(), parseJSON(), etc.
│
├── agents/
│   └── types.ts                       # Agent type definitions
│
├── auth/                              # (empty — auth.ts is the main file)
│
├── mcp/
│   └── client.ts                      # MCP protocol client
│
├── tools/
│   ├── executor.ts                    # Tool execution engine
│   ├── parser.ts                      # Tool call parser
│   ├── prompt-builder.ts             # Tool prompt builder
│   ├── registry.ts                    # Tool registry
│   └── stage-advisor.ts              # PM stage advisor tool
│
└── services/                          # 20 service files
    ├── agent-context.ts               # Build agent context from BrainNodes (Sprint 1)
    ├── agent-memory-writer.ts         # Write agent findings to BrainNode (Sprint 1)
    ├── agent-orchestrator.ts          # Multi-agent workflow runner (Sprint 4)
    ├── company-brain.ts               # BrainNode graph save/load (Sprint 1)
    ├── competitor-scorer.ts           # Competitor threat scoring (Sprint 3)
    ├── confluence.ts                   # Confluence integration
    ├── drift-detector.ts             # Strategy drift detection (Sprint 3)
    ├── email.ts                       # SMTP email service
    ├── github.ts                      # GitHub REST API service (Sprint 5)
    ├── insight-writer.ts             # ProactiveInsight writer (Sprint 3)
    ├── jira.ts                        # Jira REST API (bidirectional, Sprint 5)
    ├── linear.ts                      # Linear GraphQL API service (Sprint 5)
    ├── llm.ts                         # LLM abstraction (OpenAI, Anthropic, etc.)
    ├── market-research.ts            # Market research orchestration
    ├── notion.ts                      # Notion API service (Sprint 5)
    ├── slack.ts                       # Slack Bot service
    ├── sync-agent.ts                  # Data sync agent
    ├── teams-bot.ts                   # Teams bot service
    ├── watch-topic-processor.ts      # Watch topic processor (Sprint 3)
    ├── workflow-definitions.ts       # Workflow step definitions (Sprint 4)
    │
    └── data-pipeline/                 # Market intelligence pipeline
        ├── cache.ts                   # Pipeline cache layer
        ├── competitor-queries.ts     # Competitor query builder
        ├── job-queue.ts              # Background job queue
        ├── pipeline.ts               # Main pipeline orchestrator
        ├── query-optimizer.ts        # Query optimization
        ├── query-router.ts           # Route queries to adapters
        ├── rate-limiter.ts           # API rate limiting
        ├── registry.ts               # Adapter registry
        ├── research-templates.ts     # Research prompt templates
        ├── types.ts                   # Pipeline types
        │
        └── adapters/                  # 33 data source adapters
            ├── index.ts               # Adapter registration
            ├── app-store-reviews.ts
            ├── arxiv.ts
            ├── bls.ts
            ├── capterra-reviews.ts
            ├── competitor-site.ts
            ├── crossref.ts
            ├── crunchbase.ts
            ├── duckduckgo.ts
            ├── fred.ts
            ├── g2-reviews.ts
            ├── glassdoor.ts
            ├── google-patents.ts
            ├── google-trends.ts
            ├── hackernews.ts
            ├── linkedin-jobs.ts
            ├── mcp-confluence.ts
            ├── mcp-jira.ts
            ├── openalex.ts
            ├── play-store-reviews.ts
            ├── pricing-page.ts
            ├── producthunt-scrape.ts
            ├── quora.ts
            ├── reddit.ts
            ├── scraper-bridge.ts
            ├── semantic-scholar.ts
            ├── stackoverflow-scrape.ts
            ├── statista-scrape.ts
            ├── techcrunch.ts
            ├── wikipedia.ts
            └── worldbank.ts
```

---

## src/hooks/ — Custom React Hooks

```
src/hooks/
├── use-mobile.ts                      # Mobile breakpoint detection
└── use-toast.ts                       # Toast notification hook
```

---

## src/middleware.ts — Next.js Middleware

```
src/middleware.ts                       # Auth redirect + protected route logic
```

---

## Summary

| Category | Count |
|----------|-------|
| Prisma models | 40 |
| API routes | 105 |
| Pages | 22 |
| View components | 18 |
| Feature components | 35+ |
| UI primitives (shadcn) | 50+ |
| Services | 20 |
| Data pipeline adapters | 33 |
| Python agents | 6 |
| Test files | 18 |
| Sprint specs | 5 (2-6) |
