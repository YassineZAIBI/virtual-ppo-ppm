import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

const stackoverflowScrape: DataAdapter = {
  key: 'stackoverflow-scrape',

  metadata: {
    name: 'Stack Overflow',
    icon: 'HelpCircle',
    category: 'social',
    description: 'Developer Q&A from Stack Overflow for technical sentiment and pain points.',
    rateLimit: { requests: 30, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;

    // Try scraper first if available
    if (await isScraperAvailable()) {
      try {
        const data = await callScraper(
          {
            url: `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
            mode: 'basic',
            profile_type: 'questions',
            max_items: maxResults,
          },
          options?.signal
        );
        const items: any[] = data.results ?? data.items ?? [];
        if (items.length > 0) {
          const now = new Date();
          return items.slice(0, maxResults).map((item: any, i: number) => ({
            sourceKey: 'stackoverflow-scrape',
            sourceUrl: item.url || item.link || `https://stackoverflow.com/search?q=${encodeURIComponent(query)}`,
            sourceName: 'Stack Overflow',
            title: item.title ?? `SO Question #${i + 1}`,
            content: (item.excerpt ?? item.snippet ?? item.body ?? item.text ?? '').replace(/<[^>]*>/g, '').slice(0, 3000),
            contentType: 'post' as const,
            publishedAt: item.date ? new Date(item.date) : undefined,
            fetchedAt: now,
            metadata: { votes: item.votes ?? item.score ?? null, answers: item.answer_count ?? null, tags: item.tags ?? [], rank: i + 1 },
            relevanceHint: item.votes ? Math.min((item.votes as number) / 100, 1) : 0.4,
          }));
        }
      } catch {
        // Fall through to native API
      }
    }

    // Native fallback: Stack Exchange public API (free, no key needed)
    try {
      const apiUrl = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=${maxResults}&filter=withbody`;
      const res = await resilientFetch(apiUrl, {
        adapterKey: 'stackoverflow-scrape',
        signal: options?.signal,
        timeoutMs: 15000,
      });
      const json = await res.json();
      const items: any[] = json.items ?? [];
      const now = new Date();

      return items.slice(0, maxResults).map((item: any, i: number) => ({
        sourceKey: 'stackoverflow-scrape',
        sourceUrl: item.link ?? `https://stackoverflow.com/questions/${item.question_id}`,
        sourceName: 'Stack Overflow',
        title: item.title ?? `SO Question #${i + 1}`,
        content: (item.body ?? '').replace(/<[^>]*>/g, '').slice(0, 3000),
        contentType: 'post' as const,
        publishedAt: item.creation_date ? new Date(item.creation_date * 1000) : undefined,
        fetchedAt: now,
        metadata: {
          votes: item.score ?? 0,
          answers: item.answer_count ?? 0,
          views: item.view_count ?? 0,
          tags: item.tags ?? [],
          accepted: item.is_answered ?? false,
          rank: i + 1,
        },
        relevanceHint: item.score ? Math.min(Math.max(item.score, 0) / 50, 1) : 0.4,
      }));
    } catch (error) {
      console.error(`[stackoverflow-scrape] API fallback failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch('https://api.stackexchange.com/2.3/info?site=stackoverflow');
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(stackoverflowScrape);
