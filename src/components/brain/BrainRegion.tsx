'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Eye, ShieldAlert, Binoculars, Users, TrendingUp, Brain, Package,
} from 'lucide-react';
import type { BrainOverviewData } from '@/lib/types';

interface BrainRegionProps {
  regionKey: string;
  data: BrainOverviewData;
  onNavigate: (regionKey: string) => void;
  onNavigateDetail: (regionKey: string, itemKey: string) => void;
}

interface RegionItem {
  id: string;
  title: string;
  description: string;
  badges?: Array<{ text: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }>;
}

function getRegionContent(key: string, data: BrainOverviewData): {
  title: string;
  subtitle: string;
  icon: typeof Eye;
  accent: string;
  items: RegionItem[];
  stats: Array<{ label: string; value: string | number }>;
} {
  if (key === 'vision') {
    const items: RegionItem[] = [];
    if (data.northStar) {
      items.push({ id: 'ns', title: 'North Star', description: data.northStar.statement });
    }
    data.goals.forEach(g => {
      items.push({
        id: g.id, title: g.title, description: g.description || '',
        badges: g.metric ? [{ text: `Target: ${g.target || 'TBD'}`, variant: 'outline' }] : [],
      });
    });
    return {
      title: 'Vision', subtitle: 'North star and business goals',
      icon: Eye, accent: 'text-purple-500',
      items, stats: [
        { label: 'Goals', value: data.goals.length },
        { label: 'Alignment', value: data.stats.portfolioAlignment != null ? `${data.stats.portfolioAlignment}%` : '--' },
      ],
    };
  }

  if (key.startsWith('v-')) {
    const verticalId = key.slice(2);
    const vertical = data.verticals.find(v => v.id === verticalId);
    if (!vertical) return { title: 'Unknown', subtitle: '', icon: Package, accent: 'text-gray-500', items: [], stats: [] };

    return {
      title: vertical.name, subtitle: vertical.description || 'Product vertical',
      icon: Package, accent: 'text-indigo-500',
      items: vertical.initiatives.map(i => ({
        id: i.id, title: i.title, description: i.description || '',
        badges: [
          { text: i.status, variant: i.status === 'approved' ? 'default' : 'secondary' as const },
          ...(i.alignmentScore != null ? [{ text: `${Math.round(i.alignmentScore)}% aligned`, variant: 'outline' as const }] : []),
        ],
      })),
      stats: [
        { label: 'Initiatives', value: vertical.initiativeCount },
      ],
    };
  }

  if (key === 'orphans') {
    return {
      title: 'Unclassified', subtitle: 'Initiatives not assigned to a vertical',
      icon: Package, accent: 'text-gray-500',
      items: data.orphanInitiatives.map(i => ({
        id: i.id, title: i.title, description: i.description || '',
        badges: [{ text: i.status, variant: 'secondary' as const }],
      })),
      stats: [{ label: 'Count', value: data.orphanInitiatives.length }],
    };
  }

  if (key === 'risks') {
    return {
      title: 'Risks', subtitle: 'Active threats to the portfolio',
      icon: ShieldAlert, accent: 'text-red-500',
      items: data.risks.map(r => ({
        id: r.id, title: r.title, description: r.description,
        badges: [
          { text: r.severity, variant: r.severity === 'critical' || r.severity === 'high' ? 'destructive' : 'secondary' as const },
          { text: `P: ${r.probability}`, variant: 'outline' as const },
        ],
      })),
      stats: [
        { label: 'Total', value: data.risks.length },
        { label: 'Critical/High', value: data.risks.filter(r => r.severity === 'critical' || r.severity === 'high').length },
      ],
    };
  }

  if (key === 'competitors') {
    return {
      title: 'Competitors', subtitle: 'Competitive landscape',
      icon: Binoculars, accent: 'text-gray-500',
      items: data.competitors.map(c => ({
        id: c.id, title: c.name, description: c.description || c.website || '',
      })),
      stats: [{ label: 'Tracked', value: data.competitors.length }],
    };
  }

  if (key === 'personas') {
    return {
      title: 'Personas', subtitle: 'Who we serve',
      icon: Users, accent: 'text-pink-500',
      items: data.personas.map(p => ({
        id: p.id, title: p.name, description: p.description || '',
      })),
      stats: [{ label: 'Total', value: data.personas.length }],
    };
  }

  if (key === 'market') {
    return {
      title: 'Market', subtitle: 'Market intelligence and AI insights',
      icon: TrendingUp, accent: 'text-green-500',
      items: data.insights.map(ins => ({
        id: ins.id, title: ins.title, description: ins.summary || '',
        badges: [{ text: ins.agentType, variant: 'secondary' as const }],
      })),
      stats: [
        { label: 'Insights', value: data.insights.length },
        { label: 'Competitors', value: data.competitors.length },
      ],
    };
  }

  if (key === 'foundation') {
    return {
      title: 'Foundation', subtitle: 'AI infrastructure powering Azmyra',
      icon: Brain, accent: 'text-slate-500',
      items: [
        { id: 'nodes', title: 'Brain Nodes', description: `${data.stats.totalNodes} knowledge nodes captured by AI agents` },
        { id: 'rels', title: 'Connections', description: `${data.stats.totalRelations} relationships between nodes` },
      ],
      stats: [
        { label: 'Nodes', value: data.stats.totalNodes },
        { label: 'Relations', value: data.stats.totalRelations },
      ],
    };
  }

  return { title: key, subtitle: '', icon: Eye, accent: 'text-gray-500', items: [], stats: [] };
}

export function BrainRegion({ regionKey, data, onNavigate, onNavigateDetail }: BrainRegionProps) {
  const { title, subtitle, icon: Icon, accent, items, stats } = getRegionContent(regionKey, data);

  // Determine if items are navigable (initiatives in verticals/orphans)
  const isInitiativeRegion = regionKey.startsWith('v-') || regionKey === 'orphans';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Icon className={cn('h-6 w-6', accent)} />
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Stats row */}
      {stats.length > 0 && (
        <div className="flex gap-4">
          {stats.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cards grid */}
      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No items in this section yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map(item => (
            <Card
              key={item.id}
              className={cn(
                'transition-all hover:shadow-sm',
                isInitiativeRegion && 'cursor-pointer hover:border-foreground/20'
              )}
              onClick={isInitiativeRegion ? () => onNavigateDetail(regionKey, item.id) : undefined}
            >
              <CardContent className="pt-3 pb-3">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                {item.badges && item.badges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.badges.map((b, i) => (
                      <Badge key={i} variant={b.variant || 'secondary'} className="text-[10px]">
                        {b.text}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cross-navigation chips */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <span className="text-xs text-muted-foreground mr-1 self-center">Navigate to:</span>
        {['vision', 'risks', 'competitors', 'personas', 'market', 'foundation']
          .filter(k => k !== regionKey)
          .map(k => (
            <Badge
              key={k}
              variant="outline"
              className="cursor-pointer hover:bg-accent text-[10px] capitalize"
              onClick={() => onNavigate(k)}
            >
              {k}
            </Badge>
          ))}
      </div>
    </div>
  );
}
