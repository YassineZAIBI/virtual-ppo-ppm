import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockInitiativeFindMany = vi.fn();
const mockInitiativeFindFirst = vi.fn();
const mockInitiativeUpdate = vi.fn();
const mockCompetitorFindMany = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    initiative: {
      findMany: (...a: unknown[]) => mockInitiativeFindMany(...a),
      findFirst: (...a: unknown[]) => mockInitiativeFindFirst(...a),
      update: (...a: unknown[]) => mockInitiativeUpdate(...a),
    },
    competitor: {
      findMany: (...a: unknown[]) => mockCompetitorFindMany(...a),
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

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// GET /api/strategy/cross-radar  (conflict / synergy detection)
// ===========================================================================
describe('GET /api/strategy/cross-radar', () => {
  let GET: typeof import('@/app/api/strategy/cross-radar/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/strategy/cross-radar/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(createRequest('http://localhost/api/strategy/cross-radar'));
    expect(res.status).toBe(401);
  });

  it('returns placeholder analysis with the correct shape', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const fakeInitiatives = [
      { id: 'i1', title: 'Alpha', status: 'discovery', userId: 'user-1' },
      { id: 'i2', title: 'Beta', status: 'validation', userId: 'user-1' },
    ];
    mockInitiativeFindMany.mockResolvedValueOnce(fakeInitiatives);

    const res = await GET(createRequest('http://localhost/api/strategy/cross-radar'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body).toEqual({
      conflicts: [],
      synergies: [],
      orphanGoals: [],
      overloadedGoals: [],
      summary: expect.stringContaining('placeholder'),
      analyzedCount: 2,
    });
  });

  it('excludes initiatives with status "idea" from the analysis', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockInitiativeFindMany.mockResolvedValueOnce([]);

    await GET(createRequest('http://localhost/api/strategy/cross-radar'));

    expect(mockInitiativeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          status: { not: 'idea' },
        },
      }),
    );
  });
});

// ===========================================================================
// POST /api/strategy/competitive-rank
// ===========================================================================
describe('POST /api/strategy/competitive-rank', () => {
  let POST: typeof import('@/app/api/strategy/competitive-rank/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/strategy/competitive-rank/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await POST(
      createRequest('http://localhost/api/strategy/competitive-rank', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when a specific initiativeId does not belong to user', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindMany.mockResolvedValueOnce([]);
    mockInitiativeFindFirst.mockResolvedValueOnce(null);

    const res = await POST(
      createRequest('http://localhost/api/strategy/competitive-rank', {
        method: 'POST',
        body: JSON.stringify({ initiativeId: 'unknown-id' }),
      }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Initiative not found');
  });

  it('ranks a single initiative based on its businessValue', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindMany.mockResolvedValueOnce([]);
    const initiative = { id: 'init-1', title: 'High-val', businessValue: 'high', userId: 'user-1' };
    mockInitiativeFindFirst.mockResolvedValueOnce(initiative);
    mockInitiativeUpdate.mockResolvedValueOnce({ ...initiative, competitiveRank: 1 });

    const res = await POST(
      createRequest('http://localhost/api/strategy/competitive-rank', {
        method: 'POST',
        body: JSON.stringify({ initiativeId: 'init-1' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ranked).toBe(1);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].competitiveRank).toBe(1); // high => rank 1
    expect(mockInitiativeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'init-1' },
        data: { competitiveRank: 1 },
      }),
    );
  });

  it('ranks all initiatives when no initiativeId is provided', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindMany.mockResolvedValueOnce([]);
    const allInits = [
      { id: 'i1', title: 'High', businessValue: 'high', userId: 'user-1' },
      { id: 'i2', title: 'Medium', businessValue: 'medium', userId: 'user-1' },
      { id: 'i3', title: 'Low', businessValue: 'low', userId: 'user-1' },
    ];
    mockInitiativeFindMany.mockResolvedValueOnce(allInits);
    mockInitiativeUpdate
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    const res = await POST(
      createRequest('http://localhost/api/strategy/competitive-rank', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ranked).toBe(3);
    expect(body.results[0].competitiveRank).toBe(1); // high
    expect(body.results[1].competitiveRank).toBe(2); // medium
    expect(body.results[2].competitiveRank).toBe(3); // low
  });

  it('defaults to rank 2 when businessValue is not in the lookup map', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockCompetitorFindMany.mockResolvedValueOnce([]);
    const initiative = { id: 'i-weird', title: 'Oddball', businessValue: 'unknown-val', userId: 'user-1' };
    mockInitiativeFindFirst.mockResolvedValueOnce(initiative);
    mockInitiativeUpdate.mockResolvedValueOnce({});

    const res = await POST(
      createRequest('http://localhost/api/strategy/competitive-rank', {
        method: 'POST',
        body: JSON.stringify({ initiativeId: 'i-weird' }),
      }),
    );
    const body = await res.json();
    expect(body.results[0].competitiveRank).toBe(2); // default fallback
  });
});
