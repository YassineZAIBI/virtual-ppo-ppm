import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ authOptions: {} }));

vi.mock('@/lib/db', () => ({
  db: {
    northStar: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    businessGoal: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    targetGroup: {
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
    },
    productMapping: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    need: {
      findFirst: vi.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { db } from '@/lib/db';

import {
  GET as northStarGET,
  POST as northStarPOST,
} from '@/app/api/vision/north-star/route';

import {
  GET as businessGoalsGET,
  POST as businessGoalsPOST,
} from '@/app/api/vision/business-goals/route';

import {
  GET as targetGroupsGET,
  POST as targetGroupsPOST,
} from '@/app/api/vision/target-groups/route';

import {
  GET as productsGET,
  POST as productsPOST,
} from '@/app/api/vision/products/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSession = { user: { id: 'user-1', name: 'Test', email: 'test@test.com' } };

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any;
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// AUTH TESTS — 401 for all vision CRUD routes when unauthenticated
// ===========================================================================

describe('Auth guard (401 when unauthenticated)', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(null);
  });

  it('GET /api/vision/north-star', async () => {
    const res = await northStarGET(createRequest('http://localhost/api/vision/north-star'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('POST /api/vision/north-star', async () => {
    const res = await northStarPOST(
      createRequest('http://localhost/api/vision/north-star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: 'Our north star' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/vision/business-goals', async () => {
    const res = await businessGoalsGET(createRequest('http://localhost/api/vision/business-goals'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('POST /api/vision/business-goals', async () => {
    const res = await businessGoalsPOST(
      createRequest('http://localhost/api/vision/business-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ northStarId: 'ns-1', title: 'Goal' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/vision/target-groups', async () => {
    const res = await targetGroupsGET(createRequest('http://localhost/api/vision/target-groups'));
    expect(res.status).toBe(401);
  });

  it('POST /api/vision/target-groups', async () => {
    const res = await targetGroupsPOST(
      createRequest('http://localhost/api/vision/target-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessGoalId: 'bg-1', name: 'Developers' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/vision/products', async () => {
    const res = await productsGET(createRequest('http://localhost/api/vision/products'));
    expect(res.status).toBe(401);
  });

  it('POST /api/vision/products', async () => {
    const res = await productsPOST(
      createRequest('http://localhost/api/vision/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ needId: 'n-1', name: 'Widget', type: 'feature' }),
      }),
    );
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// NORTH STAR ROUTES
// ===========================================================================

describe('GET /api/vision/north-star', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns the user north star', async () => {
    const mockNorthStar = { id: 'ns-1', userId: 'user-1', statement: 'Be #1' };
    (db.northStar.findUnique as any).mockResolvedValue(mockNorthStar);

    const res = await northStarGET(createRequest('http://localhost/api/vision/north-star'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockNorthStar);
    expect(db.northStar.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('returns null when no north star exists', async () => {
    (db.northStar.findUnique as any).mockResolvedValue(null);

    const res = await northStarGET(createRequest('http://localhost/api/vision/north-star'));

    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });
});

describe('POST /api/vision/north-star', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('upserts the north star and marks visionComplete', async () => {
    const upserted = { id: 'ns-1', userId: 'user-1', statement: 'New vision', version: 1 };
    (db.northStar.upsert as any).mockResolvedValue(upserted);
    (db.user.update as any).mockResolvedValue({});

    const res = await northStarPOST(
      createRequest('http://localhost/api/vision/north-star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: 'New vision', context: 'some context', confidence: 80 }),
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(upserted);
    expect(db.northStar.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: {
        userId: 'user-1',
        statement: 'New vision',
        context: 'some context',
        confidence: 80,
      },
      update: {
        statement: 'New vision',
        context: 'some context',
        confidence: 80,
        version: { increment: 1 },
      },
    });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { visionComplete: true },
    });
  });

  it('returns 400 when statement is missing', async () => {
    const res = await northStarPOST(
      createRequest('http://localhost/api/vision/north-star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'no statement here' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Statement is required' });
  });

  it('defaults context and confidence when omitted', async () => {
    const upserted = { id: 'ns-1', statement: 'Minimal' };
    (db.northStar.upsert as any).mockResolvedValue(upserted);
    (db.user.update as any).mockResolvedValue({});

    await northStarPOST(
      createRequest('http://localhost/api/vision/north-star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement: 'Minimal' }),
      }),
    );

    expect(db.northStar.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          context: null,
          confidence: 0,
        }),
      }),
    );
  });
});

// ===========================================================================
// BUSINESS GOALS ROUTES
// ===========================================================================

describe('GET /api/vision/business-goals', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns the user business goals with target group count', async () => {
    const mockGoals = [
      { id: 'bg-1', title: 'Grow Revenue', _count: { targetGroups: 2 } },
      { id: 'bg-2', title: 'Expand Market', _count: { targetGroups: 0 } },
    ];
    (db.businessGoal.findMany as any).mockResolvedValue(mockGoals);

    const res = await businessGoalsGET(createRequest('http://localhost/api/vision/business-goals'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockGoals);
    expect(db.businessGoal.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { priority: 'asc' },
      include: {
        _count: {
          select: { targetGroups: true },
        },
      },
    });
  });
});

describe('POST /api/vision/business-goals', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('creates a business goal when northStar belongs to the user', async () => {
    const mockNorthStar = { id: 'ns-1', userId: 'user-1' };
    const created = { id: 'bg-new', title: 'Grow Revenue', northStarId: 'ns-1' };
    (db.northStar.findFirst as any).mockResolvedValue(mockNorthStar);
    (db.businessGoal.create as any).mockResolvedValue(created);

    const res = await businessGoalsPOST(
      createRequest('http://localhost/api/vision/business-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ northStarId: 'ns-1', title: 'Grow Revenue' }),
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
    expect(db.businessGoal.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        northStarId: 'ns-1',
        title: 'Grow Revenue',
        description: null,
        metric: null,
        target: null,
        deadline: null,
        priority: 0,
      },
    });
  });

  it('returns 400 when northStarId is missing', async () => {
    const res = await businessGoalsPOST(
      createRequest('http://localhost/api/vision/business-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Goal without northStarId' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'northStarId and title are required' });
  });

  it('returns 400 when title is missing', async () => {
    const res = await businessGoalsPOST(
      createRequest('http://localhost/api/vision/business-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ northStarId: 'ns-1' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'northStarId and title are required' });
  });

  it('returns 404 when northStar does not belong to the user', async () => {
    (db.northStar.findFirst as any).mockResolvedValue(null);

    const res = await businessGoalsPOST(
      createRequest('http://localhost/api/vision/business-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ northStarId: 'ns-other', title: 'Orphaned Goal' }),
      }),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'NorthStar not found' });
  });
});

// ===========================================================================
// TARGET GROUPS ROUTES
// ===========================================================================

describe('GET /api/vision/target-groups', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns all target groups for the user', async () => {
    const mockGroups = [
      { id: 'tg-1', name: 'Developers', _count: { needs: 3 } },
    ];
    (db.targetGroup.findMany as any).mockResolvedValue(mockGroups);

    const res = await targetGroupsGET(createRequest('http://localhost/api/vision/target-groups'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockGroups);
    expect(db.targetGroup.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      include: {
        _count: {
          select: { needs: true },
        },
      },
    });
  });

  it('filters by businessGoalId when provided', async () => {
    (db.targetGroup.findMany as any).mockResolvedValue([]);

    const res = await targetGroupsGET(
      createRequest('http://localhost/api/vision/target-groups?businessGoalId=bg-1'),
    );

    expect(res.status).toBe(200);
    expect(db.targetGroup.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', businessGoalId: 'bg-1' },
      }),
    );
  });
});

describe('POST /api/vision/target-groups', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('creates a target group when businessGoal belongs to the user', async () => {
    (db.businessGoal.findFirst as any).mockResolvedValue({ id: 'bg-1', userId: 'user-1' });
    const created = { id: 'tg-new', name: 'Designers', businessGoalId: 'bg-1' };
    (db.targetGroup.upsert as any).mockResolvedValue(created);

    const res = await targetGroupsPOST(
      createRequest('http://localhost/api/vision/target-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessGoalId: 'bg-1', name: 'Designers' }),
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
    expect(db.targetGroup.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_name: { userId: 'user-1', name: 'Designers' } },
        create: expect.objectContaining({ userId: 'user-1', name: 'Designers', businessGoalId: 'bg-1' }),
      }),
    );
  });

  it('creates a target group without businessGoalId (standalone)', async () => {
    const created = { id: 'tg-new', name: 'Designers', businessGoalId: null };
    (db.targetGroup.upsert as any).mockResolvedValue(created);

    const res = await targetGroupsPOST(
      createRequest('http://localhost/api/vision/target-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Designers' }),
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
  });

  it('returns 400 when name is missing', async () => {
    const res = await targetGroupsPOST(
      createRequest('http://localhost/api/vision/target-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessGoalId: 'bg-1' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'name is required' });
  });

  it('returns 404 when businessGoal does not belong to the user', async () => {
    (db.businessGoal.findFirst as any).mockResolvedValue(null);

    const res = await targetGroupsPOST(
      createRequest('http://localhost/api/vision/target-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessGoalId: 'bg-other', name: 'Orphaned' }),
      }),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'BusinessGoal not found' });
  });
});

// ===========================================================================
// PRODUCTS ROUTES
// ===========================================================================

describe('GET /api/vision/products', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns all products for the user', async () => {
    const mockProducts = [
      { id: 'p-1', name: 'Widget', type: 'feature', needId: 'n-1' },
    ];
    (db.productMapping.findMany as any).mockResolvedValue(mockProducts);

    const res = await productsGET(createRequest('http://localhost/api/vision/products'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockProducts);
    expect(db.productMapping.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });

  it('filters by needId when provided', async () => {
    (db.productMapping.findMany as any).mockResolvedValue([]);

    const res = await productsGET(
      createRequest('http://localhost/api/vision/products?needId=n-1'),
    );

    expect(res.status).toBe(200);
    expect(db.productMapping.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', needId: 'n-1' },
    });
  });
});

describe('POST /api/vision/products', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('creates a product when the need belongs to the user', async () => {
    (db.need.findFirst as any).mockResolvedValue({ id: 'n-1', userId: 'user-1' });
    const created = { id: 'p-new', name: 'New Widget', type: 'feature', needId: 'n-1' };
    (db.productMapping.create as any).mockResolvedValue(created);

    const res = await productsPOST(
      createRequest('http://localhost/api/vision/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ needId: 'n-1', name: 'New Widget', type: 'feature' }),
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
    expect(db.productMapping.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        needId: 'n-1',
        name: 'New Widget',
        type: 'feature',
      },
    });
  });

  it('returns 400 when needId is missing', async () => {
    const res = await productsPOST(
      createRequest('http://localhost/api/vision/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Widget', type: 'feature' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'needId, name, and type are required' });
  });

  it('returns 400 when name is missing', async () => {
    const res = await productsPOST(
      createRequest('http://localhost/api/vision/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ needId: 'n-1', type: 'feature' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'needId, name, and type are required' });
  });

  it('returns 400 when type is missing', async () => {
    const res = await productsPOST(
      createRequest('http://localhost/api/vision/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ needId: 'n-1', name: 'Widget' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'needId, name, and type are required' });
  });

  it('returns 404 when need does not belong to the user', async () => {
    (db.need.findFirst as any).mockResolvedValue(null);

    const res = await productsPOST(
      createRequest('http://localhost/api/vision/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ needId: 'n-other', name: 'Orphaned', type: 'feature' }),
      }),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Need not found' });
  });
});
