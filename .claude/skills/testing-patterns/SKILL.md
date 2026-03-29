---
name: testing-patterns
description: Use when writing tests for Azmyra — unit tests, API route tests, component tests with Vitest and React Testing Library. Covers mocking Prisma, NextAuth, and fetch.
allowed-tools: Read, Grep, Glob, Bash(npm:*)
---

# Testing Patterns — Azmyra (Vitest + RTL)

## Test File Location

```
src/
  __tests__/              # integration-level tests
    api/
      initiatives.test.ts
  components/
    views/
      DashboardView.test.tsx   # colocated component tests
  lib/
    services/
      encryption.test.ts       # colocated service tests
```

## API Route Test Template

```typescript
// src/__tests__/api/initiatives.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/initiatives/route';
import { NextRequest } from 'next/server';

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock Prisma db
vi.mock('@/lib/db', () => ({
  db: {
    initiative: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';

const mockSession = { user: { id: 'user-1', email: 'test@test.com', name: 'Test' } };

describe('GET /api/initiatives', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/initiatives');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns initiatives for authenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    vi.mocked(db.initiative.findMany).mockResolvedValue([{ id: '1', title: 'Test' }] as any);
    vi.mocked(db.initiative.count).mockResolvedValue(1);

    const req = new NextRequest('http://localhost/api/initiatives');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);
  });
});
```

## Component Test Template

```typescript
// src/components/views/FeatureView.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeatureView } from './FeatureView';

// Mock fetch
global.fetch = vi.fn();

// Mock Zustand store
vi.mock('@/lib/store', () => ({
  useAppStore: () => ({
    settings: { theme: 'dark' },
  }),
}));

describe('FeatureView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton initially', () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    } as any);

    render(<FeatureView />);
    expect(screen.getByTestId('skeleton') || document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders items after loading', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ id: '1', title: 'My Initiative' }] }),
    } as any);

    render(<FeatureView />);
    await waitFor(() => expect(screen.getByText('My Initiative')).toBeTruthy());
  });
});
```

## Service / Utility Test Template

```typescript
// src/lib/services/encryption.test.ts
import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '@/lib/encryption';

describe('encryption', () => {
  it('round-trips correctly', () => {
    const plaintext = 'my-api-key-12345';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it('produces unique ciphertexts for same input', () => {
    const a = encrypt('test');
    const b = encrypt('test');
    expect(a).not.toBe(b); // different IVs
  });
});
```

## Factory Functions (for reusable test data)

```typescript
// src/__tests__/factories.ts
export function makeInitiative(overrides = {}) {
  return {
    id: 'init-1',
    title: 'Test Initiative',
    status: 'idea',
    userId: 'user-1',
    metadata: '{}',
    extractedFacts: '[]',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

## Running Tests

```bash
npm run test              # run all tests
npm run test:watch        # watch mode
npx vitest run --coverage # with coverage report
npx vitest run src/__tests__/api/initiatives.test.ts  # single file
```

## Gotchas

- **`@/` alias works** in tests via `vitest.config.ts` resolve — no need to use relative paths
- **Mock Prisma at module level** — not inside `it()` blocks — or it won't intercept the import
- **JSON string fields in mocks** — mock them as strings (`metadata: '{}'`) to match the real DB shape
- **Don't test implementation details** — test behavior (what the user sees / what the API returns)
