---
name: ui-components
description: Use when building or modifying React components, views, dialogs, forms, tables, or any UI element in Azmyra. Covers shadcn/ui patterns, Tailwind CSS 4, loading/error/empty states, dark mode, mobile responsiveness, Radix quirks, and the specific component patterns established across Sprints 1-5. Trigger keywords: component, dialog, modal, button, form, table, card, view, loading, skeleton, toast, empty state, mobile, dark mode, layout, sidebar.
allowed-tools: Read, Grep, Glob
---

# UI Components — Azmyra Patterns (Updated Sprint 1-5)

## Golden rules (memorise these)

1. Every view MUST have loading, error, and empty states — no exceptions
2. Every mutation MUST have a toast (success + error)
3. Never use `'use client'` in page.tsx — only in components/views/
4. Never use hardcoded colors — only Tailwind semantic tokens
5. Use `cn()` for class merging — never string concatenation
6. Radix Dialog: use inline `style={{ display: 'flex' }}` — never Tailwind grid overrides

---

## View component template (complete)

```typescript
'use client';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ItemType } from '@/lib/types';

export function FeatureView() {
  const [items, setItems] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/feature');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setError('Failed to load. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchItems} />;
  if (items.length === 0) return <EmptyState onAction={handleCreate} />;

  return (
    <div className="p-6 space-y-4">
      {items.map(item => <ItemCard key={item.id} item={item} />)}
    </div>
  );
}
```

---

## Three mandatory states

### Loading state
```typescript
function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-4">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  );
}
```
Use 1 skeleton for detail views, 3-5 for list views.

### Error state
```typescript
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-4 text-center">
      <p className="text-sm text-destructive">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
    </div>
  );
}
```

### Empty state
```typescript
function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 gap-3 text-center">
      <p className="text-sm text-muted-foreground">No items yet</p>
      <p className="text-xs text-muted-foreground">
        Get started by creating your first one
      </p>
      <Button size="sm" onClick={onAction}>Create item</Button>
    </div>
  );
}
```

---

## Mutation pattern with toast

```typescript
async function handleSave(data: FormData) {
  // Option A: simple toast
  try {
    const res = await fetch('/api/feature', { method: 'POST', body: JSON.stringify(data) });
    if (!res.ok) throw new Error();
    toast.success('Saved successfully');
    await fetchItems(); // refresh
  } catch {
    toast.error('Failed to save. Please try again.');
  }
}

// Option B: toast.promise (cleaner for async)
async function handleSave(data: FormData) {
  toast.promise(
    fetch('/api/feature', { method: 'POST', body: JSON.stringify(data) }).then(r => {
      if (!r.ok) throw new Error();
      return r.json();
    }),
    {
      loading: 'Saving...',
      success: 'Saved successfully',
      error: 'Failed to save. Please try again.',
    }
  );
}
```

---

## Radix Dialog — the one quirk

`DialogContent` renders as CSS `grid` internally.
Tailwind grid class overrides (`!grid-rows-*`) do not work.

```typescript
// ✅ Correct
<DialogContent style={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
  <DialogHeader>...</DialogHeader>
  <div className="flex-1 overflow-y-auto">
    {/* scrollable content */}
  </div>
  <DialogFooter>...</DialogFooter>
</DialogContent>

// ❌ Wrong — will not work
<DialogContent className="!grid-rows-[auto_1fr_auto]">
```

Mobile dialog width:
```typescript
<DialogContent className="max-w-[95vw] sm:max-w-lg" style={{ display: 'flex', ... }}>
```

---

## Semantic color tokens (dark mode safe)

```typescript
// ✅ Use these
className="text-foreground"          // primary text
className="text-muted-foreground"    // secondary text
className="text-destructive"         // errors
className="bg-background"            // page background
className="bg-secondary"             // surface/card background
className="border"                   // default border
className="border-destructive"       // error border

// ❌ Never use these
className="text-gray-500"
className="text-black"
className="bg-white"
className="border-gray-200"
```

---

## Mobile-first grid patterns

```typescript
// List grid
className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"

// Metric cards
className="grid grid-cols-2 sm:grid-cols-4 gap-3"

// Full-width on mobile, side-by-side on desktop
className="flex flex-col sm:flex-row gap-4"

// Horizontal scroll for tables
<div className="overflow-x-auto">
  <table className="w-full">...</table>
</div>

// Dialog full-screen on mobile
<DialogContent className="max-w-[95vw] sm:max-w-[600px]" ...>
```

---

## Sprint 3: InsightsPanel pattern

```typescript
export function InsightsPanel() {
  const [insights, setInsights] = useState<ProactiveInsightData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInsights(); }, []);

  async function fetchInsights() {
    try {
      const res = await fetch('/api/insights?status=new&limit=5');
      if (!res.ok) return; // silent fail — panel is non-critical
      const data = await res.json();
      setInsights(data.insights ?? []);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return null; // ← return null, NOT a skeleton (panel is optional)
  if (insights.length === 0) return null; // ← return null (no empty state for panels)

  // render insights
}
```

