'use client';

import { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  MessageSquare,
  BookOpen,
  Landmark,
  Plug,
  Loader2,
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
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof Search }> = {
  search: { label: 'Search', icon: Search },
  social: { label: 'Social', icon: MessageSquare },
  research: { label: 'Research', icon: BookOpen },
  government: { label: 'Government', icon: Landmark },
  mcp: { label: 'MCP Connectors', icon: Plug },
};

export function AdapterSelector({ selectedKeys, onChange }: AdapterSelectorProps) {
  const [adapters, setAdapters] = useState<Adapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAdapters() {
      try {
        const res = await fetch('/api/data-pipeline/adapters');
        if (!res.ok) throw new Error('Failed to fetch adapters');
        const data = await res.json();
        setAdapters(Array.isArray(data) ? data : data.adapters || []);
      } catch (err) {
        toast.error('Failed to load data adapters');
        // Provide sensible defaults so the UI isn't empty
        setAdapters([
          { key: 'search_google', name: 'Google Search', description: 'Web search via Google', category: 'search', enabled: true },
          { key: 'search_bing', name: 'Bing Search', description: 'Web search via Bing', category: 'search', enabled: true },
          { key: 'social_reddit', name: 'Reddit', description: 'Reddit discussions and threads', category: 'social', enabled: true },
          { key: 'social_hackernews', name: 'Hacker News', description: 'Hacker News stories and discussions', category: 'social', enabled: true },
          { key: 'research_arxiv', name: 'arXiv', description: 'Academic papers and preprints', category: 'research', enabled: true },
          { key: 'research_semantic_scholar', name: 'Semantic Scholar', description: 'Academic paper search', category: 'research', enabled: true },
          { key: 'government_sec', name: 'SEC EDGAR', description: 'SEC filings and reports', category: 'government', enabled: true },
          { key: 'government_census', name: 'Census Bureau', description: 'US Census data', category: 'government', enabled: true },
          { key: 'mcp_custom', name: 'MCP Tool', description: 'Custom MCP server data source', category: 'mcp', enabled: true },
        ]);
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

  // Group adapters by category
  const grouped = adapters.reduce<Record<string, Adapter[]>>((acc, adapter) => {
    const cat = adapter.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(adapter);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading adapters...</span>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[360px]">
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, items]) => {
          const config = CATEGORY_CONFIG[category] || {
            label: category.charAt(0).toUpperCase() + category.slice(1),
            icon: Plug,
          };
          const CategoryIcon = config.icon;

          return (
            <div key={category} className="space-y-2">
              <div className="flex items-center gap-2">
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {config.label}
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {items.length}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                {items.map((adapter) => {
                  const isSelected = selectedKeys.includes(adapter.key);
                  return (
                    <label
                      key={adapter.key}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-border bg-card hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleAdapter(adapter.key)}
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {adapter.name}
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
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
  );
}
