import { DataAdapter, DataResult, FetchOptions } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { callCrawler } from './scraper-bridge';

const CRAWL_PATTERNS = ['/features/', '/pricing/', '/docs/', '/changelog/'];
const MAX_CRAWL_PAGES = 15;

const competitorSite: DataAdapter = {
  key: 'competitor-site',

  metadata: {
    name: 'Competitor Site Crawl',
    icon: 'Globe',
    category: 'search',
    description: 'Crawl a competitor website to extract features, pricing, and documentation pages.',
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

      const pages: any[] = data.pages ?? data.results ?? data.items ?? [];
      const now = new Date();

      return pages.slice(0, maxPages).map((page: any, i: number) => {
        // Determine what section of the site this is from
        const pageUrl = page.url ?? page.link ?? competitorUrl;
        const section = CRAWL_PATTERNS.find(p => pageUrl.includes(p.replace(/\//g, '')))
          ?? 'general';

        return {
          sourceKey: 'competitor-site',
          sourceUrl: pageUrl,
          sourceName: `Competitor: ${new URL(competitorUrl).hostname}`,
          title: page.title ?? `Page #${i + 1}`,
          content: (page.text ?? page.content ?? page.body ?? page.markdown ?? '').slice(0, 5000),
          contentType: 'article' as const,
          fetchedAt: now,
          metadata: {
            section,
            depth: page.depth ?? null,
            wordCount: page.word_count ?? (page.text?.split(/\s+/).length ?? null),
            links: page.links_count ?? page.outlinks ?? null,
            baseUrl: competitorUrl,
            rank: i + 1,
          },
          relevanceHint: section === 'general' ? 0.4 : 0.7,
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
