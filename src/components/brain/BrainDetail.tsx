'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, Eye, ShieldAlert, Users, Package, Target, Brain,
  Clock, ChevronRight,
} from 'lucide-react';
import type { BrainOverviewData, BrainConnection } from '@/lib/types';

interface BrainDetailProps {
  regionKey: string;
  itemKey: string;
  data: BrainOverviewData;
  detailData: unknown;
  onNavigate: (regionKey: string) => void;
  onNavigateDetail: (regionKey: string, itemKey: string) => void;
  onBack: () => void;
}

interface InitiativeDetail {
  initiative: {
    id: string; title: string; description: string | null;
    status: string; businessValue: string; effort: string;
    verticalId: string | null;
    vertical: { id: string; name: string } | null;
    updatedAt: string; createdAt: string;
  };
  alignment: {
    overallScore: number; reasoning: string | null;
    northStarRelevance: number | null; businessGoalCoverage: number | null;
    targetGroupImpact: number | null; needFulfillment: number | null;
  } | null;
  risks: Array<{ id: string; title: string; severity: string }>;
  connections: BrainConnection[];
  timeline: Array<{ id: string; title: string; type: string; domain: string; createdAt: string; summary: string | null }>;
}

const CONNECTION_ICONS: Record<string, typeof Eye> = {
  vision: Eye,
  vertical: Package,
  risk: ShieldAlert,
  persona: Users,
  goal: Target,
};

