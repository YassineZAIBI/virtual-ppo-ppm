import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '../types';
import { registry } from '../registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

const googlePatents: DataAdapter = {
  key: 'google-patents',

  metadata: {
    name: 'Google Patents',
    icon: 'FileText',
    category: 'research',
    description: 'Patent search via Google Patents for intellectual property and innovation signals.',
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
            url: `https://patents.google.com/?q=${encodeURIComponent(query)}`,
            mode: 'basic',
            profile_type: 'patent',
            max_items: maxResults,
          },
          options?.signal
        );
        const items: any[] = data.results ?? data.items ?? [];
        if (items.length > 0) {
          const now = new Date();
          return items.slice(0, maxResults).map((item: any, i: number) => ({
            sourceKey: 'google-patents',
            sourceUrl: item.url || item.link || `https://patents.google.com/?q=${encodeURIComponent(query)}`,
            sourceName: 'Google Patents',
            title: item.title ?? `Patent #${i + 1}`,
            content: (item.abstract ?? item.snippet ?? item.description ?? item.text ?? '').slice(0, 3000),
            contentType: 'paper' as const,
            publishedAt: (item.date ?? item.filing_date) ? new Date(item.date ?? item.filing_date) : undefined,
            fetchedAt: now,
            metadata: { patentNumber: item.patent_number ?? null, assignee: item.assignee ?? null, rank: i + 1 },
            relevanceHint: 0.7,
          }));
        }
      } catch {
        // Fall through to native fallback
      }
    }

    // Native fallback: Fetch Google Patents HTML and parse basic results
    try {
      const url = `https://patents.google.com/?q=${encodeURIComponent(query)}&oq=${encodeURIComponent(query)}`;
      const res = await resilientFetch(url, {
        adapterKey: 'google-patents',
        signal: options?.signal,
        timeoutMs: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
        },
      });
      const html = await res.text();
      const now = new Date();

      // Google Patents embeds search results data - try to extract article tags
      const results: DataResult[] = [];
      // Look for result items in the HTML
      const articleRegex = /<article[^>]*>([\s\S]*?)<\/article>/g;
      let match;

      while ((match = articleRegex.exec(html)) !== null && results.length < maxResults) {
        const block = match[1];
        const title = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]?.replace(/<[^>]*>/g, '').trim()
          ?? block.match(/<h4[^>]*>([\s\S]*?)<\/h4>/)?.[1]?.replace(/<[^>]*>/g, '').trim();
        const link = block.match(/href="([^"]*patent[^"]*)"/)?.[1];
        const snippet = block.match(/<span[^>]*class="[^"]*abstract[^"]*"[^>]*>([\s\S]*?)<\/span>/)?.[1]?.replace(/<[^>]*>/g, '').trim();

        if (title) {
          results.push({
            sourceKey: 'google-patents',
            sourceUrl: link ? `https://patents.google.com${link}` : url,
            sourceName: 'Google Patents',
            title,
            content: (snippet ?? `Patent related to: ${query}`).slice(0, 3000),
            contentType: 'paper' as const,
            fetchedAt: now,
            metadata: { searchQuery: query, rank: results.length + 1 },
            relevanceHint: 0.5,
          });
        }
      }

      // If we couldn't parse articles, return a single reference result
      if (results.length === 0) {
        results.push({
          sourceKey: 'google-patents',
          sourceUrl: url,
          sourceName: 'Google Patents',
          title: `Google Patents: ${query}`,
          content: `Search Google Patents for "${query}" to discover relevant intellectual property and innovation signals. Visit: ${url}`,
          contentType: 'paper' as const,
          fetchedAt: now,
          metadata: { searchQuery: query, fallback: true },
          relevanceHint: 0.3,
        });
      }

      return results;
    } catch (error) {
      console.error(`[google-patents] Native fallback failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch('https://patents.google.com/', { method: 'HEAD' });
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(googlePatents);
