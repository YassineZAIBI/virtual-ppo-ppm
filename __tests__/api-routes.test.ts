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
    marketResearch: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    dataPoint: { create: vi.fn() },
    contentVersion: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    dataConnectorConfig: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    dataJob: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/services/data-pipeline/registry', () => ({
  registry: {
    list: vi.fn(),
  },
}));

vi.mock('@/lib/services/data-pipeline/adapters', () => ({}));

vi.mock('@/lib/services/data-pipeline/job-queue', () => ({
  getJob: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { db } from '@/lib/db';
import { registry } from '@/lib/services/data-pipeline/registry';
import { getJob } from '@/lib/services/data-pipeline/job-queue';

import {
  GET as marketResearchListGET,
  POST as marketResearchPOST,
} from '@/app/api/market-research/route';

import {
  GET as marketResearchIdGET,
  PATCH as marketResearchIdPATCH,
  DELETE as marketResearchIdDELETE,
} from '@/app/api/market-research/[id]/route';

import { GET as adaptersGET } from '@/app/api/data-pipeline/adapters/route';
import { GET as jobIdGET } from '@/app/api/data-pipeline/jobs/[id]/route';
import { GET as contentVersionsGET } from '@/app/api/content-versions/route';

import {
  GET as connectorsListGET,
  POST as connectorsPOST,
} from '@/app/api/connectors/route';

import {
  GET as connectorIdGET,
  PATCH as connectorIdPATCH,
  DELETE as connectorIdDELETE,
} from '@/app/api/connectors/[id]/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSession = { user: { id: 'user-1', name: 'Test', email: 'test@test.com' } };

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any;
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// AUTH TESTS — 401 for all routes when unauthenticated
// ===========================================================================

describe('Auth guard (401 when unauthenticated)', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(null);
  });

  it('GET /api/market-research', async () => {
    const res = await marketResearchListGET(createRequest('http://localhost/api/market-research'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('POST /api/market-research', async () => {
    const res = await marketResearchPOST(
      createRequest('http://localhost/api/market-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'T', query: 'Q' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/market-research/[id]', async () => {
    const res = await marketResearchIdGET(createRequest('http://localhost/api/market-research/1'), params('1'));
    expect(res.status).toBe(401);
  });

  it('PATCH /api/market-research/[id]', async () => {
    const res = await marketResearchIdPATCH(
      createRequest('http://localhost/api/market-research/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New' }),
      }),
      params('1'),
    );
    expect(res.status).toBe(401);
  });

  it('DELETE /api/market-research/[id]', async () => {
    const res = await marketResearchIdDELETE(createRequest('http://localhost/api/market-research/1'), params('1'));
    expect(res.status).toBe(401);
  });

  it('GET /api/data-pipeline/adapters', async () => {
    const res = await adaptersGET();
    expect(res.status).toBe(401);
  });

  it('GET /api/data-pipeline/jobs/[id]', async () => {
    const res = await jobIdGET(createRequest('http://localhost/api/data-pipeline/jobs/j1'), params('j1'));
    expect(res.status).toBe(401);
  });

  it('GET /api/content-versions', async () => {
    const res = await contentVersionsGET(
      createRequest('http://localhost/api/content-versions?entityType=x&entityId=y'),
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/connectors', async () => {
    const res = await connectorsListGET();
    expect(res.status).toBe(401);
  });

  it('POST /api/connectors', async () => {
    const res = await connectorsPOST(
      createRequest('http://localhost/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'c', adapterKey: 'a' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('GET /api/connectors/[id]', async () => {
    const res = await connectorIdGET(createRequest('http://localhost/api/connectors/c1'), params('c1'));
    expect(res.status).toBe(401);
  });

  it('PATCH /api/connectors/[id]', async () => {
    const res = await connectorIdPATCH(
      createRequest('http://localhost/api/connectors/c1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'x' }),
      }),
      params('c1'),
    );
    expect(res.status).toBe(401);
  });

  it('DELETE /api/connectors/[id]', async () => {
    const res = await connectorIdDELETE(createRequest('http://localhost/api/connectors/c1'), params('c1'));
    expect(res.status).toBe(401);
  });
});

// ===========================================================================
// MARKET RESEARCH ROUTES
// ===========================================================================

describe('GET /api/market-research', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns the user\'s research list', async () => {
    const mockReports = [
      { id: 'r1', title: 'Report 1', dataPoints: [] },
      { id: 'r2', title: 'Report 2', dataPoints: [] },
    ];
    (db.marketResearch.findMany as any).mockResolvedValue(mockReports);

    const res = await marketResearchListGET(createRequest('http://localhost/api/market-research'));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockReports);
    expect(db.marketResearch.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      include: {
        dataPoints: {
          select: {
            id: true,
            adapterKey: true,
            sourceName: true,
            sourceUrl: true,
            title: true,
            contentType: true,
            fetchedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('filters by initiativeId when provided', async () => {
    (db.marketResearch.findMany as any).mockResolvedValue([]);

    const res = await marketResearchListGET(
      createRequest('http://localhost/api/market-research?initiativeId=init-1'),
    );

    expect(res.status).toBe(200);
    expect(db.marketResearch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', initiativeId: 'init-1' },
      }),
    );
  });
});

describe('POST /api/market-research', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('creates research with title and query', async () => {
    const created = { id: 'r-new', title: 'My Research', query: 'AI trends', status: 'pending' };
    (db.marketResearch.create as any).mockResolvedValue(created);

    const res = await marketResearchPOST(
      createRequest('http://localhost/api/market-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My Research', query: 'AI trends' }),
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
    expect(db.marketResearch.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        title: 'My Research',
        query: 'AI trends',
        initiativeId: null,
        status: 'pending',
      },
    });
  });

  it('returns 400 if title is missing', async () => {
    const res = await marketResearchPOST(
      createRequest('http://localhost/api/market-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'AI trends' }),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Title and query are required' });
  });

  it('returns 400 if query is missing', async () => {
    const res = await marketResearchPOST(
      createRequest('http://localhost/api/market-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My Research' }),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Title and query are required' });
  });
});

describe('GET /api/market-research/[id]', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns research with dataPoints', async () => {
    const mockResearch = {
      id: 'r1',
      title: 'Report',
      dataPoints: [{ id: 'dp1', title: 'Point 1' }],
    };
    (db.marketResearch.findFirst as any).mockResolvedValue(mockResearch);

    const res = await marketResearchIdGET(
      createRequest('http://localhost/api/market-research/r1'),
      params('r1'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(mockResearch);
    expect(db.marketResearch.findFirst).toHaveBeenCalledWith({
      where: { id: 'r1', userId: 'user-1' },
      include: { dataPoints: true },
    });
  });

  it('returns 404 for non-existent research', async () => {
    (db.marketResearch.findFirst as any).mockResolvedValue(null);

    const res = await marketResearchIdGET(
      createRequest('http://localhost/api/market-research/nope'),
      params('nope'),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});

describe('PATCH /api/market-research/[id]', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('updates title', async () => {
    const existing = { id: 'r1', title: 'Old', synthesizedReport: null };
    const updated = { id: 'r1', title: 'New Title' };
    (db.marketResearch.findFirst as any).mockResolvedValue(existing);
    (db.marketResearch.update as any).mockResolvedValue(updated);

    const res = await marketResearchIdPATCH(
      createRequest('http://localhost/api/market-research/r1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title' }),
      }),
      params('r1'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
    expect(db.marketResearch.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { title: 'New Title' },
    });
  });

  it('saves ContentVersion when synthesizedReport changes', async () => {
    const existing = { id: 'r1', title: 'T', synthesizedReport: 'Old report' };
    const updated = { id: 'r1', synthesizedReport: 'New report' };
    (db.marketResearch.findFirst as any).mockResolvedValue(existing);
    (db.marketResearch.update as any).mockResolvedValue(updated);
    (db.contentVersion.create as any).mockResolvedValue({});

    const res = await marketResearchIdPATCH(
      createRequest('http://localhost/api/market-research/r1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          synthesizedReport: 'New report',
          changeDescription: 'Updated findings',
        }),
      }),
      params('r1'),
    );

    expect(res.status).toBe(200);
    expect(db.contentVersion.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        entityType: 'market_research',
        entityId: 'r1',
        content: 'New report',
        editedBy: 'user',
        changeDescription: 'Updated findings',
      },
    });
  });

  it('does NOT create ContentVersion when synthesizedReport has not changed', async () => {
    const existing = { id: 'r1', title: 'T', synthesizedReport: 'Same report' };
    const updated = { id: 'r1', synthesizedReport: 'Same report' };
    (db.marketResearch.findFirst as any).mockResolvedValue(existing);
    (db.marketResearch.update as any).mockResolvedValue(updated);

    await marketResearchIdPATCH(
      createRequest('http://localhost/api/market-research/r1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synthesizedReport: 'Same report' }),
      }),
      params('r1'),
    );

    expect(db.contentVersion.create).not.toHaveBeenCalled();
  });

  it('returns 404 if research does not exist', async () => {
    (db.marketResearch.findFirst as any).mockResolvedValue(null);

    const res = await marketResearchIdPATCH(
      createRequest('http://localhost/api/market-research/nope', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'X' }),
      }),
      params('nope'),
    );

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/market-research/[id]', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('deletes the research and returns success', async () => {
    (db.marketResearch.findFirst as any).mockResolvedValue({ id: 'r1' });
    (db.marketResearch.delete as any).mockResolvedValue({});

    const res = await marketResearchIdDELETE(
      createRequest('http://localhost/api/market-research/r1'),
      params('r1'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(db.marketResearch.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });

  it('returns 404 if research does not exist', async () => {
    (db.marketResearch.findFirst as any).mockResolvedValue(null);

    const res = await marketResearchIdDELETE(
      createRequest('http://localhost/api/market-research/nope'),
      params('nope'),
    );

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// DATA PIPELINE ROUTES
// ===========================================================================

describe('GET /api/data-pipeline/adapters', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns the adapter list', async () => {
    const adapters = [
      { key: 'google-trends', metadata: { name: 'Google Trends', description: 'Fetch trends' } },
      { key: 'reddit', metadata: { name: 'Reddit', description: 'Fetch reddit posts' } },
    ];
    (registry.list as any).mockReturnValue(
      adapters.map((a) => ({ key: a.key, ...a, metadata: a.metadata })),
    );

    // The route maps: registry.list().map(a => ({ key: a.key, ...a.metadata }))
    // So registry.list() should return objects with { key, metadata }
    (registry.list as any).mockReturnValue([
      { key: 'google-trends', metadata: { name: 'Google Trends', description: 'Fetch trends' } },
      { key: 'reddit', metadata: { name: 'Reddit', description: 'Fetch reddit posts' } },
    ]);

    const res = await adaptersGET();

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual([
      { key: 'google-trends', name: 'Google Trends', description: 'Fetch trends' },
      { key: 'reddit', name: 'Reddit', description: 'Fetch reddit posts' },
    ]);
  });
});

