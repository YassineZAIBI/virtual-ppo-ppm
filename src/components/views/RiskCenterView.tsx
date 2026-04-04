'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  ShieldAlert, Plus, AlertTriangle, Shield, ShieldCheck, Trash2,
  Sparkles, Loader2, ChevronDown, ChevronRight, Check, X,
  Wrench, TrendingUp, Zap, Clock, Target, AlertCircle, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { VisionGateBanner } from '@/components/layout/VisionGateBanner';

// ── helpers ─────────────────────────────────────────────────────────────

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function scoreColor(score: number): string {
  if (score >= 75) return 'bg-red-500';
  if (score >= 50) return 'bg-orange-500';
  if (score >= 25) return 'bg-amber-500';
  return 'bg-green-500';
}

function scoreTextColor(score: number): string {
  if (score >= 75) return 'text-red-600 dark:text-red-400';
  if (score >= 50) return 'text-orange-600 dark:text-orange-400';
  if (score >= 25) return 'text-amber-600 dark:text-amber-400';
  return 'text-green-600 dark:text-green-400';
}

// ── component ───────────────────────────────────────────────────────────

export function RiskCenterView() {
  const { risks, setRisks, addRisk, updateRisk, removeRisk, settings } = useAppStore();
  const [riskLoading, setRiskLoading] = useState(true);
  const [showNewRisk, setShowNewRisk] = useState(false);
  const [newRisk, setNewRisk] = useState({
    title: '',
    description: '',
    severity: 'medium' as string,
    probability: 'medium' as string,
    impact: 'medium' as string,
    mitigationPlan: '',
  });

  // AI assessment state
  const [assessingId, setAssessingId] = useState<string | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [riskActions, setRiskActions] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetch('/api/risks')
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        if (Array.isArray(d)) {
          setRisks(d);
          // Hydrate proposed actions from persisted aiAssessment
          const hydrated: Record<string, any[]> = {};
          for (const risk of d) {
            if (risk.aiAssessment) {
              try {
                const parsed = typeof risk.aiAssessment === 'string'
                  ? JSON.parse(risk.aiAssessment)
                  : risk.aiAssessment;
                if (Array.isArray(parsed.proposedActions) && parsed.proposedActions.length > 0) {
                  hydrated[risk.id] = parsed.proposedActions.map((a: any, i: number) => ({
                    id: a.id || `risk-action-${risk.id}-${i}`,
                    toolName: a.toolName,
                    description: a.description,
                    toolArguments: a.toolArguments ?? {},
                  }));
                }
              } catch { /* ignore malformed JSON */ }
            }
          }
          if (Object.keys(hydrated).length > 0) {
            setRiskActions(prev => ({ ...prev, ...hydrated }));
          }
        }
      })
      .catch(() => {})
      .finally(() => setRiskLoading(false));
  }, [setRisks]);

  // ── handlers ────────────────────────────────────────────────────────

  const handleAddRisk = async () => {
    if (!newRisk.title.trim()) return;
    try {
      const res = await fetch('/api/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRisk, status: 'identified' }),
      });
      if (res.ok) {
        const saved = await res.json();
        addRisk({ ...saved, relatedItems: saved.relatedItems ?? [] });
        toast.success('Risk added');
      } else {
        throw new Error('API error');
      }
    } catch {
      addRisk({
        id: crypto.randomUUID(),
        ...newRisk,
        status: 'identified',
        relatedItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      toast.success('Risk added locally');
    }
    setNewRisk({ title: '', description: '', severity: 'medium', probability: 'medium', impact: 'medium', mitigationPlan: '' });
    setShowNewRisk(false);
  };

  const handleDeleteRisk = async (id: string) => {
    try {
      await fetch(`/api/risks/${id}`, { method: 'DELETE' });
      removeRisk(id);
      toast.success('Risk removed');
    } catch {
      toast.error('Failed to delete risk');
    }
  };

  const handleAssessRisk = async (riskId: string) => {
    setAssessingId(riskId);
    try {
      const res = await fetch(`/api/risks/${riskId}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmConfig: settings.llm }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Assessment failed');
      }
      const data = await res.json();

      // Update risk in store with AI fields
      updateRisk(riskId, {
        aiAssessment: JSON.stringify(data.assessment),
        aiSeverity: data.assessment?.severityAssessment?.recommended,
        aiMitigation: data.assessment?.mitigationStrategy?.summary,
        assessedAt: new Date(),
      } as any);

      // Store proposed actions
      if (data.actions?.length) {
        setRiskActions(prev => ({ ...prev, [riskId]: data.actions }));
      }

      setExpandedRisk(riskId);
      toast.success('Risk assessed by AI agent');
    } catch (err: any) {
      toast.error(err.message || 'Failed to assess risk');
    } finally {
      setAssessingId(null);
    }
  };

  const handleApproveRiskAction = async (riskId: string, actionId: string) => {
    const actions = riskActions[riskId] ?? [];
    const action = actions.find((a: any) => a.id === actionId);
    if (!action) return;

    try {
      const resp = await fetch('/api/agents/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionId,
          decision: 'approve',
          toolName: action.toolName,
          toolArguments: action.toolArguments,
          settings: { integrations: settings.integrations },
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          // Apply store mutation
          if (data.storeAction) {
            switch (data.storeAction.type) {
              case 'updateRisk':
                updateRisk(data.storeAction.payload.id, data.storeAction.payload.updates);
                break;
              case 'addRisk':
                addRisk(data.storeAction.payload);
                break;
            }
          }
          // Mark action as executed
          setRiskActions(prev => ({
            ...prev,
            [riskId]: (prev[riskId] ?? []).map((a: any) =>
              a.id === actionId ? { ...a, status: 'executed' } : a
            ),
          }));
          toast.success(`Action executed: ${action.description}`);
        } else {
          toast.error(`Action failed: ${data.error || 'Unknown error'}`);
        }
      }
    } catch {
      toast.error('Error executing action');
    }
  };

  const handleRejectRiskAction = (riskId: string, actionId: string) => {
    setRiskActions(prev => ({
      ...prev,
      [riskId]: (prev[riskId] ?? []).map((a: any) =>
        a.id === actionId ? { ...a, status: 'rejected' } : a
      ),
    }));
    toast.info('Action rejected');
  };

  // ── derived ─────────────────────────────────────────────────────────

  const severityConfig: Record<string, { color: string; icon: any; label: string }> = {
    critical: { color: 'bg-red-500 text-white', icon: AlertTriangle, label: 'Critical' },
    high: { color: 'bg-orange-500 text-white', icon: AlertTriangle, label: 'High' },
    medium: { color: 'bg-amber-500 text-white', icon: Shield, label: 'Medium' },
    low: { color: 'bg-green-500 text-white', icon: ShieldCheck, label: 'Low' },
  };

  const criticalCount = risks.filter(r => r.severity === 'critical').length;
  const highCount = risks.filter(r => r.severity === 'high').length;
  const mediumCount = risks.filter(r => r.severity === 'medium').length;
  const lowCount = risks.filter(r => r.severity === 'low').length;

  // ── parse AI assessment ─────────────────────────────────────────────

  function getAssessment(risk: any): any | null {
    if (!risk.aiAssessment) return null;
    try { return typeof risk.aiAssessment === 'string' ? JSON.parse(risk.aiAssessment) : risk.aiAssessment; }
    catch { return null; }
  }

  // ── render ──────────────────────────────────────────────────────────

  if (riskLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <VisionGateBanner />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-teal-500" />
            Risk Center
          </h1>
          <p className="text-muted-foreground">Track and mitigate product risks across your portfolio.</p>
        </div>
        <Button onClick={() => setShowNewRisk(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Risk
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Critical', count: criticalCount, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
          { label: 'High', count: highCount, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10' },
          { label: 'Medium', count: mediumCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Low', count: lowCount, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
        ].map(({ label, count, color, bg }) => (
          <Card key={label} className={bg}>
            <CardContent className="pt-4 pb-4">
              <p className={cn('text-2xl font-bold', color)}>{count}</p>
              <p className="text-xs text-muted-foreground">{label} Risks</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk list */}
      {risks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No risks identified</p>
            <p className="text-sm mt-1">Add risks to track and mitigate them.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {risks
            .sort((a, b) => {
              const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
              return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
            })
            .map((risk) => {
              const config = severityConfig[risk.severity] || severityConfig.medium;
              const SevIcon = config.icon;
              const assessment = getAssessment(risk);
              const isExpanded = expandedRisk === risk.id;
              const actions = riskActions[risk.id] ?? [];

              return (
                <Card key={risk.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    {/* ── Risk header row ── */}
                    <div className="flex items-start gap-4">
                      <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', config.color)}>
                        <SevIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-medium text-foreground">{risk.title}</h3>
                          <Badge className={config.color}>{config.label}</Badge>
                          <Badge variant="outline" className="capitalize">{risk.status}</Badge>
                          {(risk as any).aiSeverity && (risk as any).aiSeverity !== risk.severity && (
                            <Badge variant="outline" className={cn('text-xs', severityConfig[(risk as any).aiSeverity]?.color)}>
                              AI: {(risk as any).aiSeverity}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{risk.description}</p>
                        {risk.mitigationPlan && (
                          <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                            <span className="font-medium">Mitigation:</span> {risk.mitigationPlan}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Assess button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          onClick={() => handleAssessRisk(risk.id)}
                          disabled={assessingId === risk.id}
                          title="AI Risk Assessment"
                        >
                          {assessingId === risk.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                        {/* Expand assessment */}
                        {assessment && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground"
                            onClick={() => setExpandedRisk(isExpanded ? null : risk.id)}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-red-500"
                          onClick={() => handleDeleteRisk(risk.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* ── AI loading state ── */}
                    {assessingId === risk.id && (
                      <div className="mt-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                          <div>
                            <p className="text-sm font-medium text-purple-800 dark:text-purple-200">AI Agent Assessing Risk...</p>
                            <p className="text-xs text-purple-600 dark:text-purple-400">Researching best practices, analyzing impact, generating mitigation strategy</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── Expandable AI assessment panel ── */}
                    {assessment && isExpanded && (
                      <div className="mt-4 space-y-4 border-t pt-4">
                        {/* Risk Score + Severity Check */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Risk Score */}
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-2">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">Risk Score</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn('text-3xl font-bold', scoreTextColor(assessment.riskScore ?? 0))}>
                                {assessment.riskScore ?? '—'}
                              </span>
                              <div className="flex-1">
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={cn('h-full rounded-full transition-all', scoreColor(assessment.riskScore ?? 0))}
                                    style={{ width: `${assessment.riskScore ?? 0}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {(assessment.riskScore ?? 0) >= 75 ? 'Critical attention needed' :
                                   (assessment.riskScore ?? 0) >= 50 ? 'Significant risk' :
                                   (assessment.riskScore ?? 0) >= 25 ? 'Moderate risk' : 'Low risk'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Severity Assessment */}
                          {assessment.severityAssessment && (
                            <div className="p-3 rounded-lg bg-muted/50">
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">Severity Check</span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm text-muted-foreground">Current:</span>
                                <Badge className={severityConfig[risk.severity]?.color || ''}>{risk.severity}</Badge>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-sm text-muted-foreground">AI:</span>
                                <Badge className={severityConfig[assessment.severityAssessment.recommended]?.color || ''}>
                                  {assessment.severityAssessment.recommended}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{assessment.severityAssessment.justification}</p>
                            </div>
                          )}
                        </div>

                        {/* Impact Analysis */}
                        {assessment.impactAnalysis && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">Impact Analysis</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{assessment.impactAnalysis}</p>
                          </div>
                        )}

                        {/* Mitigation Strategy */}
                        {assessment.mitigationStrategy && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2 mb-3">
                              <Shield className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-foreground">Mitigation Strategy</span>
                            </div>
                            {assessment.mitigationStrategy.summary && (
                              <p className="text-sm text-foreground mb-3">{assessment.mitigationStrategy.summary}</p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {/* Immediate */}
                              {assessment.mitigationStrategy.immediate?.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Zap className="h-3 w-3 text-red-500" />
                                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">Immediate (48h)</span>
                                  </div>
                                  <ul className="space-y-1">
                                    {assessment.mitigationStrategy.immediate.map((item: string, i: number) => (
                                      <li key={i} className="text-xs text-muted-foreground flex gap-1">
                                        <span className="text-red-400 shrink-0">-</span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {/* Short-term */}
                              {assessment.mitigationStrategy.shortTerm?.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Clock className="h-3 w-3 text-amber-500" />
                                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Short-term (2-4w)</span>
                                  </div>
                                  <ul className="space-y-1">
                                    {assessment.mitigationStrategy.shortTerm.map((item: string, i: number) => (
                                      <li key={i} className="text-xs text-muted-foreground flex gap-1">
                                        <span className="text-amber-400 shrink-0">-</span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {/* Long-term */}
                              {assessment.mitigationStrategy.longTerm?.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-1 mb-1">
                                    <Target className="h-3 w-3 text-blue-500" />
                                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Long-term (quarter)</span>
                                  </div>
                                  <ul className="space-y-1">
                                    {assessment.mitigationStrategy.longTerm.map((item: string, i: number) => (
                                      <li key={i} className="text-xs text-muted-foreground flex gap-1">
                                        <span className="text-blue-400 shrink-0">-</span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Cascading Risks */}
                        {assessment.cascadingRisks?.length > 0 && (
                          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Cascading Risks</span>
                            </div>
                            <ul className="space-y-1">
                              {assessment.cascadingRisks.map((cr: string, i: number) => (
                                <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex gap-1">
                                  <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                                  {cr}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendations */}
                        {assessment.recommendations && (
                          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-2 mb-1">
                              <BookOpen className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Strategic Recommendations</span>
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-300">{assessment.recommendations}</p>
                          </div>
                        )}

                        {/* Sources */}
                        {assessment.sources?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {assessment.sources.map((src: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[10px] py-0 font-normal">
                                {src}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Proposed Actions */}
                        {actions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Proposed Actions</p>
                            {actions.map((action: any) => {
                              const status = action.status || 'pending';
                              return (
                                <div key={action.id} className={cn(
                                  'rounded-lg border p-3',
                                  status === 'executed' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                                  status === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 opacity-60' :
                                  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                )}>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Wrench className="h-4 w-4 text-amber-600 shrink-0" />
                                      <span className="text-sm font-medium truncate">{action.description}</span>
                                    </div>
                                    {status === 'pending' && (
                                      <div className="flex gap-1 shrink-0">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30"
                                          onClick={() => handleApproveRiskAction(risk.id, action.id)}
                                        >
                                          <Check className="h-3 w-3 mr-1" /> Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                          onClick={() => handleRejectRiskAction(risk.id, action.id)}
                                        >
                                          <X className="h-3 w-3 mr-1" /> Reject
                                        </Button>
                                      </div>
                                    )}
                                    {status === 'executed' && <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 shrink-0">Executed</Badge>}
                                    {status === 'rejected' && <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 shrink-0">Rejected</Badge>}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {action.toolName}: {JSON.stringify(action.toolArguments ?? {}).substring(0, 120)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Footer */}
                        {(risk as any).assessedAt && (
                          <p className="text-xs text-muted-foreground text-right">
                            Assessed {timeAgo((risk as any).assessedAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* New Risk Dialog */}
      <Dialog open={showNewRisk} onOpenChange={setShowNewRisk}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Risk</DialogTitle>
            <DialogDescription>Identify and document a product risk.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Title</Label><Input value={newRisk.title} onChange={(e) => setNewRisk({ ...newRisk, title: e.target.value })} placeholder="Risk title..." /></div>
            <div><Label>Description</Label><Textarea value={newRisk.description} onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })} placeholder="Describe the risk..." /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Severity</Label>
                <Select value={newRisk.severity} onValueChange={(v) => setNewRisk({ ...newRisk, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="critical">Critical</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Probability</Label>
                <Select value={newRisk.probability} onValueChange={(v) => setNewRisk({ ...newRisk, probability: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Impact</Label>
                <Select value={newRisk.impact} onValueChange={(v) => setNewRisk({ ...newRisk, impact: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Mitigation Plan</Label><Textarea value={newRisk.mitigationPlan} onChange={(e) => setNewRisk({ ...newRisk, mitigationPlan: e.target.value })} placeholder="How will you mitigate this risk?" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewRisk(false)}>Cancel</Button>
            <Button onClick={handleAddRisk}>Add Risk</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
