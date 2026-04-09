import { DataAdapter, DataResult, FetchOptions } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

function toSlug(query: string): string {
  return query.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const g2Reviews: DataAdapter = {
  key: 'g2-reviews',

  metadata: {
    name: 'G2 Reviews',
    icon: 'Star',
    category: 'social',
    description: 'G2 product reviews and ratings for competitive intelligence.',
    rateLimit: { requests: 30, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  disabled: true,
  disabledReason: 'Scrapes anti-bot protected site — will fail in production',

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    const slug = options?.config?.slug ?? toSlug(query);

    // Try scraper first if available (bypasses Cloudflare)
    if (await isScraperAvailable()) {
      try {
        const data = await callScraper(
          {
            url: `https://www.g2.com/products/${slug}/reviews`,
            mode: 'stealth',
            profile_type: 'reviews',
            max_items: maxResults,
          },
          options?.signal
        );

        const items: any[] = data.results ?? data.items ?? [];
        const now = new Date();

        if (items.length > 0) {
          return items.slice(0, maxResults).map((item: any, i: number) => ({
            sourceKey: 'g2-reviews',
            sourceUrl: item.url || `https://www.g2.com/products/${slug}/reviews`,
            sourceName: 'G2',
            title: item.title ?? `G2 Review #${i + 1} for ${query}`,
            content: [item.text, item.pros && `Pros: ${item.pros}`, item.cons && `Cons: ${item.cons}`]
              .filter(Boolean)
              .join('\n')
              .slice(0, 3000) || `Review of ${query}`,
            contentType: 'review' as const,
            publishedAt: item.date ? new Date(item.date) : undefined,
            fetchedAt: now,
            metadata: {
              rating: item.rating ?? item.stars ?? null,
              pros: item.pros ?? null,
              cons: item.cons ?? null,
              author: item.author ?? item.reviewer ?? null,
              rank: i + 1,
            },
            relevanceHint: item.text ? Math.min(item.text.length / 1000, 1) : 0.3,
          }));
        }
      } catch {
        // Fall through to native fallback
      }
    }

    // Native fallback: Use DuckDuckGo site:g2.com search
    // G2 blocks direct access (Cloudflare 403) but DDG indexes G2 pages with snippets
    try {
      const ddgQuery = `site:g2.com ${query} reviews`;
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(ddgQuery)}`;
      const res = await fetch(ddgUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: `q=${encodeURIComponent(ddgQuery)}`,
        signal: options?.signal,
      });

      if (!res.ok) throw new Error(`DDG HTTP ${res.status}`);
      const html = await res.text();
      const now = new Date();

      // Parse DDG results (same format as duckduckgo adapter)
      const titleMatches = [...html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
      const snippetMatches = [...html.matchAll(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi)];

      const results: DataResult[] = [];
      const count = Math.min(titleMatches.length, maxResults);

      for (let i = 0; i < count; i++) {
        const titleMatch = titleMatches[i];
        let href = titleMatch[1];
        const rawTitle = titleMatch[2].replace(/<[^>]*>/g, '').trim();

        // DuckDuckGo wraps URLs in a redirect; extract actual URL
        const uddgMatch = href.match(/uddg=([^&]+)/);
        if (uddgMatch) {
          href = decodeURIComponent(uddgMatch[1]);
        }

        // Only keep results from g2.com
        if (!href.includes('g2.com')) continue;

        const snippet = snippetMatches[i]
          ? snippetMatches[i][1].replace(/<[^>]*>/g, '').trim()
          : '';

        if (!rawTitle) continue;

        // Try to extract rating from snippet (G2 snippets often include "X.X out of 5 stars")
        const ratingMatch = snippet.match(/(\d+\.?\d*)\s*(?:out of 5|\/5|stars)/i);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;

        results.push({
          sourceKey: 'g2-reviews',
          sourceUrl: href,
          sourceName: 'G2',
          title: rawTitle.replace(/ \| G2$/i, '').replace(/ - G2$/i, ''),
          content: snippet || rawTitle,
          contentType: 'review' as const,
          fetchedAt: now,
          metadata: {
            rating,
            searchQuery: query,
            source: 'duckduckgo-fallback',
            rank: results.length + 1,
          },
          relevanceHint: href.includes('/reviews') ? 0.7 : 0.5,
        });
      }

      if (results.length > 0) {
        return results.slice(0, maxResults);
      }
    } catch (error) {
      console.error(`[g2-reviews] Native fallback failed:`, error instanceof Error ? error.message : error);
    }

    return [];
  },

  async testConnection() {
    try {
      // Test via DDG site search (works without scraper)
      const res = await fetch('https://html.duckduckgo.com/html/?q=site%3Ag2.com+slack+reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'q=site%3Ag2.com+slack+reviews',
      });
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(g2Reviews);
