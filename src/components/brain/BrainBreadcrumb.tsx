'use client';

import { ChevronRight, Brain } from 'lucide-react';
import type { BrainOverviewData } from '@/lib/types';

interface BrainBreadcrumbProps {
  depth: 0 | 1 | 2;
  regionKey: string | null;
  itemKey: string | null;
  data: BrainOverviewData;
  onNavigate: (depth: 0 | 1) => void;
}

const REGION_LABELS: Record<string, string> = {
  vision: 'Vision',
  risks: 'Risks',
  competitors: 'Competitors',
  personas: 'Personas',
  market: 'Market',
  foundation: 'Foundation',
  orphans: 'Unclassified',
};

function getRegionLabel(key: string, data: BrainOverviewData): string {
  if (key.startsWith('v-')) {
    const v = data.verticals.find(v => v.id === key.slice(2));
    return v?.name || 'Vertical';
  }
  return REGION_LABELS[key] || key;
}

function getItemLabel(regionKey: string, itemKey: string, data: BrainOverviewData): string {
  const allInitiatives = [
    ...data.verticals.flatMap(v => v.initiatives),
    ...data.orphanInitiatives,
  ];
  const init = allInitiatives.find(i => i.id === itemKey);
  if (init) return init.title;

  if (regionKey === 'risks') {
    const risk = data.risks.find(r => r.id === itemKey);
    if (risk) return risk.title;
  }
  if (regionKey === 'competitors') {
    const comp = data.competitors.find(c => c.id === itemKey);
    if (comp) return comp.name;
  }
  return 'Detail';
}

export function BrainBreadcrumb({ depth, regionKey, itemKey, data, onNavigate }: BrainBreadcrumbProps) {
  if (depth === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground -mt-2 mb-1">
      <button
        onClick={() => onNavigate(0)}
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Brain className="h-3.5 w-3.5" /> Brain
      </button>
      {depth >= 1 && regionKey && (
        <>
          <ChevronRight className="h-3 w-3" />
          <button
            onClick={() => depth > 1 ? onNavigate(1) : undefined}
            className={depth > 1 ? 'hover:text-foreground transition-colors' : 'text-foreground font-medium'}
          >
            {getRegionLabel(regionKey, data)}
          </button>
        </>
      )}
      {depth === 2 && regionKey && itemKey && (
        <>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {getItemLabel(regionKey, itemKey, data)}
          </span>
        </>
      )}
    </nav>
  );
}
