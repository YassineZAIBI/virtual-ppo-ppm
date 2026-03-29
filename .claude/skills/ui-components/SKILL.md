---
name: ui-components
description: Use when building or modifying React components, views, dialogs, forms, or any UI in Azmyra. Covers shadcn/ui patterns, Tailwind CSS 4, loading/error/empty states, dark mode, and Radix quirks.
allowed-tools: Read, Grep, Glob
---

# UI Components — Azmyra Patterns

## View Component Template

```tsx
// src/components/views/FeatureView.tsx
'use client';
import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { FeatureType } from '@/lib/types';

export function FeatureView() {
  const { settings } = useAppStore();
  const [items, setItems] = useState<FeatureType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    try {
      setLoading(true);
      const res = await fetch('/api/feature');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setItems(data.items);
    } catch (err) {
      setError('Failed to load items');
    } finally {
      setLoading(false);
    }
  }

  // Loading state
  if (loading) return (
    <div className="space-y-4 p-6">
      {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
    </div>
  );

  // Error state
  if (error) return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <p className="text-destructive mb-4">{error}</p>
      <Button onClick={fetchItems}>Retry</Button>
    </div>
  );

  // Empty state
  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <p className="text-muted-foreground">No items yet.</p>
      <Button className="mt-4">Create first item</Button>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      {items.map(item => (
        <Card key={item.id}>
          <CardHeader><CardTitle>{item.title}</CardTitle></CardHeader>
          <CardContent>{/* content */}</CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## Radix Dialog — CSS Quirk

`DialogContent` uses CSS `grid` internally. Tailwind grid overrides don't work.

```tsx
// ✅ Use inline styles for flex layout in dialogs
<DialogContent style={{ display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}>
  <DialogHeader>...</DialogHeader>
  <div className="flex-1 overflow-y-auto">
    {/* scrollable content */}
  </div>
  <DialogFooter>...</DialogFooter>
</DialogContent>

// ❌ This does NOT work:
<DialogContent className="!grid-rows-[auto_1fr_auto]">
```

## Class Merging

```tsx
// ✅ Always use cn() for conditional classes
<div className={cn('base-class', isActive && 'font-bold', variant === 'danger' && 'text-destructive')}>

// ❌ Never concatenate strings
<div className={`base-class ${isActive ? 'font-bold' : ''}`}>
```

## Forms

```tsx
// Use uncontrolled inputs with FormData for simple forms
async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = new FormData(e.currentTarget);
  const title = form.get('title') as string;
  // POST to API
}

// For complex validated forms, use react-hook-form + Zod
```

## Toast Notifications

```tsx
import { toast } from 'sonner';

toast.success('Saved successfully');
toast.error('Failed to save');
toast.loading('Saving...');
toast.promise(savePromise, {
  loading: 'Saving...',
  success: 'Saved!',
  error: 'Failed to save',
});
```

## Dark Mode

- Strategy: `next-themes` with `class` strategy
- Use semantic Tailwind colors: `text-foreground`, `bg-background`, `text-muted-foreground`, `border`, `text-destructive`
- Avoid hard-coded `text-gray-700` — use semantic tokens

## Icons

```tsx
import { Plus, Trash2, Edit, ChevronDown, Loader2 } from 'lucide-react';

// Loading spinner pattern
<Loader2 className="h-4 w-4 animate-spin" />
```

## Gotchas

- **All views use `'use client'`** — never try to use hooks in a server component
- **State from Zustand** — use `useAppStore()` for app-wide state; `useState` for component-local only
- **No SWR/React Query** — use Zustand + client fetch pattern
- **50+ shadcn components already installed** — check `src/components/ui/` before installing anything new
- **ErrorBoundary** — every page wraps its view in `<ErrorBoundary>` — this catches render errors silently
