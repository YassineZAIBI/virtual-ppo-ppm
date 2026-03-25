import { DataAdapter, DataResult, FetchOptions } from '../types';
import { registry } from '../registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

const quora: DataAdapter = {
  key: 'quora',

  metadata: {
    name: 'Quora',
    icon: 'MessageCircle',
    category: 'social',
    description: 'Scrape Quora Q&A for market insights and customer pain points.',
    rateLimit: { requests: 20, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    if (!(await isScraperAvailable())) {
      console.info('[quora] Scraper service not available — requires Docker scraper for anti-bot bypass');
      return [];
    }

    try {
      const data = await callScraper(
        {
          url: `https://www.quora.com/search?q=${encodeURIComponent(query)}`,
          mode: 'stealth',
          profile_type: 'answers',
          max_items: maxResults,
        },
        options?.signal
      );

      const items: any[] = data.results ?? data.items ?? [];
      const now = new Date();

      return items.slice(0, maxResults).map((item: any, i: number) => ({
        sourceKey: 'quora',
        sourceUrl: item.url || item.link || `https://www.quora.com/search?q=${encodeURIComponent(query)}`,
        sourceName: 'Quora',
        title: item.question ?? item.title ?? `Quora Answer #${i + 1}`,
        content: (item.answer ?? item.text ?? item.snippet ?? item.excerpt ?? '').slice(0, 3000),
        contentType: 'post' as const,
        publishedAt: item.date ? new Date(item.date) : undefined,
        fetchedAt: now,
        metadata: {
          upvotes: item.upvotes ?? item.votes ?? null,
          author: item.author ?? null,
          question: item.question ?? null,
          answerCount: item.answer_count ?? null,
          views: item.views ?? null,
          rank: i + 1,
        },
        relevanceHint: item.upvotes
          ? Math.min((item.upvotes as number) / 200, 1)
          : item.answer ? 0.5 : 0.3,
      }));
    } catch (error) {
      console.error(`[quora] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const data = await callScraper({
        url: 'https://www.quora.com/search?q=product+management',
        mode: 'stealth',
        profile_type: 'answers',
        max_items: 1,
      });
      return { ok: !!data };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(quora);
