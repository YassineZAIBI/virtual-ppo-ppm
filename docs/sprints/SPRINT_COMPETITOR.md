# SPRINT_COMPETITOR.md — Robust Competitive Intelligence Engine
# Status: DEDICATED SPRINT — do not combine with other work
# Complexity: HIGH — full pipeline redesign
#
# HOW TO USE:
# "Read SPRINT_COMPETITOR.md and execute every step in order.
#  Stop for ALL file creations and schema changes.
#  After all steps: run npx tsc --noEmit and show full report."

---

## The problem, precisely stated

The current Competitor Eye produces stale, irrelevant results (2020, 2025 content)
because of three fundamental design flaws:

1. No temporal anchoring — queries don't enforce recency
2. Generic search queries — same query for all competitors, no targeting
3. Passive polling — scrapes when cron runs, no active change detection
4. Single-source dependence — DuckDuckGo alone is insufficient

The goal of this sprint: when a user adds a competitor, Azmyra should know
within 24 hours if that competitor ships a new feature, changes pricing,
raises funding, posts a job that signals strategic direction, or gets a
wave of negative reviews.

---

## Architecture: the new 4-layer intelligence pipeline

```
Layer 1: OWNED DATA SOURCES (highest signal, lowest latency)
  - Competitor website monitor (pricing, changelog, careers, features)
  - App store reviews monitor (G2, Capterra, App Store, Play Store)

Layer 2: NEWS + EVENTS (high signal, real-time)
  - RSS feeds from TechCrunch, VentureBeat, ProductHunt, HackerNews
  - LinkedIn company page signals (jobs = roadmap indicator)
  - Crunchbase funding events

Layer 3: SEARCH INTELLIGENCE (medium signal, broad coverage)
  - DuckDuckGo with mandatory date filter (current year only)
  - Reddit /r/SaaS, /r/entrepreneur, /r/projectmanagement
  - StackOverflow mentions (technical positioning)

Layer 4: LLM SYNTHESIS (intelligence layer, not data layer)
  - Takes raw signals from layers 1-3
  - Extracts competitive insights with significance scoring
  - Generates strategic implications ("this pricing change means X")
  - Deduplicates across sources
```

---

## Pre-flight

Read before starting:
1. prisma/schema.prisma — Competitor, CompetitorFeed models, ALL fields
2. src/lib/services/data-pipeline/adapters/ — list all adapter files
3. src/lib/services/competitor-scorer.ts — current scoring logic
4. src/lib/services/data-pipeline/cache.ts — current TTL values
5. src/app/api/cron/competitor-scan/route.ts — current cron job
6. src/components/competitors/ — all competitor UI components

---

## Step 1 — Add competitive intelligence models to schema

STOP: Show diff and wait for confirmation before db push.

Add to prisma/schema.prisma:

```prisma
model CompetitorMonitor {
  id              String   @id @default(cuid())
  competitorId    String
  competitor      Competitor @relation(fields: [competitorId], references: [id], onDelete: Cascade)
  userId          String

  // Monitored URL config
  domain          String   // e.g. "notion.so"
  monitoredPaths  String   @default("[]") // JSON: ["/pricing", "/blog", "/changelog"]
  lastScannedAt   DateTime?

  // Change detection state (JSON maps: path -> contentHash)
  contentHashes   String   @default("{}")
  // Format: { "/pricing": "abc123", "/changelog": "def456" }

  // Settings
  scanFrequency   String   @default("daily") // "hourly" | "daily" | "weekly"
  isActive        Boolean  @default(true)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([competitorId, domain])
  @@index([userId, isActive])
}

model CompetitorAlert {
  id              String   @id @default(cuid())
  competitorId    String
  competitor      Competitor @relation(fields: [competitorId], references: [id], onDelete: Cascade)
  userId          String

  alertType       String
  // "pricing_change" | "new_feature" | "funding" | "negative_reviews"
  // | "website_change" | "job_signal" | "product_launch" | "partnership"

  title           String
  summary         String   @db.Text
  evidence        String   @default("[]") // JSON: [{url, snippet, publishedAt}]
  significance    Float    @default(0.5)  // 0-1: how strategically important
  strategicNote   String   @default("")   // LLM-generated "what this means for you"

  sourceUrls      String   @default("[]") // JSON array of source URLs
  publishedAt     DateTime?               // when the underlying event happened
  scrapedAt       DateTime @default(now())

  status          String   @default("new") // "new" | "read" | "dismissed" | "actioned"
  dismissed       Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId, status])
  @@index([competitorId, alertType])
  @@index([userId, createdAt])
}
```

