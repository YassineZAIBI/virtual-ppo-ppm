import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockCompetitor = {
  id: 'comp-1',
  userId: 'user-1',
  name: 'Acme Corp',
  website: 'https://acme.com',
  description: 'A rival company',
  tags: '["saas","enterprise"]',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    competitor: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
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
// /api/competitors  (GET, POST)
// ---------------------------------------------------------------------------
describe('/api/competitors', () => {
  let GET: any, POST: any;

  beforeEach(async () => {
    const mod = await import('@/app/api/competitors/route');
    GET = mod.GET;
    POST = mod.POST;
  });

  // --- AUTH ---
  it('GET returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(createRequest('http://localhost/api/competitors'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('POST returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await POST(
      createRequest('http://localhost/api/competitors', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  // --- GET list ---
  it('GET returns a list of competitors with feed counts', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const list = [
      { ...mockCompetitor, _count: { feeds: 5 } },
      { ...mockCompetitor, id: 'comp-2', name: 'Beta Inc', _count: { feeds: 0 } },
    ];
    mockFindMany.mockResolvedValueOnce(list);

    const res = await GET(createRequest('http://localhost/api/competitors'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(2);
    expect(json[0]._count.feeds).toBe(5);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        include: { _count: { select: { feeds: true } } },
      }),
    );
  });

  // --- POST create ---
  it('POST creates a competitor and returns 201', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCreate.mockResolvedValueOnce(mockCompetitor);

    const res = await POST(
      createRequest('http://localhost/api/competitors', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Acme Corp',
          website: 'https://acme.com',
          description: 'A rival company',
          tags: ['saas', 'enterprise'],
        }),
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.name).toBe('Acme Corp');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          name: 'Acme Corp',
        }),
      }),
    );
  });

  it('POST returns 400 when name is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

    const res = await POST(
      createRequest('http://localhost/api/competitors', {
        method: 'POST',
        body: JSON.stringify({ website: 'https://example.com' }),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('name is required');
  });
});

// ---------------------------------------------------------------------------
// /api/competitors/[id]  (GET, PATCH, DELETE)
// ---------------------------------------------------------------------------
describe('/api/competitors/[id]', () => {
  let GET: any, PATCH: any, DELETE: any;

  beforeEach(async () => {
    const mod = await import('@/app/api/competitors/[id]/route');
    GET = mod.GET;
    PATCH = mod.PATCH;
    DELETE = mod.DELETE;
  });

  // --- AUTH ---
  it('GET returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(createRequest('http://localhost/api/competitors/comp-1'), params('comp-1'));
    expect(res.status).toBe(401);
  });

  // --- GET single ---
  it('GET returns competitor with feeds', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const withFeeds = { ...mockCompetitor, feeds: [{ id: 'feed-1', title: 'News' }] };
    mockFindFirst.mockResolvedValueOnce(withFeeds);

    const res = await GET(createRequest('http://localhost/api/competitors/comp-1'), params('comp-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.feeds).toHaveLength(1);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'comp-1', userId: 'user-1' },
        include: expect.objectContaining({ feeds: expect.any(Object) }),
      }),
    );
  });

  it('GET returns 404 for unknown id', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await GET(createRequest('http://localhost/api/competitors/bad-id'), params('bad-id'));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Not found');
  });

  // --- PATCH ---
  it('PATCH updates competitor fields', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce(mockCompetitor);
    const updated = { ...mockCompetitor, name: 'Acme v2', isActive: false };
    mockUpdate.mockResolvedValueOnce(updated);

    const res = await PATCH(
      createRequest('http://localhost/api/competitors/comp-1', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Acme v2', isActive: false }),
      }),
      params('comp-1'),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.name).toBe('Acme v2');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'comp-1' },
        data: expect.objectContaining({ name: 'Acme v2', isActive: false }),
      }),
    );
  });

  it('PATCH returns 404 when competitor does not exist', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await PATCH(
      createRequest('http://localhost/api/competitors/bad-id', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'X' }),
      }),
      params('bad-id'),
    );
    expect(res.status).toBe(404);
  });

  // --- DELETE ---
  it('DELETE removes competitor', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce(mockCompetitor);
    mockDelete.mockResolvedValueOnce(mockCompetitor);

    const res = await DELETE(
      createRequest('http://localhost/api/competitors/comp-1', { method: 'DELETE' }),
      params('comp-1'),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'comp-1' } });
  });

  it('DELETE returns 404 for wrong id', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await DELETE(
      createRequest('http://localhost/api/competitors/nope', { method: 'DELETE' }),
      params('nope'),
    );
    expect(res.status).toBe(404);
  });
});
