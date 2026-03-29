# Plan: Market Intelligence Platform — 3 Pillars

## Context

Azmyra's Discovery view currently generates AI-only text for market research — no real data. The goal is to transform Azmyra into a full **Market Intelligence Platform** with three pillars:

1. **Real Market Research** — gather actual statistics from free web sources, research databases, MCP tools; AI-synthesized attributed reports; editable content; autonomous monitoring
2. **User Activity Intelligence** — connect product analytics, in-app tracking, feedback channels → map and predict user needs
3. **Competitive Intelligence & Predictions** — auto-discover competitors, track feature changes, full predictive engine combining all signals

All data sources must be **cost-free** (public APIs, scraping, free tiers). The custom LLM project (AirLLM + Llama 3) is **deferred** to a later phase.

---

## Architecture: Extensible Data Pipeline

### Core Design Principle: **Unified Data Adapter Pattern**

Every data source (API, scraper, MCP tool, research database, user connector) implements ONE interface. Adding a new source = adding one file. No changes to pipeline, UI, or database.

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA ADAPTER INTERFACE                     │
│  fetch(query, config) → DataResult[]                         │
│  testConnection(config) → { ok, error? }                     │
│  getCapabilities() → { searchable, streamable, realtime }    │
│  getMetadata() → { name, icon, category, rateLimit }         │
└─────────────────┬───────────────────────────────────────────┘
                  │ implements
    ┌─────────────┼─────────────┬──────────────┬──────────────┐
    │             │             │              │              │
 Web APIs    MCP Tools    Research DBs    Scrapers     User Connectors
 (HN, Reddit) (Jira,     (arXiv, SSRN,   (G2, news)  (GA4, Mixpanel,
              Confluence)  Semantic Scholar)             Intercom)
