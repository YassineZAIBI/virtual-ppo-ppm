'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn, parseTags } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  Loader2, Radar as RadarIcon, TrendingUp, Activity, Sparkles,
  ArrowUpRight, ArrowRight, ArrowDownRight, DollarSign, Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface CompetitorMetric {
  id: string;
  name: string;
  website?: string | null;
  tags: string[];
  feedCount: number;
  activityScore: number;
  sentimentScore: number;
  relevanceScore: number;
  productVelocity: number;
  marketPresence: number;
  threatLevel: number;
  // AI market analysis fields
  estimatedMarketCap?: string | null;
  estimatedUsers?: string | null;
  marketTrend?: string | null;
  predictedGrowth?: number | null;
  marketAnalysis?: string | null;
  marketAnalysisAt?: string | null;
}

const TAG_COLORS: Record<string, string> = {
  direct: '#ef4444',
  indirect: '#f59e0b',
  emerging: '#3b82f6',
};


const COMPETITOR_COLORS = [
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
  '#06b6d4', '#f43f5e', '#10b981', '#eab308', '#a855f7',
];

const TREND_COLORS: Record<string, string> = {
  growing: '#22c55e',
  stable: '#f59e0b',
  declining: '#ef4444',
};

const RADAR_DIMENSIONS = [
  { key: 'activityScore', label: 'Activity' },
  { key: 'sentimentScore', label: 'Sentiment' },
  { key: 'relevanceScore', label: 'Relevance' },
  { key: 'productVelocity', label: 'Product Velocity' },
  { key: 'marketPresence', label: 'Market Presence' },
  { key: 'threatLevel', label: 'Threat Level' },
];

/** Parse "$2.5B" → 2500 (in millions), "$150M" → 150, "$50K" → 0.05 */
function parseMarketValue(val: string | null | undefined): number {
  if (!val) return 0;
  const match = val.replace(/[~,]/g, '').match(/([\d.]+)\s*([BKMT])/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'B') return num * 1000;
  if (unit === 'M') return num;
  if (unit === 'K') return num / 1000;
  if (unit === 'T') return num * 1000000;
  return num;
}

/** Format number on log scale axis: 0.1 → "$100K", 100 → "$100M", 2500 → "$2.5B" */
function formatAxisValue(val: number): string {
  if (val >= 1000) return `$${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}B`;
  if (val >= 1) return `$${val.toFixed(val >= 100 ? 0 : 0)}M`;
  if (val > 0) return `$${Math.round(val * 1000)}K`;
  return '$0';
}