describe('GET /api/data-pipeline/jobs/[id]', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns job status', async () => {
    const job = {
      id: 'j1',
      userId: 'user-1',
      jobType: 'research',
      status: 'completed',
      progress: 100,
      error: null,
      output: JSON.stringify({ resultCount: 5 }),
      startedAt: '2026-01-01T00:00:00Z',
      completedAt: '2026-01-01T00:01:00Z',
      createdAt: '2026-01-01T00:00:00Z',
    };
    (getJob as any).mockResolvedValue(job);

    const res = await jobIdGET(
      createRequest('http://localhost/api/data-pipeline/jobs/j1'),
      params('j1'),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe('j1');
    expect(data.status).toBe('completed');
    expect(data.output).toEqual({ resultCount: 5 });
    expect(data.progress).toBe(100);
  });

  it('returns 404 for missing job', async () => {
    (getJob as any).mockResolvedValue(null);

    const res = await jobIdGET(
      createRequest('http://localhost/api/data-pipeline/jobs/nope'),
      params('nope'),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Job not found' });
  });

  it('returns 404 for another user\'s job', async () => {
    const job = {
      id: 'j2',
      userId: 'other-user',
      jobType: 'research',
      status: 'completed',
      progress: 100,
      error: null,
      output: null,
      startedAt: null,
      completedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    (getJob as any).mockResolvedValue(job);

    const res = await jobIdGET(
      createRequest('http://localhost/api/data-pipeline/jobs/j2'),
      params('j2'),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Not found' });
  });
});

// ===========================================================================
// CONNECTORS ROUTES
// ===========================================================================

describe('GET /api/connectors', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('lists user\'s connectors', async () => {
    const connectors = [
      { id: 'c1', name: 'My Connector', adapterKey: 'google-trends' },
    ];
    (db.dataConnectorConfig.findMany as any).mockResolvedValue(connectors);

    const res = await connectorsListGET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(connectors);
    expect(db.dataConnectorConfig.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('POST /api/connectors', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('creates a connector', async () => {
    const created = { id: 'c-new', name: 'New', adapterKey: 'reddit', type: 'preset' };
    (db.dataConnectorConfig.create as any).mockResolvedValue(created);

    const res = await connectorsPOST(
      createRequest('http://localhost/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New', adapterKey: 'reddit' }),
      }),
    );

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
    expect(db.dataConnectorConfig.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'New',
        adapterKey: 'reddit',
        type: 'preset',
        config: '{}',
        dataMapping: '{}',
        refreshSchedule: 'manual',
      },
    });
  });

  it('returns 400 if name is missing', async () => {
    const res = await connectorsPOST(
      createRequest('http://localhost/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapterKey: 'reddit' }),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'name and adapterKey are required' });
  });

  it('returns 400 if adapterKey is missing', async () => {
    const res = await connectorsPOST(
      createRequest('http://localhost/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New' }),
      }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'name and adapterKey are required' });
  });

  it('passes custom config, dataMapping, type, and refreshSchedule', async () => {
    (db.dataConnectorConfig.create as any).mockResolvedValue({ id: 'c2' });

    await connectorsPOST(
      createRequest('http://localhost/api/connectors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Custom',
          adapterKey: 'reddit',
          type: 'custom',
          config: { apiKey: 'abc' },
          dataMapping: { field: 'value' },
          refreshSchedule: 'daily',
        }),
      }),
    );

    expect(db.dataConnectorConfig.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Custom',
        adapterKey: 'reddit',
        type: 'custom',
        config: JSON.stringify({ apiKey: 'abc' }),
        dataMapping: JSON.stringify({ field: 'value' }),
        refreshSchedule: 'daily',
      },
    });
  });
});

