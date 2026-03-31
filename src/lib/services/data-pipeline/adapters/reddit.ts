import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    score: number;
    num_comments: number;
    subreddit: string;
    author: string;
    created_utc: number;
    is_self: boolean;
  };
}

const reddit: DataAdapter = {
  key: 'reddit',

  metadata: {
    name: 'Reddit',
    icon: 'Users',
    category: 'social',
    description: 'Search Reddit posts via the public JSON API.',
    rateLimit: { requests: 60, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: true },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = Math.min(options?.maxResults ?? 10, 25);

    try {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=relevance&limit=${maxResults}`;
      const res = await resilientFetch(url, {
        adapterKey: 'reddit',
        headers: { 'User-Agent': 'Azmyra/1.0' },
        signal: options?.signal,
      });

      const json = await res.json();
      const children: RedditPost[] = json?.data?.children ?? [];
      const now = new Date();

      return children.map((child, i) => {
        const post = child.data;
        const content = post.selftext
          ? post.selftext.slice(0, 3000)
          : post.title;

        return {
          sourceKey: 'reddit',
          sourceUrl: `https://www.reddit.com${post.permalink}`,
          sourceName: `r/${post.subreddit}`,
          title: post.title,
          content,
          contentType: 'post' as const,
          publishedAt: new Date(post.created_utc * 1000),
          fetchedAt: now,
          metadata: {
            subreddit: post.subreddit,
            score: post.score,
            numComments: post.num_comments,
            author: post.author,
            isSelf: post.is_self,
            externalUrl: post.is_self ? undefined : post.url,
            rank: i + 1,
          },
          relevanceHint: Math.min(post.score / 1000, 1),
        };
      });
    } catch (error) {
      console.error('[reddit] Fetch failed:', error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch('https://www.reddit.com/search.json?q=test&limit=1', {
        headers: { 'User-Agent': 'Azmyra/1.0' },
      });
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(reddit);
