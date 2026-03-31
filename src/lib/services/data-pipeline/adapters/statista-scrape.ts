import { DataAdapter, DataResult, FetchOptions } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

const statistaScrape: DataAdapter = {
  key: 'statista-scrape',

  metadata: {
    name: 'Statista',
    icon: 'BarChart3',
    category: 'research',
    description: 'Scrape Statista search results for market statistics and industry data.',
    rateLimit: { requests: 20, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    if (!(await isScraperAvailable())) {
      console.info('[statista-scrape] Scraper service not available — requires Docker scraper for anti-bot bypass');
      return [];
    }

    try {
      const data = await callScraper(
        {
          url: `https://www.statista.com/search/?q=${encodeURIComponent(query)}`,
          mode: 'stealth',
          profile_type: 'stats',
          max_items: maxResults,
        },
        options?.signal
      );

      const items: any[] = data.results ?? data.items ?? [];
      const now = new Date();

      return items.slice(0, maxResults).map((item: any, i: number) => ({
        sourceKey: 'statista-scrape',
        sourceUrl: item.url || item.link || `https://www.statista.com/search/?q=${encodeURIComponent(query)}`,
        sourceName: 'Statista',
        title: item.title ?? `Statista Statistic #${i + 1}`,
        content: (item.description ?? item.snippet ?? item.text ?? item.summary ?? '').slice(0, 3000),
        contentType: 'statistic' as const,
        publishedAt: item.date ? new Date(item.date) : undefined,
        fetchedAt: now,
        metadata: {
          statisticType: item.type ?? item.content_type ?? null,
          source: item.source ?? null,
          region: item.region ?? item.geography ?? null,
          surveyPeriod: item.survey_period ?? item.period ?? null,
          premium: item.premium ?? item.is_premium ?? null,
          rank: i + 1,
        },
        relevanceHint: item.description ? 0.7 : 0.4,
      }));
    } catch (error) {
      console.error(`[statista-scrape] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const data = await callScraper({
        url: 'https://www.statista.com/search/?q=SaaS+market+size',
        mode: 'stealth',
        profile_type: 'stats',
        max_items: 1,
      });
      return { ok: !!data };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(statistaScrape);