```

### MCP Integration for Data Sources

The existing MCP system (`python-agents/tools/mcp_client.py`) bridges Python → Next.js API routes. We extend this pattern:

1. **New MCP data tools** registered in both TypeScript (`src/lib/tools/registry.ts`) and Python (`python-agents/tools/mcp_client.py`)
2. **Data-fetching MCP tools** are read-only (`requiresApproval: false`) → auto-execute
3. **The Discovery agent** (`python-agents/agents/registry.py`) gains these tools for autonomous research
4. **RAG pipeline** (`python-agents/knowledge/rag.py`) extended to include research data as context

### Production-Ready Patterns

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| **Adapter registry** | `DataAdapterRegistry` singleton with `register(key, adapter)` | Add sources without touching pipeline code |
| **Rate limiter** | Per-adapter token bucket with configurable limits | Respect free tier limits, prevent bans |
| **Result cache** | Redis-like cache with TTL per source (localStorage fallback for Cloud Run) | Avoid redundant fetches, speed up UX |
| **Retry with backoff** | Exponential backoff (1s, 2s, 4s, max 30s) with circuit breaker | Handle transient failures gracefully |
| **Queue pattern** | Async job queue via DB (status: pending→running→done) | Long-running research doesn't block UI |
| **Schema validation** | Zod schemas for all adapter inputs/outputs | Catch bad data at boundaries |
| **Observability** | Structured logs per fetch: source, query, latency, result count, errors | Debug and optimize data pipeline |

---

## Data Source Catalog (All Free)

### Tier 1: Web Search & Social (Phase 1)

| Adapter | Source | Method | Rate Limit |
|---------|--------|--------|------------|
| `duckduckgo` | DuckDuckGo | HTML scrape `html.duckduckgo.com/html/?q=...` → follow top URLs | ~30 req/min |
| `hackernews` | Hacker News | Algolia API `hn.algolia.com/api/v1/search` | 10k req/hr |
| `reddit` | Reddit | Public JSON `.json` suffix on any Reddit URL | 60 req/min |
| `wikipedia` | Wikipedia | MediaWiki REST API | Unlimited |
| `google-trends` | Google Trends | Scrape public trending pages | ~10 req/min |

### Tier 2: Research Databases (Phase 1)

| Adapter | Source | Method | Rate Limit |
|---------|--------|--------|------------|
| `arxiv` | arXiv.org | REST API `export.arxiv.org/api/query?search_query=...` | 3 req/sec |
| `semantic-scholar` | Semantic Scholar | REST API `api.semanticscholar.org/graph/v1/paper/search` | 100 req/5min |
| `crossref` | Crossref (DOI) | REST API `api.crossref.org/works?query=...` | 50 req/sec (polite) |
| `openalex` | OpenAlex | REST API `api.openalex.org/works?search=...` | Unlimited (free) |
| `pubmed` | PubMed/NCBI | E-Utilities API `eutils.ncbi.nlm.nih.gov` | 3 req/sec (10 with key) |

### Tier 3: Government & Economic Data (Phase 1)

| Adapter | Source | Method | Rate Limit |
|---------|--------|--------|------------|
| `bls` | US Bureau of Labor Statistics | REST API `api.bls.gov/publicAPI/v2/timeseries/data/` | 25 req/day (500 with free key) |
| `worldbank` | World Bank | REST API `api.worldbank.org/v2/` | Unlimited |
| `fred` | Federal Reserve (FRED) | REST API `api.stlouisfed.org/fred/` (free key) | Unlimited |
| `eurostat` | EU Statistics | REST API `ec.europa.eu/eurostat/api/` | Unlimited |

### Tier 4: MCP-Integrated Sources (Phase 1)

| Adapter | Source | Method | Existing? |
|---------|--------|--------|-----------|
| `confluence-research` | Confluence | Existing MCP tool `confluence_search` | Yes — reuse |
| `jira-insights` | Jira | Existing MCP tool `jira_search_issues` | Yes — reuse |
| `knowledge-base` | Uploaded docs | Existing RAG retrieval | Yes — reuse |

### Tier 5: Feeds & Scrapers (Phase 3)

| Adapter | Source | Method |
|---------|--------|--------|
| `rss` | Any RSS/Atom feed | XML parsing |
| `producthunt` | Product Hunt | Scrape public pages |
| `custom-scraper` | User-defined URL | CSS selectors / JSON paths |
| `custom-api` | User-defined API | REST endpoint + JSON path mapping |

### Tier 6: Activity Connectors (Phase 3)

| Adapter | Source | Method |
|---------|--------|--------|
| `ga4` | Google Analytics 4 | GA4 Data API (service account) |
| `posthog` | PostHog | REST API |
| `mixpanel` | Mixpanel | Export API |
| `amplitude` | Amplitude | Export API |
| `intercom` | Intercom | REST API (conversations) |
| `zendesk` | Zendesk | REST API (tickets) |
| `app-reviews` | App Store / Play Store | Scrape public reviews |
| `csv-import` | CSV Upload | Parse uploaded file |
| `in-app` | Azmyra itself | Lightweight event endpoint |

---

## Phase 1: Data Pipeline Foundation + Market Research

### 1A. Unified Data Adapter System (`src/lib/services/data-pipeline/`)

**Core files — the extensible foundation:**

| File | Purpose |
|------|---------|
| `types.ts` | `DataAdapter` interface, `DataResult`, `AdapterMetadata`, `FetchOptions`, Zod schemas |
| `registry.ts` | `DataAdapterRegistry` singleton: `register()`, `get()`, `list()`, `listByCategory()` |
| `rate-limiter.ts` | Per-adapter token bucket rate limiter with configurable limits |
| `cache.ts` | Result cache with TTL (PostgreSQL-backed for Cloud Run statelessness) |
| `pipeline.ts` | Orchestrator: `fetchFromSources(query, adapterKeys[], options)` — parallel fan-out, rate limiting, caching, error handling, result merging |
| `job-queue.ts` | Async job pattern: create job in DB → process → update status. Polling endpoint for UI |

**Adapter interface:**
```ts
interface DataAdapter {
  key: string;
  metadata: AdapterMetadata; // name, icon, category, description, rateLimit, capabilities
  fetch(query: string, options?: FetchOptions): Promise<DataResult[]>;
  testConnection?(config?: Record<string, any>): Promise<{ ok: boolean; error?: string }>;
}

