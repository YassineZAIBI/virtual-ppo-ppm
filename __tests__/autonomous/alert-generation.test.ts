import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockAlertFindMany = vi.fn();
const mockAlertCount = vi.fn();
const mockAlertCreate = vi.fn();
const mockAlertFindFirst = vi.fn();
const mockAlertUpdate = vi.fn();
const mockAlertDelete = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    userAlert: {
      findMany: (...args: unknown[]) => mockAlertFindMany(...args),
      count: (...args: unknown[]) => mockAlertCount(...args),
      create: (...args: unknown[]) => mockAlertCreate(...args),
      findFirst: (...args: unknown[]) => mockAlertFindFirst(...args),
      update: (...args: unknown[]) => mockAlertUpdate(...args),
      delete: (...args: unknown[]) => mockAlertDelete(...args),
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
// /api/alerts  (GET, POST)
// ---------------------------------------------------------------------------
describe('/api/alerts', () => {
  let GET: any, POST: any;

  beforeEach(async () => {
    const mod = await import('@/app/api/alerts/route');
    GET = mod.GET;
    POST = mod.POST;
  });

  // --- AUTH ---
  it('GET returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(createRequest('http://localhost/api/alerts'));
    expect(res.status).toBe(401);
  });

  it('POST returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await POST(
      createRequest('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'competitor_move',
          severity: 'info',
          title: 'Test',
          message: 'Test msg',
        }),
      }),
    );
    expect(res.status).toBe(401);
  });

  // --- GET list ---
  it('GET returns paginated alerts filtered by isDismissed:false', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const alerts = [
      { id: 'a-1', type: 'competitor_move', severity: 'info', title: 'Alert 1' },
    ];
    mockAlertFindMany.mockResolvedValueOnce(alerts);
    mockAlertCount.mockResolvedValueOnce(1);

    const res = await GET(createRequest('http://localhost/api/alerts'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alerts).toHaveLength(1);
    expect(json.pagination.total).toBe(1);
    expect(mockAlertFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          isDismissed: false,
        }),
      }),
    );
  });

  it('GET supports unread, severity and type filters', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockAlertFindMany.mockResolvedValueOnce([]);
    mockAlertCount.mockResolvedValueOnce(0);

    const res = await GET(
      createRequest('http://localhost/api/alerts?unread=true&severity=critical&type=strategy_risk'),
    );
    expect(res.status).toBe(200);
    expect(mockAlertFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          isDismissed: false,
          isRead: false,
          severity: 'critical',
          type: 'strategy_risk',
        }),
      }),
    );
  });

  // --- POST create ---
  it('POST creates an alert and returns 201', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const newAlert = {
      id: 'a-2',
      userId: 'user-1',
      type: 'market_shift',
      severity: 'warning',
      title: 'New shift',
      message: 'Market moved',
    };
    mockAlertCreate.mockResolvedValueOnce(newAlert);

    const res = await POST(
      createRequest('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'market_shift',
          severity: 'warning',
          title: 'New shift',
          message: 'Market moved',
        }),
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.type).toBe('market_shift');
  });

  it('POST returns 400 when required fields are missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

    const res = await POST(
      createRequest('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ type: 'competitor_move' }),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('required');
  });

  it('POST returns 400 for invalid type', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

    const res = await POST(
      createRequest('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid_type',
          severity: 'info',
          title: 'X',
          message: 'Y',
        }),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('type must be one of');
  });

  it('POST returns 400 for invalid severity', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

    const res = await POST(
      createRequest('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'competitor_move',
          severity: 'extreme',
          title: 'X',
          message: 'Y',
        }),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('severity must be one of');
  });
});

// ---------------------------------------------------------------------------
// /api/alerts/[id]  (PATCH, DELETE)
// ---------------------------------------------------------------------------
describe('/api/alerts/[id]', () => {
  let PATCH: any, DELETE: any;

  beforeEach(async () => {
    const mod = await import('@/app/api/alerts/[id]/route');
    PATCH = mod.PATCH;
    DELETE = mod.DELETE;
  });

  it('PATCH returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await PATCH(
      createRequest('http://localhost/api/alerts/a-1', {
        method: 'PATCH',
        body: JSON.stringify({ isRead: true }),
      }),
      params('a-1'),
    );
    expect(res.status).toBe(401);
  });

  it('PATCH marks alert as read', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockAlertFindFirst.mockResolvedValueOnce({ id: 'a-1' });
    const updated = { id: 'a-1', isRead: true };
    mockAlertUpdate.mockResolvedValueOnce(updated);

    const res = await PATCH(
      createRequest('http://localhost/api/alerts/a-1', {
        method: 'PATCH',
        body: JSON.stringify({ isRead: true }),
      }),
      params('a-1'),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.isRead).toBe(true);
  });

  it('PATCH returns 404 for unknown alert', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockAlertFindFirst.mockResolvedValueOnce(null);

    const res = await PATCH(
      createRequest('http://localhost/api/alerts/bad', {
        method: 'PATCH',
        body: JSON.stringify({ isRead: true }),
      }),
      params('bad'),
    );
    expect(res.status).toBe(404);
  });

  it('PATCH returns 400 when no valid fields provided', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockAlertFindFirst.mockResolvedValueOnce({ id: 'a-1' });

    const res = await PATCH(
      createRequest('http://localhost/api/alerts/a-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'ignored' }),
      }),
      params('a-1'),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('isRead or isDismissed');
  });

  it('DELETE removes alert', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockAlertFindFirst.mockResolvedValueOnce({ id: 'a-1' });
    mockAlertDelete.mockResolvedValueOnce({});

    const res = await DELETE(
      createRequest('http://localhost/api/alerts/a-1', { method: 'DELETE' }),
      params('a-1'),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// /api/alerts/unread-count  (GET)
// ---------------------------------------------------------------------------
describe('/api/alerts/unread-count', () => {
  let GET: any;

  beforeEach(async () => {
    const mod = await import('@/app/api/alerts/unread-count/route');
    GET = mod.GET;
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(createRequest('http://localhost/api/alerts/unread-count'));
    expect(res.status).toBe(401);
  });

  it('returns unread count', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockAlertCount.mockResolvedValueOnce(7);

    const res = await GET(createRequest('http://localhost/api/alerts/unread-count'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.count).toBe(7);
    expect(mockAlertCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          isRead: false,
          isDismissed: false,
        }),
      }),
    );
  });
});