describe('GET /api/connectors/[id]', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns a connector by id', async () => {
    const connector = { id: 'c1', name: 'My Conn' };
    (db.dataConnectorConfig.findFirst as any).mockResolvedValue(connector);

    const res = await connectorIdGET(
      createRequest('http://localhost/api/connectors/c1'),
      params('c1'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(connector);
  });

  it('returns 404 for non-existent connector', async () => {
    (db.dataConnectorConfig.findFirst as any).mockResolvedValue(null);

    const res = await connectorIdGET(
      createRequest('http://localhost/api/connectors/nope'),
      params('nope'),
    );

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/connectors/[id]', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('updates connector config', async () => {
    const existing = { id: 'c1', name: 'Old' };
    const updated = { id: 'c1', name: 'Old', config: '{"key":"val"}' };
    (db.dataConnectorConfig.findFirst as any).mockResolvedValue(existing);
    (db.dataConnectorConfig.update as any).mockResolvedValue(updated);

    const res = await connectorIdPATCH(
      createRequest('http://localhost/api/connectors/c1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { key: 'val' } }),
      }),
      params('c1'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
    expect(db.dataConnectorConfig.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        config: JSON.stringify({ key: 'val' }),
      },
    });
  });

  it('updates connector name and refreshSchedule', async () => {
    (db.dataConnectorConfig.findFirst as any).mockResolvedValue({ id: 'c1' });
    (db.dataConnectorConfig.update as any).mockResolvedValue({ id: 'c1', name: 'Renamed' });

    const res = await connectorIdPATCH(
      createRequest('http://localhost/api/connectors/c1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Renamed', refreshSchedule: 'hourly' }),
      }),
      params('c1'),
    );

    expect(res.status).toBe(200);
    expect(db.dataConnectorConfig.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        name: 'Renamed',
        refreshSchedule: 'hourly',
      },
    });
  });

  it('returns 404 if connector does not exist', async () => {
    (db.dataConnectorConfig.findFirst as any).mockResolvedValue(null);

    const res = await connectorIdPATCH(
      createRequest('http://localhost/api/connectors/nope', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'x' }),
      }),
      params('nope'),
    );

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/connectors/[id]', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('deletes the connector', async () => {
    (db.dataConnectorConfig.findFirst as any).mockResolvedValue({ id: 'c1' });
    (db.dataConnectorConfig.delete as any).mockResolvedValue({});

    const res = await connectorIdDELETE(
      createRequest('http://localhost/api/connectors/c1'),
      params('c1'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(db.dataConnectorConfig.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('returns 404 if connector does not exist', async () => {
    (db.dataConnectorConfig.findFirst as any).mockResolvedValue(null);

    const res = await connectorIdDELETE(
      createRequest('http://localhost/api/connectors/nope'),
      params('nope'),
    );

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// CONTENT VERSIONS ROUTE
// ===========================================================================

describe('GET /api/content-versions', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns versions for a given entity', async () => {
    const versions = [
      { id: 'v1', entityType: 'market_research', entityId: 'r1', content: 'Version 1' },
      { id: 'v2', entityType: 'market_research', entityId: 'r1', content: 'Version 2' },
    ];
    (db.contentVersion.findMany as any).mockResolvedValue(versions);

    const res = await contentVersionsGET(
      createRequest('http://localhost/api/content-versions?entityType=market_research&entityId=r1'),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(versions);
    expect(db.contentVersion.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', entityType: 'market_research', entityId: 'r1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns 400 if entityType is missing', async () => {
    const res = await contentVersionsGET(
      createRequest('http://localhost/api/content-versions?entityId=r1'),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'entityType and entityId are required' });
  });

  it('returns 400 if entityId is missing', async () => {
    const res = await contentVersionsGET(
      createRequest('http://localhost/api/content-versions?entityType=market_research'),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'entityType and entityId are required' });
  });

  it('returns 400 if both entityType and entityId are missing', async () => {
    const res = await contentVersionsGET(
      createRequest('http://localhost/api/content-versions'),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'entityType and entityId are required' });
  });
});
