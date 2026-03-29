import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

// ── Mocks ──────────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockUserFindUnique = vi.fn();
const mockUserDelete = vi.fn();
const mockTransaction = vi.fn();

// Build a deleteMany mock for every model referenced in the deletion route
const modelNames = [
  'competitorFeed', 'cronRun', 'cronJob', 'userAlert', 'alignmentScore',
  'businessImpact', 'productMapping', 'need', 'targetGroup', 'businessGoal',
  'northStar', 'competitor', 'chatMessage', 'chatSession', 'initiative',
  'risk', 'meeting', 'dataPoint', 'marketResearch', 'contentVersion',
  'dataConnectorConfig', 'dataJob', 'knowledgeDocument', 'pendingAction',
  'onboardingProgress', 'userSettingsRecord', 'syncRecord', 'shareComment',
  'shareLink', 'session', 'account',
] as const;

function buildDbMock() {
  const db: Record<string, Record<string, unknown>> = {};
  for (const name of modelNames) {
    db[name] = { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) };
  }
  db.user = {
    findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
    delete: (...a: unknown[]) => mockUserDelete(...a),
  };
  db.$transaction = (...a: unknown[]) => mockTransaction(...a);
  return db;
}

const dbMock = buildDbMock();

vi.mock('@/lib/db', () => ({ db: dbMock }));

// ── Helpers ────────────────────────────────────────────────────────────
const mockSession = {
  user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
};

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTransaction.mockResolvedValue(undefined);
});

// ── Tests ──────────────────────────────────────────────────────────────
describe('POST /api/profile/delete', () => {
  let POST: (req: any) => Promise<Response>;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/profile/delete/route'));
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await POST(
      createRequest('http://localhost/api/profile/delete', { method: 'POST' }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when the user record does not exist', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockUserFindUnique.mockResolvedValue(null);

    const res = await POST(
      createRequest('http://localhost/api/profile/delete', { method: 'POST' }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('deletes the account and returns success confirmation', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockUserFindUnique.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });

    const res = await POST(
      createRequest('http://localhost/api/profile/delete', { method: 'POST' }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(true);
    expect(body.message).toContain('permanently deleted');
  });

  it('executes all deletions inside a single transaction', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockUserFindUnique.mockResolvedValue({ id: 'user-1' });

    await POST(
      createRequest('http://localhost/api/profile/delete', { method: 'POST' }),
    );

    // $transaction must be called exactly once
    expect(mockTransaction).toHaveBeenCalledTimes(1);

    // The argument should be an array of deletion operations
    const txArg = mockTransaction.mock.calls[0][0];
    expect(Array.isArray(txArg)).toBe(true);
    // At least 20 models are deleted (leaf + vision + entities + auth + user)
    expect(txArg.length).toBeGreaterThanOrEqual(20);
  });

  it('returns 500 when the transaction fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockUserFindUnique.mockResolvedValue({ id: 'user-1' });
    mockTransaction.mockRejectedValue(new Error('DB connection lost'));

    const res = await POST(
      createRequest('http://localhost/api/profile/delete', { method: 'POST' }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});
