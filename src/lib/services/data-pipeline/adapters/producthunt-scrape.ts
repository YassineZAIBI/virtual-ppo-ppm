import { DataAdapter, DataResult, FetchOptions } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

function toSlug(query: string): string {
  return query.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const producthuntScrape: DataAdapter = {
  key: 'producthunt-scrape',

  metadata: {
    name: 'Product Hunt',
    icon: 'Rocket',
    category: 'social',
    description: 'Product launches, upvotes, and maker discussions from Product Hunt.',
    rateLimit: { requests: 30, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    const slug = options?.config?.slug ?? toSlug(query);

    // Try scraper first if available
    if (await isScraperAvailable()) {
      try {
        const data = await callScraper(
          {
            url: `https://www.producthunt.com/products/${slug}`,
            mode: 'basic',
            profile_type: 'product',
            max_items: maxResults,
          },
          options?.signal
        );
        const items: any[] = data.results ?? data.items ?? [];
        const now = new Date();

        if (items.length === 0 && data.title) {
          return [{
            sourceKey: 'producthunt-scrape',
            sourceUrl: `https://www.producthunt.com/products/${slug}`,
            sourceName: 'Product Hunt',
            title: data.title ?? query,
            content: (data.description ?? data.tagline ?? data.text ?? '').slice(0, 3000),
            contentType: 'post' as const,
            fetchedAt: now,
            metadata: { upvotes: data.upvotes ?? null, tagline: data.tagline ?? null },
            relevanceHint: 0.6,
          }];
        }

        if (items.length > 0) {
          return items.slice(0, maxResults).map((item: any, i: number) => ({
            sourceKey: 'producthunt-scrape',
            sourceUrl: item.url || `https://www.producthunt.com/products/${slug}`,
            sourceName: 'Product Hunt',
            title: item.title ?? item.name ?? `${query} Launch #${i + 1}`,
            content: (item.description ?? item.tagline ?? item.text ?? '').slice(0, 3000),
            contentType: 'post' as const,
            publishedAt: item.launched_at ? new Date(item.launched_at) : undefined,
            fetchedAt: now,
            metadata: { upvotes: item.upvotes ?? null, rank: i + 1 },
            relevanceHint: 0.5,
          }));
        }
      } catch {
        // Fall through to native
      }
    }

    // Native fallback: PH Atom RSS feed (always accessible from Node.js)
    // PH blocks direct page access via TLS fingerprinting, but the RSS feed is open
    try {
      const res = await fetch('https://www.producthunt.com/feed', {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/atom+xml,application/xml,text/xml',
        },
        signal: options?.signal,
      });
      if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
      const xml = await res.text();
      const now = new Date();

      // Parse Atom entries: <entry> blocks with <title>, <content>, <link>, <published>, <author>
      const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];
      const queryLower = query.toLowerCase();
      const keywords = queryLower.split(/\s+/).filter(w => w.length > 2);

      const allResults: DataResult[] = [];

      for (const [, entryXml] of entries) {
        const title = entryXml.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? '';
        const href = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*\/>/)?.[1]
          ?? entryXml.match(/<link[^>]*href="([^"]*)"[^>]*>/)?.[1] ?? '';
        const published = entryXml.match(/<published>([^<]*)<\/published>/)?.[1] ?? '';
        const author = entryXml.match(/<name>([^<]*)<\/name>/)?.[1]?.trim() ?? '';
        // Content contains tagline in <p> tags (HTML-encoded)
        const rawContent = entryXml.match(/<content[^>]*>([\s\S]*?)<\/content>/)?.[1] ?? '';
        const tagline = rawContent
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
          .replace(/<[^>]*>/g, '').trim()
          .split('\n').map(l => l.trim()).filter(Boolean)[0] ?? '';

        if (!title) continue;

        allResults.push({
          sourceKey: 'producthunt-scrape',
          sourceUrl: href || `https://www.producthunt.com/products/${toSlug(title)}`,
          sourceName: 'Product Hunt',
          title,
          content: tagline || title,
          contentType: 'post' as const,
          publishedAt: published ? new Date(published) : undefined,
          fetchedAt: now,
          metadata: {
            tagline: tagline || null,
            author: author || null,
            source: 'rss-feed',
            rank: allResults.length + 1,
          },
          relevanceHint: 0.5,
        });
      }

      // Filter by keyword relevance
      const relevant = allResults.filter(r => {
        const text = (r.title + ' ' + r.content).toLowerCase();
        return keywords.some(kw => text.includes(kw));
      });

      // Return keyword-matched results if enough, otherwise return all recent products
      return (relevant.length >= 3 ? relevant : allResults).slice(0, maxResults);
    } catch (error) {
      console.error(`[producthunt-scrape] Native fallback failed:`, error instanceof Error ? error.message : error);
    }

    return [];
  },

  async testConnection() {
    try {
      const res = await fetch('https://www.producthunt.com/feed', {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(producthuntScrape);