Key rules for optional panels:
- Return `null` not empty div (affects layout)
- Silent fail on API error (non-blocking)
- No error state shown (panel is enhancement, not core)

---

## Sprint 4: WorkflowLauncher pattern

Multi-step dialog with async state machine:

```typescript
type WorkflowUIState = 'selecting' | 'running' | 'completed' | 'failed';

export function WorkflowLauncher({ initiativeId }: Props) {
  const [state, setState] = useState<WorkflowUIState>('selecting');
  const [result, setResult] = useState<WorkflowResult | null>(null);

  async function handleRun(workflowType: string) {
    setState('running');
    try {
      const res = await fetch('/api/agents/workflow', { ... });
      const data = await res.json();
      setResult(data);
      setState(data.status === 'completed' ? 'completed' : 'failed');
    } catch {
      setState('failed');
    }
  }

  // Render different UI based on state
  return (
    <Dialog>
      <DialogContent style={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
        {state === 'selecting' && <WorkflowSelector onSelect={handleRun} />}
        {state === 'running' && <RunningIndicator />}
        {state === 'completed' && <WorkflowTimeline workflow={result} />}
        {state === 'failed' && <ErrorState message="Workflow failed" onRetry={() => setState('selecting')} />}
      </DialogContent>
    </Dialog>
  );
}
```

---

## Sprint 5: IntegrationCard pattern

```typescript
// Status badge color logic
const STATUS_STYLES = {
  connected: 'bg-green-100 text-green-800',
  disconnected: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-800',
} as const;

// Expand form on "Connect" click — not a new page or dialog
const [expanded, setExpanded] = useState(false);

// Connect/Disconnect are in-place — no navigation
async function handleConnect() { ... toast.promise(...) }
async function handleDisconnect() { ... toast.promise(...) }
```

---

## ProactiveInsight priority colors

```typescript
const PRIORITY_COLORS = {
  high:   'bg-red-50 border-red-200',
  medium: 'bg-amber-50 border-amber-200',
  low:    'bg-blue-50 border-blue-200',
} as const;

const PRIORITY_TEXT = {
  high:   'text-red-800',
  medium: 'text-amber-800',
  low:    'text-blue-800',
} as const;
```

---

## AlertPanel routing pattern

```typescript
// Every alert type must route to specific entity, not just list
const ENTITY_ROUTE_MAP: Record<string, (id: string) => string> = {
  competitor_move:   (id) => `/competitors/${id}`,
  alignment_drift:   (_)  => '/vision',
  market_shift:      (_)  => '/market-research',
  action_required:   (_)  => '/settings',
  risk_escalation:   (id) => `/risks/${id}`,
  workflow_complete: (id) => `/initiatives/${id}`,
};

// Usage
const route = ENTITY_ROUTE_MAP[alert.type]?.(alert.entityId) ?? '/';
router.push(route);
```

---

## Parallel data loading

Never fetch sequentially in views. Always parallel:

```typescript
// ❌ Sequential (slow)
const initiatives = await fetch('/api/initiatives').then(r => r.json());
const risks = await fetch('/api/risks').then(r => r.json());

// ✅ Parallel (fast)
const [initiativesRes, risksRes] = await Promise.all([
  fetch('/api/initiatives'),
  fetch('/api/risks'),
]);
const [initiatives, risks] = await Promise.all([
  initiativesRes.json(),
  risksRes.json(),
]);
```

---

## Notification bell — hide when zero

```typescript
// ❌ Shows "0" badge
<Badge>{count}</Badge>

// ✅ Hides when zero
{count > 0 && <Badge>{count}</Badge>}

// Or with combined count
const total = alertCount + insightCount;
{total > 0 && (
  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
    {total > 99 ? '99+' : total}
  </Badge>
)}
```

---

## Gotchas

1. **Radix Dialog grid** — always use `style={{ display: 'flex' }}`, never Tailwind grid
2. **InsightsPanel returns null** — NOT empty div. Empty div adds unwanted spacing.
3. **Hardcoded colors** — `text-gray-*` is invisible in dark mode. Use semantic tokens.
4. **Toast.promise** — cleaner than separate try/catch toasts for async mutations
5. **Skeleton count** — match expected item count (3 for lists, 1 for forms/detail)
6. **Mobile dialogs** — always add `max-w-[95vw]` for mobile safety
7. **cn() always** — never `className={'base ' + conditional}` or template strings
8. **Tables scroll** — always wrap in `<div className="overflow-x-auto">`
9. **Empty InsightsPanel** — return null, not loading skeleton (it is non-critical)
10. **Alert routing** — use entity ID in route, never route to list page only

---

## File structure for new views

```
src/
├── app/[feature]/page.tsx          ← server component, session guard, ErrorBoundary
└── components/
    ├── views/[Feature]View.tsx     ← 'use client', all state, fetching
    └── [feature]/                  ← sub-components (cards, dialogs, etc.)
        ├── [Feature]Card.tsx
        ├── [Feature]Dialog.tsx
        └── [Feature]List.tsx
```

Types go in src/lib/types.ts — never in component files.
