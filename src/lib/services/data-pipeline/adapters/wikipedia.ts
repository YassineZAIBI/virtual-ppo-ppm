import { DataAdapter, DataResult, FetchOptions } from '../types';
import { registry } from '../registry';

interface WikiSearchResult {
  ns: number;
  title: string;
  pageid: number;
  snippet: string;
  size: number;
  wordcount: number;
  timestamp: string;
}

const wikipedia: DataAdapter = {
  key: 'wikipedia',

  metadata: {
    name: 'Wikipedia',
    icon: 'BookOpen',
    category: 'research',
    description: 'Search Wikipedia articles via the MediaWiki API.',
    rateLimit: { requests: 1000, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;

    try {
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=${maxResults}&utf8=1&origin=*`;
      const res = await fetch(url, { signal: options?.signal });

      if (!res.ok) return [];

      const json = await res.json();
      const searchResults: WikiSearchResult[] = json?.query?.search ?? [];
      const now = new Date();

      return searchResults.map((result, i) => {
        const cleanSnippet = result.snippet.replace(/<[^>]*>/g, '').trim();
        const articleUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`;

        return {
          sourceKey: 'wikipedia',
          sourceUrl: articleUrl,
          sourceName: 'Wikipedia',
          title: result.title,
          content: cleanSnippet || result.title,
          contentType: 'article' as const,
          publishedAt: new Date(result.timestamp),
          fetchedAt: now,
          metadata: {
            pageId: result.pageid,
            wordcount: result.wordcount,
            size: result.size,
            rank: i + 1,
          },
        };
      });
    } catch {
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch(
        'https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=test&format=json&srlimit=1&utf8=1&origin=*'
      );
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(wikipedia);
