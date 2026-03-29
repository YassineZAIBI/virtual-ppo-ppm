---
name: prisma-patterns
description: Use when writing Prisma queries, modifying schema.prisma, adding models or fields, handling JSON string fields, or debugging database-related errors in Azmyra's 36-model PostgreSQL schema.
allowed-tools: Read, Grep, Bash(npx:*)
---

# Prisma Patterns — Azmyra Database Layer

## Client Import (always use singleton)

```typescript
import { db } from '@/lib/db'; // ✅ singleton
// ❌ NEVER: import { PrismaClient } from '@prisma/client'
```

## JSON String Fields — Critical Pattern

Several fields store JSON **as strings** in the DB (`String @default("{}")`):
- `extractedFacts`, `metadata`, `reportMetadata`, `discovery`
- Any field with `@default("{}")` or `@default("[]")` in the schema

**Always parse before use:**
```typescript
// ✅ Safe parsing (use parseJSON from @/lib/utils)
import { parseJSON } from '@/lib/utils';

const facts = parseJSON(item.extractedFacts, []);
const meta = parseJSON(item.metadata, {});

// ✅ Manual parse with fallback
const tags = JSON.parse(item.tags || '[]') as string[];

// ❌ NEVER: item.extractedFacts.map(...) — crashes if not parsed
// ❌ NEVER: item.metadata.someField — crashes
```

**When writing JSON fields:**
```typescript
await db.initiative.update({
  where: { id },
  data: {
    extractedFacts: JSON.stringify(updatedFacts),
    metadata: JSON.stringify({ ...existingMeta, newKey: value }),
  },
});
```

## Query Patterns

### Scoped to user (always required)
```typescript
const items = await db.initiative.findMany({
  where: { userId: session.user.id },
  orderBy: { createdAt: 'desc' },
});
```

### Parallel queries
```typescript
const [items, total] = await Promise.all([
  db.initiative.findMany({ where, skip, take }),
  db.initiative.count({ where }),
]);
```

### Select for list endpoints (partial data)
```typescript
const items = await db.initiative.findMany({
  where: { userId: session.user.id },
  select: { id: true, title: true, status: true, createdAt: true },
  // ⚠️ Don't include JSON string fields in lists — parse cost is wasted
});
```

### Full data for detail endpoints
```typescript
const item = await db.initiative.findFirst({
  where: { id, userId: session.user.id },
  include: { risks: true, meetings: true },
});
```

### Upsert pattern
```typescript
await db.alignmentScore.upsert({
  where: { userId: session.user.id },
  update: { score: newScore },
  create: { userId: session.user.id, score: newScore },
});
```

## Schema Change Workflow

1. Edit `prisma/schema.prisma`
2. Regenerate client: `npx prisma generate`
3. Sync to DB: `npx prisma db push` (dev only)
4. Update types in `src/lib/types.ts`
5. Note: `start.sh` runs `prisma db push --accept-data-loss` on container start in production

## Adding a New Model

```prisma
model FeatureRequest {
  id          String   @id @default(cuid())
  title       String
  description String   @default("")
  metadata    String   @default("{}") // JSON stored as string
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}
```

After adding: add corresponding `User` relation field to the `User` model.

## Sensitive Fields

Fields that contain credentials must be noted for the Prisma middleware in `src/lib/db.ts` that handles AES-256-GCM encrypt/decrypt. Check `encryption.ts` for the field list.

## Gotchas

- **`db push` is for dev** — for production schema changes, generate the SQL migration manually
- **`migrate reset` is NEVER safe** — it drops all data
- **Cascade deletes** — use `onDelete: Cascade` on user-owned data so cleanup is automatic
- **`@@index` on userId** — add this on every model with a `userId` foreign key for query performance
- **JSON fields** — document them with a comment `// JSON stored as string — always JSON.parse() on read`