interface DataResult {
  sourceKey: string;      // adapter key
  sourceUrl: string;      // original URL
  sourceName: string;     // human-readable source name
  title: string;
  content: string;        // extracted text
  contentType: 'article' | 'post' | 'paper' | 'dataset' | 'review' | 'statistic';
  publishedAt?: Date;
  fetchedAt: Date;
  metadata: Record<string, any>; // source-specific (upvotes, citations, authors, etc.)
  relevanceHint?: number; // 0-1, adapter's own relevance estimate
}

interface AdapterMetadata {
  name: string;
  icon: string;           // lucide icon name
  category: 'search' | 'social' | 'research' | 'government' | 'mcp' | 'feed' | 'activity' | 'custom';
  description: string;
  rateLimit: { requests: number; windowMs: number };
  capabilities: { searchable: boolean; streamable: boolean; realtime: boolean };
  requiresConfig: boolean;
  configSchema?: ZodSchema; // for custom connectors
}
```

**Adding a new data source = 1 file:**
```ts
// src/lib/services/data-pipeline/adapters/my-new-source.ts
import { DataAdapter, DataResult } from '../types';
import { registry } from '../registry';

const myAdapter: DataAdapter = {
  key: 'my-source',
  metadata: { name: 'My Source', icon: 'Globe', category: 'search', ... },
  async fetch(query, options) {
    // fetch logic
    return results;
  }
};

registry.register(myAdapter); // auto-registered on import
```

### 1B. Initial Adapters (12 adapters — Tiers 1-4)

| File | Adapter |
|------|---------|
| `adapters/duckduckgo.ts` | DuckDuckGo HTML search |
| `adapters/hackernews.ts` | HN Algolia API |
| `adapters/reddit.ts` | Reddit public JSON |
| `adapters/wikipedia.ts` | MediaWiki API |
| `adapters/google-trends.ts` | Google Trends scrape |
| `adapters/arxiv.ts` | arXiv REST API |
| `adapters/semantic-scholar.ts` | Semantic Scholar API |
| `adapters/crossref.ts` | Crossref DOI API |
| `adapters/openalex.ts` | OpenAlex API |
| `adapters/bls.ts` | Bureau of Labor Statistics |
| `adapters/worldbank.ts` | World Bank API |
| `adapters/fred.ts` | Federal Reserve FRED |
| `adapters/mcp-confluence.ts` | Wraps existing MCP confluence_search |
| `adapters/mcp-jira.ts` | Wraps existing MCP jira_search_issues |

### 1C. New Prisma Models (`prisma/schema.prisma`)

```prisma
// ============ Market Research ============
model MarketResearch {
  id                String   @id @default(cuid())
  userId            String
  initiativeId      String?
  title             String
  query             String
  status            String   @default("pending") // pending|gathering|synthesizing|completed|failed
  synthesizedReport String?
  reportMetadata    String   @default("{}")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dataPoints        DataPoint[]
}

model DataPoint {
  id             String   @id @default(cuid())
  researchId     String
  adapterKey     String   // matches DataAdapter.key
  sourceUrl      String
  sourceName     String
  title          String   @default("")
  rawContent     String
  contentType    String   @default("article")
  extractedFacts String   @default("[]") // JSON: [{ fact, confidence, category }]
  publishedAt    DateTime?
  fetchedAt      DateTime @default(now())
  metadata       String   @default("{}")
  research       MarketResearch @relation(fields: [researchId], references: [id], onDelete: Cascade)
  @@index([researchId, adapterKey])
}

model ContentVersion {
  id                String   @id @default(cuid())
  userId            String
  entityType        String
  entityId          String
  content           String
  editedBy          String   @default("ai")
  changeDescription String?
  createdAt         DateTime @default(now())
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([entityType, entityId])
}

