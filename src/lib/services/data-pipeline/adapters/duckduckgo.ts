import { DataAdapter, DataResult, FetchOptions } from '../types';
import { registry } from '../registry';

const duckduckgo: DataAdapter = {
  key: 'duckduckgo',

  metadata: {
    name: 'DuckDuckGo',
    icon: 'Search',
    category: 'search',
    description: 'Web search via DuckDuckGo HTML interface. No API key required.',
    rateLimit: { requests: 30, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: true },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;

    try {
      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Azmyra/1.0',
        },
        body: `q=${encodeURIComponent(query)}`,
        signal: options?.signal,
      });

      if (!res.ok) return [];

      const html = await res.text();
      const results: DataResult[] = [];
      const now = new Date();

      // Extract result blocks — each result lives inside a div with class "result"
      // Links are in <a class="result__a" and snippets in <a class="result__snippet"
      const resultBlockRegex = /<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
      const titleLinkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i;
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i;

      // Simpler approach: extract all title links and snippets separately
      const titleMatches = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
      const snippetMatches = [...html.matchAll(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)];

      const count = Math.min(titleMatches.length, maxResults);

      for (let i = 0; i < count; i++) {
        const titleMatch = titleMatches[i];
        let href = titleMatch[1];
        const rawTitle = titleMatch[2].replace(/<[^>]*>/g, '').trim();

        // DuckDuckGo wraps URLs in a redirect; try to extract the actual URL
        const uddgMatch = href.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          href = decodeURIComponent(uddgMatch[1]);
        }

        const snippet = snippetMatches[i]
          ? snippetMatches[i][1].replace(/<[^>]*>/g, '').trim()
          : '';

        if (!rawTitle) continue;

        results.push({
          sourceKey: 'duckduckgo',
          sourceUrl: href,
          sourceName: 'DuckDuckGo',
          title: rawTitle,
          content: snippet || rawTitle,
          contentType: 'article',
          fetchedAt: now,
          metadata: { rank: i + 1 },
        });
      }

      return results;
    } catch {
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch('https://html.duckduckgo.com/html/?q=test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'q=test',
      });
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(duckduckgo);
