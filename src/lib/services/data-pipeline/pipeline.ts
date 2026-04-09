import { DataResult, FetchOptions } from './types';
import { registry } from './registry';
import { rateLimiter } from './rate-limiter';
import { resultCache } from './cache';
import { optimizeQuery, extractKeywords, filterByRelevance } from './query-optimizer';

export interface PipelineOptions extends FetchOptions {
  useCache?: boolean;
  cacheTtlMs?: number;
  /** Skip query optimization — use the raw query for every adapter */
  rawQuery?: boolean;
  /** Minimum relevance score (0-1) to keep a result. Set 0 to disable filtering. Default 0.12. */
  relevanceThreshold?: number;
  onAdapterComplete?: (adapterKey: string, results: DataResult[], error?: string) => void;
  onProgress?: (completed: number, total: number) => void;
}

// Configure rate limiter from adapter metadata (runs once)
let rateLimiterConfigured = false;
function ensureRateLimiterConfigured() {
  if (rateLimiterConfigured) return;
  for (const adapter of registry.list()) {
    const rl = adapter.metadata.rateLimit;
    if (rl?.requests && rl?.windowMs) {
      rateLimiter.configure(adapter.key, rl.requests, rl.windowMs);
    }
  }
  rateLimiterConfigured = true;
}

export async function fetchFromSources(
  query: string,
  adapterKeys: string[],
  options: PipelineOptions = {}
): Promise<DataResult[]> {
  ensureRateLimiterConfigured();
  const { useCache = true, cacheTtlMs, rawQuery = false, relevanceThreshold = 0.12, onAdapterComplete, onProgress } = options;
  const allResults: DataResult[] = [];
  let completed = 0;

  // Pre-compute keywords for relevance scoring
  const queryKeywords = extractKeywords(query);

  const tasks = adapterKeys.map(async (key) => {
    const adapter = registry.get(key);
    if (!adapter) {
      console.warn(`Adapter "${key}" not found in registry, skipping.`);
      return;
    }
    if (adapter.disabled) {
      console.warn(`[Pipeline] Adapter "${key}" is disabled: ${adapter.disabledReason || 'no reason given'}`);
      return;
    }

    // Optimize query per adapter (unless rawQuery mode)
    const adapterQuery = rawQuery
      ? query
      : optimizeQuery(query, key, adapter.metadata.category);

    // Check cache (keyed on the optimized query)
    if (useCache) {
      const cacheKey = resultCache.buildKey(key, adapterQuery);
      const cached = resultCache.get<DataResult[]>(cacheKey);
      if (cached) {
        allResults.push(...cached);
        completed++;
        onAdapterComplete?.(key, cached);
        onProgress?.(completed, adapterKeys.length);
        return;
      }
    }

    try {
      // Rate limit
      await rateLimiter.acquire(key);

      // Fetch with timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const results = await adapter.fetch(adapterQuery, {
        maxResults: options.maxResults ?? 10,
        config: options.config,
        signal: options.signal ?? controller.signal,
      });

      clearTimeout(timeout);

      console.log(`[Pipeline] Adapter "${key}": fetched ${results.length} results for "${adapterQuery}"`);

      // Cache results (keyed on the optimized query)
      if (useCache && results.length > 0) {
        resultCache.set(resultCache.buildKey(key, adapterQuery), results, cacheTtlMs);
      }

      allResults.push(...results);
      onAdapterComplete?.(key, results);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Pipeline] Adapter "${key}" failed for query "${adapterQuery}":`, errorMsg);
      onAdapterComplete?.(key, [], errorMsg);
    } finally {
      completed++;
      onProgress?.(completed, adapterKeys.length);
    }
  });

  await Promise.allSettled(tasks);

  // Apply relevance filtering + sorting
  if (relevanceThreshold > 0 && queryKeywords.length > 0) {
    const filtered = filterByRelevance(allResults, queryKeywords, relevanceThreshold);
    console.log(`[Pipeline] Relevance filter: ${allResults.length} → ${filtered.length} results (threshold ${relevanceThreshold})`);
    return filtered;
  }

  // Fallback: sort by relevance hint then recency
  return allResults.sort((a, b) => {
    if (a.relevanceHint !== undefined && b.relevanceHint !== undefined) {
      return b.relevanceHint - a.relevanceHint;
    }
    return b.fetchedAt.getTime() - a.fetchedAt.getTime();
  });
}
