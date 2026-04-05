import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { calculateFreshness, SOURCE_QUALITY_TIERS, calculateCompositeScore } from '@/lib/services/data-pipeline/freshness';

const DATE_RANGE_MAP: Record<string, string> = {
  day: 'd',
  week: 'w',
  month: 'm',
  year: 'y',
};

const duckduckgo: DataAdapter = {
  key: 'duckduckgo',

  metadata: {
    name: 'DuckDuckGo',
    icon: 'Search',
    category: 'search',
    description: 'Web search via DuckDuckGo HTML interface. No API key required.',
    rateLimit: { requests: 30, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: true },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;

    try {
      // Date range filtering: df=d/w/m/y
      const dateRange = options?.dateRange ?? 'any';
      const dfParam = dateRange !== 'any' && DATE_RANGE_MAP[dateRange]
        ? `&df=${DATE_RANGE_MAP[dateRange]}`
        : '';
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}${dfParam}`;
      const res = await resilientFetch(url, {
        adapterKey: 'duckduckgo',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Azmyra/1.0',
        },
        body: `q=${encodeURIComponent(query)}`,
        signal: options?.signal,
      });

      const html = await res.text();
      const results: DataResult[] = [];
      const now = new Date();

      // Extract result blocks — each result lives inside a div with class "result"
      // Links are in <a class="result__a" and snippets in <a class="result__snippet"
      const resultBlockRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
      const titleLinkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i;
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i;

      // Simpler approach: extract all title links and snippets separately
      const titleMatches = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
      const snippetMatches = [...html.matchAll(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)];

      const count = Math.min(titleMatches.length, maxResults);

      for (let i = 0; i < count; i++) {
        const titleMatch = titleMatches[i];
        let href = titleMatch[1];
        const rawTitle = titleMatch[2].replace(/<[^>]*>/g, '').trim();

        // DuckDuckGo wraps URLs in a redirect; try to extract the actual URL
        const uddgMatch = href.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          href = decodeURIComponent(uddgMatch[1]);
        }

        const snippet = snippetMatches[i]
          ? snippetMatches[i][1].replace(/<[^>]*>/g, '').trim()
          : '';

        if (!rawTitle) continue;

        // Try to extract date from snippet (DuckDuckGo sometimes includes dates)
        const dateMatch = snippet.match(/(\w+ \d{1,2}, \d{4})/);
        const publishedAt = dateMatch ? new Date(dateMatch[1]) : undefined;
        const validPublished = publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : undefined;
        const freshnessScore = calculateFreshness(validPublished);
        const sourceQuality = SOURCE_QUALITY_TIERS['duckduckgo'];

        results.push({
          sourceKey: 'duckduckgo',
          sourceUrl: href,
          sourceName: 'DuckDuckGo',
          title: rawTitle,
          content: snippet || rawTitle,
          contentType: 'article',
          publishedAt: validPublished,
          fetchedAt: now,
          scrapedAt: now,
          freshnessScore,
          sourceQuality,
          compositeScore: calculateCompositeScore(0.5, validPublished, 'duckduckgo'),
          metadata: { rank: i + 1, dateRange },
        });
      }

      return results;
    } catch (error) {
      console.error('[duckduckgo] Fetch failed:', error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch('https://html.duckduckgo.com/html/?q=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'q=test',
      });
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(duckduckgo);
