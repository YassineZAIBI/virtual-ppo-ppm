import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '../types';
import { registry } from '../registry';

interface OpenAlexWork {
  id: string;
  display_name: string;
  abstract_inverted_index: Record<string, number[]> | null;
  doi: string | null;
  publication_year: number | null;
  cited_by_count: number;
  primary_location: {
    source?: { display_name?: string } | null;
    landing_page_url?: string | null;
  } | null;
}

/**
 * Reconstruct a readable abstract from OpenAlex's inverted index format.
 * The inverted index maps each word to the positions it appears at.
 */
function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string {
  if (!invertedIndex) return '';

  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([pos, word]);
    }
  }

  words.sort((a, b) => a[0] - b[0]);
  return words.map(w => w[1]).join(' ');
}

const openalex: DataAdapter = {
  key: 'openalex',

  metadata: {
    name: 'OpenAlex',
    icon: 'Library',
    category: 'research',
    description: 'Search scholarly works via the OpenAlex API. Open-access catalog of academic papers.',
    rateLimit: { requests: 100, windowMs: 1_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;

    try {
      const selectFields = 'id,display_name,abstract_inverted_index,doi,publication_year,cited_by_count,primary_location';
      const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per_page=${maxResults}&select=${selectFields}&mailto=contact@theproductowner.org`;

      const res = await resilientFetch(url, { adapterKey: 'openalex', signal: options?.signal });

      const json = await res.json();
      const works: OpenAlexWork[] = json?.results ?? [];
      const now = new Date();

      return works.map((work, i) => {
        const abstract = reconstructAbstract(work.abstract_inverted_index);
        const sourceUrl = work.primary_location?.landing_page_url
          || (work.doi ? `https://doi.org/${work.doi.replace('https://doi.org/', '')}` : work.id);

        return {
          sourceKey: 'openalex',
          sourceUrl,
          sourceName: work.primary_location?.source?.display_name || 'OpenAlex',
          title: work.display_name ?? '(untitled)',
          content: abstract || work.display_name || '',
          contentType: 'paper' as const,
          publishedAt: work.publication_year
            ? new Date(`${work.publication_year}-01-01`)
            : undefined,
          fetchedAt: now,
          metadata: {
            openAlexId: work.id,
            doi: work.doi,
            year: work.publication_year,
            citedByCount: work.cited_by_count,
            source: work.primary_location?.source?.display_name,
            rank: i + 1,
          },
        };
      });
    } catch (error) {
      console.error('[openalex] Fetch failed:', error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch(
        'https://api.openalex.org/works?search=test&per_page=1&select=id&mailto=contact@theproductowner.org'
      );
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(openalex);
