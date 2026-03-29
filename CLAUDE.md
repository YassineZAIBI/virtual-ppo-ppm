# CLAUDE.md — Azmyra Codebase Guide

> This file is auto-loaded at every Claude Code session. Keep it accurate.
> Skills in `.claude/skills/` load on-demand. Rules in `.claude/rules/` are always active.

---

## Project

**Azmyra** is an AI-powered Product Management SaaS platform.
Live: https://ai.theproductowner.org | Repo: `virtual-ppo-ppm/`

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js App Router + React | 16.1.1 / 19 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS + shadcn/ui (new-york, 50+ Radix) | 4 |
| State | Zustand (localStorage persist) | 5 |
| Auth | NextAuth.js — JWT, Credentials, Google, Azure AD | 4 |
| Database | PostgreSQL + Prisma ORM | 16 / 6.11.1 |
| AI Backend | Python FastAPI — 6 agents on :8100 | latest |
| Validation | Zod | 4 |
| Charts | Recharts | latest |
| Dates | date-fns | 4 |
| Testing | Vitest + React Testing Library | 4 |

---

## Key Commands

```bash
npm run dev          # Dev server → port 3000
npm run build        # Production build
npm run test         # Vitest
npm run test:watch   # Watch mode
npx prisma generate  # Regenerate client after schema changes
npx prisma db push   # Sync schema to DB (dev)
npm run db:seed      # Seed sample data
```

---

## Architecture Rules

### Imports — Always use `@/` alias
```typescript
import { db } from '@/lib/db'              // ✅ Singleton Prisma client
import { authOptions } from '@/lib/auth'   // ✅
import { useAppStore } from '@/lib/store'  // ✅
import { cn } from '@/lib/utils'           // ✅
// ❌ NEVER: import { db } from '../../lib/db'
```

### Server vs Client Components
- `page.tsx` → server component by default — call `getServerSession()`, run DB queries
- `components/views/*.tsx` → always `'use client'` — contains state, hooks, interactivity
- Only add `'use client'` when the component needs React state/hooks/browser APIs

### LLM Config — Critical Constraint
- LLM settings (`provider`, `apiKey`, `model`) live **only in Zustand** (client-side localStorage)
- They are **NOT** in the database or `UserSettingsRecord` table — never move them there
- API routes that need LLM config **must receive it from the request body**
- Instantiate with: `LLMService.create(config)` factory

### Prisma JSON Fields — Critical Constraint
- Fields `extractedFacts`, `metadata`, `reportMetadata`, `discovery` → `String @default("{}")` in schema
- They store JSON **as strings** — always `JSON.parse()` before `.map()` / `.length`
- Use `parseJSON(field, fallback)` from `@/lib/utils` for safe parsing — never skip this

### Radix Dialog CSS — Known Quirk
- `DialogContent` uses CSS `grid` internally — `!grid-rows-*` won't override it
- Use inline `style={{ display: 'flex', flexDirection: 'column' }}` instead

---

## API Route Pattern

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // use db → return NextResponse.json()
}
```

- Always auth-check first via `getServerSession(authOptions)`
- Return `{ error: string }` with correct HTTP status on failure
- Use `201` for POST creation, `200` for reads/updates
- Pagination: `skip: (page - 1) * limit, take: limit`
- Parallel queries: `await Promise.all([db.x.findMany(...), db.x.count(...)])`
- List endpoints return `select`-partial data; detail endpoints return full data

---

## Page Pattern

```typescript
// src/app/[feature]/page.tsx — Server component
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FeatureView } from '@/components/views/FeatureView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default async function FeaturePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');
  return <ErrorBoundary><FeatureView /></ErrorBoundary>;
}
```

---

## Component Pattern

```typescript
// src/components/views/FeatureView.tsx — Client component
'use client';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FeatureView() {
  const { settings } = useAppStore();
}
```

---

## Data Adapter Pattern (33 adapters in `data-pipeline/`)

```typescript
// src/lib/services/data-pipeline/adapters/my-adapter.ts
import { registry } from '../registry';
import type { DataAdapter } from '../types';

