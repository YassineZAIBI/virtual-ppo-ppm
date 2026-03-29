import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataResultSchema, FetchOptionsSchema } from '@/lib/services/data-pipeline/types';
import type { DataAdapter, DataResult, AdapterMetadata } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { rateLimiter } from '@/lib/services/data-pipeline/rate-limiter';
import { resultCache } from '@/lib/services/data-pipeline/cache';
import { fetchFromSources } from '@/lib/services/data-pipeline/pipeline';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeMetadata(overrides: Partial<AdapterMetadata> = {}): AdapterMetadata {
  return {
    name: 'Test Adapter',
    icon: '🔍',
    category: 'search',
    description: 'A test adapter',
    rateLimit: { requests: 10, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
    ...overrides,
  };
}

function makeAdapter(key: string, overrides: Partial<DataAdapter> = {}): DataAdapter {
  return {
    key,
    metadata: makeMetadata(),
    fetch: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

function makeDataResult(overrides: Partial<DataResult> = {}): DataResult {
  return {
    sourceKey: 'test',
    sourceUrl: 'https://example.com',
    sourceName: 'Test',
    title: 'Test Result',
    content: 'Some content',
    contentType: 'article',
    fetchedAt: new Date(),
    metadata: {},
    ...overrides,
  };
}

// ──────────────────────────────────────────────
// Registry Tests
// ──────────────────────────────────────────────

describe('DataAdapterRegistry', () => {
  // The registry is a singleton – clear it between tests by re-registering.
  // Since the class doesn't expose a clear(), we work around by tracking keys.
  const registeredKeys: string[] = [];

  beforeEach(() => {
    // We cannot truly reset the singleton, but we can overwrite entries per test.
  });

  it('registers an adapter and retrieves it by key', () => {
    const adapter = makeAdapter('reg-get');
    registry.register(adapter);
    registeredKeys.push('reg-get');

    const retrieved = registry.get('reg-get');
    expect(retrieved).toBeDefined();
    expect(retrieved!.key).toBe('reg-get');
    expect(retrieved!.metadata.name).toBe('Test Adapter');
  });

  it('has() returns true for registered and false for unregistered keys', () => {
    const adapter = makeAdapter('reg-has');
    registry.register(adapter);
    registeredKeys.push('reg-has');

    expect(registry.has('reg-has')).toBe(true);
    expect(registry.has('nonexistent-key')).toBe(false);
  });

  it('list() returns all registered adapters', () => {
    const a1 = makeAdapter('reg-list-1');
    const a2 = makeAdapter('reg-list-2');
    registry.register(a1);
    registry.register(a2);

    const all = registry.list();
    const keys = all.map(a => a.key);
    expect(keys).toContain('reg-list-1');
    expect(keys).toContain('reg-list-2');
  });

  it('listByCategory() filters adapters by category', () => {
    const searchAdapter = makeAdapter('cat-search', {
      metadata: makeMetadata({ category: 'search' }),
    });
    const socialAdapter = makeAdapter('cat-social', {
      metadata: makeMetadata({ category: 'social' }),
    });
    registry.register(searchAdapter);
    registry.register(socialAdapter);

    const searchResults = registry.listByCategory('search');
    const socialResults = registry.listByCategory('social');

    expect(searchResults.some(a => a.key === 'cat-search')).toBe(true);
    expect(searchResults.some(a => a.key === 'cat-social')).toBe(false);
    expect(socialResults.some(a => a.key === 'cat-social')).toBe(true);
  });

  it('keys() returns all registered keys', () => {
    const adapter = makeAdapter('reg-keys-unique');
    registry.register(adapter);

    const keys = registry.keys();
    expect(keys).toContain('reg-keys-unique');
    expect(Array.isArray(keys)).toBe(true);
  });

  it('overwrites a previously registered adapter and warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const first = makeAdapter('reg-overwrite', {
      metadata: makeMetadata({ name: 'First' }),
    });
    const second = makeAdapter('reg-overwrite', {
      metadata: makeMetadata({ name: 'Second' }),
    });

    registry.register(first);
    registry.register(second);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('already registered'),
    );

    const retrieved = registry.get('reg-overwrite');
    expect(retrieved!.metadata.name).toBe('Second');

    warnSpy.mockRestore();
  });
});

