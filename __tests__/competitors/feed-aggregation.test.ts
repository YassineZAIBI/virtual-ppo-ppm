import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockFeedFindMany = vi.fn();
const mockFeedCount = vi.fn();
const mockCompetitorFindFirst = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    competitorFeed: {
      findMany: (...args: unknown[]) => mockFeedFindMany(...args),
      count: (...args: unknown[]) => mockFeedCount(...args),
    },
    competitor: {
      findFirst: (...args: unknown[]) => mockCompetitorFindFirst(...args),
    },
  },
}));

const mockSession = { user: { id: 'user-1', name: 'Test', email: 'test@test.com' } };

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// /api/competitors/feed  (GET) -- global feed timeline
// ---------------------------------------------------------------------------
describe('/api/competitors/feed', () => {
  let GET: any;

  beforeEach(async () => {
    const mod = await import('@/app/api/competitors/feed/route');
    GET = mod.GET;
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(createRequest('http://localhost/api/competitors/feed'));
    expect(res.status).toBe(401);
  });

  it('returns paginated feed items', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const items = [
      { id: 'f-1', type: 'news', competitor: { name: 'Acme' } },
      { id: 'f-2', type: 'pricing', competitor: { name: 'Beta' } },
    ];
    mockFeedFindMany.mockResolvedValueOnce(items);
    mockFeedCount.mockResolvedValueOnce(2);

    const res = await GET(createRequest('http://localhost/api/competitors/feed'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(2);
    expect(json.pagination.total).toBe(2);
    expect(json.pagination.page).toBe(1);
  });

  it('supports type and competitorId filters', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFeedFindMany.mockResolvedValueOnce([]);
    mockFeedCount.mockResolvedValueOnce(0);

    const res = await GET(
      createRequest('http://localhost/api/competitors/feed?type=news&competitorId=comp-1'),
    );
    expect(res.status).toBe(200);
    expect(mockFeedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          type: 'news',
          competitorId: 'comp-1',
        }),
      }),
    );
  });

  it('respects page and limit query params', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFeedFindMany.mockResolvedValueOnce([]);
    mockFeedCount.mockResolvedValueOnce(50);

    const res = await GET(
      createRequest('http://localhost/api/competitors/feed?page=2&limit=10'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pagination.page).toBe(2);
    expect(json.pagination.limit).toBe(10);
    expect(json.pagination.totalPages).toBe(5);
    expect(mockFeedFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });
});

// ---------------------------------------------------------------------------
// /api/competitors/[id]/feed  (GET) -- per-competitor feed
// ---------------------------------------------------------------------------
describe('/api/competitors/[id]/feed', () => {
  let GET: any;

  beforeEach(async () => {
    const mod = await import('@/app/api/competitors/[id]/feed/route');
    GET = mod.GET;
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(
      createRequest('http://localhost/api/competitors/comp-1/feed'),
      params('comp-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when competitor does not belong to user', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindFirst.mockResolvedValueOnce(null);

    const res = await GET(
      createRequest('http://localhost/api/competitors/bad-id/feed'),
      params('bad-id'),
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Not found');
  });

  it('returns paginated feed for a specific competitor', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindFirst.mockResolvedValueOnce({ id: 'comp-1' });
    const items = [{ id: 'f-10', type: 'blog' }];
    mockFeedFindMany.mockResolvedValueOnce(items);
    mockFeedCount.mockResolvedValueOnce(1);

    const res = await GET(
      createRequest('http://localhost/api/competitors/comp-1/feed'),
      params('comp-1'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
  });
});