const myAdapter: DataAdapter = {
  key: 'my-adapter',
  metadata: { name: '...', icon: '...', category: 'search' },
  async fetch(query, options?) { ... }
};
registry.register(myAdapter);
// Then add: import './my-adapter'; in adapters/index.ts
```

---

## Encryption

- Algorithm: AES-256-GCM
- Key: `CREDENTIALS_ENCRYPTION_KEY` env var (64-char hex = 32 bytes)
- Stored format: `iv:authTag:encrypted` (colon-separated hex)
- Applies to: integration credentials in `UserSettingsRecord` via Prisma middleware
- Never handle raw credentials outside `encryption.ts`

---

## State Management

- Single Zustand store via `useAppStore()` — persisted to localStorage
- No SWR / React Query — use Zustand + client-side fetch
- `useState` for component-local state only (modals, forms, loading flags)

---

## Styling

- Merge Tailwind classes with `cn()`: `cn('text-sm', isActive && 'font-bold')`
- Dark mode via `next-themes` with `class` strategy
- Toast notifications via `sonner` (Toaster in Providers)
- Icons from `lucide-react`

---

## File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase.tsx | `DashboardView.tsx` |
| Utilities/services | camelCase.ts | `encryption.ts` |
| Hooks | use-kebab.ts | `use-toast.ts` |
| Tests | *.test.ts(x) | `encryption.test.ts` |

---

## Scale Context — Read Before Every Session

| Metric | Count | Action Required |
|--------|-------|----------------|
| API routes | 93 | Check existing route before creating |
| Prisma models | 36 | Check `schema.prisma` before any DB change |
| Data adapters | 33 | Check `adapters/index.ts` before adding |
| AI agents | 6 | Check `meeting-bot/` before agent changes |
| TypeScript types | 657 lines | Check `types.ts` before creating new types |
| shadcn/ui components | 50+ | Check `components/ui/` before adding |

---

## Known Fragile Areas — Do Not Break

| Area | Constraint | Why |
|------|-----------|-----|
| **Cron jobs** | Never trigger from within the app | Cloud Run scales to zero — needs Cloud Scheduler or VM |
| **Python agent service** | Not on Cloud Run | Runs locally via `docker-compose` only. Never assume reachable in production |
| **Teams bot** | Do not attempt Graph API fixes | Requires M365 Business/Enterprise + same-tenant. Personal accounts unsupported by design |
| **Meeting bot** | Zoom SDK only currently | Cross-platform Playwright approach is planned (Phase 1) but not built |
| **LLM config** | Client-side only | Moving to DB would break multi-user isolation |
| **Prisma JSON strings** | Always `JSON.parse()` | Raw access causes runtime `.map is not a function` crashes |
| **Standalone Docker output** | Don't remove `/prisma-cli` stage | `start.sh` runs `prisma db push` before server starts; needs Prisma CLI |

---

## Working Protocol — Follow for Every Task

```
1. Read   → Scan relevant existing files before proposing anything
2. Propose → List files to be modified and approach — wait for confirmation  
3. Implement → Make the changes
4. Report → List every file changed and why
```

**For DB changes:** show the Prisma schema diff before running anything.
**For new types:** check `types.ts` first — add there, don't create new files.
**For new features:** check if a parallel feature already exists in the 17 views.
**For bug fixes:** reproduce the issue in one sentence before touching code.

---

## Deployment

- **GCP Cloud Run** (us-central1), project `theproductowner-8620d`
- Docker multi-stage build → `cloudbuild.yaml` → manual `gcloud run deploy`
- Prisma CLI in isolated `/prisma-cli` Docker stage (standalone output)
- `start.sh` runs `prisma db push --accept-data-loss` before `node server.js`
- gcloud path (Windows): `C:\Users\yassi\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd`

---

## Environment Variables

```bash
# Required
NEXTAUTH_URL                  # App URL
NEXTAUTH_SECRET               # JWT signing secret
DATABASE_URL                  # PostgreSQL connection string
CREDENTIALS_ENCRYPTION_KEY    # 64-char hex for AES-256-GCM
AGENT_SERVICE_URL             # Python FastAPI agent service URL

# Optional OAuth
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID

# Optional Captcha
NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY
```

---

## Testing

- Framework: Vitest with jsdom environment
- Location: `__tests__/` or colocated `*.test.ts`
- Path alias `@/` works in tests via `vitest.config.ts`
- Run: `npm run test` or `npm run test:watch`

---

## Common Mistakes — Never Do These

1. Access `.map()` or `.length` on Prisma JSON string fields without `JSON.parse()` first
2. Store LLM config in the database — client-side Zustand only
3. Use `prisma` directly — always use `db` from `@/lib/db`
4. Use relative imports — always use `@/` alias
5. Forget `'use client'` on components that use hooks/state
6. Use Tailwind grid overrides on Radix Dialog — use inline styles
7. Render detail content from list endpoint data (partial select) — use detail endpoints
8. Add a new data adapter without registering it in `adapters/index.ts`
9. Touch `cloudbuild.yaml` or `Dockerfile` without being explicitly asked
10. Create new TypeScript types in component files — add to `types.ts`
