import { DataResult, FetchOptions } from './types';
import { registry } from './registry';
import { rateLimiter } from './rate-limiter';
import { resultCache } from './cache';

export interface PipelineOptions extends FetchOptions {
  useCache?: boolean;
  cacheTtlMs?: number;
  onAdapterComplete?: (adapterKey: string, results: DataResult[], error?: string) => void;
  onProgress?: (completed: number, total: number) => void;
}

export async function fetchFromSources(
  query: string,
  adapterKeys: string[],
  options: PipelineOptions = {}
): Promise<DataResult[]> {
  const { useCache = true, cacheTtlMs, onAdapterComplete, onProgress } = options;
  const allResults: DataResult[] = [];
  let completed = 0;

  const tasks = adapterKeys.map(async (key) => {
    const adapter = registry.get(key);
    if (!adapter) {
      console.warn(`Adapter "${key}" not found in registry, skipping.`);
      return;
    }

    // Check cache
    if (useCache) {
      const cacheKey = resultCache.buildKey(key, query);
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

      const results = await adapter.fetch(query, {
        maxResults: options.maxResults ?? 10,
        config: options.config,
        signal: options.signal ?? controller.signal,
      });

      clearTimeout(timeout);

      console.log(`[Pipeline] Adapter "${key}": fetched ${results.length} results for "${query}"`);

      // Cache results
      if (useCache && results.length > 0) {
        resultCache.set(resultCache.buildKey(key, query), results, cacheTtlMs);
      }

      allResults.push(...results);
      onAdapterComplete?.(key, results);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Pipeline] Adapter "${key}" failed for query "${query}":`, errorMsg);
      onAdapterComplete?.(key, [], errorMsg);
    } finally {
      completed++;
      onProgress?.(completed, adapterKeys.length);
    }
  });

  await Promise.allSettled(tasks);

  // Sort by relevance hint (highest first), then by fetchedAt (newest first)
  return allResults.sort((a, b) => {
    if (a.relevanceHint !== undefined && b.relevanceHint !== undefined) {
      return b.relevanceHint - a.relevanceHint;
    }
    return b.fetchedAt.getTime() - a.fetchedAt.getTime();
  });
}