const CONNECTION_COLORS: Record<string, string> = {
  vision: 'text-purple-500',
  vertical: 'text-indigo-500',
  risk: 'text-red-500',
  persona: 'text-pink-500',
  goal: 'text-amber-500',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

function getStaticDetail(regionKey: string, itemKey: string, data: BrainOverviewData): {
  title: string; description: string; badges: Array<{ text: string; variant: BadgeVariant }>;
} | null {
  if (regionKey === 'risks') {
    const risk = data.risks.find(r => r.id === itemKey);
    if (risk) return {
      title: risk.title, description: risk.description,
      badges: [
        { text: risk.severity, variant: risk.severity === 'critical' || risk.severity === 'high' ? 'destructive' : 'secondary' as const },
        { text: `Probability: ${risk.probability}`, variant: 'outline' as const },
      ],
    };
  }
  if (regionKey === 'competitors') {
    const comp = data.competitors.find(c => c.id === itemKey);
    if (comp) return {
      title: comp.name, description: comp.description || comp.website || '',
      badges: comp.website ? [{ text: comp.website, variant: 'outline' as const }] : [],
    };
  }
  if (regionKey === 'personas') {
    const persona = data.personas.find(p => p.id === itemKey);
    if (persona) return {
      title: persona.name, description: persona.description || '',
      badges: [],
    };
  }
  if (regionKey === 'vision') {
    if (itemKey === 'ns' && data.northStar) return {
      title: 'North Star', description: data.northStar.statement, badges: [],
    };
    const goal = data.goals.find(g => g.id === itemKey);
    if (goal) return {
      title: goal.title, description: goal.description || '',
      badges: goal.metric ? [{ text: `${goal.metric}: ${goal.target || 'TBD'}`, variant: 'outline' as const }] : [],
    };
  }
  return null;
}

function getSiblings(regionKey: string, itemKey: string, data: BrainOverviewData) {
  if (regionKey.startsWith('v-')) {
    const v = data.verticals.find(v => v.id === regionKey.slice(2));
    return v?.initiatives.filter(i => i.id !== itemKey).map(i => ({ id: i.id, title: i.title })) || [];
  }
  if (regionKey === 'orphans') {
    return data.orphanInitiatives.filter(i => i.id !== itemKey).map(i => ({ id: i.id, title: i.title }));
  }
  if (regionKey === 'risks') {
    return data.risks.filter(r => r.id !== itemKey).map(r => ({ id: r.id, title: r.title }));
  }
  if (regionKey === 'competitors') {
    return data.competitors.filter(c => c.id !== itemKey).map(c => ({ id: c.id, title: c.name }));
  }
  if (regionKey === 'personas') {
    return data.personas.filter(p => p.id !== itemKey).map(p => ({ id: p.id, title: p.name }));
  }
  return [];
}

export function BrainDetail({ regionKey, itemKey, data, detailData, onNavigate, onNavigateDetail, onBack }: BrainDetailProps) {
  const isInitiative = regionKey.startsWith('v-') || regionKey === 'orphans';
  const detail = isInitiative ? detailData as InitiativeDetail | null : null;
  const staticDetail = !isInitiative ? getStaticDetail(regionKey, itemKey, data) : null;

  const siblings = getSiblings(regionKey, itemKey, data);

  if (!detail && !staticDetail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <p className="text-sm text-muted-foreground">Loading detail...</p>
      </div>
    );
  }

  // Initiative detail view
  if (isInitiative && detail) {
    const { initiative, alignment, risks, connections, timeline } = detail;
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">{initiative.title}</h2>
            <Badge variant={initiative.status === 'approved' ? 'default' : 'secondary'} className="text-[10px]">
              {initiative.status}
            </Badge>
            <Badge variant="outline" className="text-[10px] capitalize">{initiative.businessValue}</Badge>
          </div>
          {initiative.description && (
            <p className="text-sm text-muted-foreground mt-1">{initiative.description}</p>
          )}
          {initiative.vertical && (
            <p className="text-xs text-muted-foreground mt-1">
              Vertical: <button className="underline hover:text-foreground" onClick={() => onNavigate(`v-${initiative.vertical!.id}`)}>{initiative.vertical.name}</button>
            </p>
          )}
        </div>

        {/* Metrics grid */}
        {alignment && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Overall', value: `${Math.round(alignment.overallScore)}%` },
              { label: 'North Star', value: alignment.northStarRelevance != null ? `${Math.round(alignment.northStarRelevance)}%` : '--' },
              { label: 'Goal Coverage', value: alignment.businessGoalCoverage != null ? `${Math.round(alignment.businessGoalCoverage)}%` : '--' },
              { label: 'User Impact', value: alignment.targetGroupImpact != null ? `${Math.round(alignment.targetGroupImpact)}%` : '--' },
            ].map(m => (
              <Card key={m.label}>
                <CardContent className="pt-3 pb-3 text-center">
                  <p className="text-lg font-bold">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Connections */}
        {connections.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">How this connects</h3>
            <div className="space-y-2">
              {connections.map((c, i) => {
                const Icon = CONNECTION_ICONS[c.type] || Brain;
                const color = CONNECTION_COLORS[c.type] || 'text-gray-500';
                return (
                  <Card
                    key={i}
                    className="cursor-pointer hover:shadow-sm transition-all"
                    onClick={() => onNavigate(c.targetSection)}
                  >
                    <CardContent className="pt-2.5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4 flex-shrink-0', color)} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{c.value}</p>
                          <p className="text-[10px] text-muted-foreground">{c.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">{c.label}</Badge>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Linked Risks */}
        {risks.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-500 mb-2">Linked Risks</h3>
            <div className="space-y-2">
              {risks.map(r => (
                <Card key={r.id} className="cursor-pointer hover:shadow-sm transition-all" onClick={() => onNavigate('risks')}>
                  <CardContent className="pt-2.5 pb-2.5">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <Badge variant="destructive" className="text-[10px] ml-auto flex-shrink-0">{r.severity}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Journey Timeline */}
        {timeline.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Journey</h3>
            <div className="relative pl-4 border-l-2 border-muted space-y-3">
              {timeline.map(node => (
                <div key={node.id} className="relative">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{node.title}</p>
                      <Badge variant="outline" className="text-[10px]">{node.type}</Badge>
                    </div>
                    {node.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{node.summary}</p>}
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(node.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Siblings */}
        {siblings.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Also in this region:</p>
            <div className="flex flex-wrap gap-1.5">
              {siblings.slice(0, 8).map(s => (
                <Badge
                  key={s.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent text-[10px]"
                  onClick={() => onNavigateDetail(regionKey, s.id)}
                >
                  {s.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Static detail (non-initiative items)
  if (staticDetail) {
    return (
      <div className="space-y-5">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 -ml-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">{staticDetail.title}</h2>
            {staticDetail.badges.map((b, i) => (
              <Badge key={i} variant={b.variant || 'secondary'} className="text-[10px]">{b.text}</Badge>
            ))}
          </div>
          {staticDetail.description && (
            <p className="text-sm text-muted-foreground mt-2">{staticDetail.description}</p>
          )}
        </div>

        {/* Siblings */}
        {siblings.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Also in this region:</p>
            <div className="flex flex-wrap gap-1.5">
              {siblings.slice(0, 8).map(s => (
                <Badge
                  key={s.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent text-[10px]"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('brain-navigate-detail', {
                      detail: { regionKey, itemKey: s.id },
                    }));
                  }}
                >
                  {s.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