model DataConnectorConfig {
  id              String   @id @default(cuid())
  userId          String
  type            String   // preset|custom
  name            String
  adapterKey      String   // matches DataAdapter.key
  config          String   @default("{}") // JSON: adapter-specific config
  dataMapping     String   @default("{}") // JSON: field mapping for custom adapters
  refreshSchedule String   @default("manual")
  isActive        Boolean  @default(true)
  lastFetchAt     DateTime?
  lastFetchStatus String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

// ============ Async Job Queue ============
model DataJob {
  id          String   @id @default(cuid())
  userId      String
  jobType     String   // research_gather|research_synthesize|monitoring_scan|activity_sync|competitor_scan|prediction_run
  status      String   @default("pending") // pending|running|completed|failed
  input       String   @default("{}") // JSON
  output      String?  // JSON result
  error       String?
  progress    Int      @default(0) // 0-100
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, status])
  @@index([jobType, status])
}
```

Add to `User` model: `marketResearches MarketResearch[]`, `contentVersions ContentVersion[]`, `dataConnectors DataConnectorConfig[]`, `dataJobs DataJob[]`

### 1D. Market Research Service (`src/lib/services/market-research.ts`)

```
gatherMarketData(researchId, query, adapterKeys[]) →
  1. Create DataJob (type: research_gather)
  2. Use pipeline.fetchFromSources() — parallel, rate-limited, cached
  3. Store DataPoint records per result
  4. Update job progress as adapters complete
  5. Return when all adapters done

synthesizeReport(researchId, llmConfig) →
  1. Load all DataPoints for this research
  2. Group by adapter category (research papers separate from social posts)
  3. Build structured context: "Here are REAL data points from X sources..."
  4. LLM synthesis with strict attribution prompt: every claim cites [Source](URL)
  5. Store synthesized report + save ContentVersion
```

### 1E. API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `src/app/api/market-research/route.ts` | GET, POST | List/create research |
| `src/app/api/market-research/[id]/route.ts` | GET, PATCH, DELETE | Single report CRUD |
| `src/app/api/market-research/[id]/gather/route.ts` | POST | Trigger data gathering (async job) |
| `src/app/api/market-research/[id]/synthesize/route.ts` | POST | Trigger AI synthesis |
| `src/app/api/data-pipeline/adapters/route.ts` | GET | List available adapters with metadata |
| `src/app/api/data-pipeline/adapters/[key]/test/route.ts` | POST | Test an adapter |
| `src/app/api/data-pipeline/jobs/[id]/route.ts` | GET | Poll job status + progress |
| `src/app/api/connectors/route.ts` | GET, POST | User connector configs CRUD |
| `src/app/api/connectors/[id]/route.ts` | GET, PATCH, DELETE | Single connector |
| `src/app/api/content-versions/route.ts` | GET, POST | Version history |

### 1F. MCP Tool Extension

Add to `python-agents/tools/mcp_client.py`:
```python
# New read-only tools for the Discovery agent
'market_research_search'  → POST /api/market-research (create + gather)
'market_research_get'     → GET /api/market-research/[id]
```

Add to `python-agents/agents/registry.py` → Discovery agent tools list.
Add to `src/lib/tools/registry.ts` → tool definitions with `requiresApproval: false`.

This lets the AI chat autonomously trigger market research from conversations.

### 1G. RAG Extension

Extend `python-agents/knowledge/rag.py` `retrieve_context()`:
- Add research data as a third source alongside Confluence + Knowledge Base
- Query recent `DataPoint` records matching user's message keywords
- Include synthesized report snippets in chat context

### 1H. UI Components

| Component | Purpose |
|-----------|---------|
| `src/components/market-research/MarketResearchPanel.tsx` | Main panel: "Run Research" → adapter selector → progress → Report/Raw Data/Sources tabs |
| `src/components/market-research/DataPointCard.tsx` | Single result: source icon + name + URL + content preview + metadata |
| `src/components/market-research/SourceAttribution.tsx` | Reusable: adapter icon + source name + URL + fetch date |
| `src/components/market-research/AdapterSelector.tsx` | Checkbox grid of available adapters grouped by category |
| `src/components/market-research/JobProgress.tsx` | Real-time progress bar polling job status endpoint |
| `src/components/editing/EditableMarkdown.tsx` | Wraps `StyledMarkdown`: click-to-edit, "AI Generated"/"User Edited" badge, auto-saves version |
| `src/components/connectors/ConnectorManager.tsx` | Adapter grid with enable/disable + custom connector form |
| `src/components/connectors/CustomConnectorForm.tsx` | URL pattern, CSS selectors / JSON paths / API config, schedule, data mapping |

### 1I. Modified Existing Files

| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add 5 new models + User relations |
| `src/lib/types.ts` | Add `MarketResearchReport`, `MarketDataPoint`, `DataConnectorConfig`, `ContentVersionEntry`, `DataJob` |
| `src/lib/store.ts` | Add `marketResearches` slice |
| `src/components/views/DiscoveryView.tsx` | Replace market-research tab with `MarketResearchPanel`; wrap notes with `EditableMarkdown` |
| `src/components/views/SettingsView.tsx` | Add "Data Connectors" tab |
| `python-agents/tools/mcp_client.py` | Add `market_research_search`, `market_research_get` tools |
| `python-agents/agents/registry.py` | Add new tools to Discovery agent |
| `python-agents/knowledge/rag.py` | Add research data to retrieval pipeline |
| `src/lib/tools/registry.ts` | Add market research tool definitions |

---

## Phase 2: Autonomous Monitoring

### 2A. New Prisma Models

```prisma
model WatchTopic {
  id           String   @id @default(cuid())
  userId       String
  name         String
  keywords     String   @default("[]")
  competitors  String   @default("[]")
  adapterKeys  String   @default("[]") // which adapters to scan
  schedule     String   @default("weekly")
  isActive     Boolean  @default(true)
  lastScanAt   DateTime?
  nextScanAt   DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  alerts       MarketAlert[]
  scans        MonitoringScan[]
}

