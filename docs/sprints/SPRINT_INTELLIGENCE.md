# SPRINT_INTELLIGENCE.md — Competitor Intelligence Quality Upgrade
# Depends on: SPRINT_BUGFIX complete
#
# HOW TO USE:
# 1. Run SANITY_CHECK.md first
# 2. In Claude Code:
#    "Read SPRINT_INTELLIGENCE.md and execute every step in order.
#     Stop for: schema changes, new adapter creation.
#     After all steps: run npx tsc --noEmit and show full report."
# 3. Run SANITY_CHECK.md after

---

## Issue addressed

Competitor Eye shows results from 10 years ago and inaccurate data.
The core problems:
  1. No date filtering — adapters return cached/old content
  2. No source quality scoring — old blog posts rank same as recent news
  3. No competitor-specific targeting — queries are generic
  4. No freshness enforcement — TTL cache serves stale results

---

## Research-backed solution design

Best-in-class competitive intelligence (Crayon, Klue, Visualping) uses:
  - Change detection, not just scraping
  - Multi-signal scoring: recency + source authority + relevance
  - Domain-specific monitoring (competitor's own website is source #1)
  - News API for real-time events (funding, launches, hiring)
  - Review sites for customer sentiment signals

For Azmyra (self-hosted, no paid APIs):
  - Add date-aware adapter queries (DuckDuckGo supports date:w/m/y filters)
  - Add competitor website scraper with change detection
  - Add freshness scoring to all DataPoint results
  - Add source quality tiers (website > news > review > general)
  - Cache with shorter TTL for competitor data (1h not 24h)

---

## Pre-flight

Read before starting:
1. src/lib/services/data-pipeline/types.ts — DataPoint interface, ALL fields
2. src/lib/services/data-pipeline/adapters/duckduckgo.ts — current implementation
3. src/lib/services/data-pipeline/adapters/competitor-site.ts — current state
4. src/lib/services/data-pipeline/cache.ts — current TTL values
5. src/lib/services/competitor-scorer.ts — Sprint 3 scoring logic
6. src/components/competitors/ — all competitor UI components
7. prisma/schema.prisma — CompetitorFeed, Competitor models

---

## Step 1 — Add freshness metadata to DataPoint

Read src/lib/services/data-pipeline/types.ts.

Add these fields to the DataPoint interface:
```typescript
interface DataPoint {
  // existing fields...

  // NEW: Freshness + quality metadata
  publishedAt?: Date;       // when the content was originally published
  scrapedAt?: Date;         // when we fetched it (auto-set by pipeline)
  freshnessScore?: number;  // 0-1: how recent this data point is
  sourceQuality?: number;   // 0-1: authority of the source
  compositeScore?: number;  // 0-1: combined relevance × freshness × quality

  // NEW: Change detection
  previousContent?: string; // for change detection on monitored pages
  isNew?: boolean;          // true if content changed since last scan
  changeType?: 'new' | 'updated' | 'removed';
}
```

Add a freshness calculator utility:
```typescript
// src/lib/services/data-pipeline/freshness.ts
export function calculateFreshness(publishedAt: Date | undefined): number {
  if (!publishedAt) return 0.5; // unknown date = neutral
  const ageMs = Date.now() - publishedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 1)   return 1.0;   // today
  if (ageDays <= 7)   return 0.9;   // this week
  if (ageDays <= 30)  return 0.7;   // this month
  if (ageDays <= 90)  return 0.5;   // this quarter
  if (ageDays <= 365) return 0.3;   // this year
  return 0.1;                        // older than 1 year
}

export function SOURCE_QUALITY_TIERS: Record<string, number> = {
  'competitor-site': 1.0,  // official competitor website = highest trust
  'techcrunch': 0.9,
  'g2-reviews': 0.85,
  'capterra-reviews': 0.85,
  'producthunt': 0.8,
  'hackernews': 0.75,
  'reddit': 0.65,
  'duckduckgo': 0.5,       // general search = lower trust
  'default': 0.5,
};

export function calculateCompositeScore(
  relevanceScore: number,
  publishedAt: Date | undefined,
  sourceKey: string
): number {
  const freshness = calculateFreshness(publishedAt);
  const quality = SOURCE_QUALITY_TIERS[sourceKey] ?? SOURCE_QUALITY_TIERS.default;
  return (relevanceScore * 0.4) + (freshness * 0.4) + (quality * 0.2);
}
```

Files to modify: src/lib/services/data-pipeline/types.ts
Files to create: src/lib/services/data-pipeline/freshness.ts

---

## Step 2 — Add date filtering to DuckDuckGo adapter

Read src/lib/services/data-pipeline/adapters/duckduckgo.ts.

DuckDuckGo supports date filtering via the df parameter:
  df=d → past day
  df=w → past week
  df=m → past month
  df=y → past year

Modify the fetch function to:
  1. Accept a dateRange option: 'day' | 'week' | 'month' | 'year' | 'any'
  2. Default to 'month' for competitor queries (not 'any')
  3. Parse result dates from DuckDuckGo response where available
  4. Set publishedAt on each DataPoint

```typescript
// In FetchOptions, add:
dateRange?: 'day' | 'week' | 'month' | 'year' | 'any';

// In fetch():
const df = options?.dateRange === 'any' ? '' : `&df=${options?.dateRange ?? 'month'}`;
const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}${df}&format=json`;
```

For competitor-specific queries, the calling code will pass dateRange: 'month'.

---

## Step 3 — Upgrade competitor-site adapter for change detection

Read src/lib/services/data-pipeline/adapters/competitor-site.ts.

This adapter fetches the competitor's own website. Upgrade it to:

1. Store the previous content hash in CompetitorFeed metadata
2. On each scan, compare current content to previous
3. Set isNew=true and changeType='updated' if content changed
4. Focus on high-signal pages: /pricing, /blog, /changelog, /careers

```typescript
// Pages to monitor per competitor domain
const HIGH_SIGNAL_PATHS = [
  '/pricing',
  '/blog',
  '/changelog',
  '/updates',
  '/careers',
  '/jobs',
  '/product',
  '/features',
];

// Simple hash for change detection
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// In fetch():
for (const path of HIGH_SIGNAL_PATHS) {
  const url = `https://${domain}${path}`;
  const content = await fetchAndExtract(url);
  const currentHash = hashContent(content);
  const previousHash = options?.previousHashes?.[path];
  
  results.push({
    source: 'competitor-site',
    title: `${domain}${path}`,
    content: content.slice(0, 2000),
    url,
    publishedAt: new Date(), // page scraped now
    scrapedAt: new Date(),
    freshnessScore: 1.0, // just scraped
    sourceQuality: 1.0,  // official website
    isNew: previousHash !== currentHash,
    changeType: previousHash ? 'updated' : 'new',
    previousContent: previousHash,
  });
}
```

Store content hashes in CompetitorFeed.metadata for next comparison.

---

## Step 4 — Upgrade competitor scan cron to use new signals

Read src/lib/services/competitor-scorer.ts from Sprint 3.

Update processCompetitorFeed to:
  1. Sort feed items by compositeScore (not just by threat type)
  2. Give change_detected items automatic high priority
  3. Use freshnessScore to downrank items older than 30 days

```typescript
// Updated threat scoring that incorporates freshness
export function scoreDataPoint(item: DataPoint): number {
  const baseScore = THREAT_SCORES[item.type ?? 'news'] ?? 2;
  const freshness = item.freshnessScore ?? 0.5;
  const quality = item.sourceQuality ?? 0.5;
  const changeBonus = item.isNew ? 2 : 0; // bonus for detected changes

  return Math.min(5, (baseScore * quality * freshness) + changeBonus);
}
```

Also update the competitor scan job to pass dateRange: 'month' to all adapter calls.

---

## Step 5 — Add freshness indicator to CompetitorFeedItem

Read src/components/competitors/CompetitorFeedItem.tsx.

Add:
  - A freshness badge next to each feed item:
    - 🟢 Today / This week
    - 🟡 This month
    - 🔴 Older than 1 month (these should rarely appear with fix)
  - A "Change detected" tag when isNew=true
  - Sort feed items by compositeScore not by createdAt

In CompetitorFeedTimeline.tsx:
  - Add a "Date filter" dropdown: All / Last week / Last month / Last quarter
  - Default: Last month (not "All" — this prevents old results dominating)
  - Add a "Refresh now" button that triggers a manual scan for this competitor

---

## Step 6 — Reduce cache TTL for competitor data

Read src/lib/services/data-pipeline/cache.ts.

Find the TTL configuration. For competitor-related queries:
  - competitor-site adapter: TTL = 3600 (1 hour) — was likely 24h
  - duckduckgo when querying competitor names: TTL = 7200 (2 hours)
  - General market research: keep at 24h (86400)

Add a cacheKey suffix for competitor queries so they don't share cache
with general queries on the same topic.

---

## Step 7 — Smarter competitor query construction

Read how competitor queries are currently built.
Find: src/lib/services/data-pipeline/competitor-queries.ts

Upgrade query templates for competitor searches:

```typescript
// OLD:
const query = `${competitorName} product updates`;

// NEW:
const queries = [
  `"${competitorName}" site:${competitorDomain}`, // direct domain scrape
  `"${competitorName}" funding announcement ${currentYear}`,
  `"${competitorName}" new feature launch ${currentYear}`,
  `"${competitorName}" pricing change`,
  `"${competitorName}" review site:g2.com OR site:capterra.com`,
  `"${competitorName}" hiring engineers ${currentYear}`,
];
// Run top 3 in parallel per scan cycle, rotate which 3 each run
```

Add currentYear to all queries. This alone will dramatically reduce old results.
The year filter forces search engines to surface recent content.

---

## Step 8 — Report and verification

Run: npx tsc --noEmit

```
SPRINT INTELLIGENCE REPORT

CORE CHANGES:
  DataPoint interface — freshnessScore, publishedAt, compositeScore, isNew added
  freshness.ts — calculateFreshness(), SOURCE_QUALITY_TIERS, calculateCompositeScore()
  DuckDuckGo adapter — date range filtering (default: month)
  Competitor-site adapter — change detection with content hashing
  Competitor scorer — compositeScore replaces simple type-based scoring
  Competitor queries — year-qualified queries, domain-specific searches
  Cache TTL — competitor data reduced to 1-2h

UI CHANGES:
  CompetitorFeedItem — freshness badge, change-detected tag
  CompetitorFeedTimeline — date filter (default: last month), refresh button

EXPECTED RESULT:
  - Zero results older than 1 month in competitor feed by default
  - Change detection flags when competitor website changes
  - Composite scoring surfaces high-signal recent events first
  - Year-qualified queries eliminate decade-old content

TYPESCRIPT: [0 new errors]

MANUAL TEST:
1. Add a competitor → run scan
2. Confirm all results have freshness badges
3. Confirm no results older than 30 days in "Last month" filter
4. Confirm DuckDuckGo results have publishedAt populated
5. Set date filter to "Last week" → even more focused results
```

---

## Commit

git add -A
git commit -m "feat: competitor intelligence upgrade — freshness scoring, change detection, date filtering"
