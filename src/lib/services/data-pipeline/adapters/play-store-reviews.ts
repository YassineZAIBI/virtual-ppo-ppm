import { DataAdapter, DataResult, FetchOptions } from '../types';
import { registry } from '../registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

const playStoreReviews: DataAdapter = {
  key: 'play-store-reviews',

  metadata: {
    name: 'Google Play Reviews',
    icon: 'Smartphone',
    category: 'social',
    description: 'Scrape Google Play Store app listings and reviews for mobile market insights.',
    rateLimit: { requests: 30, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    if (!(await isScraperAvailable())) {
      console.info('[play-store-reviews] Scraper service not available — requires Docker scraper');
      return [];
    }

    try {
      const data = await callScraper(
        {
          url: `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`,
          mode: 'dynamic',
          profile_type: 'reviews',
          max_items: maxResults,
        },
        options?.signal
      );

      const items: any[] = data.results ?? data.items ?? [];
      const now = new Date();

      return items.slice(0, maxResults).map((item: any, i: number) => ({
        sourceKey: 'play-store-reviews',
        sourceUrl: item.url || item.link || `https://play.google.com/store/search?q=${encodeURIComponent(query)}&c=apps`,
        sourceName: 'Google Play',
        title: item.title ?? item.name ?? `Play Store Result #${i + 1}`,
        content: (item.description ?? item.text ?? item.snippet ?? item.review ?? '').slice(0, 3000),
        contentType: 'review' as const,
        publishedAt: item.date ? new Date(item.date) : undefined,
        fetchedAt: now,
        metadata: {
          rating: item.rating ?? item.score ?? null,
          reviewCount: item.review_count ?? item.reviews ?? null,
          developer: item.developer ?? item.author ?? null,
          installs: item.installs ?? item.downloads ?? null,
          appId: item.appId ?? item.package_name ?? null,
          rank: i + 1,
        },
        relevanceHint: item.rating ? Math.min((item.rating as number) / 5, 1) * 0.6 + 0.2 : 0.3,
      }));
    } catch (error) {
      console.error(`[play-store-reviews] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const data = await callScraper({
        url: 'https://play.google.com/store/search?q=slack&c=apps',
        mode: 'dynamic',
        profile_type: 'reviews',
        max_items: 1,
      });
      return { ok: !!data };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(playStoreReviews);