model MonitoringScan {
  id              String    @id @default(cuid())
  watchTopicId    String
  status          String    @default("running")
  dataPointsFound Int       @default(0)
  alertsGenerated Int       @default(0)
  summary         String?
  rawResults      String    @default("[]")
  startedAt       DateTime  @default(now())
  completedAt     DateTime?
  watchTopic      WatchTopic @relation(fields: [watchTopicId], references: [id], onDelete: Cascade)
}

model MarketAlert {
  id           String      @id @default(cuid())
  userId       String
  watchTopicId String?
  severity     String      @default("info")
  title        String
  description  String
  sourceUrl    String?
  sourceName   String?
  isRead       Boolean     @default(false)
  isDismissed  Boolean     @default(false)
  createdAt    DateTime    @default(now())
  user         User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  watchTopic   WatchTopic? @relation(fields: [watchTopicId], references: [id], onDelete: SetNull)
}
```

### 2B. Monitoring Service

Uses the same data pipeline — `pipeline.fetchFromSources()` with watch topic keywords. Compares new results against previous scan via LLM diff analysis. Creates alerts for significant changes.

### 2C. Cloud Scheduler

- Cron: `0 */6 * * *` → `POST https://ai.theproductowner.org/api/monitoring/cron`
- Auth: `Authorization: Bearer $CRON_API_KEY`
- The cron endpoint creates DataJobs (type: `monitoring_scan`) for each due topic

### 2D. API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `src/app/api/monitoring/watch-topics/route.ts` | GET, POST | CRUD |
| `src/app/api/monitoring/watch-topics/[id]/route.ts` | GET, PATCH, DELETE | Single topic |
| `src/app/api/monitoring/scan/route.ts` | POST | Manual scan trigger |
| `src/app/api/monitoring/alerts/route.ts` | GET, PATCH | List/manage alerts |
| `src/app/api/monitoring/cron/route.ts` | POST | Cloud Scheduler webhook |

### 2E. UI Components

| Component | Purpose |
|-----------|---------|
| `src/components/monitoring/WatchTopicManager.tsx` | CRUD: keywords, adapters, schedule, "Scan Now" |
| `src/components/monitoring/MarketAlertsList.tsx` | Alert list with severity, source links, actions |
| `src/components/monitoring/MonitoringWidget.tsx` | Dashboard card: topics, last scan, alerts |

