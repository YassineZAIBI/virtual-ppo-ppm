import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

const techcrunch: DataAdapter = {
  key: 'techcrunch',

  metadata: {
    name: 'TechCrunch',
    icon: 'Newspaper',
    category: 'news',
    description: 'Tech industry news and analysis from TechCrunch.',
    rateLimit: { requests: 30, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: true },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;

    // Try scraper first if available
    if (await isScraperAvailable()) {
      try {
        const data = await callScraper(
          {
            url: `https://techcrunch.com/?s=${encodeURIComponent(query)}`,
            mode: 'basic',
            profile_type: 'article',
            max_items: maxResults,
          },
          options?.signal
        );
        const items: any[] = data.results ?? data.items ?? [];
        if (items.length > 0) {
          const now = new Date();
          return items.slice(0, maxResults).map((item: any, i: number) => ({
            sourceKey: 'techcrunch',
            sourceUrl: item.url || item.link || `https://techcrunch.com/?s=${encodeURIComponent(query)}`,
            sourceName: 'TechCrunch',
            title: item.title ?? `TechCrunch Article #${i + 1}`,
            content: (item.excerpt ?? item.snippet ?? item.text ?? item.description ?? '').slice(0, 3000),
            contentType: 'article' as const,
            publishedAt: item.date ? new Date(item.date) : undefined,
            fetchedAt: now,
            metadata: { author: item.author ?? null, rank: i + 1 },
            relevanceHint: 0.7,
          }));
        }
      } catch {
        // Fall through to native RSS
      }
    }

    // Native fallback: TechCrunch RSS feed + keyword filtering
    return this._fetchViaRss(query, maxResults, options?.signal);
  },

  async _fetchViaRss(query: string, maxResults: number, signal?: AbortSignal): Promise<DataResult[]> {
    try {
      const res = await resilientFetch(
        `https://techcrunch.com/feed/`,
        { adapterKey: 'techcrunch', signal, timeoutMs: 15000 }
      );
      const xml = await res.text();
      const now = new Date();
      const queryLower = query.toLowerCase();
      const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

      // Simple XML parsing for RSS <item> blocks
      const items: DataResult[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;

      while ((match = itemRegex.exec(xml)) !== null && items.length < maxResults * 2) {
        const block = match[1];
        const title = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
          ?? block.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
        const link = block.match(/<link>(.*?)<\/link>/)?.[1] ?? '';
        const desc = block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1]
          ?? block.match(/<description>(.*?)<\/description>/)?.[1] ?? '';
        const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
        const creator = block.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/)?.[1] ?? null;

        // Strip HTML tags from description
        const cleanDesc = desc.replace(/<[^>]*>/g, '').trim();

        items.push({
          sourceKey: 'techcrunch',
          sourceUrl: link,
          sourceName: 'TechCrunch',
          title,
          content: cleanDesc.slice(0, 3000),
          contentType: 'article' as const,
          publishedAt: pubDate ? new Date(pubDate) : undefined,
          fetchedAt: now,
          metadata: { author: creator, rss: true },
          relevanceHint: 0.5,
        });
      }

      // Filter by query relevance — only return items that match keywords
      const filtered = items.filter(item => {
        const text = (item.title + ' ' + item.content).toLowerCase();
        return keywords.some(kw => text.includes(kw));
      });

      return filtered.slice(0, maxResults);
    } catch (error) {
      console.error(`[techcrunch] RSS fallback failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch('https://techcrunch.com/feed/', { method: 'HEAD' });
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
} as DataAdapter & { _fetchViaRss: (query: string, maxResults: number, signal?: AbortSignal) => Promise<DataResult[]> };

registry.register(techcrunch);
