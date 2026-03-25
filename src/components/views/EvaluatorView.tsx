'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Gauge, Loader2, Sparkles, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { VisionGateBanner } from '@/components/layout/VisionGateBanner';

interface EvaluationResult {
  initiativeId: string;
  scores: {
    visionAlignment: number;
    marketFit: number;
    feasibility: number;
    riskLevel: number;
    overall: number;
  };
  summary: string;
  strengths: string[];
  concerns: string[];
}

export function EvaluatorView() {
  const { initiatives, setInitiatives, settings } = useAppStore();
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, EvaluationResult>>({});
  const [loadingScores, setLoadingScores] = useState(true);

  useEffect(() => {
    fetch('/api/initiatives')
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setInitiatives(d); })
      .catch(() => {});
  }, [setInitiatives]);

  // Fetch existing evaluation scores from database on mount
  useEffect(() => {
    setLoadingScores(true);
    fetch('/api/vision/alignment?entityType=initiative')
      .then(r => r.ok ? r.json() : [])
      .then((scores: any[]) => {
        if (!Array.isArray(scores)) return;
        const loaded: Record<string, EvaluationResult> = {};
        for (const score of scores) {
          loaded[score.entityId] = {
            initiativeId: score.entityId,
            scores: {
              visionAlignment: score.northStarRelevance ?? score.overallScore ?? 0,
              marketFit: score.businessGoalCoverage ?? 0,
              feasibility: score.targetGroupImpact ?? 0,
              riskLevel: score.needFulfillment ?? 0,
              overall: score.overallScore ?? 0,
            },
            summary: score.reasoning || 'Evaluation complete.',
            strengths: score.strengths || [],
            concerns: score.concerns || [],
          };
        }
        setResults(prev => ({ ...loaded, ...prev }));
      })
      .catch(() => {})
      .finally(() => setLoadingScores(false));
  }, []);

  const evaluateInitiative = async (initiativeId: string) => {
    setEvaluating(initiativeId);
    try {
      const res = await fetch('/api/vision/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'initiative', entityId: initiativeId, settings }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(prev => ({
          ...prev,
          [initiativeId]: {
            initiativeId,
            scores: {
              visionAlignment: data.northStarRelevance ?? data.overallScore ?? 0,
              marketFit: data.businessGoalCoverage ?? 0,
              feasibility: data.targetGroupImpact ?? 0,
              riskLevel: data.needFulfillment ?? 0,
              overall: data.overallScore ?? 0,
            },
            summary: data.reasoning || 'Evaluation complete.',
            strengths: data.strengths || [],
            concerns: data.concerns || [],
          },
        }));
        toast.success('Evaluation complete');
      } else {
        toast.error('Evaluation failed');
      }
    } catch {
      toast.error('Failed to evaluate initiative');
    } finally {
      setEvaluating(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 75) return '[&>div]:bg-green-500';
    if (score >= 50) return '[&>div]:bg-amber-500';
    return '[&>div]:bg-red-500';
  };

  return (
    <div className="p-6 space-y-6">
      <VisionGateBanner />

      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Gauge className="h-6 w-6 text-teal-500" />
          AI Evaluator
        </h1>
        <p className="text-muted-foreground">Evaluate initiatives against your vision, market fit, and feasibility.</p>
      </div>

      {initiatives.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Gauge className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No initiatives to evaluate</p>
            <p className="text-sm mt-1">Create initiatives in the Portfolio to evaluate them here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {initiatives.map((initiative) => {
            const result = results[initiative.id];
            const isEvaluating = evaluating === initiative.id;

            return (
              <Card key={initiative.id} className={cn(
                'transition-all',
                result && result.scores.overall >= 75 && 'border-green-200 dark:border-green-800',
                result && result.scores.overall < 50 && 'border-red-200 dark:border-red-800',
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{initiative.title}</CardTitle>
                    <Badge variant="outline" className="capitalize">{initiative.status}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">{initiative.description || 'No description'}</CardDescription>
                </CardHeader>
                <CardContent>
                  {result ? (
                    <div className="space-y-3">
                      {/* Score bars */}
                      {[
                        { label: 'North Star Relevance', value: result.scores.visionAlignment },
                        { label: 'Business Goal Coverage', value: result.scores.marketFit },
                        { label: 'Target Group Impact', value: result.scores.feasibility },
                        { label: 'Need Fulfillment', value: result.scores.riskLevel },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">{label}</span>
                            <span className={cn('font-semibold', getScoreColor(value))}>{value}%</span>
                          </div>
                          <Progress value={value} className={cn('h-2', getProgressColor(value))} />
                        </div>
                      ))}

                      {/* Overall score */}
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">Overall Score</span>
                          <span className={cn('text-xl font-bold', getScoreColor(result.scores.overall))}>
                            {result.scores.overall}%
                          </span>
                        </div>
                      </div>

                      {/* Summary */}
                      {result.summary && (
                        <p className="text-xs text-muted-foreground">{result.summary}</p>
                      )}

                      {/* Strengths & Concerns */}
                      {result.strengths.length > 0 && (
                        <div className="space-y-1">
                          {result.strengths.map((s, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-green-700 dark:text-green-400">
                              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {result.concerns.length > 0 && (
                        <div className="space-y-1">
                          {result.concerns.map((c, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                              <span>{c}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => evaluateInitiative(initiative.id)}>
                        <Sparkles className="h-3 w-3 mr-1" /> Re-evaluate
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => evaluateInitiative(initiative.id)}
                      disabled={isEvaluating || loadingScores}
                    >
                      {isEvaluating ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Evaluating...</>
                      ) : loadingScores ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" /> Evaluate with AI</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
