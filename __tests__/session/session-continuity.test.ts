import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

// ── Mocks ──────────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockSessionFindFirst = vi.fn();
const mockSessionUpdate = vi.fn();
const mockSessionDelete = vi.fn();
const mockMessageDeleteMany = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    chatSession: {
      findFirst: (...a: unknown[]) => mockSessionFindFirst(...a),
      update: (...a: unknown[]) => mockSessionUpdate(...a),
      delete: (...a: unknown[]) => mockSessionDelete(...a),
    },
    chatMessage: {
      deleteMany: (...a: unknown[]) => mockMessageDeleteMany(...a),
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

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── GET /api/chat/sessions/[id] ────────────────────────────────────────
describe('GET /api/chat/sessions/[id]', () => {
  let GET: (req: any, ctx: any) => Promise<Response>;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/chat/sessions/[id]/route'));
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await GET(
      createRequest('http://localhost/api/chat/sessions/cs-1'),
      params('cs-1'),
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when session does not exist or belongs to another user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockSessionFindFirst.mockResolvedValue(null);

    const res = await GET(
      createRequest('http://localhost/api/chat/sessions/cs-missing'),
      params('cs-missing'),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Session not found');
  });

  it('returns the session with messages and _count', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockSessionFindFirst.mockResolvedValue({
      id: 'cs-1',
      title: 'My Session',
      pillar: 'general',
      messages: [
        { id: 'm-1', role: 'user', content: 'Hello', createdAt: new Date() },
        { id: 'm-2', role: 'assistant', content: 'Hi there', createdAt: new Date() },
      ],
      _count: { messages: 2 },
    });

    const res = await GET(
      createRequest('http://localhost/api/chat/sessions/cs-1'),
      params('cs-1'),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe('cs-1');
    expect(body.messages).toHaveLength(2);
    expect(body._count.messages).toBe(2);
  });

  it('scopes the query to the authenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockSessionFindFirst.mockResolvedValue(null);

    await GET(
      createRequest('http://localhost/api/chat/sessions/cs-1'),
      params('cs-1'),
    );

    expect(mockSessionFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cs-1', userId: 'user-1' },
      }),
    );
  });
});

// ── PATCH /api/chat/sessions/[id] ──────────────────────────────────────
describe('PATCH /api/chat/sessions/[id]', () => {
  let PATCH: (req: any, ctx: any) => Promise<Response>;

  beforeEach(async () => {
    ({ PATCH } = await import('@/app/api/chat/sessions/[id]/route'));
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await PATCH(
      createRequest('http://localhost/api/chat/sessions/cs-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'New Title' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      params('cs-1'),
    );

    expect(res.status).toBe(401);
  });

  it('returns 404 when the session is not owned by the user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockSessionFindFirst.mockResolvedValue(null);

    const res = await PATCH(
      createRequest('http://localhost/api/chat/sessions/cs-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'New Title' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      params('cs-1'),
    );

    expect(res.status).toBe(404);
  });

  it('updates title and returns the updated session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockSessionFindFirst.mockResolvedValue({ id: 'cs-1', userId: 'user-1' });
    mockSessionUpdate.mockResolvedValue({
      id: 'cs-1',
      title: 'Updated Title',
      pillar: 'general',
    });

    const res = await PATCH(
      createRequest('http://localhost/api/chat/sessions/cs-1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Title' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      params('cs-1'),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.title).toBe('Updated Title');
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cs-1' },
        data: expect.objectContaining({ title: 'Updated Title' }),
      }),
    );
  });
});

// ── DELETE /api/chat/sessions/[id] ─────────────────────────────────────
describe('DELETE /api/chat/sessions/[id]', () => {
  let DELETE: (req: any, ctx: any) => Promise<Response>;

  beforeEach(async () => {
    ({ DELETE } = await import('@/app/api/chat/sessions/[id]/route'));
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await DELETE(
      createRequest('http://localhost/api/chat/sessions/cs-1', { method: 'DELETE' }),
      params('cs-1'),
    );

    expect(res.status).toBe(401);
  });

  it('deletes messages first, then the session, and returns confirmation', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockSessionFindFirst.mockResolvedValue({ id: 'cs-1', userId: 'user-1' });
    mockMessageDeleteMany.mockResolvedValue({ count: 3 });
    mockSessionDelete.mockResolvedValue({ id: 'cs-1' });

    const res = await DELETE(
      createRequest('http://localhost/api/chat/sessions/cs-1', { method: 'DELETE' }),
      params('cs-1'),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.deleted).toBe(true);

    // Messages must be deleted before the session
    expect(mockMessageDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { chatSessionId: 'cs-1' } }),
    );
    expect(mockSessionDelete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cs-1' } }),
    );

    // Verify ordering: deleteMany called before delete
    const deleteManyOrder = mockMessageDeleteMany.mock.invocationCallOrder[0];
    const deleteOrder = mockSessionDelete.mock.invocationCallOrder[0];
    expect(deleteManyOrder).toBeLessThan(deleteOrder);
  });

  it('returns 404 when session is not found', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockSessionFindFirst.mockResolvedValue(null);

    const res = await DELETE(
      createRequest('http://localhost/api/chat/sessions/cs-missing', { method: 'DELETE' }),
      params('cs-missing'),
    );

    expect(res.status).toBe(404);
  });
});
