interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class ResultCache {
  private store = new Map<string, CacheEntry<any>>();
  private defaultTtlMs = 5 * 60 * 1000; // 5 minutes

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

  buildKey(adapterKey: string, query: string): string {
    return `${adapterKey}:${query.toLowerCase().trim()}`;
  }
}

export const resultCache = new ResultCache();
