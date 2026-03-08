import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — must be declared before any imports that trigger side-effects
// ---------------------------------------------------------------------------

// Mock @/lib/db used by market-research and job-queue
vi.mock('@/lib/db', () => {
  const mockDb = {
    marketResearch: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    dataPoint: {
      create: vi.fn().mockResolvedValue({}),
    },
    contentVersion: {
      create: vi.fn().mockResolvedValue({}),
    },
    dataJob: {
      create: vi.fn().mockResolvedValue({ id: 'job-1' }),
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue({ id: 'job-1' }),
    },
  };
  return { db: mockDb };
});

// Mock the pipeline module used by market-research
vi.mock('@/lib/services/data-pipeline/pipeline', () => ({
  fetchFromSources: vi.fn().mockResolvedValue([]),
}));

// Mock the LLM service used by market-research
vi.mock('@/lib/services/llm', () => {
  const mockChat = vi.fn().mockResolvedValue('# Mock Report');
  return {
    LLMService: {
      create: vi.fn().mockReturnValue({ chat: mockChat }),
    },
    __mockChat: mockChat,
  };
});

// Mock rate-limiter and cache so adapter imports don't break
vi.mock('@/lib/services/data-pipeline/rate-limiter', () => ({
  rateLimiter: { acquire: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/lib/services/data-pipeline/cache', () => ({
  resultCache: {
    buildKey: vi.fn((...args: string[]) => args.join(':')),
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { registry } from '@/lib/services/data-pipeline/adapters';
import { db } from '@/lib/db';
import { fetchFromSources } from '@/lib/services/data-pipeline/pipeline';
import { LLMService } from '@/lib/services/llm';
import {
  gatherMarketData,
  synthesizeReport,
  formatDataPointForDisplay,
} from '@/lib/services/market-research';
import {
  createJob,
  startJob,
  updateJobProgress,
  completeJob,
  failJob,
  getJob,
} from '@/lib/services/data-pipeline/job-queue';

// ============================================================================
// Part 1: Adapter Registration Tests
// ============================================================================

const ADAPTER_KEYS = [
  'duckduckgo',
  'hackernews',
  'reddit',
  'wikipedia',
  'arxiv',
  'semantic-scholar',
  'crossref',
  'openalex',
  'worldbank',
  'bls',
] as const;

describe('Part 1 — Adapter Registration', () => {
  it('has all 10 adapters registered', () => {
    for (const key of ADAPTER_KEYS) {
      expect(registry.has(key), `"${key}" should be registered`).toBe(true);
    }
    expect(registry.keys().length).toBeGreaterThanOrEqual(ADAPTER_KEYS.length);
  });

  describe.each(ADAPTER_KEYS)('adapter "%s"', (key) => {
    it('is present in the registry', () => {
      expect(registry.has(key)).toBe(true);
    });

    it('has metadata with all required fields', () => {
      const adapter = registry.get(key)!;
      const meta = adapter.metadata;

      expect(meta).toBeDefined();
      expect(typeof meta.name).toBe('string');
      expect(meta.name.length).toBeGreaterThan(0);
      expect(typeof meta.icon).toBe('string');
      expect(meta.icon.length).toBeGreaterThan(0);
      expect(typeof meta.category).toBe('string');
      expect(
        ['search', 'social', 'research', 'government', 'mcp', 'feed', 'activity', 'custom']
      ).toContain(meta.category);
      expect(typeof meta.description).toBe('string');
      expect(meta.description.length).toBeGreaterThan(0);
    });

    it('has rateLimit with positive requests and windowMs', () => {
      const { rateLimit } = registry.get(key)!.metadata;
      expect(typeof rateLimit.requests).toBe('number');
      expect(rateLimit.requests).toBeGreaterThan(0);
      expect(typeof rateLimit.windowMs).toBe('number');
      expect(rateLimit.windowMs).toBeGreaterThan(0);
    });

    it('has capabilities with boolean flags', () => {
      const { capabilities } = registry.get(key)!.metadata;
      expect(typeof capabilities.searchable).toBe('boolean');
      expect(typeof capabilities.streamable).toBe('boolean');
      expect(typeof capabilities.realtime).toBe('boolean');
    });

    it('has a fetch function', () => {
      const adapter = registry.get(key)!;
      expect(typeof adapter.fetch).toBe('function');
    });
  });
});

// ============================================================================
// Part 2: Adapter Fetch Tests (mocked global fetch)
// ============================================================================

describe('Part 2 — Adapter Fetch (mocked network)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ---------- Hacker News ----------
  describe('hackernews adapter', () => {
    it('returns DataResult[] with correct structure', async () => {
      const hnResponse = {
        hits: [
          {
            title: 'Test HN Post',
            url: 'https://example.com',
            points: 100,
            num_comments: 50,
            author: 'testuser',
            created_at: '2023-11-14T22:13:20.000Z',
            objectID: '123',
            story_text: null,
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(hnResponse),
      }) as any;

      const adapter = registry.get('hackernews')!;
      const results = await adapter.fetch('test query');

      expect(results).toHaveLength(1);
      const r = results[0];

      expect(r.sourceKey).toBe('hackernews');
      expect(r.sourceName).toBe('Hacker News');
      expect(r.contentType).toBe('post');
      expect(r.title).toBe('Test HN Post');
      expect(r.sourceUrl).toBe('https://example.com');
      expect(r.fetchedAt).toBeInstanceOf(Date);
      expect(r.metadata).toBeDefined();
      expect(r.metadata.hnId).toBe('123');
      expect(r.metadata.points).toBe(100);
      expect(r.metadata.numComments).toBe(50);
      expect(r.metadata.author).toBe('testuser');
      expect(r.metadata.rank).toBe(1);
    });

    it('falls back to HN item URL when hit has no external URL', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            hits: [
              {
                title: 'Ask HN',
                url: null,
                points: 10,
                num_comments: 5,
                author: 'u',
                created_at: '2023-01-01T00:00:00.000Z',
                objectID: '999',
              },
            ],
          }),
      }) as any;

      const results = await registry.get('hackernews')!.fetch('test');
      expect(results[0].sourceUrl).toBe('https://news.ycombinator.com/item?id=999');
    });

    it('returns empty array on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network fail')) as any;
      const results = await registry.get('hackernews')!.fetch('test');
      expect(results).toEqual([]);
    });
  });

  // ---------- Wikipedia ----------
  describe('wikipedia adapter', () => {
    it('returns DataResult[] with correct structure', async () => {
      const wikiResponse = {
        query: {
          search: [
            {
              title: 'Test Page',
              snippet: '<span class="highlight">Test</span> content here',
              pageid: 12345,
              size: 5000,
              wordcount: 800,
              timestamp: '2023-06-15T10:00:00Z',
            },
          ],
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(wikiResponse),
      }) as any;

      const adapter = registry.get('wikipedia')!;
      const results = await adapter.fetch('test query');

      expect(results).toHaveLength(1);
      const r = results[0];

      expect(r.sourceKey).toBe('wikipedia');
      expect(r.sourceName).toBe('Wikipedia');
      expect(r.contentType).toBe('article');
      expect(r.title).toBe('Test Page');
      // HTML tags should be stripped from snippet
      expect(r.content).not.toContain('<span');
      expect(r.content).toContain('Test');
      expect(r.sourceUrl).toContain('en.wikipedia.org/wiki/Test_Page');
      expect(r.fetchedAt).toBeInstanceOf(Date);
      expect(r.metadata).toBeDefined();
      expect(r.metadata.pageId).toBe(12345);
      expect(r.metadata.wordcount).toBe(800);
      expect(r.metadata.size).toBe(5000);
      expect(r.metadata.rank).toBe(1);
    });

    it('returns empty array when response is not ok', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
      const results = await registry.get('wikipedia')!.fetch('test');
      expect(results).toEqual([]);
    });
  });

  // ---------- Reddit ----------
  describe('reddit adapter', () => {
    it('returns DataResult[] with correct structure', async () => {
      const redditResponse = {
        data: {
          children: [
            {
              data: {
                id: 'abc',
                title: 'Test Post',
                url: 'https://reddit.com/r/test/123',
                selftext: 'Content here',
                score: 200,
                num_comments: 30,
                subreddit: 'test',
                author: 'user1',
                created_utc: 1700000000,
                permalink: '/r/test/comments/123/test',
                is_self: true,
              },
            },
          ],
        },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(redditResponse),
      }) as any;

      const adapter = registry.get('reddit')!;
      const results = await adapter.fetch('test query');

      expect(results).toHaveLength(1);
      const r = results[0];

      expect(r.sourceKey).toBe('reddit');
      expect(r.sourceName).toBe('r/test');
      expect(r.contentType).toBe('post');
      expect(r.title).toBe('Test Post');
      expect(r.content).toBe('Content here');
      expect(r.sourceUrl).toBe('https://www.reddit.com/r/test/comments/123/test');
      expect(r.fetchedAt).toBeInstanceOf(Date);
      expect(r.publishedAt).toBeInstanceOf(Date);
      expect(r.metadata).toBeDefined();
      expect(r.metadata.subreddit).toBe('test');
      expect(r.metadata.score).toBe(200);
      expect(r.metadata.numComments).toBe(30);
      expect(r.metadata.author).toBe('user1');
      expect(r.metadata.isSelf).toBe(true);
      expect(r.metadata.rank).toBe(1);
    });

    it('uses title as content when selftext is empty', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              children: [
                {
                  data: {
                    id: 'x',
                    title: 'Link Post',
                    url: 'https://ext.com',
                    selftext: '',
                    score: 5,
                    num_comments: 1,
                    subreddit: 'news',
                    author: 'u2',
                    created_utc: 1700000000,
                    permalink: '/r/news/comments/x/link',
                    is_self: false,
                  },
                },
              ],
            },
          }),
      }) as any;

      const results = await registry.get('reddit')!.fetch('test');
      expect(results[0].content).toBe('Link Post');
    });

    it('returns empty array on fetch failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('timeout')) as any;
      const results = await registry.get('reddit')!.fetch('fail');
      expect(results).toEqual([]);
    });
  });
});

