import { DataAdapter, DataResult, FetchOptions } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { callCrawler } from './scraper-bridge';
import { calculateFreshness, SOURCE_QUALITY_TIERS, calculateCompositeScore } from '@/lib/services/data-pipeline/freshness';

// High-signal pages to monitor per competitor domain
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

const CRAWL_PATTERNS = ['/features/', '/pricing/', '/docs/', '/changelog/', '/blog/', '/careers/'];
const MAX_CRAWL_PAGES = 15;

// Simple hash for change detection (djb2 variant)
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

const competitorSite: DataAdapter = {
  key: 'competitor-site',

  metadata: {
    name: 'Competitor Site Crawl',
    icon: 'Globe',
    category: 'competitor',
    description: 'Crawl a competitor website to extract features, pricing, and documentation pages with change detection.',
    rateLimit: { requests: 10, windowMs: 60_000 },
    capabilities: { searchable: false, streamable: false, realtime: false },
    requiresConfig: true,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const competitorUrl = options?.config?.competitorUrl;

    if (!competitorUrl) {
      console.warn('[competitor-site] No competitorUrl provided in options.config');
      return [];
    }

    const maxPages = Math.min(options?.config?.maxPages ?? MAX_CRAWL_PAGES, MAX_CRAWL_PAGES);
    // Previous content hashes for change detection, keyed by page path
    const previousHashes: Record<string, string> = options?.config?.previousHashes ?? {};

    try {
      const data = await callCrawler(
        {
          url: competitorUrl,
          mode: 'dynamic',
          max_pages: maxPages,
          follow_patterns: CRAWL_PATTERNS,
          max_depth: 3,
        },
        options?.signal
      );

      const pages: unknown[] = data.pages ?? data.results ?? data.items ?? [];
      const now = new Date();
      const sourceQuality = SOURCE_QUALITY_TIERS['competitor-site'];

      return pages.slice(0, maxPages).map((rawPage: unknown, i: number) => {
        const page = rawPage as Record<string, unknown>;
        const pageUrl = (page.url ?? page.link ?? competitorUrl) as string;
        const pageContent = ((page.text ?? page.content ?? page.body ?? page.markdown ?? '') as string).slice(0, 5000);

        // Determine what section of the site this is from
        const section = HIGH_SIGNAL_PATHS.find(p => pageUrl.toLowerCase().includes(p))
          ?? 'general';
        const isHighSignal = section !== 'general';

        // Change detection: compare content hash to previous scan
        const contentHash = hashContent(pageContent);
        const pagePath = new URL(pageUrl, competitorUrl).pathname;
        const previousHash = previousHashes[pagePath];
        const hasChanged = previousHash ? previousHash !== contentHash : true;
        const changeType: 'new' | 'updated' = previousHash ? 'updated' : 'new';

        // Freshness: just scraped = 1.0; relevance based on section + change
        const relevance = isHighSignal ? 0.8 : 0.4;
        const changeBonus = hasChanged ? 0.15 : 0;
        const effectiveRelevance = Math.min(1, relevance + changeBonus);

        return {
          sourceKey: 'competitor-site',
          sourceUrl: pageUrl,
          sourceName: `Competitor: ${new URL(competitorUrl).hostname}`,
          title: (page.title as string) ?? `Page #${i + 1}`,
          content: pageContent,
          contentType: 'article' as const,
          publishedAt: now,
          fetchedAt: now,
          scrapedAt: now,
          freshnessScore: calculateFreshness(now),
          sourceQuality,
          compositeScore: calculateCompositeScore(effectiveRelevance, now, 'competitor-site'),
          isNew: hasChanged,
          changeType: hasChanged ? changeType : undefined,
          metadata: {
            section,
            isHighSignal,
            contentHash,
            previousHash: previousHash ?? null,
            depth: (page.depth as number) ?? null,
            wordCount: (page.word_count as number) ?? ((page.text as string)?.split(/\s+/).length ?? null),
            links: (page.links_count as number) ?? (page.outlinks as number) ?? null,
            baseUrl: competitorUrl,
            rank: i + 1,
          },
          relevanceHint: effectiveRelevance,
        };
      });
    } catch (error) {
      console.error(`[competitor-site] Crawl failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection(config?: Record<string, any>) {
    const testUrl = config?.competitorUrl ?? 'https://example.com';
    try {
      const data = await callCrawler({
        url: testUrl,
        mode: 'dynamic',
        max_pages: 1,
        follow_patterns: [],
        max_depth: 0,
      });
      return { ok: !!data };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(competitorSite);
