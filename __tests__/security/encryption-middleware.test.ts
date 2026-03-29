import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';

// ── Mocks ──────────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────
const mockSession = {
  user: { id: 'user-1', name: 'Test User', email: 'test@test.com' },
};

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Profile GET tests ──────────────────────────────────────────────────
describe('GET /api/profile', () => {
  let GET: (req: any) => Promise<Response>;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/profile/route'));
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await GET(createRequest('http://localhost/api/profile'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when user is not found in DB', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockFindUnique.mockResolvedValue(null);

    const res = await GET(createRequest('http://localhost/api/profile'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('User not found');
  });

  it('returns user data WITHOUT password hash in the select clause', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      email: 'test@test.com',
      image: null,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
      visionComplete: false,
      onboarding: { completed: true },
    });

    const res = await GET(createRequest('http://localhost/api/profile'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.id).toBe('user-1');
    expect(body.name).toBe('Test User');
    expect(body.email).toBe('test@test.com');
    // Must NEVER include password / passwordHash
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('hashedPassword');
  });

  it('verifies that findUnique select does not include password fields', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Test',
      email: 'test@test.com',
      image: null,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
      visionComplete: false,
      onboarding: null,
    });

    await GET(createRequest('http://localhost/api/profile'));

    // Assert the select object passed to Prisma does not contain password fields
    const selectArg = mockFindUnique.mock.calls[0][0].select;
    expect(selectArg).toBeDefined();
    expect(selectArg.password).toBeUndefined();
    expect(selectArg.passwordHash).toBeUndefined();
    expect(selectArg.hashedPassword).toBeUndefined();
  });

  it('maps onboarding.completed to onboardingCompleted and removes nested onboarding', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Test',
      email: 'test@test.com',
      image: null,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
      visionComplete: true,
      onboarding: { completed: true },
    });

    const res = await GET(createRequest('http://localhost/api/profile'));
    const body = await res.json();

    expect(body.onboardingCompleted).toBe(true);
    // The raw onboarding field is spread as undefined
    expect(body.onboarding).toBeUndefined();
  });

  it('defaults onboardingCompleted to false when onboarding is null', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockFindUnique.mockResolvedValue({
      id: 'user-1',
      name: 'Test',
      email: 'test@test.com',
      image: null,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
      visionComplete: false,
      onboarding: null,
    });

    const res = await GET(createRequest('http://localhost/api/profile'));
    const body = await res.json();

    expect(body.onboardingCompleted).toBe(false);
  });
});

// ── Profile PATCH tests ────────────────────────────────────────────────
describe('PATCH /api/profile', () => {
  let PATCH: (req: any) => Promise<Response>;

  beforeEach(async () => {
    ({ PATCH } = await import('@/app/api/profile/route'));
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await PATCH(
      createRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'New Name' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(res.status).toBe(401);
  });

  it('returns 400 when name is not a string', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);

    const res = await PATCH(
      createRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 123 }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('name must be a string');
  });

  it('updates the user name and returns profile without password hash', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockUpdate.mockResolvedValue({
      id: 'user-1',
      name: 'Updated Name',
      email: 'test@test.com',
      image: null,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
      visionComplete: false,
      onboarding: { completed: false },
    });

    const res = await PATCH(
      createRequest('http://localhost/api/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Name' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe('Updated Name');
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('passwordHash');

    // Verify update was called with correct data
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({ name: 'Updated Name' }),
      }),
    );
  });
});

// ── Encryption utility tests ───────────────────────────────────────────
describe('encrypt / decrypt (src/lib/encryption.ts)', () => {
  const VALID_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when CREDENTIALS_ENCRYPTION_KEY is not set', async () => {
    vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', '');
    // Re-import to pick up the fresh module (vitest caches, but we test the function at call time)
    const { encrypt } = await import('@/lib/encryption');
    expect(() => encrypt('hello')).toThrow('CREDENTIALS_ENCRYPTION_KEY');
  });

  it('throws when key length is not 64 hex characters', async () => {
    vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', 'tooshort');
    const { encrypt } = await import('@/lib/encryption');
    expect(() => encrypt('hello')).toThrow('64-character hex string');
  });

  it('encrypts and decrypts a string symmetrically', async () => {
    vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', VALID_KEY);
    const { encrypt, decrypt } = await import('@/lib/encryption');

    const plaintext = 'sensitive-data-12345';
    const encrypted = encrypt(plaintext);

    expect(encrypted).not.toBe(plaintext);
    // Format: iv:authTag:ciphertext
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('produces different ciphertexts for the same plaintext (random IV)', async () => {
    vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', VALID_KEY);
    const { encrypt } = await import('@/lib/encryption');

    const a = encrypt('same-text');
    const b = encrypt('same-text');

    // Because a fresh random IV is generated each call, the outputs must differ
    expect(a).not.toBe(b);
  });

  it('throws on invalid ciphertext format during decrypt', async () => {
    vi.stubEnv('CREDENTIALS_ENCRYPTION_KEY', VALID_KEY);
    const { decrypt } = await import('@/lib/encryption');

    expect(() => decrypt('not-valid')).toThrow('Invalid encrypted text format');
  });
});
