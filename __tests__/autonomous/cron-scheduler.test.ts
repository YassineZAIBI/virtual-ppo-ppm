import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockFindFirst = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    cronJob: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
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
  process.env.CRON_SECRET = 'test-cron-secret';
});

// ---------------------------------------------------------------------------
// /api/cron/jobs  (GET, POST)
// ---------------------------------------------------------------------------
import { GET as jobsGET, POST as jobsPOST } from '@/app/api/cron/jobs/route';

describe('/api/cron/jobs', () => {
  it('GET returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await jobsGET(createRequest('http://localhost/api/cron/jobs'));
    expect(res.status).toBe(401);
  });

  it('POST returns 401 when cron secret is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const res = await jobsPOST(
      createRequest('http://localhost/api/cron/jobs', {
        method: 'POST',
        body: JSON.stringify({ jobType: 'competitor_scan', schedule: '0 * * * *' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('GET returns a list of cron jobs', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const jobs = [
      { id: 'job-1', jobType: 'competitor_scan', schedule: '0 * * * *', status: 'active' },
    ];
    mockFindMany.mockResolvedValueOnce(jobs);

    const res = await jobsGET(createRequest('http://localhost/api/cron/jobs'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.jobs).toHaveLength(1);
    expect(json.jobs[0].jobType).toBe('competitor_scan');
  });

  it('POST creates a cron job and returns 201', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce(null);
    const newJob = {
      id: 'job-2',
      userId: 'user-1',
      jobType: 'market_pulse',
      schedule: '0 6 * * *',
      status: 'active',
    };
    mockCreate.mockResolvedValueOnce(newJob);

    const res = await jobsPOST(
      createRequest('http://localhost/api/cron/jobs', {
        method: 'POST',
        headers: { 'x-cron-secret': 'test-cron-secret' },
        body: JSON.stringify({ jobType: 'market_pulse', schedule: '0 6 * * *' }),
      }),
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.jobType).toBe('market_pulse');
    expect(json.status).toBe('active');
  });

  it('POST returns 409 when duplicate jobType exists', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce({ id: 'job-existing' });

    const res = await jobsPOST(
      createRequest('http://localhost/api/cron/jobs', {
        method: 'POST',
        headers: { 'x-cron-secret': 'test-cron-secret' },
        body: JSON.stringify({ jobType: 'competitor_scan', schedule: '0 * * * *' }),
      }),
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('already exists');
  });

  it('POST returns 400 for invalid jobType', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

    const res = await jobsPOST(
      createRequest('http://localhost/api/cron/jobs', {
        method: 'POST',
        headers: { 'x-cron-secret': 'test-cron-secret' },
        body: JSON.stringify({ jobType: 'invalid_type', schedule: '0 * * * *' }),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('jobType must be one of');
  });

  it('POST returns 400 when required fields are missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);

    const res = await jobsPOST(
      createRequest('http://localhost/api/cron/jobs', {
        method: 'POST',
        headers: { 'x-cron-secret': 'test-cron-secret' },
        body: JSON.stringify({}),
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('jobType and schedule are required');
  });
});

// ---------------------------------------------------------------------------
// /api/cron/jobs/[id]  (GET, PATCH, DELETE)
// ---------------------------------------------------------------------------
import { GET as jobIdGET, PATCH as jobIdPATCH, DELETE as jobIdDELETE } from '@/app/api/cron/jobs/[id]/route';

describe('/api/cron/jobs/[id]', () => {
  beforeEach(() => {
    vi.mocked(getServerSession).mockReset();
    mockFindFirst.mockReset();
    mockUpdate.mockReset();
    mockDelete.mockReset();
  });

  it('GET returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const res = await jobIdGET(createRequest('http://localhost/api/cron/jobs/job-1'), params('job-1'));
    expect(res.status).toBe(401);
  });

  it('GET returns job by id', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    const job = { id: 'job-1', jobType: 'risk_reassess', schedule: '0 12 * * *', status: 'active' };
    mockFindFirst.mockResolvedValueOnce(job);

    const res = await jobIdGET(createRequest('http://localhost/api/cron/jobs/job-1'), params('job-1'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe('job-1');
  });

  it('GET returns 404 for unknown id', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await jobIdGET(createRequest('http://localhost/api/cron/jobs/bad'), params('bad'));
    expect(res.status).toBe(404);
  });

  it('PATCH updates schedule and status', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce({ id: 'job-1' });
    const updated = { id: 'job-1', schedule: '30 * * * *', status: 'paused' };
    mockUpdate.mockResolvedValueOnce(updated);

    const res = await jobIdPATCH(
      createRequest('http://localhost/api/cron/jobs/job-1', {
        method: 'PATCH',
        body: JSON.stringify({ schedule: '30 * * * *', status: 'paused' }),
      }),
      params('job-1'),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('paused');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ schedule: '30 * * * *', status: 'paused' }),
      }),
    );
  });

  it('DELETE removes the cron job', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce({ id: 'job-1' });
    mockDelete.mockResolvedValueOnce({});

    const res = await jobIdDELETE(
      createRequest('http://localhost/api/cron/jobs/job-1', { method: 'DELETE' }),
      params('job-1'),
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'job-1' } });
  });

  it('DELETE returns 404 for unknown id', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(mockSession);
    mockFindFirst.mockResolvedValueOnce(null);

    const res = await jobIdDELETE(
      createRequest('http://localhost/api/cron/jobs/bad', { method: 'DELETE' }),
      params('bad'),
    );
    expect(res.status).toBe(404);
  });
});
