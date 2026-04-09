'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Inbox } from 'lucide-react';

interface Vertical {
  id: string;
  name: string;
  _count?: { initiatives: number };
}

interface VerticalSelectorProps {
  verticals: Vertical[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  unclassifiedCount: number;
  totalCount: number;
  onAddVertical: () => void;
}

export function VerticalSelector({
  verticals,
  selected,
  onSelect,
  unclassifiedCount,
  totalCount,
  onAddVertical,
}: VerticalSelectorProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
        Verticals
      </p>

      {/* All */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors',
          selected === null
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent text-foreground'
        )}
      >
        <span className="font-medium">All</span>
        <Badge variant={selected === null ? 'secondary' : 'outline'} className="text-[10px]">
          {totalCount}
        </Badge>
      </button>

      {/* Verticals */}
      {verticals.map(v => (
        <button
          key={v.id}
          onClick={() => onSelect(v.id)}
          className={cn(
            'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors',
            selected === v.id
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-foreground'
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Package className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{v.name}</span>
          </span>
          <Badge variant={selected === v.id ? 'secondary' : 'outline'} className="text-[10px]">
            {v._count?.initiatives ?? 0}
          </Badge>
        </button>
      ))}

      {/* Unclassified */}
      {unclassifiedCount > 0 && (
        <button
          onClick={() => onSelect('unassigned')}
          className={cn(
            'w-full flex items-center justify-between px-2 py-1.5 rounded-md text-sm transition-colors',
            selected === 'unassigned'
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent text-muted-foreground'
          )}
        >
          <span className="flex items-center gap-1.5">
            <Inbox className="h-3.5 w-3.5" />
            Unclassified
          </span>
          <Badge variant="outline" className="text-[10px]">{unclassifiedCount}</Badge>
        </button>
      )}

      {/* Add vertical */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-xs text-muted-foreground mt-2"
        onClick={onAddVertical}
      >
        <Plus className="h-3.5 w-3.5 mr-1" /> Add vertical
      </Button>
    </div>
  );
}
