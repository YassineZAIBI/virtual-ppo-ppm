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

vi.mock('@/lib/services/llm', () => ({
  LLMService: {
    create: vi.fn().mockReturnValue({
      chat: vi.fn().mockResolvedValue(JSON.stringify({
        northStarRelevance: 50,
        businessGoalCoverage: 50,
        targetGroupImpact: 50,
        needFulfillment: 50,
        strengths: ['Good alignment'],
        concerns: ['Some risk'],
        reasoning: 'Test alignment analysis.',
      })),
    }),
  },
  getUserLLMConfig: vi.fn().mockResolvedValue({
    provider: 'openai',
    apiKey: 'test-key',
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    northStar: {
      findUnique: vi.fn(),
    },
    businessGoal: {
      findMany: vi.fn(),
    },
    targetGroup: {
      findMany: vi.fn(),
    },
    need: {
      findMany: vi.fn(),
    },
    initiative: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    risk: {
      findFirst: vi.fn(),
    },
    alignmentScore: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { db } from '@/lib/db';

import { POST as alignmentPOST } from '@/app/api/vision/alignment/route';
import { POST as batchPOST } from '@/app/api/vision/alignment/batch/route';

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
// AUTH TESTS
// ===========================================================================

describe('Auth guard (401 when unauthenticated)', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(null);
  });

  it('POST /api/vision/alignment', async () => {
    const res = await alignmentPOST(
      createRequest('http://localhost/api/vision/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'initiative', entityId: 'i-1' }),
      }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('POST /api/vision/alignment/batch', async () => {
    const res = await batchPOST(
      createRequest('http://localhost/api/vision/alignment/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});

// ===========================================================================
// POST /api/vision/alignment — Single alignment scoring
// ===========================================================================

describe('POST /api/vision/alignment', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns 400 when entityType is missing', async () => {
    const res = await alignmentPOST(
      createRequest('http://localhost/api/vision/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: 'i-1' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'entityType and entityId are required' });
  });

  it('returns 400 when entityId is missing', async () => {
    const res = await alignmentPOST(
      createRequest('http://localhost/api/vision/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'initiative' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'entityType and entityId are required' });
  });

  it('returns 400 when entityType is invalid', async () => {
    const res = await alignmentPOST(
      createRequest('http://localhost/api/vision/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'bogus', entityId: 'x' }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'entityType must be "initiative" or "risk"' });
  });

  it('returns 404 when the initiative is not found', async () => {
    (db.northStar.findUnique as any).mockResolvedValue(null);
    (db.businessGoal.findMany as any).mockResolvedValue([]);
    (db.targetGroup.findMany as any).mockResolvedValue([]);
    (db.need.findMany as any).mockResolvedValue([]);
    (db.initiative.findFirst as any).mockResolvedValue(null);

    const res = await alignmentPOST(
      createRequest('http://localhost/api/vision/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'initiative', entityId: 'nope' }),
      }),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'initiative not found' });
  });

  it('computes alignment score for an initiative and returns visionContext', async () => {
    const mockNorthStar = { id: 'ns-1', statement: 'Be #1' };
    const mockGoals = [{ id: 'bg-1' }, { id: 'bg-2' }];
    const mockTargetGroups = [{ id: 'tg-1' }];
    const mockNeeds = [{ id: 'n-1' }, { id: 'n-2' }, { id: 'n-3' }];
    const mockInitiative = { id: 'i-1', title: 'Launch v2' };
    const createdScore = {
      id: 'as-1',
      userId: 'user-1',
      entityType: 'initiative',
      entityId: 'i-1',
      overallScore: 50,
      northStarRelevance: 50,
      businessGoalCoverage: 50,
      targetGroupImpact: 50,
      needFulfillment: 50,
      reasoning: 'Test alignment analysis.',
      computedBy: 'openai',
      version: 1,
    };

    (db.northStar.findUnique as any).mockResolvedValue(mockNorthStar);
    (db.businessGoal.findMany as any).mockResolvedValue(mockGoals);
    (db.targetGroup.findMany as any).mockResolvedValue(mockTargetGroups);
    (db.need.findMany as any).mockResolvedValue(mockNeeds);
    (db.initiative.findFirst as any).mockResolvedValue(mockInitiative);
    (db.alignmentScore.findFirst as any).mockResolvedValue(null);
    (db.alignmentScore.create as any).mockResolvedValue(createdScore);
    (db.initiative.update as any).mockResolvedValue({});

    const res = await alignmentPOST(
      createRequest('http://localhost/api/vision/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'initiative', entityId: 'i-1' }),
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.overallScore).toBe(50);
    expect(data.visionContext).toEqual({
      hasNorthStar: true,
      businessGoalCount: 2,
      targetGroupCount: 1,
      needCount: 3,
    });

    // It should update the cached alignment score on the initiative
    expect(db.initiative.update).toHaveBeenCalledWith({
      where: { id: 'i-1' },
      data: { alignmentScore: 50 },
    });
  });

  it('bumps version when a previous alignment score exists', async () => {
    (db.northStar.findUnique as any).mockResolvedValue({ id: 'ns-1' });
    (db.businessGoal.findMany as any).mockResolvedValue([]);
    (db.targetGroup.findMany as any).mockResolvedValue([]);
    (db.need.findMany as any).mockResolvedValue([]);
    (db.initiative.findFirst as any).mockResolvedValue({ id: 'i-1' });
    (db.alignmentScore.findFirst as any).mockResolvedValue({ id: 'as-old', version: 3 });
    (db.alignmentScore.create as any).mockResolvedValue({ id: 'as-new', version: 4 });
    (db.initiative.update as any).mockResolvedValue({});

    await alignmentPOST(
      createRequest('http://localhost/api/vision/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'initiative', entityId: 'i-1' }),
      }),
    );

    expect(db.alignmentScore.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 4 }),
      }),
    );
  });

  it('scores a risk entity without updating initiative cache', async () => {
    (db.northStar.findUnique as any).mockResolvedValue(null);
    (db.businessGoal.findMany as any).mockResolvedValue([]);
    (db.targetGroup.findMany as any).mockResolvedValue([]);
    (db.need.findMany as any).mockResolvedValue([]);
    (db.risk.findFirst as any).mockResolvedValue({ id: 'r-1', title: 'Data breach' });
    (db.alignmentScore.findFirst as any).mockResolvedValue(null);
    (db.alignmentScore.create as any).mockResolvedValue({
      id: 'as-risk',
      entityType: 'risk',
      entityId: 'r-1',
      overallScore: 50,
    });

    const res = await alignmentPOST(
      createRequest('http://localhost/api/vision/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'risk', entityId: 'r-1' }),
      }),
    );

    expect(res.status).toBe(200);
    // Should NOT call initiative.update for risk entities
    expect(db.initiative.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// POST /api/vision/alignment/batch — Batch alignment scoring
// ===========================================================================

describe('POST /api/vision/alignment/batch', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns empty result when user has no initiatives', async () => {
    (db.initiative.findMany as any).mockResolvedValue([]);

    const res = await batchPOST(
      createRequest('http://localhost/api/vision/alignment/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.evaluated).toBe(0);
    expect(data.drifted).toBe(0);
    expect(data.scores).toEqual([]);
    expect(data.message).toBe('No initiatives found for this user');
  });

  it('scores all initiatives and returns evaluated count', async () => {
    const initiatives = [
      { id: 'i-1', title: 'Init 1', alignmentScore: null },
      { id: 'i-2', title: 'Init 2', alignmentScore: null },
    ];
    (db.initiative.findMany as any).mockResolvedValue(initiatives);
    (db.alignmentScore.findFirst as any).mockResolvedValue(null);
    (db.alignmentScore.create as any)
      .mockResolvedValueOnce({ id: 'as-1', entityId: 'i-1', overallScore: 50 })
      .mockResolvedValueOnce({ id: 'as-2', entityId: 'i-2', overallScore: 50 });
    (db.initiative.update as any).mockResolvedValue({});

    const res = await batchPOST(
      createRequest('http://localhost/api/vision/alignment/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.evaluated).toBe(2);
    expect(data.scores).toHaveLength(2);
  });

  it('detects drift when the cached score differs by more than threshold', async () => {
    // The DRIFT_THRESHOLD is 10. Placeholder always returns 50.
    // An initiative with alignmentScore=30 will have delta=20 > 10 => drifted
    const initiatives = [
      { id: 'i-1', title: 'Drifted', alignmentScore: 30 },
      { id: 'i-2', title: 'Stable', alignmentScore: 48 },
    ];
    (db.initiative.findMany as any).mockResolvedValue(initiatives);
    (db.alignmentScore.findFirst as any).mockResolvedValue(null);
    (db.alignmentScore.create as any)
      .mockResolvedValueOnce({ id: 'as-1', overallScore: 50 })
      .mockResolvedValueOnce({ id: 'as-2', overallScore: 50 });
    (db.initiative.update as any).mockResolvedValue({});

    const res = await batchPOST(
      createRequest('http://localhost/api/vision/alignment/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.drifted).toBe(1); // Only i-1 drifted (delta=20 > 10)
  });

  it('returns 403 when userId override targets a different user', async () => {
    const res = await batchPOST(
      createRequest('http://localhost/api/vision/alignment/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'other-user' }),
      }),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Cannot batch-score for another user' });
  });
});
