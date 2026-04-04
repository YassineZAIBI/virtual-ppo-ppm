import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

// ── Mocks ──────────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/services/llm', () => ({
  LLMService: {
    create: vi.fn().mockReturnValue({
      chat: vi.fn().mockResolvedValue(JSON.stringify({
        northStarRelevance: 75,
        businessGoalCoverage: 60,
        targetGroupImpact: 80,
        needFulfillment: 55,
        strengths: ['Strong alignment with north star'],
        concerns: ['Limited coverage of all business goals'],
        reasoning: 'Good overall alignment with the product vision.',
      })),
    }),
  },
  getUserLLMConfig: vi.fn().mockResolvedValue({
    provider: 'openai',
    apiKey: 'test-key',
  }),
}));

// Shared in-memory stores to simulate DB state across route handlers
let northStarStore: Record<string, any> = {};
let businessGoalStore: any[] = [];
let targetGroupStore: any[] = [];
let userStore: Record<string, any> = {};
let alignmentScoreStore: any[] = [];
let initiativeStore: any[] = [];
let needStore: any[] = [];

function resetStores() {
  northStarStore = {};
  businessGoalStore = [];
  targetGroupStore = [];
  userStore = { 'user-1': { id: 'user-1', visionComplete: false } };
  alignmentScoreStore = [];
  initiativeStore = [{ id: 'init-1', userId: 'user-1', title: 'Launch V2' }];
  needStore = [];
}

