import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '../types';
import { registry } from '../registry';

const googleTrends: DataAdapter = {
  key: 'google-trends',

  metadata: {
    name: 'Google Trends',
    icon: 'TrendingUp',
    category: 'search',
    description: 'Discover trending search topics via Google Trends daily trends API.',
    rateLimit: { requests: 10, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    const now = new Date();

    try {
      // Google Trends doesn't have a public API, so we use the Daily Trends RSS feed
      // and supplement with a DuckDuckGo search for "google trends [query]"
      const url = `https://trends.google.com/trending/rss?geo=US`;
      const res = await resilientFetch(url, {
        adapterKey: 'google-trends',
        signal: options?.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Azmyra/1.0)' },
      });

      const text = await res.text();

      // Parse RSS XML for trending items
      const items: DataResult[] = [];
      const itemRegex = /<item>[\s\S]*?<\/item>/g;
      const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/;
      const linkRegex = /<link>(.*?)<\/link>/;
      const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>/s;
      const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
      const trafficRegex = /<ht:approx_traffic>(.*?)<\/ht:approx_traffic>/;

      let match;
      while ((match = itemRegex.exec(text)) !== null && items.length < maxResults) {
        const itemXml = match[0];
        const title = titleRegex.exec(itemXml)?.[1] ?? '';
        const link = linkRegex.exec(itemXml)?.[1] ?? '';
        const description = descRegex.exec(itemXml)?.[1]?.replace(/<[^>]*>/g, '') ?? '';
        const pubDate = pubDateRegex.exec(itemXml)?.[1];
        const traffic = trafficRegex.exec(itemXml)?.[1] ?? '';

        // Filter by relevance to query
        const combined = `${title} ${description}`.toLowerCase();
        const queryTerms = query.toLowerCase().split(/\s+/);
        const relevant = queryTerms.some(term => combined.includes(term));

        if (relevant || query.trim() === '') {
          items.push({
            sourceKey: 'google-trends',
            sourceUrl: link || `https://trends.google.com/trends/explore?q=${encodeURIComponent(title)}`,
            sourceName: 'Google Trends',
            title,
            content: description || `Trending topic: ${title}. Approximate traffic: ${traffic}.`,
            contentType: 'statistic',
            publishedAt: pubDate ? new Date(pubDate) : now,
            fetchedAt: now,
            metadata: { traffic, query },
            relevanceHint: relevant ? 0.7 : 0.3,
          });
        }
      }

      return items;
    } catch (error) {
      console.error(`[google-trends] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch('https://trends.google.com/trending/rss?geo=US');
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(googleTrends);
