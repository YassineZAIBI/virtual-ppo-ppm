'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, ShieldAlert, Lightbulb, Target } from 'lucide-react';
import type { BrainOverviewData } from '@/lib/types';

interface BrainValueCanvasProps {
  data: BrainOverviewData;
  onNavigate: (regionKey: string) => void;
  onNavigateDetail: (regionKey: string, itemKey: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'Shipped',
  definition: 'Building',
  validation: 'Validating',
  discovery: 'Discovery',
  idea: 'Idea',
};

export function BrainValueCanvas({ data, onNavigate, onNavigateDetail }: BrainValueCanvasProps) {
  const allInitiatives = [
    ...data.verticals.flatMap(v => v.initiatives.map(i => ({ ...i, verticalName: v.name, verticalId: v.id }))),
    ...data.orphanInitiatives.map(i => ({ ...i, verticalName: null, verticalId: null })),
  ];

  const delivered = allInitiatives.filter(i => i.status === 'approved');
  const inProgress = allInitiatives.filter(i => ['definition', 'validation', 'discovery'].includes(i.status));
  const criticalRisks = data.risks.filter(r => r.severity === 'critical' || r.severity === 'high');

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{allInitiatives.length}</p>
            <p className="text-[10px] text-muted-foreground">Total Initiatives</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <ShieldAlert className="h-4 w-4 mx-auto mb-1 text-red-500" />
            <p className="text-xl font-bold">{data.value.risksAtRisk}</p>
            <p className="text-[10px] text-muted-foreground">High/Critical Risks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-xl font-bold">{data.value.portfolioAlignment != null ? `${data.value.portfolioAlignment}%` : '--'}</p>
            <p className="text-[10px] text-muted-foreground">Alignment</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3 text-center">
            <Lightbulb className="h-4 w-4 mx-auto mb-1 text-amber-500" />
            <p className="text-xl font-bold">{data.insights.length}</p>
            <p className="text-[10px] text-muted-foreground">AI Insights</p>
          </CardContent>
        </Card>
      </div>

      {/* Value Delivered */}
      {(delivered.length > 0 || inProgress.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Value Delivered & In Progress</h3>
          <div className="space-y-2">
            {[...delivered, ...inProgress].map(i => (
              <Card
                key={i.id}
                className="cursor-pointer hover:shadow-sm transition-all"
                onClick={() => onNavigateDetail(
                  i.verticalId ? `v-${i.verticalId}` : 'orphans',
                  i.id
                )}
              >
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{i.title}</p>
                        <Badge
                          variant={i.status === 'approved' ? 'default' : 'secondary'}
                          className="text-[10px] flex-shrink-0"
                        >
                          {STATUS_LABELS[i.status] || i.status}
                        </Badge>
                      </div>
                      {i.verticalName && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{i.verticalName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {i.alignmentScore != null && (
                        <Badge variant="outline" className={cn('text-[10px]',
                          i.alignmentScore >= 70 ? 'border-green-500 text-green-600' :
                          i.alignmentScore >= 40 ? 'border-amber-500 text-amber-600' :
                          'border-red-500 text-red-600'
                        )}>
                          {Math.round(i.alignmentScore)}%
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[10px] capitalize">{i.businessValue}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Value at Risk */}
      {criticalRisks.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-500 mb-3">Value at Risk</h3>
          <div className="space-y-2">
            {criticalRisks.map(r => (
              <Card
                key={r.id}
                className="cursor-pointer hover:shadow-sm transition-all border-red-200 dark:border-red-500/20"
                onClick={() => onNavigate('risks')}
              >
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="h-4 w-4 text-red-500 flex-shrink-0" />
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <Badge variant="destructive" className="text-[10px] flex-shrink-0 ml-auto">
                      {r.severity}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Unrealized Opportunity */}
      {data.insights.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-500 mb-3">Unrealized Opportunity</h3>
          <div className="space-y-2">
            {data.insights.slice(0, 5).map(ins => (
              <Card key={ins.id} className="cursor-pointer hover:shadow-sm transition-all">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{ins.title}</p>
                      {ins.summary && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ins.summary}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px] flex-shrink-0 ml-auto">{ins.agentType}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