### 2F. Modified Files

- `DashboardView.tsx` — Add `MonitoringWidget`
- `Sidebar.tsx` — Add "Market Monitor" nav
- New: `src/app/monitoring/page.tsx`
- `src/lib/store.ts` — Add `watchTopics`, `marketAlerts` slices

---

## Phase 3: User Activity Intelligence

### 3A. New Prisma Models

```prisma
model ActivityConnector {
  id              String   @id @default(cuid())
  userId          String
  name            String
  connectorType   String   // ga4|posthog|mixpanel|amplitude|intercom|zendesk|app_review|csv_import|in_app|custom
  configEncrypted String   @default("{}")
  syncInterval    Int      @default(60) // minutes
  enabled         Boolean  @default(true)
  lastSyncAt      DateTime?
  lastSyncStatus  String?
  eventCount      Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  events          UserActivityEvent[]
  syncLogs        ActivitySyncLog[]
}

model UserActivityEvent {
  id           String   @id @default(cuid())
  connectorId  String
  userId       String   // owner (Azmyra user)
  source       String
  eventType    String
  userIdHash   String?  // anonymized end-user
  sessionId    String?
  eventName    String
  properties   String   @default("{}")
  sentiment    Float?
  rawText      String?
  timestamp    DateTime
  ingestedAt   DateTime @default(now())
  connector    ActivityConnector @relation(fields: [connectorId], references: [id], onDelete: Cascade)
  @@index([source, eventType, timestamp])
  @@index([userIdHash, timestamp])
}

model UserNeedMapping {
  id                  String   @id @default(cuid())
  userId              String
  title               String
  description         String   @default("")
  needType            String   // demand_signal|friction_point|unmet_need|improvement_area|ux_issue
  confidence          Float    @default(0)
  signalCount         Int      @default(0)
  evidence            String   @default("[]")
  affectedSegments    String   @default("[]")
  relatedFeatures     String   @default("[]")
  status              String   @default("identified")
  linkedInitiativeId  String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model ActivitySyncLog {
  id           String    @id @default(cuid())
  connectorId  String
  status       String
  eventsFetched Int      @default(0)
  eventsStored  Int      @default(0)
  errors       String    @default("[]")
  startedAt    DateTime  @default(now())
  completedAt  DateTime?
  connector    ActivityConnector @relation(fields: [connectorId], references: [id], onDelete: Cascade)
}
```

### 3B. Activity Connectors as Data Adapters

Activity connectors also implement the `DataAdapter` interface (category: `'activity'`), so they plug into the same pipeline. This means the prediction engine can query activity data the same way it queries research data.

### 3C. Activity Analysis Service (`src/lib/services/activity-analyzer.ts`)

Batch-processes events → extracts `UserNeedMapping` entries using LLM:
- Feature usage frequency → demand signals
- Drop-off patterns → friction points
- Support ticket clusters → unmet needs
- Sentiment batch analysis (10-20 texts per LLM call for efficiency)
- Maps needs to existing personas

### 3D. API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `src/app/api/activity/connectors/route.ts` | GET, POST | CRUD |
| `src/app/api/activity/connectors/[id]/route.ts` | GET, PATCH, DELETE | Single |
| `src/app/api/activity/connectors/[id]/test/route.ts` | POST | Test connection |
| `src/app/api/activity/connectors/[id]/sync/route.ts` | POST | Trigger sync |
| `src/app/api/activity/events/route.ts` | GET | Query events (paginated) |
| `src/app/api/activity/events/stats/route.ts` | GET | Aggregated stats |
| `src/app/api/activity/needs/route.ts` | GET, POST | Needs list / trigger analysis |
| `src/app/api/activity/needs/[id]/route.ts` | GET, PATCH | Detail / update status |
| `src/app/api/activity/import/csv/route.ts` | POST | CSV import |
| `src/app/api/activity/dashboard/route.ts` | GET | Summary for widget |

### 3E. UI Components

