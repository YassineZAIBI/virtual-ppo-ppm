---
description: Add a new data source adapter to Azmyra's market intelligence pipeline. Pass the source name as argument.
allowed-tools: Read, Glob, Grep
---

# /add-adapter — New Data Source Adapter

**New adapter:** `$ARGUMENTS`

## Step 1 — Understand the existing pattern

1. Read `src/lib/services/data-pipeline/types.ts` — understand `DataAdapter` interface
2. Read `src/lib/services/data-pipeline/registry.ts` — understand registration
3. Read one existing adapter as reference: !`ls src/lib/services/data-pipeline/adapters/ | head -5`
4. Read `src/lib/services/data-pipeline/adapters/index.ts` — see registration pattern

## Step 2 — Plan

```
ADAPTER: [name]
SOURCE URL / API: [endpoint]
CATEGORY: search | news | financial | academic | social | app-store | jobs | patents
RATE LIMIT: [requests per minute]
CACHE TTL: [seconds]
AUTH REQUIRED: yes/no

FILE TO CREATE: src/lib/services/data-pipeline/adapters/[name].ts
REGISTRATION: add import to adapters/index.ts
```

Wait for approval.

## Step 3 — Implement

Use this exact structure:
```typescript
import { registry } from '../registry';
import type { DataAdapter, FetchOptions } from '../types';

const [name]Adapter: DataAdapter = {
  key: '[name]',
  metadata: {
    name: '[Display Name]',
    icon: '[emoji]',
    category: '[category]',
    description: '[what it fetches]',
    rateLimit: { requests: X, windowMs: 60000 },
    cacheTTL: Y,
  },
  async fetch(query: string, options?: FetchOptions) {
    // implementation
  }
};

registry.register([name]Adapter);
```

Then add to `adapters/index.ts`:
```typescript
import './[name]';
```

## Step 4 — Report
Confirm the adapter is registered and list any API keys needed in env vars.