function formatUsersAxis(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}B`;
  if (val >= 1) return `${val.toFixed(val >= 100 ? 0 : 0)}M`;
  if (val > 0) return `${Math.round(val * 1000)}K`;
  return '0';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CompetitorRadarView() {
  const [metrics, setMetrics] = useState<CompetitorMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const { settings } = useAppStore();

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/competitors/radar');
      if (!res.ok) throw new Error('Failed to fetch radar data');
      const data = await res.json();
      setMetrics(data.competitors ?? []);
    } catch (err) {
      toast.error('Could not load radar data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/competitors/market-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmConfig: settings.llm?.apiKey
            ? {
                provider: settings.llm.provider,
                apiKey: settings.llm.apiKey,
                model: settings.llm.model || undefined,
              }
            : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Analysis failed');
      }
      const data = await res.json();
      toast.success(`Market analysis complete for ${data.analyzed} competitor(s).`);
      await fetchMetrics();
    } catch (err: any) {
      toast.error(err.message || 'Could not complete market analysis');
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading radar data...</span>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <RadarIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium">No radar data yet</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Add competitors and run a scan to generate market positioning data.
        </p>
      </div>
    );
  }

  // Check if AI analysis has been run
  const hasAIAnalysis = metrics.some((m) => m.estimatedMarketCap || m.estimatedUsers);

  // Build radar chart data
  const radarData = RADAR_DIMENSIONS.map((dim) => {
    const entry: Record<string, unknown> = { dimension: dim.label };
    for (const comp of metrics) {
      entry[comp.name] = (comp as unknown as Record<string, number>)[dim.key] ?? 0;
    }
    return entry;
  });

  // Build scatter data — AI mode (Market Cap vs Users) or fallback (Activity vs Sentiment)
  const scatterData = metrics.map((comp, i) => {
    if (hasAIAnalysis) {
      const capVal = parseMarketValue(comp.estimatedMarketCap);
      const usersVal = parseMarketValue(comp.estimatedUsers);
      return {
        x: Math.max(capVal, 0.01),
        y: Math.max(usersVal, 0.01),
        z: Math.max(comp.feedCount * 20, 60),
        name: comp.name,
        id: comp.id,
        color: TREND_COLORS[comp.marketTrend ?? ''] ?? COMPETITOR_COLORS[i % COMPETITOR_COLORS.length],
        trend: comp.marketTrend,
        growth: comp.predictedGrowth,
        capLabel: comp.estimatedMarketCap ?? 'Unknown',
        usersLabel: comp.estimatedUsers ?? 'Unknown',
      };
    }
    return {
      x: comp.marketPresence,
      y: comp.threatLevel,
      z: Math.max(comp.feedCount * 20, 60),
      name: comp.name,
      id: comp.id,
      color: COMPETITOR_COLORS[i % COMPETITOR_COLORS.length],
      trend: null as string | null,
      growth: null as number | null,
      capLabel: null as string | null,
      usersLabel: null as string | null,
    };
  });

  const activeComp = selectedCompetitor
    ? metrics.find((m) => m.id === selectedCompetitor)
    : null;

  return (
    <div className="space-y-6">
      {/* Market Positioning Map */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {hasAIAnalysis ? 'Market Intelligence Map' : 'Market Positioning Map'}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                {hasAIAnalysis
                  ? 'Market cap vs estimated users. Color = growth trend. Bubble size = intel volume.'
                  : 'Market presence vs threat level. Bubble size = intel volume. Run AI analysis for deeper insights.'}
              </p>
            </div>
            <Button
              variant={hasAIAnalysis ? 'outline' : 'default'}
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {hasAIAnalysis ? 'Re-analyze' : 'Analyze Market'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name={hasAIAnalysis ? 'Market Cap' : 'Market Presence'}
                  domain={hasAIAnalysis ? ['auto', 'auto'] : [0, 100]}
                  scale={hasAIAnalysis ? 'log' : 'auto'}
                  tick={{ fontSize: 11 }}
                  tickFormatter={hasAIAnalysis ? formatAxisValue : undefined}
                  label={{
                    value: hasAIAnalysis ? 'Est. Market Cap' : 'Market Presence',
                    position: 'bottom',
                    offset: 0,
                    fontSize: 12,
                    className: 'fill-muted-foreground',
                  }}
                  className="text-muted-foreground"
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name={hasAIAnalysis ? 'Est. Users' : 'Threat Level'}
                  domain={hasAIAnalysis ? ['auto', 'auto'] : [0, 100]}
                  scale={hasAIAnalysis ? 'log' : 'auto'}
                  tick={{ fontSize: 11 }}
                  tickFormatter={hasAIAnalysis ? formatUsersAxis : undefined}
                  label={{
                    value: hasAIAnalysis ? 'Est. Users' : 'Threat Level',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                    fontSize: 12,
                    className: 'fill-muted-foreground',
                  }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.[0]) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md">
                        <p className="font-medium text-sm">{d.name}</p>
                        {hasAIAnalysis ? (
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            <p>Market Cap: {d.capLabel}</p>
                            <p>Users: {d.usersLabel}</p>
                            {d.trend && (
                              <p className="capitalize">
                                Trend: <span style={{ color: TREND_COLORS[d.trend] }}>{d.trend}</span>
                                {d.growth != null && ` (${d.growth > 0 ? '+' : ''}${d.growth}%)`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            Market Presence: {d.x}% | Threat Level: {d.y}%
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <Scatter data={scatterData}>
                  {scatterData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={entry.color}
                      r={Math.max(entry.z / 10, 8)}
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedCompetitor(
                          selectedCompetitor === entry.id ? null : entry.id,
                        )
                      }
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {scatterData.map((entry) => (
              <button
                key={entry.id}
                className={cn(
                  'flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors',
                  selectedCompetitor === entry.id
                    ? 'bg-accent font-medium'
                    : 'hover:bg-accent/50',
                )}
                onClick={() =>
                  setSelectedCompetitor(
                    selectedCompetitor === entry.id ? null : entry.id,
                  )
                }
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
                {entry.trend && (
                  <span className="ml-0.5">
                    {entry.trend === 'growing' && <ArrowUpRight className="h-3 w-3 text-green-500" />}
                    {entry.trend === 'stable' && <ArrowRight className="h-3 w-3 text-amber-500" />}
                    {entry.trend === 'declining' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Trend legend when AI analysis exists */}
          {hasAIAnalysis && (
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500" /> Growing
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Stable
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Declining
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Competitive Radar
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Multi-dimensional comparison across all tracked competitors.
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fontSize: 9 }}
                    className="text-muted-foreground"
                  />
                  {metrics.map((comp, i) => (
                    <Radar
                      key={comp.id}
                      name={comp.name}
                      dataKey={comp.name}
                      stroke={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]}
                      fill={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]}
                      fillOpacity={selectedCompetitor === comp.id ? 0.3 : 0.08}
                      strokeWidth={selectedCompetitor === comp.id ? 2.5 : 1.5}
                      strokeOpacity={
                        !selectedCompetitor || selectedCompetitor === comp.id ? 1 : 0.25
                      }
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Detail */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {activeComp ? activeComp.name : 'Competitor Details'}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {activeComp ? 'Detailed breakdown' : 'Click a competitor to see details'}
            </p>
          </CardHeader>
          <CardContent>
            {activeComp ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {parseTags(activeComp.tags).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs capitalize"
                      style={{
                        borderColor: TAG_COLORS[tag] || '#94a3b8',
                        color: TAG_COLORS[tag] || '#94a3b8',
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground">
                    {activeComp.feedCount} intel items
                  </span>
                </div>

                {/* AI Market Insights */}
                {activeComp.estimatedMarketCap || activeComp.estimatedUsers ? (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                          <DollarSign className="h-3 w-3" /> Market Cap
                        </div>
                        <p className="text-lg font-semibold tabular-nums">
                          {activeComp.estimatedMarketCap || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                          <Users className="h-3 w-3" /> Est. Users
                        </div>
                        <p className="text-lg font-semibold tabular-nums">
                          {activeComp.estimatedUsers || 'Unknown'}
                        </p>
                      </div>
                    </div>

                    {/* Growth trend */}
                    {activeComp.marketTrend && (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-xs capitalize"
                          style={{
                            backgroundColor: `${TREND_COLORS[activeComp.marketTrend]}20`,
                            color: TREND_COLORS[activeComp.marketTrend],
                            borderColor: TREND_COLORS[activeComp.marketTrend],
                          }}
                        >
                          {activeComp.marketTrend === 'growing' && <ArrowUpRight className="h-3 w-3 mr-1" />}
                          {activeComp.marketTrend === 'stable' && <ArrowRight className="h-3 w-3 mr-1" />}
                          {activeComp.marketTrend === 'declining' && <ArrowDownRight className="h-3 w-3 mr-1" />}
                          {activeComp.marketTrend}
                        </Badge>
                        {activeComp.predictedGrowth != null && (
                          <span className="text-sm font-medium tabular-nums" style={{ color: TREND_COLORS[activeComp.marketTrend] }}>
                            {activeComp.predictedGrowth > 0 ? '+' : ''}
                            {activeComp.predictedGrowth}% / yr
                          </span>
                        )}
                      </div>
                    )}

                    {/* Analysis paragraph */}
                    {activeComp.marketAnalysis && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {activeComp.marketAnalysis}
                      </p>
                    )}

                    {/* Timestamp */}
                    {activeComp.marketAnalysisAt && (
                      <p className="text-[10px] text-muted-foreground/60">
                        Analyzed {timeAgo(activeComp.marketAnalysisAt)}
                      </p>
                    )}
                  </div>
                ) : null}

                {/* Feed-derived metrics */}
                <div className="space-y-3">
                  {RADAR_DIMENSIONS.map((dim) => {
                    const value =
                      (activeComp as unknown as Record<string, number>)[dim.key] ?? 0;
                    return (
                      <div key={dim.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-muted-foreground">{dim.label}</span>
                          <span className="text-sm font-medium tabular-nums">{value}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all',
                              value >= 70
                                ? 'bg-green-500'
                                : value >= 40
                                  ? 'bg-amber-500'
                                  : 'bg-gray-400',
                            )}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics.map((comp, i) => (
                  <button
                    key={comp.id}
                    className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors text-left"
                    onClick={() => setSelectedCompetitor(comp.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            COMPETITOR_COLORS[i % COMPETITOR_COLORS.length],
                        }}
                      />
                      <div>
                        <p className="text-sm font-medium">{comp.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {comp.estimatedMarketCap
                            ? `${comp.estimatedMarketCap} | ${comp.estimatedUsers ?? '?'} users`
                            : `${comp.feedCount} items | Threat: ${comp.threatLevel}%`}
                        </p>
                      </div>
                    </div>
                    {comp.marketTrend ? (
                      <Badge
                        variant="secondary"
                        className="text-xs capitalize"
                        style={{
                          backgroundColor: `${TREND_COLORS[comp.marketTrend]}20`,
                          color: TREND_COLORS[comp.marketTrend],
                        }}
                      >
                        {comp.marketTrend}
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          comp.sentimentScore >= 60
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : comp.sentimentScore <= 40
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
                        )}
                      >
                        {comp.sentimentScore >= 60
                          ? 'Positive'
                          : comp.sentimentScore <= 40
                            ? 'Negative'
                            : 'Neutral'}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
