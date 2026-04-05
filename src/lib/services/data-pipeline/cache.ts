interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Adapter-specific TTLs (in ms) — competitor data refreshes faster
const ADAPTER_TTL_MS: Record<string, number> = {
  'competitor-site': 60 * 60 * 1000,        // 1 hour — high-signal, changes matter
  'duckduckgo:competitor': 2 * 60 * 60 * 1000, // 2 hours — competitor search queries
  'default': 5 * 60 * 1000,                  // 5 minutes — general queries
};

class ResultCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTtlMs = ADAPTER_TTL_MS['default'];

  /**
   * Get TTL for a given adapter key.
   * Use "adapterKey:competitor" suffix for competitor-specific queries.
   */
  getTtl(adapterKey: string): number {
    return ADAPTER_TTL_MS[adapterKey] ?? this.defaultTtlMs;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.store.clear();
  }

  /**
   * Build a cache key. Use isCompetitor=true to suffix with ":competitor"
   * so competitor queries get shorter TTL and don't share cache with general queries.
   */
  buildKey(adapterKey: string, query: string, isCompetitor?: boolean): string {
    const suffix = isCompetitor ? ':competitor' : '';
    return `${adapterKey}${suffix}:${query.toLowerCase().trim()}`;
  }
}

export const resultCache = new ResultCache();
