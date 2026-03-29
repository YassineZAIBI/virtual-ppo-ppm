import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockRunFindMany = vi.fn();
const mockRunCount = vi.fn();
const mockRunFindFirst = vi.fn();
const mockRunUpdate = vi.fn();
const mockJobUpdateMany = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    cronRun: {
      findMany: (...args: unknown[]) => mockRunFindMany(...args),
      count: (...args: unknown[]) => mockRunCount(...args),
      findFirst: (...args: unknown[]) => mockRunFindFirst(...args),
      update: (...args: unknown[]) => mockRunUpdate(...args),
    },
    cronJob: {
      updateMany: (...args: unknown[]) => mockJobUpdateMany(...args),
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
// /api/cron/runs  (GET)
// ---------------------------------------------------------------------------
describe('/api/cron/runs', () => {
  let GET: any;

  beforeEach(async () => {
    const mod = await import('@/app/api/cron/runs/route');
    GET = mod.GET;
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(createRequest('http://localhost/api/cron/runs'));
    expect(res.status).toBe(401);
  });

  it('returns paginated list of cron runs', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const runs = [
      { id: 'run-1', jobType: 'competitor_scan', status: 'completed' },
      { id: 'run-2', jobType: 'risk_reassess', status: 'running' },
    ];
    mockRunFindMany.mockResolvedValueOnce(runs);
    mockRunCount.mockResolvedValueOnce(2);

    const res = await GET(createRequest('http://localhost/api/cron/runs'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.runs).toHaveLength(2);
    expect(json.pagination.total).toBe(2);
  });

  it('supports jobType filter', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockRunFindMany.mockResolvedValueOnce([]);
    mockRunCount.mockResolvedValueOnce(0);

    const res = await GET(
      createRequest('http://localhost/api/cron/runs?jobType=market_pulse'),
    );
    expect(res.status).toBe(200);
    expect(mockRunFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          jobType: 'market_pulse',
        }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// /api/cron/runs/[id]  (GET, PATCH)
// ---------------------------------------------------------------------------
describe('/api/cron/runs/[id]', () => {
  let GET: any, PATCH: any;

  beforeEach(async () => {
    const mod = await import('@/app/api/cron/runs/[id]/route');
    GET = mod.GET;
    PATCH = mod.PATCH;
  });

  it('GET returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await GET(createRequest('http://localhost/api/cron/runs/run-1'), params('run-1'));
    expect(res.status).toBe(401);
  });

  it('GET returns a single run', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const run = { id: 'run-1', jobType: 'competitor_scan', status: 'completed' };
    mockRunFindFirst.mockResolvedValueOnce(run);

    const res = await GET(createRequest('http://localhost/api/cron/runs/run-1'), params('run-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('run-1');
  });

  it('GET returns 404 for unknown run', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockRunFindFirst.mockResolvedValueOnce(null);

    const res = await GET(createRequest('http://localhost/api/cron/runs/bad'), params('bad'));
    expect(res.status).toBe(404);
  });

  it('PATCH updates run status and propagates to parent job on completion', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const existing = { id: 'run-1', jobType: 'competitor_scan', status: 'running' };
    mockRunFindFirst.mockResolvedValueOnce(existing);
    const updated = { ...existing, status: 'completed', result: '{"items":5}' };
    mockRunUpdate.mockResolvedValueOnce(updated);
    mockJobUpdateMany.mockResolvedValueOnce({ count: 1 });

    const res = await PATCH(
      createRequest('http://localhost/api/cron/runs/run-1', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'completed',
          result: { items: 5 },
          duration: 4200,
          tokensUsed: 1500,
        }),
      }),
      params('run-1'),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('completed');

    // Verify the parent cronJob was also updated
    expect(mockJobUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          jobType: 'competitor_scan',
        }),
        data: expect.objectContaining({
          runCount: { increment: 1 },
        }),
      }),
    );
  });

  it('PATCH returns 404 for unknown run', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockRunFindFirst.mockResolvedValueOnce(null);

    const res = await PATCH(
      createRequest('http://localhost/api/cron/runs/bad', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      }),
      params('bad'),
    );
    expect(res.status).toBe(404);
  });
});
