import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

// ── Mocks ──────────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockUserFindUnique = vi.fn();
const mockNorthStarFindUnique = vi.fn();
const mockBusinessGoalFindMany = vi.fn();
const mockInitiativeFindMany = vi.fn();
const mockRiskFindMany = vi.fn();
const mockCompetitorFindMany = vi.fn();
const mockCompetitorFeedFindMany = vi.fn();
const mockAlignmentScoreFindMany = vi.fn();
const mockBusinessImpactFindMany = vi.fn();
const mockChatSessionFindMany = vi.fn();
const mockMeetingFindMany = vi.fn();
const mockCronJobFindMany = vi.fn();
const mockCronRunFindMany = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: (...a: unknown[]) => mockUserFindUnique(...a) },
    northStar: { findUnique: (...a: unknown[]) => mockNorthStarFindUnique(...a) },
    businessGoal: { findMany: (...a: unknown[]) => mockBusinessGoalFindMany(...a) },
    initiative: { findMany: (...a: unknown[]) => mockInitiativeFindMany(...a) },
    risk: { findMany: (...a: unknown[]) => mockRiskFindMany(...a) },
    competitor: { findMany: (...a: unknown[]) => mockCompetitorFindMany(...a) },
    competitorFeed: { findMany: (...a: unknown[]) => mockCompetitorFeedFindMany(...a) },
    alignmentScore: { findMany: (...a: unknown[]) => mockAlignmentScoreFindMany(...a) },
    businessImpact: { findMany: (...a: unknown[]) => mockBusinessImpactFindMany(...a) },
    chatSession: { findMany: (...a: unknown[]) => mockChatSessionFindMany(...a) },
    meeting: { findMany: (...a: unknown[]) => mockMeetingFindMany(...a) },
    cronJob: { findMany: (...a: unknown[]) => mockCronJobFindMany(...a) },
    cronRun: { findMany: (...a: unknown[]) => mockCronRunFindMany(...a) },
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────
const mockSession = {
  user: { id: 'user-1', name: 'Test', email: 'test@test.com' },
};

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any;
}

/** Stub all DB finders to return empty / minimal data */
function stubAllDbCalls(overrides: Record<string, unknown> = {}) {
  mockUserFindUnique.mockResolvedValue(
    'user' in overrides ? overrides.user : { name: 'Test', email: 'test@test.com', createdAt: new Date() },
  );
  mockNorthStarFindUnique.mockResolvedValue(overrides.northStar ?? null);
  mockBusinessGoalFindMany.mockResolvedValue(overrides.businessGoals ?? []);
  mockInitiativeFindMany.mockResolvedValue(overrides.initiatives ?? []);
  mockRiskFindMany.mockResolvedValue(overrides.risks ?? []);
  mockCompetitorFindMany.mockResolvedValue(overrides.competitors ?? []);
  mockCompetitorFeedFindMany.mockResolvedValue(overrides.competitorFeed ?? []);
  mockAlignmentScoreFindMany.mockResolvedValue(overrides.alignmentScores ?? []);
  mockBusinessImpactFindMany.mockResolvedValue(overrides.businessImpacts ?? []);
  mockChatSessionFindMany.mockResolvedValue(overrides.chatSessions ?? []);
  mockMeetingFindMany.mockResolvedValue(overrides.meetings ?? []);
  mockCronJobFindMany.mockResolvedValue(overrides.cronJobs ?? []);
  mockCronRunFindMany.mockResolvedValue(overrides.cronRuns ?? []);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────
describe('POST /api/profile/export', () => {
  let POST: (req: any) => Promise<Response>;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/profile/export/route'));
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await POST(
      createRequest('http://localhost/api/profile/export', { method: 'POST' }),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when the user record is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    stubAllDbCalls({ user: null });

    const res = await POST(
      createRequest('http://localhost/api/profile/export', { method: 'POST' }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('returns a JSON export with the expected top-level shape', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    stubAllDbCalls();

    const res = await POST(
      createRequest('http://localhost/api/profile/export', { method: 'POST' }),
    );

    expect(res.status).toBe(200);

    const body = JSON.parse(await res.text());

    // Top-level keys must be present
    expect(body).toHaveProperty('exportDate');
    expect(body).toHaveProperty('version', '3.0');
    expect(body).toHaveProperty('user');
    expect(body).toHaveProperty('vision');
    expect(body).toHaveProperty('strategy');
    expect(body).toHaveProperty('competitors');
    expect(body).toHaveProperty('conversations');
    expect(body).toHaveProperty('meetings');
    expect(body).toHaveProperty('cronJobs');

    // User section must NOT contain password
    expect(body.user).not.toHaveProperty('password');
    expect(body.user).not.toHaveProperty('passwordHash');
  });

  it('sets Content-Disposition header for file download', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    stubAllDbCalls();

    const res = await POST(
      createRequest('http://localhost/api/profile/export', { method: 'POST' }),
    );

    const disposition = res.headers.get('Content-Disposition');
    expect(disposition).toBeDefined();
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('azmyra-export-');
    expect(disposition).toContain('.json');
  });

  it('includes vision sub-sections with correct structure', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    stubAllDbCalls({
      northStar: { id: 'ns-1', statement: 'Be the best', userId: 'user-1' },
      businessGoals: [
        {
          id: 'bg-1',
          title: 'Grow revenue',
          targetGroups: [
            {
              id: 'tg-1',
              name: 'Enterprise',
              needs: [
                { id: 'n-1', description: 'Speed', products: [{ id: 'p-1', name: 'Widget' }] },
              ],
            },
          ],
        },
      ],
    });

    const res = await POST(
      createRequest('http://localhost/api/profile/export', { method: 'POST' }),
    );
    const body = JSON.parse(await res.text());

    expect(body.vision.northStar).toBeDefined();
    expect(body.vision.northStar.statement).toBe('Be the best');
    expect(body.vision.businessGoals).toHaveLength(1);
    expect(body.vision.targetGroups).toHaveLength(1);
    expect(body.vision.needs).toHaveLength(1);
    expect(body.vision.products).toHaveLength(1);
  });

  it('exports strategy section with initiatives and risks arrays', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    stubAllDbCalls({
      initiatives: [{ id: 'i-1', title: 'Launch V2' }],
      risks: [{ id: 'r-1', title: 'Supply chain' }],
    });

    const res = await POST(
      createRequest('http://localhost/api/profile/export', { method: 'POST' }),
    );
    const body = JSON.parse(await res.text());

    expect(body.strategy.initiatives).toHaveLength(1);
    expect(body.strategy.risks).toHaveLength(1);
    expect(body.strategy).toHaveProperty('alignmentScores');
    expect(body.strategy).toHaveProperty('businessImpacts');
  });
});
