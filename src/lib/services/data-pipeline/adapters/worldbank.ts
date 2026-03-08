import { DataAdapter, DataResult, FetchOptions } from '../types';
import { registry } from '../registry';

interface WBIndicator {
  id: string;
  name: string;
  sourceNote?: string;
  sourceOrganization?: string;
}

interface WBDataPoint {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
  unit: string;
  decimal: number;
}

const worldbank: DataAdapter = {
  key: 'worldbank',

  metadata: {
    name: 'World Bank',
    icon: 'Globe',
    category: 'government',
    description: 'Search economic indicators and development data via the World Bank API.',
    rateLimit: { requests: 100, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    const now = new Date();

    try {
      // First, search for matching indicators
      const indicatorUrl = `https://api.worldbank.org/v2/indicator?format=json&per_page=${maxResults}&source=2&q=${encodeURIComponent(query)}`;
      const indicatorRes = await fetch(indicatorUrl, { signal: options?.signal });

      if (!indicatorRes.ok) return [];

      const indicatorJson = await indicatorRes.json();

      // World Bank API returns [metadata, data] as an array
      if (!Array.isArray(indicatorJson) || indicatorJson.length < 2) {
        return [];
      }

      const indicators: WBIndicator[] = indicatorJson[1] ?? [];

      if (indicators.length === 0) return [];

      // For each indicator found, create a DataResult
      const results: DataResult[] = indicators.map((ind, i) => ({
        sourceKey: 'worldbank',
        sourceUrl: `https://data.worldbank.org/indicator/${ind.id}`,
        sourceName: 'World Bank',
        title: ind.name,
        content: ind.sourceNote
          ? ind.sourceNote.replace(/<[^>]*>/g, '').slice(0, 2000)
          : ind.name,
        contentType: 'dataset' as const,
        fetchedAt: now,
        metadata: {
          indicatorId: ind.id,
          sourceOrganization: ind.sourceOrganization,
          rank: i + 1,
        },
      }));

      // Optionally fetch data for the top indicator to enrich the first result
      if (results.length > 0) {
        try {
          const topId = indicators[0].id;
          const dataUrl = `https://api.worldbank.org/v2/country/all/indicator/${topId}?format=json&per_page=5&date=2020:2024&source=2`;
          const dataRes = await fetch(dataUrl, { signal: options?.signal });

          if (dataRes.ok) {
            const dataJson = await dataRes.json();
            if (Array.isArray(dataJson) && dataJson.length >= 2 && dataJson[1]) {
              const dataPoints: WBDataPoint[] = dataJson[1];
              const summary = dataPoints
                .filter(dp => dp.value !== null)
                .slice(0, 10)
                .map(dp => `${dp.country.value} (${dp.date}): ${dp.value}`)
                .join('; ');

              if (summary) {
                results[0].content += `\n\nRecent data: ${summary}`;
                results[0].metadata.sampleData = dataPoints
                  .filter(dp => dp.value !== null)
                  .slice(0, 10)
                  .map(dp => ({
                    country: dp.country.value,
                    year: dp.date,
                    value: dp.value,
                  }));
              }
            }
          }
        } catch {
          // Non-critical enrichment — ignore errors
        }
      }

      return results;
    } catch {
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch(
        'https://api.worldbank.org/v2/indicator?format=json&per_page=1&source=2&q=gdp'
      );
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(worldbank);
