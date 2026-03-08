import { DataAdapter, DataResult, FetchOptions } from '../types';
import { registry } from '../registry';

interface HNHit {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
  num_comments: number;
  created_at: string;
  author: string;
  story_text?: string | null;
}

const hackernews: DataAdapter = {
  key: 'hackernews',

  metadata: {
    name: 'Hacker News',
    icon: 'MessageSquare',
    category: 'social',
    description: 'Search Hacker News stories via the Algolia API.',
    rateLimit: { requests: 10_000, windowMs: 3_600_000 },
    capabilities: { searchable: true, streamable: false, realtime: true },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;

    try {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${maxResults}`;
      const res = await fetch(url, { signal: options?.signal });

      if (!res.ok) return [];

      const json = await res.json();
      const hits: HNHit[] = json.hits ?? [];
      const now = new Date();

      return hits.map((hit, i) => ({
        sourceKey: 'hackernews',
        sourceUrl: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        sourceName: 'Hacker News',
        title: hit.title ?? '(untitled)',
        content: hit.story_text
          ? hit.story_text.replace(/<[^>]*>/g, '').slice(0, 2000)
          : hit.title ?? '',
        contentType: 'post' as const,
        publishedAt: new Date(hit.created_at),
        fetchedAt: now,
        metadata: {
          hnId: hit.objectID,
          points: hit.points,
          numComments: hit.num_comments,
          author: hit.author,
          rank: i + 1,
        },
        relevanceHint: Math.min(hit.points / 500, 1),
      }));
    } catch {
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch('https://hn.algolia.com/api/v1/search?query=test&hitsPerPage=1');
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(hackernews);
