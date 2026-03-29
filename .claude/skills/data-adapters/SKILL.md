---
name: data-adapters
description: Use when adding a new market intelligence data source, modifying existing adapters, or debugging the data pipeline in src/lib/services/data-pipeline/. Covers the DataAdapter interface, registry, rate limiting, and caching.
allowed-tools: Read, Grep, Glob
---

# Data Adapters — Azmyra Pipeline Patterns

## Architecture Overview

```
MarketResearch request
       │
       ▼
DataPipelineService.gather(query, sources[])
       │
       ├─ fan-out to N adapters in parallel
       │
       ├─ each adapter: check cache → rate limit → fetch → normalize
       │
       └─ results aggregated → LLM synthesis → report
```

## DataAdapter Interface

```typescript
// src/lib/services/data-pipeline/types.ts
interface DataAdapter {
  key: string;                    // unique identifier, kebab-case
  metadata: AdapterMetadata;
  fetch(query: string, options?: FetchOptions): Promise<DataPoint[]>;
}

interface AdapterMetadata {
  name: string;                   // display name
  icon: string;                   // emoji icon
  category: AdapterCategory;      // 'search' | 'news' | 'financial' | 'academic' | 'social' | 'app-store' | 'jobs' | 'patents'
  description: string;
  rateLimit: { requests: number; windowMs: number };
  cacheTTL: number;               // seconds
  requiresAuth?: boolean;
}
```

## Creating a New Adapter

```typescript
// src/lib/services/data-pipeline/adapters/my-source.ts
import { registry } from '../registry';
import type { DataAdapter, DataPoint, FetchOptions } from '../types';

const mySourceAdapter: DataAdapter = {
  key: 'my-source',
  metadata: {
    name: 'My Source',
    icon: '🔍',
    category: 'news',
    description: 'Fetches recent news articles from My Source',
    rateLimit: { requests: 10, windowMs: 60000 },
    cacheTTL: 3600,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataPoint[]> {
    const url = `https://api.mysource.com/search?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Azmyra/2.0' },
      signal: AbortSignal.timeout(10000), // always timeout
    });

    if (!response.ok) {
      throw new Error(`My Source API error: ${response.status}`);
    }

    const data = await response.json();

    // Normalize to DataPoint[]
    return (data.results || []).map((item: any) => ({
      source: 'my-source',
      title: item.title,
      content: item.summary || item.description || '',
      url: item.url,
      publishedAt: item.date ? new Date(item.date) : undefined,
      relevanceScore: item.score || 0.5,
    }));
  },
};

registry.register(mySourceAdapter);
```

Then register it:
```typescript
// src/lib/services/data-pipeline/adapters/index.ts
import './my-source'; // add this line
```

## Rate Limiting

The registry handles token bucket rate limiting automatically. Each adapter gets its own bucket based on `metadata.rateLimit`. Never implement custom rate limiting inside an adapter — the registry handles it.

## Caching

Results are cached by `key + query + options` hash for `metadata.cacheTTL` seconds. Cache key invalidation is TTL-based. If you need to bypass cache in development, pass `options.skipCache = true`.

## Gotchas

- **Always set a timeout** on fetch calls (`AbortSignal.timeout(10000)`) — external APIs hang.
- **Always normalize to DataPoint[]** — don't return adapter-specific shapes.
- **Register in index.ts** — adapters self-register at module load, but only if imported.
- **Don't throw on empty results** — return `[]` if no results found.
- **Handle paginated APIs** — fetch max 1 page (first results) per call to respect rate limits.
- **Never store API keys in adapter files** — read from environment or from user's encrypted `UserSettingsRecord`.

## Existing Adapters (33 total)

Categories: DuckDuckGo, Reddit, HN, Wikipedia, arXiv, Semantic Scholar, World Bank, FRED, BLS, Google Trends, G2, Capterra, ProductHunt, Crunchbase, Glassdoor, TechCrunch, StackOverflow, App Store, Play Store, LinkedIn Jobs, Google Patents, Statista, and more.

Before adding a new adapter, run:
```bash
ls src/lib/services/data-pipeline/adapters/
```
to confirm the source doesn't already exist.