// ============================================================================
// Part 3: Market Research Service Tests
// ============================================================================

describe('Part 3 — Market Research Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------- gatherMarketData ----------
  describe('gatherMarketData', () => {
    it('updates status to "gathering", fetches data, creates DataPoints, then "completed"', async () => {
      const mockResults = [
        {
          sourceKey: 'hackernews',
          sourceUrl: 'https://example.com',
          sourceName: 'Hacker News',
          title: 'Test',
          content: 'content',
          contentType: 'post' as const,
          fetchedAt: new Date(),
          metadata: { points: 10 },
        },
      ];
      vi.mocked(fetchFromSources).mockResolvedValueOnce(mockResults);

      await gatherMarketData('res-1', 'AI trends', ['hackernews']);

      // First call: status -> gathering
      expect(db.marketResearch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'res-1' },
          data: { status: 'gathering' },
        })
      );

      // fetchFromSources called with correct args
      expect(fetchFromSources).toHaveBeenCalledWith('AI trends', ['hackernews'], {
        maxResults: 10,
        useCache: true,
        onProgress: undefined,
      });

      // DataPoint created for each result
      expect(db.dataPoint.create).toHaveBeenCalledTimes(1);
      expect(db.dataPoint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            researchId: 'res-1',
            adapterKey: 'hackernews',
            title: 'Test',
          }),
        })
      );

      // Final status -> completed
      expect(db.marketResearch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'res-1' },
          data: expect.objectContaining({ status: 'completed' }),
        })
      );
    });

    it('updates status to "failed" on error and re-throws', async () => {
      vi.mocked(fetchFromSources).mockRejectedValueOnce(new Error('API down'));

      await expect(
        gatherMarketData('res-2', 'query', ['hackernews'])
      ).rejects.toThrow('API down');

      expect(db.marketResearch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'res-2' },
          data: { status: 'failed' },
        })
      );
    });
  });

  // ---------- synthesizeReport ----------
  describe('synthesizeReport', () => {
    const llmConfig = {
      provider: 'openai' as const,
      apiKey: 'sk-test',
      model: 'gpt-4',
    };

    it('loads data points, calls LLM, stores report and ContentVersion', async () => {
      const mockResearch = {
        id: 'res-1',
        query: 'AI trends',
        userId: 'user-1',
        dataPoints: [
          {
            id: 'dp-1',
            sourceName: 'Hacker News',
            sourceUrl: 'https://example.com',
            title: 'AI Post',
            rawContent: 'Some content about AI',
            contentType: 'post',
            adapterKey: 'hackernews',
            fetchedAt: new Date(),
            metadata: '{"points":100}',
          },
        ],
      };
      vi.mocked(db.marketResearch.findUnique).mockResolvedValueOnce(mockResearch as any);

      // Access the mock chat fn through the mocked module
      const llmModule = await import('@/lib/services/llm');
      const mockLLM = { chat: vi.fn().mockResolvedValue('# Generated Report') };
      vi.mocked(LLMService.create).mockReturnValueOnce(mockLLM as any);

      const report = await synthesizeReport('res-1', llmConfig);

      expect(report).toBe('# Generated Report');

      // Status set to synthesizing first
      expect(db.marketResearch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'res-1' },
          data: { status: 'synthesizing' },
        })
      );

      // Report stored
      expect(db.marketResearch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'res-1' },
          data: expect.objectContaining({
            synthesizedReport: '# Generated Report',
            status: 'completed',
          }),
        })
      );

      // ContentVersion created
      expect(db.contentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            entityType: 'market_research',
            entityId: 'res-1',
            content: '# Generated Report',
            editedBy: 'ai',
          }),
        })
      );
    });

    it('throws if no data points found', async () => {
      vi.mocked(db.marketResearch.findUnique).mockResolvedValueOnce({
        id: 'res-3',
        query: 'empty',
        userId: 'u',
        dataPoints: [],
      } as any);

      await expect(synthesizeReport('res-3', llmConfig)).rejects.toThrow(
        'No data points found for synthesis'
      );

      // Status set to failed
      expect(db.marketResearch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'res-3' },
          data: { status: 'failed' },
        })
      );
    });

    it('throws if research not found (null)', async () => {
      vi.mocked(db.marketResearch.findUnique).mockResolvedValueOnce(null);

      await expect(synthesizeReport('res-404', llmConfig)).rejects.toThrow(
        'No data points found for synthesis'
      );
    });
  });

  // ---------- formatDataPointForDisplay ----------
  describe('formatDataPointForDisplay', () => {
    it('returns a correct DataResult shape', () => {
      const dp = {
        sourceName: 'Hacker News',
        sourceUrl: 'https://example.com',
        title: 'Test',
        rawContent: 'Some raw content',
        adapterKey: 'hackernews',
        fetchedAt: new Date('2024-01-01T00:00:00Z'),
        metadata: '{"points":42}',
      };

      const result = formatDataPointForDisplay(dp);

      expect(result.sourceKey).toBe('hackernews');
      expect(result.sourceUrl).toBe('https://example.com');
      expect(result.sourceName).toBe('Hacker News');
      expect(result.title).toBe('Test');
      expect(result.content).toBe('Some raw content');
      expect(result.contentType).toBe('article');
      expect(result.fetchedAt).toBeInstanceOf(Date);
      expect(result.metadata).toEqual({ points: 42 });
    });

    it('returns empty object metadata when metadata string is empty', () => {
      const dp = {
        sourceName: 'Source',
        sourceUrl: 'https://x.com',
        title: 'T',
        rawContent: 'c',
        adapterKey: 'k',
        fetchedAt: new Date(),
        metadata: '',
      };

      const result = formatDataPointForDisplay(dp);
      expect(result.metadata).toEqual({});
    });
  });
});