Add relations to existing Competitor model:
  monitors  CompetitorMonitor[]
  alerts    CompetitorAlert[]

After confirmation: npx prisma generate && npx prisma db push

Add types to src/lib/types.ts:
  CompetitorMonitorData, CompetitorAlertData, CompetitorAlertType, AlertSignificance

---

## Step 2 — Create the website change detector

Create src/lib/services/competitor-monitor/website-detector.ts

```typescript
/**
 * Monitors competitor websites for changes.
 * Uses content hashing to detect changes between scans.
 * Focuses on high-signal pages: pricing, changelog, blog, careers, features.
 */

const HIGH_SIGNAL_PATHS = [
  '/pricing',
  '/price',
  '/plans',
  '/changelog',
  '/updates',
  '/release-notes',
  '/blog',
  '/careers',
  '/jobs',
  '/features',
  '/product',
  '/enterprise',
];

const SIGNAL_WEIGHTS: Record<string, number> = {
  '/pricing': 0.95,   // pricing changes are highest signal
  '/price': 0.95,
  '/plans': 0.95,
  '/changelog': 0.85, // new features
  '/updates': 0.85,
  '/release-notes': 0.85,
  '/careers': 0.6,    // hiring = product investment signal
  '/jobs': 0.6,
  '/blog': 0.5,
  '/features': 0.75,
  '/product': 0.75,
  '/enterprise': 0.7,
};

function simpleHash(str: string): string {
  let hash = 0;
  const normalized = str.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < Math.min(normalized.length, 50000); i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Azmyra/1.0; +https://ai.theproductowner.org)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Strip HTML tags, keep text content
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return null;
  }
}

export interface PageScanResult {
  path: string;
  url: string;
  changed: boolean;
  isFirstScan: boolean;
  currentHash: string;
  previousHash: string | null;
  signalWeight: number;
  content: string | null;
}

export async function scanCompetitorWebsite(
  domain: string,
  previousHashes: Record<string, string>,
  pathsToMonitor: string[] = HIGH_SIGNAL_PATHS.slice(0, 6)
): Promise<PageScanResult[]> {
  const results: PageScanResult[] = [];

  // Scan pages in parallel (max 4 concurrent)
  const batches = [];
  for (let i = 0; i < pathsToMonitor.length; i += 4) {
    batches.push(pathsToMonitor.slice(i, i + 4));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (path) => {
        const url = `https://${domain}${path}`;
        const content = await fetchPageText(url);
        if (!content || content.length < 100) return null;

        const currentHash = simpleHash(content);
        const previousHash = previousHashes[path] ?? null;
        const changed = previousHash !== null && previousHash !== currentHash;
        const isFirstScan = previousHash === null;

        return {
          path,
          url,
          changed,
          isFirstScan,
          currentHash,
          previousHash,
          signalWeight: SIGNAL_WEIGHTS[path] ?? 0.5,
          content: changed ? content.slice(0, 3000) : null,
        };
      })
    );
    results.push(...batchResults.filter((r): r is PageScanResult => r !== null));
  }

  return results;
}

export function getChangedPages(results: PageScanResult[]): PageScanResult[] {
  return results.filter(r => r.changed && !r.isFirstScan);
}
```

---

## Step 3 — Create the news & RSS feed fetcher

Create src/lib/services/competitor-monitor/news-fetcher.ts

```typescript
/**
 * Fetches recent news about competitors from multiple free sources.
 * DuckDuckGo news, HackerNews, RSS feeds.
 * All queries are year-qualified to prevent stale results.
 */

const CURRENT_YEAR = new Date().getFullYear();
const PREV_YEAR = CURRENT_YEAR - 1;

