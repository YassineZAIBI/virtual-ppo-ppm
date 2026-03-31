import { DataAdapter, DataResult, FetchOptions } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

function toSlug(query: string): string {
  return query.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
}

const glassdoor: DataAdapter = {
  key: 'glassdoor',

  metadata: {
    name: 'Glassdoor Reviews',
    icon: 'Users',
    category: 'social',
    description: 'Scrape Glassdoor company reviews for employer brand signals.',
    rateLimit: { requests: 20, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    if (!(await isScraperAvailable())) {
      console.info('[glassdoor] Scraper service not available — requires Docker scraper for anti-bot bypass');
      return [];
    }
    const slug = options?.config?.slug ?? toSlug(query);

    try {
      const data = await callScraper(
        {
          url: `https://www.glassdoor.com/Reviews/${slug}-reviews.htm`,
          mode: 'stealth',
          profile_type: 'reviews',
          max_items: maxResults,
        },
        options?.signal
      );

      const items: any[] = data.results ?? data.items ?? [];
      const now = new Date();

      return items.slice(0, maxResults).map((item: any, i: number) => ({
        sourceKey: 'glassdoor',
        sourceUrl: item.url || `https://www.glassdoor.com/Reviews/${slug}-reviews.htm`,
        sourceName: 'Glassdoor',
        title: item.title ?? item.headline ?? `Glassdoor Review #${i + 1} for ${query}`,
        content: [item.text, item.pros && `Pros: ${item.pros}`, item.cons && `Cons: ${item.cons}`]
          .filter(Boolean)
          .join('\n')
          .slice(0, 3000) || `Employee review of ${query}`,
        contentType: 'review' as const,
        publishedAt: item.date ? new Date(item.date) : undefined,
        fetchedAt: now,
        metadata: {
          rating: item.rating ?? item.overall_rating ?? null,
          pros: item.pros ?? null,
          cons: item.cons ?? null,
          author: item.author ?? item.job_title ?? null,
          jobTitle: item.job_title ?? null,
          employmentStatus: item.employment_status ?? null,
          rank: i + 1,
        },
        relevanceHint: item.text ? Math.min(item.text.length / 800, 1) : 0.3,
      }));
    } catch (error) {
      console.error(`[glassdoor] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const data = await callScraper({
        url: 'https://www.glassdoor.com/Reviews/Google-reviews.htm',
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

registry.register(glassdoor);
