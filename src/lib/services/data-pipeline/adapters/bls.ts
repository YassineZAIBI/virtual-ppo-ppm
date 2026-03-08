import { DataAdapter, DataResult, FetchOptions } from '../types';
import { registry } from '../registry';

/**
 * Well-known BLS series IDs for common economic indicators.
 * Used as a fallback when query-based search isn't specific enough.
 */
const POPULAR_SERIES: Record<string, { id: string; name: string; description: string }> = {
  cpi: {
    id: 'CUUR0000SA0',
    name: 'Consumer Price Index (CPI-U)',
    description: 'Consumer Price Index for All Urban Consumers: All Items, US City Average, Not Seasonally Adjusted',
  },
  unemployment: {
    id: 'LNS14000000',
    name: 'Unemployment Rate',
    description: 'Unemployment Rate, Seasonally Adjusted',
  },
  nonfarm: {
    id: 'CES0000000001',
    name: 'Total Nonfarm Payroll',
    description: 'All Employees, Total Nonfarm, Seasonally Adjusted',
  },
  wages: {
    id: 'CES0500000003',
    name: 'Average Hourly Earnings',
    description: 'Average Hourly Earnings of All Employees, Total Private, Seasonally Adjusted',
  },
  ppi: {
    id: 'WPSFD4',
    name: 'Producer Price Index (PPI)',
    description: 'Producer Price Index: Final Demand, Not Seasonally Adjusted',
  },
  labor_force: {
    id: 'LNS11000000',
    name: 'Civilian Labor Force Level',
    description: 'Civilian Labor Force Level, Seasonally Adjusted',
  },
};

/**
 * Attempt to match query keywords to known BLS series.
 */
function matchSeries(query: string): { id: string; name: string; description: string }[] {
  const q = query.toLowerCase();
  const matches: { id: string; name: string; description: string }[] = [];

  for (const [keyword, series] of Object.entries(POPULAR_SERIES)) {
    if (
      q.includes(keyword) ||
      q.includes(series.name.toLowerCase()) ||
      series.description.toLowerCase().includes(q)
    ) {
      matches.push(series);
    }
  }

  // If no specific match, return all popular series
  if (matches.length === 0) {
    return Object.values(POPULAR_SERIES);
  }

  return matches;
}

interface BLSSeriesData {
  seriesID: string;
  data: {
    year: string;
    period: string;
    periodName: string;
    latest: string;
    value: string;
    footnotes: { code: string; text: string }[];
  }[];
}

const bls: DataAdapter = {
  key: 'bls',

  metadata: {
    name: 'Bureau of Labor Statistics',
    icon: 'BarChart3',
    category: 'government',
    description: 'Access US labor and economic statistics from the BLS Public Data API.',
    rateLimit: { requests: 25, windowMs: 86_400_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    const now = new Date();
    const currentYear = now.getFullYear();

    try {
      const matched = matchSeries(query).slice(0, maxResults);

      // Use BLS Public Data API v2 to fetch time series
      const seriesIds = matched.map(s => s.id);

      const apiUrl = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
      const body = JSON.stringify({
        seriesid: seriesIds,
        startyear: String(currentYear - 3),
        endyear: String(currentYear),
      });

      // Provide API key if configured, otherwise use public (limited) tier
      const apiKey = options?.config?.blsApiKey;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers['registrationkey'] = apiKey;
      }

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body,
        signal: options?.signal,
      });

      if (!res.ok) {
        // Fallback: return series metadata without fetched data
        return matched.map((series, i) => ({
          sourceKey: 'bls',
          sourceUrl: `https://data.bls.gov/timeseries/${series.id}`,
          sourceName: 'Bureau of Labor Statistics',
          title: series.name,
          content: series.description,
          contentType: 'statistic' as const,
          fetchedAt: now,
          metadata: { seriesId: series.id, rank: i + 1 },
        }));
      }

      const json = await res.json();
      const seriesResults: BLSSeriesData[] = json?.Results?.series ?? [];

      return matched.map((series, i) => {
        const seriesData = seriesResults.find(s => s.seriesID === series.id);
        const recentData = seriesData?.data?.slice(0, 12) ?? [];

        const dataSummary = recentData
          .map(d => `${d.periodName} ${d.year}: ${d.value}`)
          .join('; ');

        return {
          sourceKey: 'bls',
          sourceUrl: `https://data.bls.gov/timeseries/${series.id}`,
          sourceName: 'Bureau of Labor Statistics',
          title: series.name,
          content: dataSummary
            ? `${series.description}\n\nRecent values: ${dataSummary}`
            : series.description,
          contentType: 'statistic' as const,
          fetchedAt: now,
          metadata: {
            seriesId: series.id,
            latestValue: recentData[0]?.value,
            latestPeriod: recentData[0]
              ? `${recentData[0].periodName} ${recentData[0].year}`
              : undefined,
            dataPoints: recentData.map(d => ({
              period: `${d.periodName} ${d.year}`,
              value: d.value,
            })),
            rank: i + 1,
          },
        };
      });
    } catch {
      return [];
    }
  },

  async testConnection(config?: Record<string, any>) {
    try {
      const res = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seriesid: ['LNS14000000'],
          startyear: '2024',
          endyear: '2024',
        }),
      });
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(bls);