vi.mock('@/lib/db', () => ({
  db: {
    northStar: {
      findUnique: vi.fn(({ where }: any) => {
        if (where.userId) return Promise.resolve(northStarStore[where.userId] ?? null);
        return Promise.resolve(null);
      }),
      findFirst: vi.fn(({ where }: any) => {
        if (where.userId && where.id) {
          const ns = northStarStore[where.userId];
          return Promise.resolve(ns && ns.id === where.id ? ns : null);
        }
        return Promise.resolve(null);
      }),
      upsert: vi.fn(({ where, create, update }: any) => {
        const existing = northStarStore[where.userId];
        if (existing) {
          const updated = { ...existing, ...update, version: (existing.version || 1) + 1 };
          northStarStore[where.userId] = updated;
          return Promise.resolve(updated);
        }
        const created = { id: 'ns-1', ...create, version: 1 };
        northStarStore[create.userId] = created;
        return Promise.resolve(created);
      }),
    },
    businessGoal: {
      findMany: vi.fn(({ where }: any) => {
        return Promise.resolve(businessGoalStore.filter((bg) => bg.userId === where.userId));
      }),
      findFirst: vi.fn(({ where }: any) => {
        return Promise.resolve(
          businessGoalStore.find((bg) => bg.id === where.id && bg.userId === where.userId) ?? null,
        );
      }),
      create: vi.fn(({ data }: any) => {
        const bg = { id: `bg-${businessGoalStore.length + 1}`, ...data };
        businessGoalStore.push(bg);
        return Promise.resolve(bg);
      }),
    },
    targetGroup: {
      findMany: vi.fn(({ where }: any) => {
        return Promise.resolve(targetGroupStore.filter((tg) => tg.userId === where.userId));
      }),
      create: vi.fn(({ data }: any) => {
        const tg = { id: `tg-${targetGroupStore.length + 1}`, ...data };
        targetGroupStore.push(tg);
        return Promise.resolve(tg);
      }),
      upsert: vi.fn(({ where, create }: any) => {
        const existing = targetGroupStore.find(
          (tg) => tg.userId === where.userId_name?.userId && tg.name === where.userId_name?.name
        );
        if (existing) return Promise.resolve(existing);
        const tg = { id: `tg-${targetGroupStore.length + 1}`, ...create };
        targetGroupStore.push(tg);
        return Promise.resolve(tg);
      }),
    },
    need: {
      findMany: vi.fn(({ where }: any) => {
        return Promise.resolve(needStore.filter((n) => n.userId === where.userId));
      }),
    },
    user: {
      update: vi.fn(({ where, data }: any) => {
        if (userStore[where.id]) {
          userStore[where.id] = { ...userStore[where.id], ...data };
        }
        return Promise.resolve(userStore[where.id]);
      }),
    },
    initiative: {
      findFirst: vi.fn(({ where }: any) => {
        return Promise.resolve(
          initiativeStore.find((i) => i.id === where.id && i.userId === where.userId) ?? null,
        );
      }),
      update: vi.fn(({ where, data }: any) => {
        const idx = initiativeStore.findIndex((i) => i.id === where.id);
        if (idx >= 0) initiativeStore[idx] = { ...initiativeStore[idx], ...data };
        return Promise.resolve(initiativeStore[idx]);
      }),
    },
    risk: {
      findFirst: vi.fn(() => Promise.resolve(null)),
    },
    alignmentScore: {
      findFirst: vi.fn(({ where }: any) => {
        const match = alignmentScoreStore.find(
          (a) =>
            a.userId === where.userId &&
            a.entityType === where.entityType &&
            a.entityId === where.entityId,
        );
        return Promise.resolve(match ?? null);
      }),
      create: vi.fn(({ data }: any) => {
        const score = { id: `as-${alignmentScoreStore.length + 1}`, ...data };
        alignmentScoreStore.push(score);
        return Promise.resolve(score);
      }),
    },
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────
const mockSession = {
  user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
};

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetStores();
  vi.mocked(getServerSession).mockResolvedValue(mockSession);
});

// ── Integration flow tests ─────────────────────────────────────────────
describe('Vision flow integration', () => {
  it('Step 1: creates a NorthStar via POST /api/vision/north-star', async () => {
    const { POST } = await import('@/app/api/vision/north-star/route');

    const res = await POST(
      createRequest('http://localhost/api/vision/north-star', {
        method: 'POST',
        body: JSON.stringify({ statement: 'Become market leader in AI-driven PM tools' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.statement).toBe('Become market leader in AI-driven PM tools');
    expect(body.id).toBe('ns-1');

    // visionComplete should now be set on the user
    expect(userStore['user-1'].visionComplete).toBe(true);
  });

  it('Step 2: creates a BusinessGoal linked to the NorthStar', async () => {
    // First create the NorthStar
    const { POST: createNS } = await import('@/app/api/vision/north-star/route');
    await createNS(
      createRequest('http://localhost/api/vision/north-star', {
        method: 'POST',
        body: JSON.stringify({ statement: 'Be the best' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Now create a business goal
    const { POST: createBG } = await import('@/app/api/vision/business-goals/route');
    const res = await createBG(
      createRequest('http://localhost/api/vision/business-goals', {
        method: 'POST',
        body: JSON.stringify({ northStarId: 'ns-1', title: 'Increase revenue by 30%' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.title).toBe('Increase revenue by 30%');
    expect(body.northStarId).toBe('ns-1');
  });

  it('Step 3: creates a TargetGroup linked to the BusinessGoal', async () => {
    // Setup: NorthStar + BusinessGoal
    const { POST: createNS } = await import('@/app/api/vision/north-star/route');
    await createNS(
      createRequest('http://localhost/api/vision/north-star', {
        method: 'POST',
        body: JSON.stringify({ statement: 'Be the best' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { POST: createBG } = await import('@/app/api/vision/business-goals/route');
    await createBG(
      createRequest('http://localhost/api/vision/business-goals', {
        method: 'POST',
        body: JSON.stringify({ northStarId: 'ns-1', title: 'Grow' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Create target group
    const { POST: createTG } = await import('@/app/api/vision/target-groups/route');
    const res = await createTG(
      createRequest('http://localhost/api/vision/target-groups', {
        method: 'POST',
        body: JSON.stringify({ businessGoalId: 'bg-1', name: 'Enterprise PMs' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.name).toBe('Enterprise PMs');
    expect(body.businessGoalId).toBe('bg-1');
  });

  it('Step 4: visionComplete is set on the user after NorthStar creation', async () => {
    expect(userStore['user-1'].visionComplete).toBe(false);

    const { POST } = await import('@/app/api/vision/north-star/route');
    await POST(
      createRequest('http://localhost/api/vision/north-star', {
        method: 'POST',
        body: JSON.stringify({ statement: 'Lead the market' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(userStore['user-1'].visionComplete).toBe(true);
  });

  it('Step 5: evaluates alignment for an initiative', async () => {
    // Setup: full vision hierarchy
    const { POST: createNS } = await import('@/app/api/vision/north-star/route');
    await createNS(
      createRequest('http://localhost/api/vision/north-star', {
        method: 'POST',
        body: JSON.stringify({ statement: 'Be the best' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { POST: createBG } = await import('@/app/api/vision/business-goals/route');
    await createBG(
      createRequest('http://localhost/api/vision/business-goals', {
        method: 'POST',
        body: JSON.stringify({ northStarId: 'ns-1', title: 'Revenue' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { POST: createTG } = await import('@/app/api/vision/target-groups/route');
    await createTG(
      createRequest('http://localhost/api/vision/target-groups', {
        method: 'POST',
        body: JSON.stringify({ businessGoalId: 'bg-1', name: 'SMBs' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Now evaluate alignment
    const { POST: evalAlignment } = await import('@/app/api/vision/alignment/route');
    const res = await evalAlignment(
      createRequest('http://localhost/api/vision/alignment', {
        method: 'POST',
        body: JSON.stringify({ entityType: 'initiative', entityId: 'init-1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.overallScore).toBeDefined();
    expect(typeof body.overallScore).toBe('number');
    expect(body.entityType).toBe('initiative');
    expect(body.entityId).toBe('init-1');
    expect(body.visionContext).toBeDefined();
    expect(body.visionContext.hasNorthStar).toBe(true);
    expect(body.visionContext.businessGoalCount).toBe(1);
    expect(body.visionContext.targetGroupCount).toBe(1);
  });

  it('rejects alignment when entityType is invalid', async () => {
    const { POST } = await import('@/app/api/vision/alignment/route');

    const res = await POST(
      createRequest('http://localhost/api/vision/alignment', {
        method: 'POST',
        body: JSON.stringify({ entityType: 'feature', entityId: 'f-1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain('entityType');
  });

  it('returns 404 when the alignment entity does not exist', async () => {
    // Setup: NorthStar only (alignment still needs vision data)
    const { POST: createNS } = await import('@/app/api/vision/north-star/route');
    await createNS(
      createRequest('http://localhost/api/vision/north-star', {
        method: 'POST',
        body: JSON.stringify({ statement: 'Be the best' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { POST: evalAlignment } = await import('@/app/api/vision/alignment/route');
    const res = await evalAlignment(
      createRequest('http://localhost/api/vision/alignment', {
        method: 'POST',
        body: JSON.stringify({ entityType: 'initiative', entityId: 'nonexistent' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toContain('not found');
  });
});
