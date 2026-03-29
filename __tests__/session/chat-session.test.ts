import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

// ── Mocks ──────────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockFindMany = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    chatSession: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      create: (...a: unknown[]) => mockCreate(...a),
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
});

// ── GET /api/chat/sessions ─────────────────────────────────────────────
describe('GET /api/chat/sessions', () => {
  let GET: (req: any) => Promise<Response>;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/chat/sessions/route'));
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await GET(createRequest('http://localhost/api/chat/sessions'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns an empty array when the user has no sessions', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockFindMany.mockResolvedValue([]);

    const res = await GET(createRequest('http://localhost/api/chat/sessions'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([]);
  });

  it('returns sessions with _count.messages included', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockFindMany.mockResolvedValue([
      { id: 'cs-1', title: 'Session 1', pillar: 'general', _count: { messages: 5 } },
      { id: 'cs-2', title: 'Session 2', pillar: 'strategy', _count: { messages: 12 } },
    ]);

    const res = await GET(createRequest('http://localhost/api/chat/sessions'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(body[0]._count.messages).toBe(5);
    expect(body[1]._count.messages).toBe(12);
  });

  it('queries only sessions belonging to the authenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockFindMany.mockResolvedValue([]);

    await GET(createRequest('http://localhost/api/chat/sessions'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
      }),
    );
  });

  it('orders sessions by updatedAt desc', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockFindMany.mockResolvedValue([]);

    await GET(createRequest('http://localhost/api/chat/sessions'));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { updatedAt: 'desc' },
      }),
    );
  });
});

// ── POST /api/chat/sessions ────────────────────────────────────────────
describe('POST /api/chat/sessions', () => {
  let POST: (req: any) => Promise<Response>;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/chat/sessions/route'));
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await POST(
      createRequest('http://localhost/api/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({ title: 'My Chat' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(res.status).toBe(401);
  });

  it('creates a session with provided title and pillar', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockCreate.mockResolvedValue({
      id: 'cs-new',
      userId: 'user-1',
      title: 'My Chat',
      pillar: 'vision',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await POST(
      createRequest('http://localhost/api/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({ title: 'My Chat', pillar: 'vision' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe('cs-new');
    expect(body.title).toBe('My Chat');
    expect(body.pillar).toBe('vision');

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          userId: 'user-1',
          title: 'My Chat',
          pillar: 'vision',
        },
      }),
    );
  });

  it('defaults title to "New conversation" and pillar to "general" when omitted', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockCreate.mockResolvedValue({
      id: 'cs-default',
      userId: 'user-1',
      title: 'New conversation',
      pillar: 'general',
    });

    const res = await POST(
      createRequest('http://localhost/api/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(res.status).toBe(201);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'New conversation',
          pillar: 'general',
        }),
      }),
    );
  });

  it('returns 500 when db.create throws', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockCreate.mockRejectedValue(new Error('DB error'));

    const res = await POST(
      createRequest('http://localhost/api/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({ title: 'fail' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});