| Component | Purpose |
|-----------|---------|
| `ActivityIntelView.tsx` | Main view: Dashboard / Connectors / Events / Needs tabs |
| `ConnectorGrid.tsx` | Card grid with sync status, event counts |
| `ConnectorSetupWizard.tsx` | Step dialog: type → credentials → test → configure |
| `EventExplorer.tsx` | Filterable event table |
| `ActivityDashboard.tsx` | Charts: volume, sources, sentiment trend (recharts) |
| `NeedsList.tsx` | Need cards with confidence, evidence, "Create Initiative" |
| `ActivityPulseWidget.tsx` | Dashboard mini-widget |

### 3F. Modified Files

- `Sidebar.tsx` — Add "User Activity" nav
- `DashboardView.tsx` — Add `ActivityPulseWidget`
- `UserJourneyView.tsx` — Add "Insights" tab per persona with linked needs
- New: `src/app/activity/page.tsx`

---

## Phase 4: Competitive Intelligence

### 4A. New Prisma Models

```prisma
model Competitor {
  id              String   @id @default(cuid())
  userId          String
  name            String
  websiteUrl      String?
  description     String   @default("")
  logoUrl         String?
  discoverySource String   // auto_g2|auto_capterra|auto_producthunt|manual
  pricingInfo     String   @default("{}")
  category        String   @default("direct") // direct|indirect|potential
  status          String   @default("active")
  lastScannedAt   DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  features        CompetitorFeature[]
  changes         CompetitorChangeEvent[]
}

model CompetitorFeature {
  id              String   @id @default(cuid())
  competitorId    String
  featureName     String
  category        String?
  description     String   @default("")
  maturity        String   @default("unknown")
  firstDetectedAt DateTime @default(now())
  lastConfirmedAt DateTime @default(now())
  sourceUrl       String?
  evidence        String   @default("{}")
  competitor      Competitor @relation(fields: [competitorId], references: [id], onDelete: Cascade)
  @@index([competitorId, featureName])
}

model CompetitorChangeEvent {
  id               String   @id @default(cuid())
  competitorId     String
  changeType       String   // new_feature|pricing_change|product_launch|funding|partnership
  title            String
  description      String   @default("")
  impactAssessment String?
  severity         String   @default("info")
  sourceUrls       String   @default("[]")
  detectedAt       DateTime @default(now())
  acknowledged     Boolean  @default(false)
  competitor       Competitor @relation(fields: [competitorId], references: [id], onDelete: Cascade)
}

model FeatureComparisonMatrix {
  id             String   @id @default(cuid())
  userId         String
  title          String
  matrixData     String   @default("{}") // JSON: full comparison data
  generatedModel String?
  createdAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 4B. Competitive Services

| File | Purpose |
|------|---------|
| `src/lib/services/competitive/discovery.ts` | Scrape G2, Capterra, Product Hunt + DuckDuckGo "[category] alternatives" |
| `src/lib/services/competitive/scanner.ts` | Scrape competitor sites/changelogs, LLM extracts features, diff detection |
| `src/lib/services/competitive/matrix.ts` | Generate comparison matrix: our features vs competitors |

These services USE the data pipeline adapters (DuckDuckGo, custom-scraper) internally.

### 4C. API Routes + UI Components

Same pattern as previous phases. Key components:
- `CompetitiveIntelView.tsx` — Competitors / Feature Matrix / Changes / Positioning tabs
- `FeatureMatrix.tsx` — Responsive comparison table
- `PositioningMap.tsx` — Recharts scatter plot
- `CompetitiveThreatWidget.tsx` — Dashboard card

---

## Phase 5: Prediction Engine

### 5A. New Prisma Models

```prisma
model Prediction {
  id                   String   @id @default(cuid())
  userId               String
  title                String
  predictionType       String   // user_need|market_shift|competitive_threat|opportunity|risk
  description          String   @default("")
  reasoningChain       String   @default("")
  confidenceScore      Float    @default(0)
  timeSensitivity      String   @default("strategic") // urgent|near_term|strategic
  signalSources        String   @default("[]") // JSON: [{pillar, sourceType, sourceId, summary}]
  recommendation       String   @default("")
  riskAssessment       String   @default("")
  relatedInitiativeIds String   @default("[]")
  roadmapGap           Boolean  @default(false)
  status               String   @default("active")
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PredictionRun {
  id                   String   @id @default(cuid())
  userId               String
  signalsAnalyzed      Int      @default(0)
  predictionsGenerated Int      @default(0)
  modelUsed            String?
  inputSummary         String   @default("{}")
  durationSeconds      Float?
  status               String   @default("running")
  error                String?
  runAt                DateTime @default(now())
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 5B. Prediction Service (`src/lib/services/prediction-engine.ts`)

```
run(userId, llmConfig) →
  1. GATHER SIGNALS (all via DataAdapterRegistry + direct DB queries):
     - Research: recent reports, monitoring alerts, market data
     - Activity: user needs, sentiment trends, feature demand
     - Competitive: feature moves, change events, pricing shifts
     - Existing: persona goals, current roadmap/initiatives

  2. MULTI-PASS LLM:
     Pass 1: Pattern identification — cluster related signals
     Pass 2: Prediction generation with reasoning chains
     Pass 3: Confidence scoring (signal count × recency × consistency)

  3. ROADMAP GAP CHECK — compare against existing initiatives

  4. STORE predictions with full signal attribution
```

### 5C. UI: `PredictionView.tsx`

- Prediction feed with confidence bars + time-sensitivity badges
- Signal summary visual (counts per pillar)
- "Create Initiative" button per prediction
- Run history table
- Dashboard widget: top 3 predictions

---

## Cross-Pillar Integrations

| Integration | How |
|-------------|-----|
| **Prediction → Initiative** | One-click convert: pre-fills title, description, tags from prediction |
| **Activity Needs → Personas** | Link extracted needs to personas in UserJourneyView |
| **Competitor Changes → Risks** | Critical changes auto-create Risk entries |
| **All Data → Chat Context** | `python-agents/knowledge/rag.py` includes research + predictions + needs in chat |
| **Monitoring → Dashboard** | Unread alerts in "Items Requiring Attention" |
| **Watch Topics → Discovery** | Auto-enrich initiative's discovery section |
| **All Adapters → MCP** | Discovery agent can trigger research via MCP tools in conversations |

---

## File Counts

| Category | Count |
|----------|-------|
| Data pipeline core | 6 files (`types`, `registry`, `rate-limiter`, `cache`, `pipeline`, `job-queue`) |
| Data adapters (Phase 1) | 14 files (12 sources + 2 MCP wrappers) |
| Data adapters (Phase 3+) | 10 files (activity connectors + feeds + custom) |
| Services | 7 files (market-research, content-versioning, activity-analyzer, competitive/3, prediction-engine) |
| API routes | ~35 route files |
| UI components | ~35 component files |
| New pages | 4 (`monitoring`, `activity`, `competitive`, `predictions`) |
| Prisma models | ~16 new models |

## Execution Order

```
Phase 1 → Data pipeline foundation + 14 adapters + market research + editable content + connectors
Phase 2 → Autonomous monitoring (builds on Phase 1 pipeline)
Phase 3 → User activity connectors + need extraction + persona enrichment
Phase 4 → Competitive intelligence + feature matrix
Phase 5 → Prediction engine combining all signals
```

Each phase is independently deployable and adds value on its own.

## Verification

1. `npx prisma migrate dev` — all tables created
2. `npm run build` — 0 errors
3. Test adapter extensibility: add a dummy adapter file → appears in adapter list without other changes
4. Test research: select adapters → gather → see real data from HN/Reddit/arXiv with source URLs → synthesize report
5. Test editing: click AI text → edit → version saved → restore
6. Test monitoring: create watch topic → scan → alerts appear → dashboard widget
7. Test activity: connect CSV → import events → analyze needs → evidence links
8. Test competitive: discover competitors → scan → feature matrix → changes feed
9. Test predictions: run engine → predictions with reasoning + confidence → create initiative
10. Deploy to Cloud Run + Cloud Scheduler
