'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Gauge, Sparkles, RefreshCw, TrendingUp, TrendingDown,
  Minus, ChevronDown, ChevronUp, Loader2, AlertTriangle,
  CheckCircle2, Target, Zap, Users, Clock, DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { Initiative } from '@/lib/types';
import { ShareButton } from '@/components/share/ShareButton';

interface ValueAssessment {
  initiativeId: string;
  overallScore: number;
  dimensions: {
    revenueImpact: number;
    userImpact: number;
    strategicAlignment: number;
    technicalFeasibility: number;
    marketTiming: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  aiChallenge: string;
  timestamp: Date;
}

const DIMENSION_CONFIG = [
  { key: 'revenueImpact' as const, label: 'Revenue Impact', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-500' },
  { key: 'userImpact' as const, label: 'User Impact', icon: Users, color: 'text-blue-600', bg: 'bg-blue-500' },
  { key: 'strategicAlignment' as const, label: 'Strategic Alignment', icon: Target, color: 'text-purple-600', bg: 'bg-purple-500' },
  { key: 'technicalFeasibility' as const, label: 'Technical Feasibility', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-500' },
  { key: 'marketTiming' as const, label: 'Market Timing', icon: Clock, color: 'text-cyan-600', bg: 'bg-cyan-500' },
];

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-blue-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-blue-500';
  if (score >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Low';
  return 'Very Low';
}

export function ValueMeterView() {
  const { initiatives, settings } = useAppStore();
  const [assessments, setAssessments] = useState<Record<string, ValueAssessment>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vppo-value-assessments');
      if (saved) return JSON.parse(saved);
    }
    return {};
  });
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const activeInitiatives = initiatives.filter(
    (i) => ['approved', 'definition', 'validation', 'discovery'].includes(i.status)
  );

