'use client';

import { useEffect, useState, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  MessageSquare,
  BookOpen,
  Landmark,
  Plug,
  Loader2,
  Star,
  Newspaper,
  Swords,
  Briefcase,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface Adapter {
  key: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

interface AdapterSelectorProps {
  selectedKeys: string[];
  onChange: (keys: string[]) => void;
  /** If provided, enables "Smart Suggest" based on query intent */
  query?: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Search; order: number }> = {
  search: { label: 'Search & Web', icon: Search, order: 1 },
  social: { label: 'Social & Community', icon: MessageSquare, order: 2 },
  research: { label: 'Research & Academic', icon: BookOpen, order: 3 },
  review: { label: 'Reviews & Ratings', icon: Star, order: 4 },
  news: { label: 'News & Media', icon: Newspaper, order: 5 },
  competitor: { label: 'Competitive Intel', icon: Swords, order: 6 },
  jobs: { label: 'Jobs & Hiring', icon: Briefcase, order: 7 },
  government: { label: 'Government & Economic', icon: Landmark, order: 8 },
  mcp: { label: 'MCP Connectors', icon: Plug, order: 9 },
};

export function AdapterSelector({ selectedKeys, onChange, query }: AdapterSelectorProps) {
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdapters() {
      try {
        const res = await fetch('/api/data-pipeline/adapters');
        if (!res.ok) throw new Error('Failed to fetch adapters');
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.adapters || [];
        // API returns { key, metadata: { name, description, category, ... } } — flatten for UI
        setAdapters(list.map((a: any) => ({
          key: a.key,
          name: a.metadata?.name || a.name || a.key,
          description: a.metadata?.description || a.description || '',
          category: a.metadata?.category || a.category || 'other',
          enabled: true,
        })));
      } catch {
        toast.error('Failed to load data adapters');
        setAdapters([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAdapters();
  }, []);

  const toggleAdapter = (key: string) => {
    if (selectedKeys.includes(key)) {
      onChange(selectedKeys.filter((k) => k !== key));
    } else {
      onChange([...selectedKeys, key]);
    }
  };

  const selectAll = () => {
    onChange(adapters.map((a) => a.key));
  };

  const clearAll = () => {
    onChange([]);
  };

  const handleSmartSuggest = useCallback(async () => {
    if (!query?.trim()) {
      toast.error('Enter a research query first');
      return;
    }
    try {
      // Dynamic import to avoid bundling in SSR
      const { getRecommendedAdapterKeys } = await import(
        '@/lib/services/data-pipeline/query-router'
      );
      const recommended = getRecommendedAdapterKeys(query);
      // Filter to only adapters that exist in the registry
      const available = new Set(adapters.map((a) => a.key));
      const valid = recommended.filter((k) => available.has(k));
      if (valid.length > 0) {
        onChange(valid);
        toast.success(`Selected ${valid.length} recommended adapters`);
      } else {
        toast.info('No specific recommendations — try selecting manually');
      }
    } catch {
      toast.error('Could not generate suggestions');
    }
  }, [query, adapters, onChange]);

  // Group adapters by category, sorted by config order
  const grouped = adapters.reduce<Record<string, Adapter[]>>((acc, adapter) => {
    const cat = adapter.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(adapter);
    return acc;
  }, {});

  const sortedCategories = Object.entries(grouped).sort(([a], [b]) => {
    const orderA = CATEGORY_CONFIG[a]?.order ?? 99;
    const orderB = CATEGORY_CONFIG[b]?.order ?? 99;
    return orderA - orderB;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading adapters...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Quick actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSmartSuggest}
          className="gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Smart Suggest
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
          Select All
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
          Clear
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {selectedKeys.length} / {adapters.length} selected
        </span>
      </div>

      <ScrollArea className="max-h-[420px] pr-3">
        <div className="space-y-4">
          {sortedCategories.map(([category, items]) => {
            const config = CATEGORY_CONFIG[category] || {
              label: category.charAt(0).toUpperCase() + category.slice(1),
              icon: Plug,
              order: 99,
            };
            const CategoryIcon = config.icon;
            const selectedInCategory = items.filter((a) =>
              selectedKeys.includes(a.key)
            ).length;

            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    {config.label}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {selectedInCategory}/{items.length}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 pl-6">
                  {items.map((adapter) => {
                    const isSelected = selectedKeys.includes(adapter.key);
                    return (
                      <label
                        key={adapter.key}
                        className={`flex items-start gap-2.5 rounded-md border p-2.5 cursor-pointer transition-all min-h-[60px] ${
                          isSelected
                            ? 'border-primary/60 bg-primary/[0.06] ring-1 ring-primary/20 dark:bg-primary/[0.08] dark:border-primary/40'
                            : 'border-border bg-background hover:border-muted-foreground/30 hover:bg-muted/40'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleAdapter(adapter.key)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-foreground leading-tight">
                            {adapter.name}
                          </div>
                          <div className="text-[11px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                            {adapter.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