export interface NewsItem {
  title: string;
  url: string;
  summary: string;
  publishedAt: Date | null;
  source: string;
  relevanceType: string; // "funding" | "launch" | "pricing" | "partnership" | "general"
}

/**
 * Classify what type of news this is from the title/content.
 */
function classifyNewsItem(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  if (/fund|raise|series|invest|million|billion|valuat/.test(text)) return 'funding';
  if (/launch|ship|release|announce|introduce|new feature|now available/.test(text)) return 'launch';
  if (/pric|plan|tier|subscript|paid|free|cost/.test(text)) return 'pricing';
  if (/partner|integrat|acqui|merge/.test(text)) return 'partnership';
  if (/hire|hiring|job|recruit|team|headcount/.test(text)) return 'hiring';
  if (/review|complain|issue|problem|broken|fail/.test(text)) return 'reputation';
  return 'general';
}

/**
 * Search DuckDuckGo News with mandatory date filtering.
 * Uses df=m (past month) or df=y (past year) — never "all time".
 */
export async function searchDuckDuckGoNews(
  competitorName: string,
  dateRange: 'm' | 'y' = 'm'
): Promise<NewsItem[]> {
  const queries = [
    `"${competitorName}" ${CURRENT_YEAR}`,
    `"${competitorName}" new feature ${CURRENT_YEAR}`,
    `"${competitorName}" pricing ${CURRENT_YEAR}`,
    `"${competitorName}" funding ${CURRENT_YEAR} OR ${PREV_YEAR}`,
  ];

  const allItems: NewsItem[] = [];

  for (const query of queries.slice(0, 2)) { // limit to 2 queries per competitor per scan
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&df=${dateRange}&t=azmyra`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;

      const data = await res.json();
      const results = [...(data.Results ?? []), ...(data.RelatedTopics ?? [])];

      for (const item of results.slice(0, 5)) {
        const title = item.Text ?? item.FirstURL ?? '';
        const url = item.FirstURL ?? '';
        if (!title || !url) continue;

        // Enforce year filter manually for safety
        const hasCurrentYear = title.includes(String(CURRENT_YEAR)) ||
                               title.includes(String(PREV_YEAR));
        // Don't strictly filter by year in title — DuckDuckGo df param handles it
        // but do deprioritize items that look old

        allItems.push({
          title: title.slice(0, 200),
          url,
          summary: title.slice(0, 300),
          publishedAt: null, // DuckDuckGo doesn't reliably return dates
          source: 'duckduckgo',
          relevanceType: classifyNewsItem(title, ''),
        });
      }
    } catch {
      // Skip failed query — non-blocking
    }
  }

  return allItems;
}

/**
 * Check HackerNews for competitor mentions in the last 30 days.
 * Uses HN Algolia API which supports date filtering.
 */
export async function searchHackerNews(competitorName: string): Promise<NewsItem[]> {
  try {
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const query = encodeURIComponent(competitorName);
    const url = `https://hn.algolia.com/api/v1/search?query=${query}&numericFilters=created_at_i>${thirtyDaysAgo}&hitsPerPage=10&tags=story`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.hits ?? []).slice(0, 5).map((hit: Record<string, unknown>) => ({
      title: String(hit.title ?? ''),
      url: String(hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`),
      summary: `${hit.points ?? 0} points, ${hit.num_comments ?? 0} comments`,
      publishedAt: hit.created_at ? new Date(hit.created_at as string) : null,
      source: 'hackernews',
      relevanceType: classifyNewsItem(String(hit.title ?? ''), ''),
    }));
  } catch {
    return [];
  }
}

/**
 * Aggregate all news for a competitor.
 * Returns items sorted by recency, deduped by URL.
 */
export async function fetchCompetitorNews(competitorName: string): Promise<NewsItem[]> {
  const [ddgItems, hnItems] = await Promise.all([
    searchDuckDuckGoNews(competitorName, 'm'),
    searchHackerNews(competitorName),
  ]);

  const allItems = [...ddgItems, ...hnItems];

  // Dedup by URL
  const seen = new Set<string>();
  return allItems.filter(item => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
```

---

## Step 4 — Create the LLM intelligence synthesizer

Create src/lib/services/competitor-monitor/intelligence-synthesizer.ts

```typescript
/**
 * Takes raw signals (website changes, news items) and uses LLM to:
 * 1. Determine if signals are significant (not noise)
 * 2. Extract the strategic insight
 * 3. Generate a "what this means for you" note
 *
 * This is the intelligence layer — raw data becomes actionable insight.
 */

import type { NewsItem } from './news-fetcher';
import type { PageScanResult } from './website-detector';
import { LLMService } from '@/lib/services/llm';
import type { CompetitorAlertData } from '@/lib/types';

const SYNTHESIS_PROMPT = `You are a competitive intelligence analyst. 
Given these signals about a competitor, identify which ones are strategically significant.
For each significant signal, generate a brief strategic note.

Competitor: {competitorName}
Your company's vision: {northStar}

Signals to analyze:
{signals}

Return JSON array. Include ONLY signals with significance > 0.5:
[
  {
    "alertType": "pricing_change | new_feature | funding | website_change | job_signal | product_launch | partnership | reputation",
    "title": "Brief title (under 80 chars)",
    "summary": "What happened (2-3 sentences)",
    "significance": 0.0-1.0,
    "strategicNote": "What this means for your product strategy (1-2 sentences)",
    "sourceUrl": "url",
    "publishedAt": "ISO date or null"
  }
]
Return empty array [] if no significant signals found.
Do NOT include routine blog posts, minor copy changes, or events older than 60 days.`;

export interface SynthesisInput {
  competitorName: string;
  northStar: string;
  changedPages: PageScanResult[];
  newsItems: NewsItem[];
}

export interface SynthesisResult {
  alerts: Omit<CompetitorAlertData, 'id' | 'competitorId' | 'userId' | 'createdAt' | 'updatedAt'>[];
  signalCount: number;
  processingMs: number;
}

export async function synthesizeIntelligence(
  input: SynthesisInput,
  llmConfig: Parameters<typeof LLMService.create>[0]
): Promise<SynthesisResult> {
  const start = Date.now();

  // Format signals for LLM
  const signals: string[] = [];

  for (const page of input.changedPages) {
    signals.push(`[WEBSITE CHANGE] ${page.url} — content changed (signal weight: ${page.signalWeight})`);
    if (page.content) {
      signals.push(`  Preview: ${page.content.slice(0, 200)}`);
    }
  }

  for (const news of input.newsItems.slice(0, 10)) {
    const date = news.publishedAt
      ? news.publishedAt.toISOString().split('T')[0]
      : 'date unknown';
    signals.push(`[${news.source.toUpperCase()}] ${news.title} (${date}) — ${news.relevanceType}`);
    signals.push(`  URL: ${news.url}`);
  }

  if (signals.length === 0) {
    return { alerts: [], signalCount: 0, processingMs: Date.now() - start };
  }

  try {
    const prompt = SYNTHESIS_PROMPT
      .replace('{competitorName}', input.competitorName)
      .replace('{northStar}', input.northStar || 'not set')
      .replace('{signals}', signals.join('\n'));

    const llm = LLMService.create(llmConfig);
    const response = await llm.complete([
      { role: 'system', content: 'You are a competitive intelligence analyst. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ]);

    const clean = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(clean);
    
    if (!Array.isArray(parsed)) {
      return { alerts: [], signalCount: signals.length, processingMs: Date.now() - start };
    }

    const alerts = parsed
      .filter((a: Record<string, unknown>) => 
        a.alertType && a.title && typeof a.significance === 'number'
      )
      .map((a: Record<string, unknown>) => ({
        alertType: String(a.alertType),
        title: String(a.title).slice(0, 200),
        summary: String(a.summary ?? ''),
        significance: Math.min(1, Math.max(0, Number(a.significance))),
        strategicNote: String(a.strategicNote ?? ''),
        sourceUrls: JSON.stringify(a.sourceUrl ? [a.sourceUrl] : []),
        publishedAt: a.publishedAt ? new Date(String(a.publishedAt)) : null,
        evidence: JSON.stringify([]),
        status: 'new' as const,
        dismissed: false,
      }));

    return { alerts, signalCount: signals.length, processingMs: Date.now() - start };
  } catch (err) {
    console.error('[intelligence-synthesizer] LLM synthesis failed:', err);
    return { alerts: [], signalCount: signals.length, processingMs: Date.now() - start };
  }
}
```

---

## Step 5 — Create the main competitor scan orchestrator

Create src/lib/services/competitor-monitor/scanner.ts

```typescript
/**
 * Main orchestrator for competitor monitoring.
 * Called by the cron job and by manual "Scan now" triggers.
 */

import { db } from '@/lib/db';
import { scanCompetitorWebsite, getChangedPages } from './website-detector';
import { fetchCompetitorNews } from './news-fetcher';
import { synthesizeIntelligence } from './intelligence-synthesizer';
import type { LLMConfig } from '@/lib/types';

export interface ScanOptions {
  userId: string;
  competitorId?: string; // if set, scan only this competitor
  llmConfig: Parameters<typeof import('@/lib/services/llm').LLMService.create>[0];
  forceFullScan?: boolean; // ignore lastScannedAt
}

export interface ScanSummary {
  competitorsScanned: number;
  alertsGenerated: number;
  errors: string[];
}

export async function runCompetitorScan(options: ScanOptions): Promise<ScanSummary> {
  const { userId, competitorId, llmConfig, forceFullScan } = options;
  const summary: ScanSummary = { competitorsScanned: 0, alertsGenerated: 0, errors: [] };

  // Load competitors to scan
  const competitors = await db.competitor.findMany({
    where: {
      userId,
      ...(competitorId ? { id: competitorId } : {}),
    },
    include: {
      monitors: true,
    },
  });

  // Load company North Star for context
  const northStarNode = await db.brainNode.findFirst({
    where: { userId, type: 'vision' },
    select: { content: true },
  }).catch(() => null);

  const northStar = northStarNode?.content ?? '';

  for (const competitor of competitors) {
    try {
      // Get or create monitor for this competitor
      const domain = extractDomain(competitor.website ?? competitor.name);
      if (!domain) continue;

      let monitor = competitor.monitors.find(m => m.domain === domain);
      if (!monitor) {
        monitor = await db.competitorMonitor.create({
          data: {
            competitorId: competitor.id,
            userId,
            domain,
            monitoredPaths: JSON.stringify(['/pricing', '/blog', '/changelog', '/careers', '/features']),
          },
        });
      }

      // Skip if scanned recently (unless forced)
      if (!forceFullScan && monitor.lastScannedAt) {
        const hoursSince = (Date.now() - monitor.lastScannedAt.getTime()) / 3600000;
        const minHours = monitor.scanFrequency === 'hourly' ? 1 :
                         monitor.scanFrequency === 'daily' ? 20 : 160;
        if (hoursSince < minHours) continue;
      }

      // Parse stored hashes
      let previousHashes: Record<string, string> = {};
      try {
        previousHashes = JSON.parse(monitor.contentHashes);
      } catch {}

      // Scan website for changes
      const monitoredPaths = JSON.parse(monitor.monitoredPaths) as string[];
      const pageResults = await scanCompetitorWebsite(domain, previousHashes, monitoredPaths);
      const changedPages = getChangedPages(pageResults);

      // Fetch recent news
      const newsItems = await fetchCompetitorNews(competitor.name);

      // Update content hashes for all successfully scanned pages
      const newHashes: Record<string, string> = { ...previousHashes };
      for (const result of pageResults) {
        newHashes[result.path] = result.currentHash;
      }

      // Update monitor
      await db.competitorMonitor.update({
        where: { id: monitor.id },
        data: {
          contentHashes: JSON.stringify(newHashes),
          lastScannedAt: new Date(),
        },
      });

      // Skip LLM synthesis if no changes and no news
      if (changedPages.length === 0 && newsItems.length === 0) {
        summary.competitorsScanned++;
        continue;
      }

      // LLM synthesis — find what's significant
      const synthesis = await synthesizeIntelligence({
        competitorName: competitor.name,
        northStar,
        changedPages,
        newsItems,
      }, llmConfig);

      // Save alerts to DB (avoid duplicates using title+type dedup)
      for (const alert of synthesis.alerts) {
        // Dedup: same type + similar title in last 7 days
        const existing = await db.competitorAlert.findFirst({
          where: {
            competitorId: competitor.id,
            userId,
            alertType: alert.alertType,
            title: alert.title,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        if (existing) continue;

        await db.competitorAlert.create({
          data: {
            ...alert,
            competitorId: competitor.id,
            userId,
          },
        });
        summary.alertsGenerated++;
      }

      summary.competitorsScanned++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`${competitor.name}: ${msg}`);
    }
  }

  return summary;
}

function extractDomain(websiteOrName: string): string | null {
  try {
    if (websiteOrName.includes('.')) {
      const clean = websiteOrName
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
      return clean;
    }
    return null;
  } catch {
    return null;
  }
}
```

---

## Step 6 — Update cron route to use new scanner

Read src/app/api/cron/competitor-scan/route.ts.

Replace the body with:

```typescript
import { runCompetitorScan } from '@/lib/services/competitor-monitor/scanner';

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all distinct userIds with competitors
  const users = await db.competitor.findMany({
    distinct: ['userId'],
    select: { userId: true, user: { select: { id: true } } },
  });

  const results = [];
  for (const { userId } of users) {
    // Note: cron runs without user llmConfig — use the agent service or skip LLM synthesis
    // For now: run website scanning (no LLM) + save raw signals for user review
    const summary = await runCompetitorScan({
      userId,
      llmConfig: null as unknown as Parameters<typeof import('@/lib/services/llm').LLMService.create>[0],
      forceFullScan: false,
    }).catch((err) => ({ error: String(err) }));
    results.push({ userId, ...summary });
  }

  return NextResponse.json({ success: true, results });
}
```

Note on cron + LLM: The cron job cannot access user LLM config (stored in localStorage).
Two options:
  A) Cron does website scan only (change detection) — no LLM synthesis
  B) Store a server-side LLM config option per user (future feature)
For now: option A. LLM synthesis runs on-demand when user visits Competitor Eye.

---

## Step 7 — Add manual scan API route

Create src/app/api/competitors/[id]/scan/route.ts

```typescript
// POST /api/competitors/[id]/scan
// User-triggered scan — has access to llmConfig from request body
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { llmConfig } = await req.json();

    const competitor = await db.competitor.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!competitor) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const summary = await runCompetitorScan({
      userId: session.user.id,
      competitorId: params.id,
      llmConfig,
      forceFullScan: true, // manual scan always scans regardless of lastScannedAt
    });

    return NextResponse.json({
      success: true,
      alertsGenerated: summary.alertsGenerated,
      errors: summary.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

---

## Step 8 — Add alerts API routes

Create src/app/api/competitors/alerts/route.ts

```typescript
// GET /api/competitors/alerts?competitorId=&status=new
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const competitorId = searchParams.get('competitorId');
  const status = searchParams.get('status');

  const alerts = await db.competitorAlert.findMany({
    where: {
      userId: session.user.id,
      ...(competitorId ? { competitorId } : {}),
      ...(status ? { status } : {}),
      dismissed: false,
    },
    orderBy: [
      { significance: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 50,
    include: {
      competitor: { select: { name: true, website: true } },
    },
  });

  return NextResponse.json({ alerts });
}

// PATCH /api/competitors/alerts — bulk update status
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ids, status } = await req.json();

  await db.competitorAlert.updateMany({
    where: { id: { in: ids }, userId: session.user.id },
    data: { status, ...(status === 'dismissed' ? { dismissed: true } : {}) },
  });

  return NextResponse.json({ success: true });
}
```

---

## Step 9 — Redesign CompetitorView UI

Read the current CompetitorView or CompetitorFeedTimeline component.

The new layout:

```
┌─────────────────────────────────────────────┐
│ Competitor Eye                              │
│ [All competitors] ▼  [Last 30 days] ▼  [🔄 Scan now] │
├───────────────┬─────────────────────────────┤
│ COMPETITORS   │ INTELLIGENCE FEED           │
│               │                             │
│ ○ Notion      │ ⚡ HIGH SIGNIFICANCE         │
│   Last: 2h    │ ┌─────────────────────────┐ │
│   4 new alerts│ │ 💰 Notion raised $X     │ │
│               │ │ Pricing page changed    │ │
│ ○ Linear      │ │ [Strategic note]        │ │
│   Last: 1d    │ │ Source · 2h ago         │ │
│   1 new alert │ └─────────────────────────┘ │
│               │                             │
│ ○ Monday.com  │ 📢 MEDIUM                   │
│   Last: 3h    │ [cards...]                  │
│   0 new       │                             │
│               │ 📋 LOW                      │
│ [+ Add]       │ [cards...]                  │
└───────────────┴─────────────────────────────┘
```

Key UI rules:
  - Sort competitors by "unread alert count" — most active at top
  - Sort intelligence feed by significance (high → medium → low)
  - Show "Last scanned: Xh ago" per competitor
  - "Scan now" button: calls /api/competitors/[id]/scan with llmConfig
  - Alert cards show: alertType badge, title, strategic note, source URL, time ago
  - Dismiss button per alert (marks dismissed: true)
  - No results older than 30 days shown by default (enforce in query: createdAt > 30d ago)

Files to modify: src/components/views/CompetitorView.tsx (or equivalent)
                 src/components/competitors/CompetitorCard.tsx
                 src/components/competitors/CompetitorFeedItem.tsx — replace with new alert-based component
                 src/components/competitors/CompetitorFeedTimeline.tsx — rebuild as alert feed

---

## Step 10 — Update CLAUDE.md

Add to Known Fragile Areas:
```
| Competitor scan cron | Runs website detection only (no LLM synthesis) because cron has no user llmConfig. LLM synthesis runs on manual "Scan now" trigger in the UI which passes llmConfig from the user's session. |
| CompetitorMonitor domain | Extracted from competitor.website field. If website is blank, competitor is skipped during monitoring. Prompt user to add website when adding a competitor. |
```

Add to Scale Context:
```
| Competitor monitor services | 3 | website-detector.ts, news-fetcher.ts, intelligence-synthesizer.ts |
| Competitor alert routes | 3 | /api/competitors/[id]/scan, /api/competitors/alerts (GET+PATCH) |
```

---

## Step 11 — TypeScript check and report

Run: npx tsc --noEmit

```
SPRINT COMPETITOR REPORT

