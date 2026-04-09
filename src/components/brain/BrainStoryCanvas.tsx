'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Eye, ShieldAlert, Binoculars, Package, Users, TrendingUp, Brain, ArrowRight, ArrowDown,
} from 'lucide-react';
import type { BrainOverviewData } from '@/lib/types';

interface BrainStoryCanvasProps {
  data: BrainOverviewData;
  onNavigate: (regionKey: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-green-500',
  definition: 'bg-blue-500',
  validation: 'bg-blue-400',
  discovery: 'bg-amber-500',
  idea: 'bg-gray-400',
};

function ZoneCard({
  title, icon: Icon, accent, count, children, onClick,
}: {
  title: string; icon: typeof Eye; accent: string;
  count?: number; children: React.ReactNode; onClick: () => void;
}) {
  return (
    <Card
      className={cn('cursor-pointer transition-all hover:shadow-md hover:border-foreground/20 border-l-2', accent)}
      onClick={onClick}
    >
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-semibold">{title}</span>
          {count != null && count > 0 && (
            <Badge variant="secondary" className="text-[10px] ml-auto">{count}</Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground space-y-1">{children}</div>
      </CardContent>
    </Card>
  );
}

function FlowArrow({ label, direction = 'right' }: { label: string; direction?: 'right' | 'down' }) {
  return (
    <div className={cn(
      'flex items-center gap-1 text-[10px] text-muted-foreground/60 font-medium',
      direction === 'down' ? 'justify-center py-1' : 'justify-center px-1'
    )}>
      {direction === 'right' && <>{label} <ArrowRight className="h-3 w-3" /></>}
      {direction === 'down' && <><ArrowDown className="h-3 w-3" /> {label}</>}
    </div>
  );
}

export function BrainStoryCanvas({ data, onNavigate }: BrainStoryCanvasProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[180px_1fr_180px] grid-cols-1">
      {/* LEFT: External Forces */}
      <div className="space-y-3">
        <ZoneCard
          title="Risks" icon={ShieldAlert} accent="border-red-500"
          count={data.risks.length} onClick={() => onNavigate('risks')}
        >
          {data.risks.length === 0 && <p>No active risks</p>}
          {data.risks.slice(0, 3).map(r => (
            <div key={r.id} className="flex items-center gap-1.5">
              <span className={cn(
                'h-1.5 w-1.5 rounded-full flex-shrink-0',
                r.severity === 'critical' ? 'bg-red-500' : r.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
              )} />
              <span className="truncate">{r.title}</span>
            </div>
          ))}
        </ZoneCard>

        <FlowArrow label="threatens" direction="right" />

        <ZoneCard
          title="Competitors" icon={Binoculars} accent="border-gray-500"
          count={data.competitors.length} onClick={() => onNavigate('competitors')}
        >
          {data.competitors.length === 0 && <p>No competitors tracked</p>}
          {data.competitors.slice(0, 3).map(c => (
            <p key={c.id} className="truncate">{c.name}</p>
          ))}
        </ZoneCard>

        <FlowArrow label="pressures" direction="right" />
      </div>

      {/* CENTER: Our Strategy */}
      <div className="space-y-3">
        {/* Vision */}
        <ZoneCard
          title="Vision" icon={Eye} accent="border-purple-500"
          onClick={() => onNavigate('vision')}
        >
          {data.northStar ? (
            <p className="line-clamp-2 text-foreground">{data.northStar.statement}</p>
          ) : (
            <p className="text-amber-500">No north star defined</p>
          )}
          {data.goals.length > 0 && (
            <p className="mt-1">{data.goals.length} business goal{data.goals.length > 1 ? 's' : ''}</p>
          )}
        </ZoneCard>

        <FlowArrow label="organized into verticals" direction="down" />

        {/* Verticals */}
        {data.verticals.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.verticals.map(v => (
              <Card
                key={v.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md hover:border-foreground/20',
                  v.initiativeCount === 0 && 'opacity-50'
                )}
                onClick={() => onNavigate(`v-${v.id}`)}
              >
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-semibold truncate">{v.name}</span>
                    <Badge variant="secondary" className="text-[10px] ml-auto">
                      {v.initiativeCount}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {v.initiatives.slice(0, 2).map(i => (
                      <div key={i.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', STATUS_COLORS[i.status] || 'bg-gray-400')} />
                        <span className="truncate">{i.title}</span>
                      </div>
                    ))}
                    {v.initiativeCount > 2 && (
                      <p className="text-[10px] text-muted-foreground">+{v.initiativeCount - 2} more</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-4 text-center text-sm text-muted-foreground">
              No verticals yet. Create verticals to organize initiatives.
            </CardContent>
          </Card>
        )}

        {/* Orphan Initiatives */}
        {data.orphanInitiatives.length > 0 && (
          <Card
            className="cursor-pointer border-dashed hover:border-foreground/20 transition-all"
            onClick={() => onNavigate('orphans')}
          >
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-muted-foreground">Unclassified</span>
                <Badge variant="outline" className="text-[10px]">{data.orphanInitiatives.length}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {data.orphanInitiatives.length} initiative{data.orphanInitiatives.length > 1 ? 's' : ''} not assigned to a vertical
              </p>
            </CardContent>
          </Card>
        )}

        <FlowArrow label="serves" direction="down" />

        {/* Personas */}
        <ZoneCard
          title="Personas" icon={Users} accent="border-pink-500"
          count={data.personas.length} onClick={() => onNavigate('personas')}
        >
          {data.personas.length === 0 && <p>No personas defined</p>}
          {data.personas.slice(0, 3).map(p => (
            <p key={p.id} className="truncate">{p.name}</p>
          ))}
        </ZoneCard>
      </div>

      {/* RIGHT: Growth Levers */}
      <div className="space-y-3">
        <ZoneCard
          title="Market" icon={TrendingUp} accent="border-green-500"
          onClick={() => onNavigate('market')}
        >
          <p>{data.competitors.length} competitor{data.competitors.length !== 1 ? 's' : ''} tracked</p>
          {data.insights.length > 0 && <p>{data.insights.length} AI insights</p>}
        </ZoneCard>

        <FlowArrow label="opportunity for" direction="down" />

        <ZoneCard
          title="Foundation" icon={Brain} accent="border-slate-500"
          onClick={() => onNavigate('foundation')}
        >
          <p>{data.stats.totalNodes} brain nodes</p>
          <p>{data.stats.totalRelations} connections</p>
          {data.stats.portfolioAlignment != null && (
            <p className="text-foreground font-medium">{data.stats.portfolioAlignment}% aligned</p>
          )}
        </ZoneCard>

        <FlowArrow label="powers verticals" direction="right" />
      </div>
    </div>
  );
}