// ──────────────────────────────────────────────
// Rate Limiter Tests
// ──────────────────────────────────────────────

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('acquire() resolves immediately when tokens are available', async () => {
    rateLimiter.configure('rl-fast', 5, 60_000);

    // Should resolve without waiting
    const start = Date.now();
    await rateLimiter.acquire('rl-fast');
    const elapsed = Date.now() - start;

    expect(elapsed).toBe(0);
  });

  it('acquire() resolves immediately when no limit is configured for the key', async () => {
    // A key with no bucket configured should pass through instantly
    await expect(rateLimiter.acquire('unconfigured-key')).resolves.toBeUndefined();
  });

  it('multiple rapid acquire() calls exhaust tokens', async () => {
    rateLimiter.configure('rl-exhaust', 2, 10_000);

    // First two should pass immediately
    await rateLimiter.acquire('rl-exhaust');
    await rateLimiter.acquire('rl-exhaust');

    // Third call: tokens exhausted, acquire should trigger a setTimeout wait
    const acquirePromise = rateLimiter.acquire('rl-exhaust');

    // Advance timers so the setTimeout inside acquire() resolves
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(acquirePromise).resolves.toBeUndefined();
  });

  it('tokens refill after the window passes', async () => {
    rateLimiter.configure('rl-refill', 1, 1_000);

    await rateLimiter.acquire('rl-refill');

    // Advance time past the full window so tokens refill
    vi.advanceTimersByTime(1_100);

    // Now a new acquire should resolve immediately
    const start = Date.now();
    await rateLimiter.acquire('rl-refill');
    const elapsed = Date.now() - start;

    expect(elapsed).toBe(0);
  });
});

// ──────────────────────────────────────────────
// Cache Tests
// ──────────────────────────────────────────────

