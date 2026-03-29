import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ authOptions: {} }));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST as extractPOST } from '@/app/api/vision/extract/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockSession = { user: { id: 'user-1', name: 'Test', email: 'test@test.com' } };

function createRequest(url: string, options?: RequestInit) {
  return new Request(url, options) as any;
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// AUTH TEST
// ===========================================================================

describe('Auth guard (401 when unauthenticated)', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(null);
  });

  it('POST /api/vision/extract', async () => {
    const res = await extractPOST(
      createRequest('http://localhost/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: [{ type: 'text', content: 'Our company vision...' }],
          llmConfig: { provider: 'openai', apiKey: 'sk-test' },
        }),
      }),
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });
});

// ===========================================================================
// POST /api/vision/extract — Vision extraction
// ===========================================================================

describe('POST /api/vision/extract', () => {
  beforeEach(() => {
    (getServerSession as any).mockResolvedValue(mockSession);
  });

  it('returns 400 when sources array is missing', async () => {
    const res = await extractPOST(
      createRequest('http://localhost/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmConfig: { provider: 'openai', apiKey: 'sk-test' },
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'sources array is required and must not be empty' });
  });

  it('returns 400 when sources array is empty', async () => {
    const res = await extractPOST(
      createRequest('http://localhost/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: [],
          llmConfig: { provider: 'openai', apiKey: 'sk-test' },
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'sources array is required and must not be empty' });
  });

  it('returns 400 when a source has an invalid type', async () => {
    const res = await extractPOST(
      createRequest('http://localhost/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: [{ type: 'invalid', content: 'Some content' }],
          llmConfig: { provider: 'openai', apiKey: 'sk-test' },
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Each source must have a type of "document", "url", or "text"',
    });
  });

  it('returns 400 when a source has empty content', async () => {
    const res = await extractPOST(
      createRequest('http://localhost/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: [{ type: 'text', content: '' }],
          llmConfig: { provider: 'openai', apiKey: 'sk-test' },
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Each source must have a non-empty content string',
    });
  });

  it('returns 400 when llmConfig is missing', async () => {
    const res = await extractPOST(
      createRequest('http://localhost/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: [{ type: 'text', content: 'Our vision is...' }],
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'LLM configuration required for vision extraction' });
  });

  it('returns 400 when llmConfig.provider is missing', async () => {
    const res = await extractPOST(
      createRequest('http://localhost/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: [{ type: 'text', content: 'Our vision is...' }],
          llmConfig: { apiKey: 'sk-test' },
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'LLM configuration required for vision extraction' });
  });

  it('returns 400 when llmConfig.apiKey is missing', async () => {
    const res = await extractPOST(
      createRequest('http://localhost/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: [{ type: 'text', content: 'Our vision is...' }],
          llmConfig: { provider: 'openai' },
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'LLM configuration required for vision extraction' });
  });

  it('returns placeholder extraction with valid sources and llmConfig', async () => {
    const res = await extractPOST(
      createRequest('http://localhost/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: [
            { type: 'text', content: 'We aim to be the leading platform for product managers.' },
          ],
          llmConfig: { provider: 'openai', apiKey: 'sk-test', model: 'gpt-4' },
        }),
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('placeholder');
    expect(data.sourceCount).toBe(1);
    expect(data.proposed).toBeDefined();
    expect(data.proposed.northStar).toBeDefined();
    expect(data.proposed.northStar.statement).toBeTruthy();
    expect(data.proposed.businessGoals).toEqual([]);
    expect(data.proposed.targetGroups).toEqual([]);
    expect(data.proposed.needs).toEqual([]);
    expect(data.proposed.products).toEqual([]);
  });

  it('handles multiple sources and reports correct sourceCount', async () => {
    const res = await extractPOST(
      createRequest('http://localhost/api/vision/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sources: [
            { type: 'text', content: 'Company mission statement...' },
            { type: 'document', content: 'Strategic plan document...' },
            { type: 'url', content: 'https://example.com/about' },
          ],
          llmConfig: { provider: 'openai', apiKey: 'sk-test' },
        }),
      }),
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sourceCount).toBe(3);
    expect(data.proposed).toBeDefined();
  });

  it('accepts all valid source types (document, url, text)', async () => {
    for (const sourceType of ['document', 'url', 'text'] as const) {
      const res = await extractPOST(
        createRequest('http://localhost/api/vision/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sources: [{ type: sourceType, content: `Content from ${sourceType}` }],
            llmConfig: { provider: 'openai', apiKey: 'sk-test' },
          }),
        }),
      );

      expect(res.status).toBe(200);
    }
  });
});
