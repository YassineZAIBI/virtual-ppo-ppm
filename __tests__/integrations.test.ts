import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — declared before imports
// ---------------------------------------------------------------------------

const mockSession = { user: { id: 'user-1', email: 'test@example.com' } };

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/db', () => {
  const mockDb = {
    userSettingsRecord: {
      upsert: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    integrationConnection: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return { db: mockDb };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { POST as connectPOST } from '@/app/api/integrations/connect/route';
import { POST as disconnectPOST } from '@/app/api/integrations/disconnect/route';
import { GET as statusGET } from '@/app/api/integrations/status/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, method = 'POST'): Request {
  return new Request('http://localhost:3000/api/integrations/connect', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Request;
}

function makeGetRequest(): Request {
  return new Request('http://localhost:3000/api/integrations/status', {
    method: 'GET',
  }) as unknown as Request;
}

// ============================================================================
// POST /api/integrations/connect
// ============================================================================

describe('POST /api/integrations/connect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const res = await connectPOST(makeRequest({ integrationType: 'notion', credentials: {} }) as any);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 for invalid integration type', async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

    const res = await connectPOST(
      makeRequest({ integrationType: 'invalid_type', credentials: {} }) as any
    );
    expect(res.status).toBe(400);
  });

  it('saves credentials via upsert on UserSettingsRecord', async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

    const res = await connectPOST(
      makeRequest({
        integrationType: 'notion',
        credentials: { notionAccessToken: 'secret_abc123' },
      }) as any
    );

    expect(res.status).toBe(200);
    expect(db.userSettingsRecord.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({ userId: 'user-1', notionAccessToken: 'secret_abc123' }),
        update: expect.objectContaining({ notionAccessToken: 'secret_abc123' }),
      })
    );
  });

  it('creates IntegrationConnection with status connected', async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

    const res = await connectPOST(
      makeRequest({
        integrationType: 'linear',
        credentials: { linearApiKey: 'lin_key' },
        displayName: 'My Linear',
      }) as any
    );

    expect(res.status).toBe(200);
    expect(db.integrationConnection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_integrationType: { userId: 'user-1', integrationType: 'linear' },
        },
        create: expect.objectContaining({
          userId: 'user-1',
          integrationType: 'linear',
          status: 'connected',
          displayName: 'My Linear',
        }),
        update: expect.objectContaining({
          status: 'connected',
          displayName: 'My Linear',
        }),
      })
    );
  });
});

// ============================================================================
// POST /api/integrations/disconnect
// ============================================================================

describe('POST /api/integrations/disconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const res = await disconnectPOST(makeRequest({ integrationType: 'notion' }) as any);
    expect(res.status).toBe(401);
  });

  it('clears credential fields on UserSettingsRecord', async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

    const res = await disconnectPOST(
      makeRequest({ integrationType: 'jira' }) as any
    );

    expect(res.status).toBe(200);
    expect(db.userSettingsRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        data: expect.objectContaining({
          jiraUrl: '',
          jiraEmail: '',
          jiraApiToken: '',
        }),
      })
    );
  });

  it('updates IntegrationConnection status to disconnected', async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);

    const res = await disconnectPOST(
      makeRequest({ integrationType: 'notion' }) as any
    );

    expect(res.status).toBe(200);
    expect(db.integrationConnection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          status: 'disconnected',
          lastSyncAt: null,
        }),
      })
    );
  });
});

// ============================================================================
// GET /api/integrations/status
// ============================================================================

describe('GET /api/integrations/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const res = await statusGET(makeGetRequest() as any);
    expect(res.status).toBe(401);
  });

  it('returns connections for the user', async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);
    const mockConnections = [
      { id: 'ic-1', integrationType: 'notion', status: 'connected' },
      { id: 'ic-2', integrationType: 'slack', status: 'connected' },
    ];
    (db.integrationConnection.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockConnections);

    const res = await statusGET(makeGetRequest() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.connections).toHaveLength(2);
    expect(json.connections[0].integrationType).toBe('notion');
  });

  it('returns empty array when user has no connections', async () => {
    (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSession);
    (db.integrationConnection.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

    const res = await statusGET(makeGetRequest() as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.connections).toEqual([]);
  });
});