describe('ResultCache', () => {
  beforeEach(() => {
    resultCache.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('set/get stores and retrieves data', () => {
    const data = [makeDataResult()];
    resultCache.set('cache-key-1', data);

    const retrieved = resultCache.get<DataResult[]>('cache-key-1');
    expect(retrieved).toEqual(data);
  });

  it('get returns null for missing keys', () => {
    const result = resultCache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('buildKey creates consistent, normalized keys', () => {
    const key1 = resultCache.buildKey('adapter-a', '  Hello World  ');
    const key2 = resultCache.buildKey('adapter-a', 'hello world');

    expect(key1).toBe(key2);
    expect(key1).toBe('adapter-a:hello world');
  });

  it('expired entries return null after TTL', () => {
    vi.useFakeTimers();

    resultCache.set('ttl-test', { value: 42 }, 1_000); // 1 second TTL

    // Before expiration
    expect(resultCache.get('ttl-test')).toEqual({ value: 42 });

    // Advance past TTL
    vi.advanceTimersByTime(1_500);

    expect(resultCache.get('ttl-test')).toBeNull();
  });

  it('has() returns true for valid entries and false for expired/missing', () => {
    vi.useFakeTimers();

    resultCache.set('has-test', 'data', 1_000);
    expect(resultCache.has('has-test')).toBe(true);

    vi.advanceTimersByTime(2_000);
    expect(resultCache.has('has-test')).toBe(false);

    expect(resultCache.has('missing')).toBe(false);
  });
});

// ──────────────────────────────────────────────
// Zod Schema Tests
// ──────────────────────────────────────────────

describe('DataResultSchema (Zod)', () => {
  it('validates a correct DataResult', () => {
    const valid = {
      sourceKey: 'test',
      sourceUrl: 'https://example.com/article',
      sourceName: 'Test Source',
      title: 'Title',
      content: 'Content body',
      contentType: 'article',
      fetchedAt: new Date(),
      metadata: {},
      relevanceHint: 0.85,
    };

    const result = DataResultSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('accepts all valid contentType values', () => {
    const types = ['article', 'post', 'paper', 'dataset', 'review', 'statistic'] as const;

    for (const contentType of types) {
      const result = DataResultSchema.safeParse({
        sourceKey: 'k',
        sourceUrl: 'https://example.com',
        sourceName: 'S',
        title: 'T',
        content: 'C',
        contentType,
        fetchedAt: new Date(),
        metadata: {},
      });
      expect(result.success).toBe(true);
    }
  });

  it('fails when required fields are missing', () => {
    const incomplete = {
      sourceKey: 'test',
      // sourceUrl missing
      // sourceName missing
      title: 'Title',
      content: 'Content',
      contentType: 'article',
      fetchedAt: new Date(),
      metadata: {},
    };

    const result = DataResultSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('fails for invalid contentType', () => {
    const invalid = {
      sourceKey: 'test',
      sourceUrl: 'https://example.com',
      sourceName: 'Source',
      title: 'Title',
      content: 'Content',
      contentType: 'video', // not in enum
      fetchedAt: new Date(),
      metadata: {},
    };

    const result = DataResultSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('fails when relevanceHint is out of 0-1 range', () => {
    const base = {
      sourceKey: 'test',
      sourceUrl: 'https://example.com',
      sourceName: 'Source',
      title: 'Title',
      content: 'Content',
      contentType: 'article',
      fetchedAt: new Date(),
      metadata: {},
    };

    const tooHigh = DataResultSchema.safeParse({ ...base, relevanceHint: 1.5 });
    expect(tooHigh.success).toBe(false);

    const tooLow = DataResultSchema.safeParse({ ...base, relevanceHint: -0.1 });
    expect(tooLow.success).toBe(false);

    // Boundary values should pass
    const atZero = DataResultSchema.safeParse({ ...base, relevanceHint: 0 });
    expect(atZero.success).toBe(true);

    const atOne = DataResultSchema.safeParse({ ...base, relevanceHint: 1 });
    expect(atOne.success).toBe(true);
  });

  it('fails for invalid sourceUrl (not a URL)', () => {
    const invalid = {
      sourceKey: 'test',
      sourceUrl: 'not-a-url',
      sourceName: 'Source',
      title: 'Title',
      content: 'Content',
      contentType: 'article',
      fetchedAt: new Date(),
      metadata: {},
    };

    const result = DataResultSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('FetchOptionsSchema (Zod)', () => {
  it('validates valid options', () => {
    const result = FetchOptionsSchema.safeParse({ maxResults: 20 });
    expect(result.success).toBe(true);
  });

  it('applies default maxResults of 10', () => {
    const result = FetchOptionsSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data!.maxResults).toBe(10);
    }
  });

  it('accepts undefined (the whole schema is optional)', () => {
    const result = FetchOptionsSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it('fails when maxResults is out of range', () => {
    const tooLow = FetchOptionsSchema.safeParse({ maxResults: 0 });
    expect(tooLow.success).toBe(false);

    const tooHigh = FetchOptionsSchema.safeParse({ maxResults: 101 });
    expect(tooHigh.success).toBe(false);
  });
});

// ──────────────────────────────────────────────
// Pipeline (fetchFromSources) Tests
// ──────────────────────────────────────────────

describe('fetchFromSources', () => {
  beforeEach(() => {
    resultCache.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns merged results from multiple mock adapters', async () => {
    const result1 = makeDataResult({ sourceKey: 'a1', title: 'Result A', relevanceHint: 0.9 });
    const result2 = makeDataResult({ sourceKey: 'a2', title: 'Result B', relevanceHint: 0.7 });

    const adapter1 = makeAdapter('pipe-a1', {
      fetch: vi.fn().mockResolvedValue([result1]),
    });
    const adapter2 = makeAdapter('pipe-a2', {
      fetch: vi.fn().mockResolvedValue([result2]),
    });

    registry.register(adapter1);
    registry.register(adapter2);

    const results = await fetchFromSources('test query', ['pipe-a1', 'pipe-a2'], {
      useCache: false,
      rawQuery: true,
      relevanceThreshold: 0,
    });

    expect(results).toHaveLength(2);
    // Sorted by relevanceHint descending
    expect(results[0].title).toBe('Result A');
    expect(results[1].title).toBe('Result B');
  });

  it('failed adapters do not break the pipeline (Promise.allSettled)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const goodResult = makeDataResult({ sourceKey: 'good', title: 'Good' });
    const goodAdapter = makeAdapter('pipe-good', {
      fetch: vi.fn().mockResolvedValue([goodResult]),
    });
    const badAdapter = makeAdapter('pipe-bad', {
      fetch: vi.fn().mockRejectedValue(new Error('Network failure')),
    });

    registry.register(goodAdapter);
    registry.register(badAdapter);

    const results = await fetchFromSources('test', ['pipe-good', 'pipe-bad'], {
      useCache: false,
      rawQuery: true,
      relevanceThreshold: 0,
    });

    // Good adapter's results should still be present
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Good');

    // Error should have been logged
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('pipe-bad'),
      expect.stringContaining('Network failure'),
    );

    errorSpy.mockRestore();
  });

  it('calls onProgress callback with correct counts', async () => {
    const adapter1 = makeAdapter('pipe-prog-1', {
      fetch: vi.fn().mockResolvedValue([makeDataResult()]),
    });
    const adapter2 = makeAdapter('pipe-prog-2', {
      fetch: vi.fn().mockResolvedValue([makeDataResult()]),
    });

    registry.register(adapter1);
    registry.register(adapter2);

    const onProgress = vi.fn();

    await fetchFromSources('test', ['pipe-prog-1', 'pipe-prog-2'], {
      useCache: false,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
    // Should have been called with (completed, total) where total=2
    const calls = onProgress.mock.calls;
    expect(calls.some(([completed, total]: [number, number]) => total === 2)).toBe(true);
    // Final call should show all completed
    expect(calls[calls.length - 1][0]).toBe(2);
    expect(calls[calls.length - 1][1]).toBe(2);
  });

  it('uses cache when useCache=true and data is cached', async () => {
    const cachedResults = [makeDataResult({ sourceKey: 'cached-src', title: 'Cached' })];
    const cacheKey = resultCache.buildKey('pipe-cached', 'query');
    resultCache.set(cacheKey, cachedResults);

    const adapter = makeAdapter('pipe-cached', {
      fetch: vi.fn().mockResolvedValue([makeDataResult({ title: 'Fresh' })]),
    });
    registry.register(adapter);

    const results = await fetchFromSources('query', ['pipe-cached'], {
      useCache: true,
      rawQuery: true,
      relevanceThreshold: 0,
    });

    // Should return cached data, not call fetch
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Cached');
    expect(adapter.fetch).not.toHaveBeenCalled();
  });

  it('calls adapter.fetch when useCache=false even if cache has data', async () => {
    const cacheKey = resultCache.buildKey('pipe-nocache', 'query');
    resultCache.set(cacheKey, [makeDataResult({ title: 'Stale' })]);

    const freshResult = makeDataResult({ sourceKey: 'pipe-nocache', title: 'Fresh' });
    const adapter = makeAdapter('pipe-nocache', {
      fetch: vi.fn().mockResolvedValue([freshResult]),
    });
    registry.register(adapter);

    const results = await fetchFromSources('query', ['pipe-nocache'], {
      useCache: false,
      rawQuery: true,
      relevanceThreshold: 0,
    });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Fresh');
    expect(adapter.fetch).toHaveBeenCalled();
  });

  it('skips unknown adapter keys with a console warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const results = await fetchFromSources('test', ['nonexistent-adapter'], {
      useCache: false,
    });

    expect(results).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent-adapter'),
    );

    warnSpy.mockRestore();
  });

  it('calls onAdapterComplete for each adapter', async () => {
    const adapter = makeAdapter('pipe-complete-cb', {
      fetch: vi.fn().mockResolvedValue([makeDataResult()]),
    });
    registry.register(adapter);

    const onAdapterComplete = vi.fn();

    await fetchFromSources('test', ['pipe-complete-cb'], {
      useCache: false,
      onAdapterComplete,
    });

    expect(onAdapterComplete).toHaveBeenCalledWith(
      'pipe-complete-cb',
      expect.any(Array),
    );
  });

  it('calls onAdapterComplete with error string when adapter fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const adapter = makeAdapter('pipe-err-cb', {
      fetch: vi.fn().mockRejectedValue(new Error('Timeout')),
    });
    registry.register(adapter);

    const onAdapterComplete = vi.fn();

    await fetchFromSources('test', ['pipe-err-cb'], {
      useCache: false,
      onAdapterComplete,
    });

    expect(onAdapterComplete).toHaveBeenCalledWith(
      'pipe-err-cb',
      [],
      'Timeout',
    );
  });

  it('sorts results by relevanceHint descending when both have hints', async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 10_000);

    const r1 = makeDataResult({ sourceKey: 'sort', title: 'Low', relevanceHint: 0.3, fetchedAt: now });
    const r2 = makeDataResult({ sourceKey: 'sort', title: 'High', relevanceHint: 0.9, fetchedAt: earlier });

    const adapter = makeAdapter('pipe-sort-hint', {
      fetch: vi.fn().mockResolvedValue([r1, r2]),
    });
    registry.register(adapter);

    const results = await fetchFromSources('test', ['pipe-sort-hint'], { useCache: false, rawQuery: true, relevanceThreshold: 0 });

    // r2 (0.9) should come before r1 (0.3) despite being older
    expect(results[0].title).toBe('High');
    expect(results[1].title).toBe('Low');
  });

  it('sorts results by fetchedAt descending when no relevanceHint', async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 10_000);

    const r1 = makeDataResult({ sourceKey: 'sort', title: 'Old', fetchedAt: earlier });
    const r2 = makeDataResult({ sourceKey: 'sort', title: 'New', fetchedAt: now });

    const adapter = makeAdapter('pipe-sort-date', {
      fetch: vi.fn().mockResolvedValue([r1, r2]),
    });
    registry.register(adapter);

    const results = await fetchFromSources('test', ['pipe-sort-date'], { useCache: false, rawQuery: true, relevanceThreshold: 0 });

    // Newer fetchedAt should come first
    expect(results[0].title).toBe('New');
    expect(results[1].title).toBe('Old');
  });
});
