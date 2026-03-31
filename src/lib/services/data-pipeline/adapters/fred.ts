import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';

interface FredSeries {
  id: string;
  title: string;
  observation_start: string;
  observation_end: string;
  frequency: string;
  units: string;
  notes?: string;
  popularity: number;
}

const BASE_URL = 'https://api.stlouisfed.org/fred';

const fred: DataAdapter = {
  key: 'fred',

  metadata: {
    name: 'FRED (Federal Reserve)',
    icon: 'Landmark',
    category: 'government',
    description: 'Search U.S. economic data from the Federal Reserve Bank of St. Louis (FRED).',
    rateLimit: { requests: 120, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    const apiKey = options?.config?.apiKey || process.env.FRED_API_KEY;

    if (!apiKey) {
      console.warn('[fred] No API key configured. Set FRED_API_KEY or provide via config.');
      return [];
    }

    try {
      const searchUrl = `${BASE_URL}/series/search?search_text=${encodeURIComponent(query)}&limit=${maxResults}&order_by=popularity&sort_order=desc&api_key=${apiKey}&file_type=json`;
      const res = await resilientFetch(searchUrl, {
        adapterKey: 'fred',
        signal: options?.signal,
      });

      const json = await res.json();
      const series: FredSeries[] = json.seriess ?? [];
      const now = new Date();

      // For each series, get latest observation
      const results: DataResult[] = await Promise.all(
        series.slice(0, maxResults).map(async (s) => {
          let latestValue = '';
          try {
            const obsUrl = `${BASE_URL}/series/observations?series_id=${s.id}&sort_order=desc&limit=1&api_key=${apiKey}&file_type=json`;
            const obsRes = await resilientFetch(obsUrl, { adapterKey: 'fred' });
            const obsJson = await obsRes.json();
            const obs = obsJson.observations?.[0];
            if (obs) {
              latestValue = `Latest value: ${obs.value} (${obs.date})`;
            }
          } catch {
            // Skip latest value on error
          }

          const content = [
            s.notes?.replace(/<[^>]*>/g, '').slice(0, 500) || s.title,
            `Units: ${s.units}. Frequency: ${s.frequency}.`,
            `Data range: ${s.observation_start} to ${s.observation_end}.`,
            latestValue,
          ].filter(Boolean).join('\n');

          return {
            sourceKey: 'fred',
            sourceUrl: `https://fred.stlouisfed.org/series/${s.id}`,
            sourceName: 'FRED (Federal Reserve)',
            title: s.title,
            content,
            contentType: 'dataset' as const,
            fetchedAt: now,
            metadata: {
              seriesId: s.id,
              frequency: s.frequency,
              units: s.units,
              popularity: s.popularity,
            },
            relevanceHint: Math.min(s.popularity / 100, 1),
          };
        })
      );

      return results;
    } catch (error) {
      console.error(`[fred] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection(config?: Record<string, any>) {
    const apiKey = config?.apiKey || process.env.FRED_API_KEY;
    if (!apiKey) return { ok: false, error: 'FRED_API_KEY not configured' };
    try {
      const res = await fetch(`${BASE_URL}/series/search?search_text=GDP&limit=1&api_key=${apiKey}&file_type=json`);
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(fred);
