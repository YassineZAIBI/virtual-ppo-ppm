import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '../types';
import { registry } from '../registry';

const arxiv: DataAdapter = {
  key: 'arxiv',

  metadata: {
    name: 'arXiv',
    icon: 'GraduationCap',
    category: 'research',
    description: 'Search academic preprints on arXiv via the REST API.',
    rateLimit: { requests: 3, windowMs: 1_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;

    try {
      const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${maxResults}`;
      const res = await resilientFetch(url, { adapterKey: 'arxiv', signal: options?.signal });

      const xml = await res.text();
      const results: DataResult[] = [];
      const now = new Date();

      // Extract each <entry> block
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      let entryMatch: RegExpExecArray | null;
      let rank = 0;

      while ((entryMatch = entryRegex.exec(xml)) !== null) {
        rank++;
        const block = entryMatch[1];

        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
        const summaryMatch = block.match(/<summary>([\s\S]*?)<\/summary>/);
        const idMatch = block.match(/<id>([\s\S]*?)<\/id>/);
        const publishedMatch = block.match(/<published>([\s\S]*?)<\/published>/);

        // Extract all authors
        const authorMatches = [...block.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/gi)];
        const authors = authorMatches.map(m => m[1].trim());

        // Extract categories
        const categoryMatches = [...block.matchAll(/<category[^>]*term="([^"]*)"[^>]*\/>/gi)];
        const categories = categoryMatches.map(m => m[1]);

        const title = titleMatch
          ? titleMatch[1].replace(/\s+/g, ' ').trim()
          : '(untitled)';

        const summary = summaryMatch
          ? summaryMatch[1].replace(/\s+/g, ' ').trim()
          : '';

        const arxivId = idMatch ? idMatch[1].trim() : '';
        const absUrl = arxivId || `https://arxiv.org/abs/${rank}`;

        results.push({
          sourceKey: 'arxiv',
          sourceUrl: absUrl,
          sourceName: 'arXiv',
          title,
          content: summary || title,
          contentType: 'paper',
          publishedAt: publishedMatch ? new Date(publishedMatch[1].trim()) : undefined,
          fetchedAt: now,
          metadata: {
            arxivId,
            authors,
            categories,
            rank,
          },
        });
      }

      return results;
    } catch (error) {
      console.error('[arxiv] Fetch failed:', error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch(
        'https://export.arxiv.org/api/query?search_query=all:test&start=0&max_results=1'
      );
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(arxiv);