SCHEMA CHANGES:
  CompetitorMonitor model added
  CompetitorAlert model added
  Competitor relations updated

NEW SERVICES (src/lib/services/competitor-monitor/):
  website-detector.ts  — content hashing, high-signal page monitoring
  news-fetcher.ts      — DuckDuckGo (date-filtered) + HackerNews Algolia
  intelligence-synthesizer.ts — LLM significance scoring + strategic notes
  scanner.ts           — orchestrates all layers, manages dedup

NEW API ROUTES:
  POST /api/competitors/[id]/scan    — manual scan with llmConfig
  GET  /api/competitors/alerts       — fetch alerts by significance
  PATCH /api/competitors/alerts      — dismiss / mark read

MODIFIED:
  cron/competitor-scan — uses new scanner (website only, no LLM)
  CompetitorView — rebuilt with alert-based feed

EXPECTED RESULTS:
  - Zero results older than 30 days in feed by default
  - Pricing page changes detected within 1h (when triggered manually)
  - HN mentions from last 30 days included
  - LLM generates "what this means for you" for high-signal events
  - Significance sort: high → medium → low (not newest-first)

TYPESCRIPT: [0 new errors]

MANUAL TEST:
1. Add Notion as competitor with website notion.so
2. Click "Scan now" → scan runs
3. Confirm alerts appear in feed with significance badges
4. Confirm no results from 2020 or 2024 in the feed
5. Dismiss an alert → it disappears from feed
6. Check cron scan runs without LLM (website detection only)
```

---

## Commit

git add -A
git commit -m "feat: competitor intelligence engine v2 — website monitoring, news fetcher, LLM synthesis, alert system"