// ============================================================================
// Part 4: Job Queue Tests
// ============================================================================

describe('Part 4 — Job Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createJob', () => {
    it('calls db.dataJob.create with correct data', async () => {
      await createJob({
        userId: 'user-1',
        jobType: 'market-research',
        input: { query: 'AI trends', adapters: ['hackernews'] },
      });

      expect(db.dataJob.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          jobType: 'market-research',
          input: JSON.stringify({ query: 'AI trends', adapters: ['hackernews'] }),
          status: 'pending',
        },
      });
    });
  });

  describe('startJob', () => {
    it('updates status to "running" with startedAt', async () => {
      await startJob('job-1');

      expect(db.dataJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          status: 'running',
          startedAt: expect.any(Date),
        },
      });
    });
  });

  describe('updateJobProgress', () => {
    it('clamps progress to 0-100 range (high value)', async () => {
      await updateJobProgress('job-1', 150);

      expect(db.dataJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { progress: 100 },
      });
    });

    it('clamps progress to 0-100 range (low value)', async () => {
      await updateJobProgress('job-1', -10);

      expect(db.dataJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { progress: 0 },
      });
    });

    it('passes through normal progress values', async () => {
      await updateJobProgress('job-1', 55);

      expect(db.dataJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: { progress: 55 },
      });
    });
  });

  describe('completeJob', () => {
    it('sets status, output, progress=100, completedAt', async () => {
      await completeJob('job-1', { reportId: 'r-1' });

      expect(db.dataJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          status: 'completed',
          output: JSON.stringify({ reportId: 'r-1' }),
          progress: 100,
          completedAt: expect.any(Date),
        },
      });
    });
  });

  describe('failJob', () => {
    it('sets status="failed", error, and completedAt', async () => {
      await failJob('job-1', 'Something went wrong');

      expect(db.dataJob.update).toHaveBeenCalledWith({
        where: { id: 'job-1' },
        data: {
          status: 'failed',
          error: 'Something went wrong',
          completedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getJob', () => {
    it('calls db.dataJob.findUnique with correct id', async () => {
      await getJob('job-42');

      expect(db.dataJob.findUnique).toHaveBeenCalledWith({
        where: { id: 'job-42' },
      });
    });
  });
});