  const saveAssessments = (updated: Record<string, ValueAssessment>) => {
    setAssessments(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vppo-value-assessments', JSON.stringify(updated));
    }
  };

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const assessInitiative = async (initiative: Initiative) => {
    setLoadingIds((prev) => new Set(prev).add(initiative.id));

    try {
      const prompt = `You are a ruthless but fair product value assessor. Analyze this initiative and provide a critical, honest assessment.

**Initiative:** ${initiative.title}
**Description:** ${initiative.description || 'No description provided'}
**Current Status:** ${initiative.status}
**Business Value (self-assessed):** ${initiative.businessValue}
**Effort:** ${initiative.effort}
**Stakeholders:** ${initiative.stakeholders.join(', ') || 'None specified'}
**Tags:** ${initiative.tags.join(', ') || 'None'}
**Known Risks:** ${initiative.risks.join(', ') || 'None identified'}
**Dependencies:** ${initiative.dependencies.join(', ') || 'None'}

Respond ONLY with valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "overallScore": <number 0-100>,
  "dimensions": {
    "revenueImpact": <number 0-100>,
    "userImpact": <number 0-100>,
    "strategicAlignment": <number 0-100>,
    "technicalFeasibility": <number 0-100>,
    "marketTiming": <number 0-100>
  },
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>"],
  "aiChallenge": "<A direct, provocative question challenging whether this initiative truly deserves its priority. Be specific and push back on assumptions.>"
}

Be critical. Don't give inflated scores. A 50 is average. Only truly exceptional initiatives should score above 80. Challenge vague descriptions, missing data, and weak justifications.`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          history: [],
          settings: settings,
        }),
      });

      if (!response.ok) throw new Error('AI assessment failed');

      const data = await response.json();
      let parsed: any;

      // Try to extract JSON from the response
      const content = data.response || data.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response');
      }

      const assessment: ValueAssessment = {
        initiativeId: initiative.id,
        overallScore: Math.min(100, Math.max(0, parsed.overallScore || 50)),
        dimensions: {
          revenueImpact: Math.min(100, Math.max(0, parsed.dimensions?.revenueImpact || 50)),
          userImpact: Math.min(100, Math.max(0, parsed.dimensions?.userImpact || 50)),
          strategicAlignment: Math.min(100, Math.max(0, parsed.dimensions?.strategicAlignment || 50)),
          technicalFeasibility: Math.min(100, Math.max(0, parsed.dimensions?.technicalFeasibility || 50)),
          marketTiming: Math.min(100, Math.max(0, parsed.dimensions?.marketTiming || 50)),
        },
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
        recommendations: parsed.recommendations || [],
        aiChallenge: parsed.aiChallenge || 'No challenge generated.',
        timestamp: new Date(),
      };

      const updated = { ...assessments, [initiative.id]: assessment };
      saveAssessments(updated);
      setExpandedIds((prev) => new Set(prev).add(initiative.id));
      toast.success(`Value assessment complete for "${initiative.title}"`);
    } catch (error: any) {
      console.error('Assessment error:', error);
      // Fallback: generate a local assessment based on available data
      const fallback = generateLocalAssessment(initiative);
      const updated = { ...assessments, [initiative.id]: fallback };
      saveAssessments(updated);
      setExpandedIds((prev) => new Set(prev).add(initiative.id));
      toast.info('Generated local assessment (AI unavailable)');
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(initiative.id);
        return next;
      });
    }
  };

  const assessAll = async () => {
    for (const init of activeInitiatives) {
      if (!loadingIds.has(init.id)) {
        await assessInitiative(init);
      }
    }
  };

  // Sorted initiatives by score (assessed first, then unassessed)
  const sortedInitiatives = [...activeInitiatives].sort((a, b) => {
    const scoreA = assessments[a.id]?.overallScore ?? -1;
    const scoreB = assessments[b.id]?.overallScore ?? -1;
    return scoreB - scoreA;
  });

  const assessedCount = activeInitiatives.filter((i) => assessments[i.id]).length;
  const avgScore = assessedCount > 0
    ? Math.round(activeInitiatives.reduce((sum, i) => sum + (assessments[i.id]?.overallScore || 0), 0) / assessedCount)
    : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Gauge className="h-7 w-7 text-blue-600" />
            Value Meter
          </h1>
          <p className="text-slate-500">AI challenges each initiative and estimates its true value proposition</p>
        </div>
        <div className="flex gap-2">
          <ShareButton resourceType="value-meter" />
          <Button variant="outline" onClick={assessAll} disabled={loadingIds.size > 0 || activeInitiatives.length === 0}>
            <Sparkles className="h-4 w-4 mr-2" />
            Assess All
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Gauge className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-bold">{activeInitiatives.length}</p>
              <p className="text-xs text-slate-500">Active Initiatives</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-3xl font-bold">{assessedCount}</p>
              <p className="text-xs text-slate-500">Assessed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', avgScore >= 60 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30')}>
              {avgScore >= 60 ? <TrendingUp className="h-6 w-6 text-green-600" /> : <Minus className="h-6 w-6 text-amber-600" />}
            </div>
            <div>
              <p className={cn('text-3xl font-bold', getScoreColor(avgScore))}>{avgScore || '--'}</p>
              <p className="text-xs text-slate-500">Avg Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-3xl font-bold text-red-600">
                {activeInitiatives.filter((i) => assessments[i.id] && assessments[i.id].overallScore < 40).length}
              </p>
              <p className="text-xs text-slate-500">Low Value</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Initiative Assessments */}
      {activeInitiatives.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center text-slate-500">
              <Gauge className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium mb-2">No Active Initiatives</h3>
              <p className="text-sm">Create initiatives in the Pipeline to start value assessments.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedInitiatives.map((initiative) => {
            const assessment = assessments[initiative.id];
            const isLoading = loadingIds.has(initiative.id);
            const isExpanded = expandedIds.has(initiative.id);

            return (
              <Card key={initiative.id} className={cn(
                'transition-all',
                assessment && assessment.overallScore >= 70 && 'border-green-200 dark:border-green-800',
                assessment && assessment.overallScore < 40 && 'border-red-200 dark:border-red-800',
              )}>
                {/* Initiative Header Row */}
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  onClick={() => assessment && toggleExpanded(initiative.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Score Circle */}
                    <div className={cn(
                      'h-14 w-14 rounded-full flex items-center justify-center flex-shrink-0 border-4',
                      assessment
                        ? cn('border-current', getScoreColor(assessment.overallScore))
                        : 'border-slate-200 dark:border-slate-700'
                    )}>
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      ) : assessment ? (
                        <span className={cn('text-lg font-bold', getScoreColor(assessment.overallScore))}>
                          {assessment.overallScore}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">--</span>
                      )}
                    </div>

                    {/* Initiative Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white truncate">{initiative.title}</h3>
                        <Badge variant="outline" className="text-xs capitalize">{initiative.status}</Badge>
                        {assessment && (
                          <Badge className={cn('text-xs', getScoreBg(assessment.overallScore), 'text-white')}>
                            {getScoreLabel(assessment.overallScore)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">{initiative.description || 'No description'}</p>

                      {/* AI Challenge preview */}
                      {assessment && (
                        <div className="mt-2 flex items-start gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700 dark:text-amber-400 italic line-clamp-1">
                            {assessment.aiChallenge}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); assessInitiative(initiative); }}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : assessment ? (
                          <><RefreshCw className="h-4 w-4 mr-1" />Re-assess</>
                        ) : (
                          <><Sparkles className="h-4 w-4 mr-1" />Assess</>
                        )}
                      </Button>
                      {assessment && (
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Mini dimension bars (always visible when assessed) */}
                  {assessment && !isExpanded && (
                    <div className="mt-3 grid grid-cols-5 gap-2 ml-[72px]">
                      {DIMENSION_CONFIG.map((dim) => (
                        <div key={dim.key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">{dim.label}</span>
                            <span className="text-[10px] font-medium">{assessment.dimensions[dim.key]}</span>
                          </div>
                          <Progress value={assessment.dimensions[dim.key]} className="h-1.5" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Expanded Assessment Details */}
                {assessment && isExpanded && (
                  <CardContent className="pt-0 pb-4 px-4 border-t dark:border-slate-800">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                      {/* Left: Dimension Scores */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Target className="h-4 w-4" /> Value Dimensions
                        </h4>
                        {DIMENSION_CONFIG.map((dim) => {
                          const Icon = dim.icon;
                          const score = assessment.dimensions[dim.key];
                          return (
                            <div key={dim.key} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Icon className={cn('h-4 w-4', dim.color)} />
                                  <span className="text-sm font-medium">{dim.label}</span>
                                </div>
                                <span className={cn('text-sm font-bold', getScoreColor(score))}>{score}/100</span>
                              </div>
                              <div className="relative h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={cn('absolute inset-y-0 left-0 rounded-full transition-all', getScoreBg(score))}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Right: Analysis */}
                      <div className="space-y-4">
                        {/* AI Challenge */}
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                          <h4 className="font-medium text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2">
                            <Sparkles className="h-4 w-4" /> AI Challenge
                          </h4>
                          <p className="text-sm text-amber-700 dark:text-amber-400 italic">
                            &ldquo;{assessment.aiChallenge}&rdquo;
                          </p>
                        </div>

                        {/* Strengths */}
                        {assessment.strengths.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
                              <TrendingUp className="h-4 w-4" /> Strengths
                            </h4>
                            <ul className="space-y-1">
                              {assessment.strengths.map((s, i) => (
                                <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Weaknesses */}
                        {assessment.weaknesses.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-red-700 dark:text-red-400 flex items-center gap-2 mb-2">
                              <TrendingDown className="h-4 w-4" /> Weaknesses
                            </h4>
                            <ul className="space-y-1">
                              {assessment.weaknesses.map((w, i) => (
                                <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                                  {w}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendations */}
                        {assessment.recommendations.length > 0 && (
                          <div>
                            <h4 className="font-medium text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2 mb-2">
                              <Zap className="h-4 w-4" /> Recommendations
                            </h4>
                            <ul className="space-y-1">
                              {assessment.recommendations.map((r, i) => (
                                <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                  <span className="text-blue-500 flex-shrink-0">{i + 1}.</span>
                                  {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Fallback local assessment when AI is unavailable
function generateLocalAssessment(initiative: Initiative): ValueAssessment {
  const valueScore = initiative.businessValue === 'high' ? 75 : initiative.businessValue === 'medium' ? 50 : 25;
  const effortPenalty = initiative.effort === 'high' ? -10 : initiative.effort === 'low' ? 10 : 0;
  const riskPenalty = initiative.risks.length * -5;
  const stakeholderBonus = Math.min(initiative.stakeholders.length * 5, 15);
  const descriptionBonus = initiative.description && initiative.description.length > 50 ? 5 : -10;

  const base = valueScore + effortPenalty + riskPenalty + stakeholderBonus + descriptionBonus;
  const clamp = (n: number) => Math.min(100, Math.max(0, n));

  return {
    initiativeId: initiative.id,
    overallScore: clamp(base),
    dimensions: {
      revenueImpact: clamp(valueScore + Math.random() * 20 - 10),
      userImpact: clamp(valueScore + stakeholderBonus),
      strategicAlignment: clamp(base + 5),
      technicalFeasibility: clamp(70 + effortPenalty + riskPenalty),
      marketTiming: clamp(50 + Math.random() * 20),
    },
    strengths: [
      initiative.businessValue === 'high' ? 'High business value potential' : 'Moderate scope keeps risk manageable',
      initiative.stakeholders.length > 0 ? `${initiative.stakeholders.length} stakeholder(s) engaged` : 'Opportunity to build stakeholder alignment',
    ],
    weaknesses: [
      ...(initiative.description ? [] : ['No description provided - unclear value proposition']),
      ...(initiative.risks.length > 0 ? [`${initiative.risks.length} identified risk(s) need mitigation`] : []),
      ...(initiative.effort === 'high' ? ['High effort may strain resources'] : []),
    ],
    recommendations: [
      'Define measurable success criteria and KPIs',
      initiative.risks.length === 0 ? 'Conduct a risk assessment workshop' : 'Develop detailed mitigation plans for identified risks',
      'Validate assumptions with customer interviews',
    ],
    aiChallenge: initiative.description
      ? `If "${initiative.title}" has such clear value, why hasn't it been done already? What's the real blocker?`
      : `"${initiative.title}" has no description. How can we assess value without understanding what we're building?`,
    timestamp: new Date(),
  };
}
