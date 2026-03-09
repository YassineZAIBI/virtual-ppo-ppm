import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '../types';
import { registry } from '../registry';

interface S2Paper {
  paperId: string;
  title: string;
  abstract: string | null;
  url: string;
  year: number | null;
  citationCount: number;
  authors: { authorId: string; name: string }[];
}

const semanticScholar: DataAdapter = {
  key: 'semantic-scholar',

  metadata: {
    name: 'Semantic Scholar',
    icon: 'Microscope',
    category: 'research',
    description: 'Search academic papers via the Semantic Scholar Graph API.',
    rateLimit: { requests: 100, windowMs: 300_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;

    try {
      const fields = 'title,abstract,url,year,citationCount,authors';
      const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${maxResults}&fields=${fields}`;
      const res = await resilientFetch(url, { adapterKey: 'semantic-scholar', signal: options?.signal });

      const json = await res.json();
      const papers: S2Paper[] = json?.data ?? [];
      const now = new Date();

      // Determine max citation count for relevance normalization
      const maxCitations = Math.max(1, ...papers.map(p => p.citationCount ?? 0));

      return papers.map((paper, i) => ({
        sourceKey: 'semantic-scholar',
        sourceUrl: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
        sourceName: 'Semantic Scholar',
        title: paper.title ?? '(untitled)',
        content: paper.abstract ?? paper.title ?? '',
        contentType: 'paper' as const,
        publishedAt: paper.year ? new Date(`${paper.year}-01-01`) : undefined,
        fetchedAt: now,
        metadata: {
          paperId: paper.paperId,
          year: paper.year,
          citationCount: paper.citationCount,
          authors: paper.authors?.map(a => a.name) ?? [],
          rank: i + 1,
        },
        relevanceHint: paper.citationCount
          ? Math.min(paper.citationCount / maxCitations, 1)
          : 0,
      }));
    } catch (error) {
      console.error('[semantic-scholar] Fetch failed:', error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch(
        'https://api.semanticscholar.org/graph/v1/paper/search?query=test&limit=1&fields=title'
      );
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(semanticScholar);
