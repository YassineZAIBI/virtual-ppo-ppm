import { DataAdapter, DataResult, FetchOptions } from '../types';
import { registry } from '../registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

function toSlug(query: string): string {
  return query.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const capterraReviews: DataAdapter = {
  key: 'capterra-reviews',

  metadata: {
    name: 'Capterra Reviews',
    icon: 'Star',
    category: 'social',
    description: 'Scrape Capterra software reviews for market research.',
    rateLimit: { requests: 30, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    if (!(await isScraperAvailable())) {
      console.info('[capterra-reviews] Scraper service not available — requires Docker scraper for anti-bot bypass');
      return [];
    }
    const slug = options?.config?.slug ?? toSlug(query);

    try {
      const data = await callScraper(
        {
          url: `https://www.capterra.com/p/${slug}/reviews/`,
          mode: 'stealth',
          profile_type: 'reviews',
          max_items: maxResults,
        },
        options?.signal
      );

      const items: any[] = data.results ?? data.items ?? [];
      const now = new Date();

      return items.slice(0, maxResults).map((item: any, i: number) => ({
        sourceKey: 'capterra-reviews',
        sourceUrl: item.url || `https://www.capterra.com/p/${slug}/reviews/`,
        sourceName: 'Capterra',
        title: item.title ?? `Capterra Review #${i + 1} for ${query}`,
        content: [item.text, item.pros && `Pros: ${item.pros}`, item.cons && `Cons: ${item.cons}`]
          .filter(Boolean)
          .join('\n')
          .slice(0, 3000) || `Review of ${query}`,
        contentType: 'review' as const,
        publishedAt: item.date ? new Date(item.date) : undefined,
        fetchedAt: now,
        metadata: {
          rating: item.rating ?? item.stars ?? null,
          pros: item.pros ?? null,
          cons: item.cons ?? null,
          author: item.author ?? item.reviewer ?? null,
          rank: i + 1,
        },
        relevanceHint: item.text ? Math.min(item.text.length / 1000, 1) : 0.3,
      }));
    } catch (error) {
      console.error(`[capterra-reviews] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const data = await callScraper({
        url: 'https://www.capterra.com/p/slack/reviews/',
        mode: 'stealth',
        profile_type: 'reviews',
        max_items: 1,
      });
      return { ok: !!data };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(capterraReviews);
