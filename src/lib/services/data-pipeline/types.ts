import { z } from 'zod';

// ============ Core Interfaces ============

export interface DataAdapter {
  key: string;
  metadata: AdapterMetadata;
  disabled?: boolean;
  disabledReason?: string;
  fetch(query: string, options?: FetchOptions): Promise<DataResult[]>;
  testConnection?(config?: Record<string, any>): Promise<{ ok: boolean; error?: string }>;
}

export interface AdapterMetadata {
  name: string;
  icon: string;
  category: 'search' | 'social' | 'research' | 'government' | 'mcp' | 'feed' | 'activity' | 'custom' | 'review' | 'news' | 'competitor' | 'jobs';
  description: string;
  rateLimit: { requests: number; windowMs: number };
  capabilities: { searchable: boolean; streamable: boolean; realtime: boolean };
  requiresConfig: boolean;
}

export interface DataResult {
  sourceKey: string;
  sourceUrl: string;
  sourceName: string;
  title: string;
  content: string;
  contentType: 'article' | 'post' | 'paper' | 'dataset' | 'review' | 'statistic';
  publishedAt?: Date;
  fetchedAt: Date;
  metadata: Record<string, any>;
  relevanceHint?: number;

  // Freshness + quality metadata (Sprint Intelligence)
  scrapedAt?: Date;
  freshnessScore?: number;  // 0-1: how recent this data point is
  sourceQuality?: number;   // 0-1: authority of the source
  compositeScore?: number;  // 0-1: combined relevance x freshness x quality

  // Change detection
  isNew?: boolean;
  changeType?: 'new' | 'updated' | 'removed';
}

export interface FetchOptions {
  maxResults?: number;
  config?: Record<string, any>;
  signal?: AbortSignal;
  dateRange?: 'day' | 'week' | 'month' | 'year' | 'any';
}

// ============ Zod Schemas ============

export const DataResultSchema = z.object({
  sourceKey: z.string(),
  sourceUrl: z.string().url(),
  sourceName: z.string(),
  title: z.string(),
  content: z.string(),
  contentType: z.enum(['article', 'post', 'paper', 'dataset', 'review', 'statistic']),
  publishedAt: z.date().optional(),
  fetchedAt: z.date(),
  metadata: z.record(z.any()),
  relevanceHint: z.number().min(0).max(1).optional(),
});

export const FetchOptionsSchema = z.object({
  maxResults: z.number().min(1).max(100).optional().default(10),
  config: z.record(z.any()).optional(),
}).optional();

export type AdapterCategory = AdapterMetadata['category'];

// ============ Resilient Fetch Helper ============

/**
 * Fetch with retry on 429/5xx, timeout, and error logging.
 * Throws on permanent failure so the pipeline can log it.
 */
export async function resilientFetch(
  url: string,
  options: RequestInit & { adapterKey?: string; retries?: number; timeoutMs?: number } = {}
): Promise<Response> {
  const { adapterKey = 'unknown', retries = 2, timeoutMs = 25000, ...fetchOptions } = options;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...fetchOptions,
        signal: fetchOptions.signal ?? controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) return res;

      // Retry on 429 (rate limit) or 5xx (server error)
      if ((res.status === 429 || res.status >= 500) && attempt < retries) {
        const retryAfter = res.headers.get('Retry-After');
        const waitMs = retryAfter ? Math.min(parseInt(retryAfter, 10) * 1000, 10000) : (attempt + 1) * 2000;
        console.warn(`[${adapterKey}] HTTP ${res.status}, retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      // Non-retryable error
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    } catch (error) {
      clearTimeout(timeout);
      if (attempt < retries && error instanceof Error && error.name === 'AbortError') {
        console.warn(`[${adapterKey}] Timeout, retrying (attempt ${attempt + 1}/${retries})`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`[${adapterKey}] All ${retries + 1} attempts failed`);
}
