import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockInitiativeFindFirst = vi.fn();
const mockInitiativeFindMany = vi.fn();
const mockInitiativeUpdate = vi.fn();
const mockNorthStarFindUnique = vi.fn();
const mockBusinessGoalFindMany = vi.fn();
const mockBusinessImpactFindFirst = vi.fn();
const mockBusinessImpactCreate = vi.fn();
const mockBusinessImpactUpdate = vi.fn();
const mockAlignmentScoreFindFirst = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    initiative: {
      findFirst: (...a: unknown[]) => mockInitiativeFindFirst(...a),
      findMany: (...a: unknown[]) => mockInitiativeFindMany(...a),
      update: (...a: unknown[]) => mockInitiativeUpdate(...a),
    },
    northStar: {
      findUnique: (...a: unknown[]) => mockNorthStarFindUnique(...a),
    },
    businessGoal: {
      findMany: (...a: unknown[]) => mockBusinessGoalFindMany(...a),
    },
    businessImpact: {
      findFirst: (...a: unknown[]) => mockBusinessImpactFindFirst(...a),
      create: (...a: unknown[]) => mockBusinessImpactCreate(...a),
      update: (...a: unknown[]) => mockBusinessImpactUpdate(...a),
    },
    alignmentScore: {
      findFirst: (...a: unknown[]) => mockAlignmentScoreFindFirst(...a),
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
// POST /api/strategy/evaluate
// ===========================================================================
describe('POST /api/strategy/evaluate', () => {
  let POST: typeof import('@/app/api/strategy/evaluate/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/strategy/evaluate/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await POST(
      createRequest('http://localhost/api/strategy/evaluate', {
        method: 'POST',
        body: JSON.stringify({ initiativeId: 'init-1' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when initiativeId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const res = await POST(
      createRequest('http://localhost/api/strategy/evaluate', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('initiativeId is required');
  });

  it('returns 404 when initiative does not belong to user', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockInitiativeFindFirst.mockResolvedValueOnce(null);

    const res = await POST(
      createRequest('http://localhost/api/strategy/evaluate', {
        method: 'POST',
        body: JSON.stringify({ initiativeId: 'unknown-id' }),
      }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Initiative not found');
  });

  it('returns placeholder evaluation with expected shape', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockInitiativeFindFirst.mockResolvedValueOnce({ id: 'init-1', userId: 'user-1' });
    mockNorthStarFindUnique.mockResolvedValueOnce(null);
    mockBusinessGoalFindMany.mockResolvedValueOnce([]);

    const res = await POST(
      createRequest('http://localhost/api/strategy/evaluate', {
        method: 'POST',
        body: JSON.stringify({ initiativeId: 'init-1' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.initiativeId).toBe('init-1');
    expect(body.computedBy).toBe('placeholder');
    expect(body.evaluation).toEqual(
      expect.objectContaining({
        strategicFit: 50,
        marketReadiness: 50,
        executionRisk: 50,
        overallRecommendation: 'evaluate',
      }),
    );
  });
});

// ===========================================================================
// POST /api/strategy/impact
// ===========================================================================
describe('POST /api/strategy/impact', () => {
  let POST: typeof import('@/app/api/strategy/impact/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/strategy/impact/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await POST(
      createRequest('http://localhost/api/strategy/impact', {
        method: 'POST',
        body: JSON.stringify({ initiativeId: 'init-1' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when initiativeId is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const res = await POST(
      createRequest('http://localhost/api/strategy/impact', {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('initiativeId is required');
  });

  it('creates a new BusinessImpact record when none exists', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockInitiativeFindFirst.mockResolvedValueOnce({ id: 'init-1', userId: 'user-1' });
    mockNorthStarFindUnique.mockResolvedValueOnce(null);
    mockBusinessGoalFindMany.mockResolvedValueOnce([]);
    mockBusinessImpactFindFirst.mockResolvedValueOnce(null); // no existing
    const createdImpact = { id: 'impact-1', entityId: 'init-1', revenueEstimate: 0, computedBy: 'placeholder' };
    mockBusinessImpactCreate.mockResolvedValueOnce(createdImpact);
    mockInitiativeUpdate.mockResolvedValueOnce({});

    const res = await POST(
      createRequest('http://localhost/api/strategy/impact', {
        method: 'POST',
        body: JSON.stringify({ initiativeId: 'init-1' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('impact-1');
    expect(mockBusinessImpactCreate).toHaveBeenCalled();
    expect(mockBusinessImpactUpdate).not.toHaveBeenCalled();
    // initiative gets updated with businessImpactId
    expect(mockInitiativeUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'init-1' },
        data: { businessImpactId: 'impact-1' },
      }),
    );
  });

  it('updates an existing BusinessImpact record when one already exists', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockInitiativeFindFirst.mockResolvedValueOnce({ id: 'init-1', userId: 'user-1' });
    mockNorthStarFindUnique.mockResolvedValueOnce(null);
    mockBusinessGoalFindMany.mockResolvedValueOnce([]);
    mockBusinessImpactFindFirst.mockResolvedValueOnce({ id: 'existing-impact' }); // existing
    const updatedImpact = { id: 'existing-impact', entityId: 'init-1', computedBy: 'placeholder' };
    mockBusinessImpactUpdate.mockResolvedValueOnce(updatedImpact);
    mockInitiativeUpdate.mockResolvedValueOnce({});

    const res = await POST(
      createRequest('http://localhost/api/strategy/impact', {
        method: 'POST',
        body: JSON.stringify({ initiativeId: 'init-1' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe('existing-impact');
    expect(mockBusinessImpactUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'existing-impact' } }),
    );
    expect(mockBusinessImpactCreate).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// GET /api/strategy/portfolio
// ===========================================================================
describe('GET /api/strategy/portfolio', () => {
  let GET: typeof import('@/app/api/strategy/portfolio/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/strategy/portfolio/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(createRequest('http://localhost/api/strategy/portfolio'));
    expect(res.status).toBe(401);
  });

  it('returns portfolio with summary for multiple initiatives', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const fakeInitiatives = [
      { id: 'i1', title: 'Alpha', status: 'idea', level: 'idea', userId: 'user-1' },
      { id: 'i2', title: 'Beta', status: 'discovery', level: 'epic', userId: 'user-1' },
      { id: 'i3', title: 'Gamma', status: 'idea', level: 'idea', userId: 'user-1' },
    ];
    mockInitiativeFindMany.mockResolvedValueOnce(fakeInitiatives);

    // alignment lookups
    mockAlignmentScoreFindFirst
      .mockResolvedValueOnce({ overallScore: 80 }) // i1
      .mockResolvedValueOnce(null)                  // i2
      .mockResolvedValueOnce({ overallScore: 60 }); // i3

    // impact lookups
    mockBusinessImpactFindFirst
      .mockResolvedValueOnce({ id: 'imp-1' }) // i1
      .mockResolvedValueOnce(null)            // i2
      .mockResolvedValueOnce(null);           // i3

    const res = await GET(createRequest('http://localhost/api/strategy/portfolio'));
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.portfolio).toHaveLength(3);
    expect(body.summary.total).toBe(3);
    expect(body.summary.byStatus).toEqual({ idea: 2, discovery: 1 });
    expect(body.summary.byLevel).toEqual({ idea: 2, epic: 1 });
    expect(body.summary.avgAlignment).toBe(70); // (80 + 60) / 2
    expect(body.summary.withImpact).toBe(1);
  });

  it('returns avgAlignment as null when no initiatives have alignment scores', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockInitiativeFindMany.mockResolvedValueOnce([
      { id: 'i1', status: 'idea', level: 'idea', userId: 'user-1' },
    ]);
    mockAlignmentScoreFindFirst.mockResolvedValueOnce(null);
    mockBusinessImpactFindFirst.mockResolvedValueOnce(null);

    const res = await GET(createRequest('http://localhost/api/strategy/portfolio'));
    const body = await res.json();
    expect(body.summary.avgAlignment).toBeNull();
  });
});
