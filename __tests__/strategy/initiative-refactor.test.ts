import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockAlignmentDeleteMany = vi.fn();
const mockImpactDeleteMany = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    initiative: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      create: (...a: unknown[]) => mockCreate(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
      delete: (...a: unknown[]) => mockDelete(...a),
    },
    alignmentScore: {
      deleteMany: (...a: unknown[]) => mockAlignmentDeleteMany(...a),
    },
    businessImpact: {
      deleteMany: (...a: unknown[]) => mockImpactDeleteMany(...a),
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockSession = {
  user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
};

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// GET / POST  -  /api/initiatives
// ===========================================================================
describe('GET /api/initiatives', () => {
  let GET: typeof import('@/app/api/initiatives/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/initiatives/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(createRequest('http://localhost/api/initiatives'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns a list of initiatives for the authenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const fakeList = [
      { id: 'init-1', title: 'Alpha', status: 'idea', userId: 'user-1' },
      { id: 'init-2', title: 'Beta', status: 'discovery', userId: 'user-1' },
    ];
    mockFindMany.mockResolvedValueOnce(fakeList);

    const res = await GET(createRequest('http://localhost/api/initiatives'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].title).toBe('Alpha');
  });

  it('passes query-string filters (status, level, pillar) to the query', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindMany.mockResolvedValueOnce([]);

    const url = 'http://localhost/api/initiatives?status=discovery&level=epic&pillar=growth';
    await GET(createRequest(url));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          status: 'discovery',
          level: 'epic',
          pillar: 'growth',
        },
      }),
    );
  });
});

describe('POST /api/initiatives', () => {
  let POST: typeof import('@/app/api/initiatives/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/initiatives/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await POST(
      createRequest('http://localhost/api/initiatives', {
        method: 'POST',
        body: JSON.stringify({ title: 'X' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when title is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const res = await POST(
      createRequest('http://localhost/api/initiatives', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('title is required');
  });

  it('creates an initiative with defaults and returns 201', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const created = {
      id: 'init-new',
      userId: 'user-1',
      title: 'New Init',
      description: '',
      status: 'idea',
      businessValue: 'medium',
      effort: 'medium',
      level: 'idea',
      pillar: 'strategy',
    };
    mockCreate.mockResolvedValueOnce(created);

    const res = await POST(
      createRequest('http://localhost/api/initiatives', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Init' }),
      }),
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('New Init');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          title: 'New Init',
          status: 'idea',
          businessValue: 'medium',
          effort: 'medium',
        }),
      }),
    );
  });

  it('serialises array fields (stakeholders, tags, risks, dependencies) to JSON strings', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCreate.mockResolvedValueOnce({ id: 'init-arr' });

    await POST(
      createRequest('http://localhost/api/initiatives', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Arrays',
          stakeholders: ['Alice', 'Bob'],
          tags: ['tag-a'],
          risks: ['r1'],
          dependencies: ['dep-1'],
        }),
      }),
    );

    const callData = mockCreate.mock.calls[0][0].data;
    expect(callData.stakeholders).toBe(JSON.stringify(['Alice', 'Bob']));
    expect(callData.tags).toBe(JSON.stringify(['tag-a']));
    expect(callData.risks).toBe(JSON.stringify(['r1']));
    expect(callData.dependencies).toBe(JSON.stringify(['dep-1']));
  });
});

// ===========================================================================
// GET / PATCH / DELETE  -  /api/initiatives/[id]
// ===========================================================================
describe('GET /api/initiatives/[id]', () => {
  let GET: typeof import('@/app/api/initiatives/[id]/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/initiatives/[id]/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(createRequest('http://localhost/api/initiatives/init-1'), params('init-1'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when the initiative does not belong to the user', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await GET(
      createRequest('http://localhost/api/initiatives/other-id'),
      params('other-id'),
    );
    expect(res.status).toBe(404);
  });

  it('returns the initiative when ownership matches', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const record = { id: 'init-1', title: 'Found', userId: 'user-1' };
    mockFindFirst.mockResolvedValueOnce(record);

    const res = await GET(createRequest('http://localhost/api/initiatives/init-1'), params('init-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Found');
  });
});

describe('PATCH /api/initiatives/[id]', () => {
  let PATCH: typeof import('@/app/api/initiatives/[id]/route').PATCH;

  beforeEach(async () => {
    ({ PATCH } = await import('@/app/api/initiatives/[id]/route'));
  });

  it('returns 404 when the initiative does not belong to the user', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await PATCH(
      createRequest('http://localhost/api/initiatives/bad-id', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'nope' }),
      }),
      params('bad-id'),
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for an invalid status value', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce({ id: 'init-1', userId: 'user-1' });

    const res = await PATCH(
      createRequest('http://localhost/api/initiatives/init-1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'invalid-status' }),
      }),
      params('init-1'),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid status/);
  });

  it('updates the initiative with valid fields', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce({ id: 'init-1', userId: 'user-1' });
    mockUpdate.mockResolvedValueOnce({ id: 'init-1', title: 'Updated', status: 'discovery' });

    const res = await PATCH(
      createRequest('http://localhost/api/initiatives/init-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated', status: 'discovery' }),
      }),
      params('init-1'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Updated');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'init-1' },
        data: expect.objectContaining({ title: 'Updated', status: 'discovery' }),
      }),
    );
  });
});

describe('DELETE /api/initiatives/[id]', () => {
  let DELETE: typeof import('@/app/api/initiatives/[id]/route').DELETE;

  beforeEach(async () => {
    ({ DELETE } = await import('@/app/api/initiatives/[id]/route'));
  });

  it('returns 404 when the initiative does not belong to the user', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await DELETE(
      createRequest('http://localhost/api/initiatives/nope', { method: 'DELETE' }),
      params('nope'),
    );
    expect(res.status).toBe(404);
  });

  it('deletes related records then removes the initiative', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce({ id: 'init-1', userId: 'user-1' });
    mockAlignmentDeleteMany.mockResolvedValueOnce({ count: 1 });
    mockImpactDeleteMany.mockResolvedValueOnce({ count: 1 });
    mockDelete.mockResolvedValueOnce({});

    const res = await DELETE(
      createRequest('http://localhost/api/initiatives/init-1', { method: 'DELETE' }),
      params('init-1'),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify cleanup order
    expect(mockAlignmentDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entityType: 'initiative', entityId: 'init-1', userId: 'user-1' },
      }),
    );
    expect(mockImpactDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entityType: 'initiative', entityId: 'init-1', userId: 'user-1' },
      }),
    );
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'init-1' } });
  });
});
