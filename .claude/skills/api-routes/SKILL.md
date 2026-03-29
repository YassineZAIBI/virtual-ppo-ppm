---
name: api-routes
description: Use when creating, modifying, or debugging Next.js App Router API routes in Azmyra's src/app/api/ directory. Covers auth guards, response patterns, LLM config handling, and pagination.
allowed-tools: Read, Grep, Glob
---

# API Routes — Azmyra Patterns

## Standard Route Template

```typescript
// src/app/api/[feature]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  // 1. Auth — always first
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse query params
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // 3. Parallel DB queries
  const [items, total] = await Promise.all([
    db.item.findMany({
      where: { userId: session.user.id },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true }, // partial for lists
    }),
    db.item.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();

  // 4. Validate input
  const schema = z.object({ title: z.string().min(1) });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const item = await db.item.create({
    data: { ...parsed.data, userId: session.user.id },
  });

  return NextResponse.json(item, { status: 201 }); // 201 for creation
}
```

## Routes with LLM Config

LLM settings come from the request body — never from DB.

```typescript
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { llmConfig, ...data } = await req.json();

  if (!llmConfig?.apiKey || !llmConfig?.provider) {
    return NextResponse.json({ error: 'LLM config required' }, { status: 400 });
  }

  const llm = LLMService.create(llmConfig);
  const result = await llm.complete(data.prompt);

  return NextResponse.json({ result });
}
```

## Dynamic Route Segments

```typescript
// src/app/api/initiatives/[id]/route.ts
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const item = await db.initiative.findFirst({
    where: { id: params.id, userId: session.user.id }, // scope to user
  });

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(item); // full data for detail endpoint
}
```

## HTTP Status Reference

| Situation | Status |
|-----------|--------|
| Success read/update | 200 |
| Resource created | 201 |
| Bad input / validation | 400 |
| Not authenticated | 401 |
| Authenticated but no permission | 403 |
| Resource not found | 404 |
| Server error | 500 |

## Gotchas

- **List vs detail endpoints:** list routes use `select` (partial); detail routes return full object. Never render detail UI from list data.
- **Always scope to user:** every query must include `where: { userId: session.user.id }` — never return data from other users.
- **Prisma JSON fields:** `extractedFacts`, `metadata`, `reportMetadata`, `discovery` are stored as strings — `JSON.parse()` before use in the response or in components.
- **Don't use `prisma` directly** — always `db` from `@/lib/db` (singleton pattern).
