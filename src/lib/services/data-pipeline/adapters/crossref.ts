import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';

interface CrossrefItem {
  DOI: string;
  title?: string[];
  abstract?: string;
  URL?: string;
  'published-print'?: { 'date-parts': number[][] };
  'is-referenced-by-count'?: number;
  author?: { given?: string; family?: string }[];
  publisher?: string;
  'container-title'?: string[];
}

const crossref: DataAdapter = {
  key: 'crossref',

  metadata: {
    name: 'Crossref',
    icon: 'FileText',
    category: 'research',
    description: 'Search scholarly works via the Crossref Works API.',
    rateLimit: { requests: 50, windowMs: 1_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;

    try {
      const selectFields = 'DOI,title,abstract,URL,published-print,is-referenced-by-count,author,publisher,container-title';
      const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${maxResults}&select=${encodeURIComponent(selectFields)}`;

      const res = await resilientFetch(url, {
        adapterKey: 'crossref',
        headers: {
          'User-Agent': 'Azmyra/1.0 (mailto:contact@theproductowner.org)',
        },
        signal: options?.signal,
      });

      const json = await res.json();
      const items: CrossrefItem[] = json?.message?.items ?? [];
      const now = new Date();

      return items.map((item, i) => {
        const title = item.title?.[0] ?? '(untitled)';
        const abstract = item.abstract
          ? item.abstract.replace(/<[^>]*>/g, '').trim()
          : '';

        let publishedAt: Date | undefined;
        const dateParts = item['published-print']?.['date-parts']?.[0];
        if (dateParts && dateParts.length >= 1) {
          const [year, month = 1, day = 1] = dateParts;
          publishedAt = new Date(year, month - 1, day);
        }

        const authors = item.author?.map(a =>
          [a.given, a.family].filter(Boolean).join(' ')
        ) ?? [];

        return {
          sourceKey: 'crossref',
          sourceUrl: item.URL || `https://doi.org/${item.DOI}`,
          sourceName: item['container-title']?.[0] || 'Crossref',
          title,
          content: abstract || title,
          contentType: 'paper' as const,
          publishedAt,
          fetchedAt: now,
          metadata: {
            doi: item.DOI,
            citationCount: item['is-referenced-by-count'] ?? 0,
            authors,
            publisher: item.publisher,
            journal: item['container-title']?.[0],
            rank: i + 1,
          },
        };
      });
    } catch (error) {
      console.error('[crossref] Fetch failed:', error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch('https://api.crossref.org/works?query=test&rows=1', {
        headers: {
          'User-Agent': 'Azmyra/1.0 (mailto:contact@theproductowner.org)',
        },
      });
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(crossref);
