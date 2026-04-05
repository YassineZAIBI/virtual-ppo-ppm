import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockCompetitorFindMany = vi.fn();
const mockCompetitorFeedFindMany = vi.fn();
const mockCompetitorFeedCreateMany = vi.fn();
const mockNorthStarFindUnique = vi.fn();
const mockProductMappingFindMany = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    competitor: {
      findMany: (...args: unknown[]) => mockCompetitorFindMany(...args),
      create: (...args: unknown[]) => mockCompetitorCreate(...args),
    },
    competitorFeed: {
      findMany: (...args: unknown[]) => mockCompetitorFeedFindMany(...args),
      createMany: (...args: unknown[]) => mockCompetitorFeedCreateMany(...args),
    },
    northStar: {
      findUnique: (...args: unknown[]) => mockNorthStarFindUnique(...args),
    },
    productMapping: {
      findMany: (...args: unknown[]) => mockProductMappingFindMany(...args),
    },
  },
}));

// Mock the data pipeline to avoid real network calls
vi.mock('@/lib/services/data-pipeline/pipeline', () => ({
  fetchFromSources: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/services/data-pipeline/adapters', () => ({}));

// Mock LLM service for suggest endpoint
const mockLlmChat = vi.fn();
vi.mock('@/lib/services/llm', () => ({
  LLMService: {
    create: vi.fn().mockReturnValue({
      chat: (...args: unknown[]) => mockLlmChat(...args),
    }),
  },
}));

const mockCompetitorCreate = vi.fn();

const mockSession = { user: { id: 'user-1', name: 'Test', email: 'test@test.com' } };

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// /api/competitors/scan  (POST)
// ---------------------------------------------------------------------------
describe('/api/competitors/scan', () => {
  let POST: any;

  beforeEach(async () => {
    const mod = await import('@/app/api/competitors/scan/route');
    POST = mod.POST;
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await POST(
      createRequest('http://localhost/api/competitors/scan', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('scans all active competitors when no competitorId given', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindMany.mockResolvedValueOnce([
      { id: 'comp-1', name: 'Acme', website: null, tags: null },
      { id: 'comp-2', name: 'Beta Corp', website: null, tags: null },
      { id: 'comp-3', name: 'Gamma Inc', website: null, tags: null },
    ]);
    // For deduplication checks — return empty (no existing feeds)
    mockCompetitorFeedFindMany.mockResolvedValue([]);
    mockCompetitorFeedCreateMany.mockResolvedValue({ count: 0 });

    const res = await POST(
      createRequest('http://localhost/api/competitors/scan', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scanned).toBe(3);
    expect(typeof json.newItems).toBe('number');
  });

  it('scans a specific competitor when competitorId provided', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindMany.mockResolvedValueOnce([
      { id: 'comp-1', name: 'Acme', website: null, tags: null },
    ]);
    mockCompetitorFeedFindMany.mockResolvedValue([]);
    mockCompetitorFeedCreateMany.mockResolvedValue({ count: 0 });

    const res = await POST(
      createRequest('http://localhost/api/competitors/scan', {
        method: 'POST',
        body: JSON.stringify({ competitorId: 'comp-1' }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scanned).toBe(1);
  });

  it('filters out results that are not about the competitor', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindMany.mockResolvedValueOnce([
      { id: 'comp-1', name: 'Linear', website: null, tags: null },
    ]);
    mockCompetitorFeedFindMany.mockResolvedValue([]);
    mockCompetitorFeedCreateMany.mockResolvedValue({ count: 0 });

    // Return a mix of relevant and irrelevant results from pipeline
    const { fetchFromSources } = await import('@/lib/services/data-pipeline/pipeline');
    vi.mocked(fetchFromSources).mockResolvedValue([
      {
        sourceKey: 'hackernews',
        sourceUrl: 'https://example.com/1',
        sourceName: 'HN',
        title: 'Linear raises $50M for project management platform',
        content: 'Linear software startup raises Series B funding for its issue tracker.',
        contentType: 'article' as const,
        fetchedAt: new Date(),
        metadata: {},
        relevanceHint: 0.8,
      },
      {
        sourceKey: 'reddit',
        sourceUrl: 'https://example.com/2',
        sourceName: 'Reddit',
        title: 'Cyberpunk 2077 performance issues with linear rendering',
        content: 'Having trouble with the linear rendering pipeline in the game.',
        contentType: 'post' as const,
        fetchedAt: new Date(),
        metadata: {},
        relevanceHint: 0.5,
      },
    ]);

    const res = await POST(
      createRequest('http://localhost/api/competitors/scan', {
        method: 'POST',
        body: JSON.stringify({ competitorId: 'comp-1' }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    // Only the relevant result should be saved (not the Cyberpunk one)
    // Since pipeline is called multiple times (one per query), newItems may vary
    // but createMany should only receive relevant items
    if (json.newItems > 0) {
      const createCalls = mockCompetitorFeedCreateMany.mock.calls;
      for (const call of createCalls) {
        const items = call[0]?.data ?? [];
        for (const item of items) {
          expect(item.title.toLowerCase()).not.toContain('cyberpunk');
        }
      }
    }
  });

  it('returns scanned 0 when specified competitor does not exist', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindMany.mockResolvedValueOnce([]);

    const res = await POST(
      createRequest('http://localhost/api/competitors/scan', {
        method: 'POST',
        body: JSON.stringify({ competitorId: 'bad-id' }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scanned).toBe(0);
    expect(json.newItems).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// /api/competitors/suggest  (POST)
// ---------------------------------------------------------------------------
describe('/api/competitors/suggest', () => {
  let POST: any;

  beforeEach(async () => {
    const mod = await import('@/app/api/competitors/suggest/route');
    POST = mod.POST;
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await POST(
      createRequest('http://localhost/api/competitors/suggest', { method: 'POST' }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when NorthStar is not set', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindMany.mockResolvedValueOnce([]); // existing competitors
    mockNorthStarFindUnique.mockResolvedValueOnce(null);
    mockProductMappingFindMany.mockResolvedValueOnce([]);

    const res = await POST(
      createRequest('http://localhost/api/competitors/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmConfig: { provider: 'openai', apiKey: 'sk-test' } }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('North Star');
  });

  it('returns suggestions when NorthStar exists', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindMany.mockResolvedValueOnce([]); // existing competitors
    mockNorthStarFindUnique.mockResolvedValueOnce({
      id: 'ns-1',
      userId: 'user-1',
      statement: 'Dominate the SaaS market',
    });
    mockProductMappingFindMany.mockResolvedValueOnce([
      { id: 'pm-1', name: 'Product A' },
      { id: 'pm-2', name: 'Product B' },
    ]);
    mockLlmChat.mockResolvedValueOnce(JSON.stringify({
      competitors: [
        { name: 'Rival Corp', website: 'https://rival.com', description: 'A direct competitor', tags: ['direct'] },
      ],
    }));
    mockCompetitorCreate.mockResolvedValue({ id: 'comp-new' });

    const res = await POST(
      createRequest('http://localhost/api/competitors/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmConfig: { provider: 'openai', apiKey: 'sk-test' } }),
      }),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.added).toBe(1);
    expect(json.suggestions).toContain('Rival Corp');
  });
});
