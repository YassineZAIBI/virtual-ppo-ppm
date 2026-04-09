'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { ViewShell } from '@/components/views/shared/ViewShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase, Clock, AlertTriangle, Calendar, Plus, FileText, Users,
  Target, Workflow, ArrowRight, BookOpen, X, Eye, Binoculars,
  ShieldAlert, Lightbulb, Gauge, Bell, Brain,
} from 'lucide-react';
import { toast } from 'sonner';
import { ShareButton } from '@/components/share/ShareButton';
import { InsightsPanel } from '@/components/dashboard/InsightsPanel';
import { isSampleData } from '@/lib/sample-data';
import { ExampleBadge } from '@/components/ui/example-badge';

interface VisionData {
  northStar?: string;
  mission?: string;
}

export function DashboardView() {
  const router = useRouter();
  const { initiatives, meetings, risks, addInitiative, setInitiatives, setMeetings, setRisks, settings, setPendingChatPrompt } = useAppStore();
  const [showNewInitiative, setShowNewInitiative] = useState(false);
  const [visionData, setVisionData] = useState<VisionData | null>(null);
  const [guideDismissed, setGuideDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('azmyra-guide-dismissed') === 'true';
    }
    return false;
  });
  const [newInitiative, setNewInitiative] = useState({ title: '', description: '', businessValue: 'medium' as const, effort: 'medium' as const });
  const [alertCount, setAlertCount] = useState(0);
  const [recentAlerts, setRecentAlerts] = useState<{ id: string; type: string; title: string; significance: string; competitorName?: string; createdAt: string }[]>([]);
  const [vasAvg, setVasAvg] = useState<number | null>(null);
  const [brainPulse, setBrainPulse] = useState<{
    totalNodes: number;
    totalRelations: number;
    alignment: number | null;
    latestInsight: string | null;
  } | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/initiatives').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setInitiatives(d); }),
      fetch('/api/meetings').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setMeetings(d); }),
      fetch('/api/risks').then(r => r.ok ? r.json() : []).then(d => { if (Array.isArray(d)) setRisks(d); }),
      fetch('/api/vision').then(r => r.ok ? r.json() : null).then(d => setVisionData(d)),
      fetch('/api/competitors/feed?limit=3').then(r => r.ok ? r.json() : { pagination: { total: 0 }, alerts: [] }).then(d => {
        setAlertCount(d.pagination?.total || 0);
        setRecentAlerts((d.alerts ?? d.items ?? []).slice(0, 3));
      }),
      fetch('/api/strategy/portfolio').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.summary?.avgAlignment != null) setVasAvg(d.summary.avgAlignment);
      }),
      fetch('/api/brain').then(r => r.ok ? r.json() : null).then(d => {
        if (d?.stats) setBrainPulse({
          totalNodes: d.stats.totalNodes,
          totalRelations: d.stats.totalRelations,
          alignment: d.stats.portfolioAlignment ?? null,
          latestInsight: d.insights?.[0]?.title ?? null,
        });
      }),
    ]).catch(() => {}).finally(() => setDashLoading(false));
  }, []);

  const activeInitiatives = initiatives.filter((i) => i.status !== 'idea').length;
  const criticalRisks = risks.filter((r) => r.severity === 'critical' || r.severity === 'high').length;

  const byStage = {
    idea: initiatives.filter(i => i.status === 'idea').length,
    definition: initiatives.filter(i => i.status === 'definition').length,
    discovery: initiatives.filter(i => i.status === 'discovery').length,
    approved: initiatives.filter(i => i.status === 'approved').length,
    delivered: initiatives.filter(i => i.status === 'delivered').length,
  };

  const visionComplete = !!(visionData?.northStar || visionData?.mission);

  const handleAddInitiative = async () => {
    if (!newInitiative.title.trim()) return;
    const payload = {
      title: newInitiative.title,
      description: newInitiative.description,
      status: 'idea',
      businessValue: newInitiative.businessValue,
      effort: newInitiative.effort,
    };
    try {
      const res = await fetch('/api/initiatives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const saved = await res.json();
        addInitiative({ ...saved, stakeholders: [], tags: [], risks: [], dependencies: [] });
      } else {
        throw new Error('API error');
      }
    } catch {
      addInitiative({ id: crypto.randomUUID(), ...payload, stakeholders: [], createdAt: new Date(), updatedAt: new Date(), tags: [], risks: [], dependencies: [] });
    }
    setNewInitiative({ title: '', description: '', businessValue: 'medium', effort: 'medium' });
    setShowNewInitiative(false);
    toast.success('Initiative created successfully!');
  };

  const handleQuickAction = (action: string) => {
    const context = `Current initiatives: ${initiatives.map(i => i.title).join(', ')}. Current risks: ${risks.map(r => r.title).join(', ')}.`;

    if (action === 'Jira Sync') {
      if (settings.integrations.jira.enabled && settings.integrations.jira.projectKey) {
        toast.info('Navigating to Settings to sync Jira...');
      } else {
        toast.info('Configure your Jira integration first');
      }
      router.push('/settings');
      return;
    }

    const prompts: Record<string, string> = {
      'PRD': `Generate a Product Requirements Document (PRD) for the highest-priority initiative. ${context}`,
      'Interview': `Help me prepare a user interview script for our product. Include questions about user needs, pain points, and feature expectations. ${context}`,
      'OKRs': `Draft OKRs (Objectives and Key Results) for the current quarter based on our product initiatives and risks. ${context}`,
    };

    const prompt = prompts[action] || `Help me with: ${action}. ${context}`;
    setPendingChatPrompt(prompt);
    toast.success(`Opening AI Assistant for "${action}"...`);
    router.push('/chat');
  };

  return (
    <ViewShell
      title="Welcome back!"
      description="Your three-pillar product overview"
      loading={dashLoading}
      actions={
        <>
          <ShareButton resourceType="dashboard" />
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowNewInitiative(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Initiative
          </Button>
        </>
      }
    >
      <InsightsPanel />

      {/* Getting Started Banner */}
      {!guideDismissed && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-300">New to Azmyra?</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400/80">Check out our getting started guide to learn how to use each feature.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/20" onClick={() => router.push('/guide')}>
                  <BookOpen className="h-3 w-3 mr-1" />View Guide
                </Button>
                <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-600 h-8 w-8 p-0" onClick={() => { setGuideDismissed(true); localStorage.setItem('azmyra-guide-dismissed', 'true'); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── VISION (WHY) Section ── */}
      <div>
        <h2 className="text-sm font-semibold tracking-wider uppercase text-amber-500 dark:text-amber-400 mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4" /> Vision (Why)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/vision')}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center shrink-0">
                  <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">North Star</p>
                  {visionComplete ? (
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {visionData?.northStar || visionData?.mission || 'Vision configured'}
                    </p>
                  ) : (
                    <p className="text-sm text-amber-600 dark:text-amber-400">Not configured yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/assessment')}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">VAS Average</p>
                  {visionComplete ? (
                    <p className="text-2xl font-bold text-foreground mt-1">{vasAvg !== null ? `${vasAvg}%` : '--'}</p>
                  ) : (
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">Set up Vision first</p>
                  )}
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                  <Gauge className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/landscape')}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Competitor Alerts</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{alertCount}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                  <Binoculars className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Competitive Intelligence */}
        {recentAlerts.length > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Binoculars className="h-3.5 w-3.5" /> Recent Intelligence
              </p>
              <div className="space-y-2">
                {recentAlerts.map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <Badge variant={a.significance === 'high' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 flex-shrink-0">
                      {a.significance || 'info'}
                    </Badge>
                    <span className="truncate text-foreground">{a.title || a.type}</span>
                    {a.competitorName && <span className="text-xs text-muted-foreground flex-shrink-0">({a.competitorName})</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── BRAIN PULSE ── */}
      {brainPulse && brainPulse.totalNodes > 0 && (
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/brain')}>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-500" />
                <span className="font-semibold text-sm">Brain Pulse</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{brainPulse.totalNodes} nodes</span>
                <span>{brainPulse.totalRelations} relations</span>
                {brainPulse.alignment != null && <span>{brainPulse.alignment}% aligned</span>}
              </div>
            </div>
            {brainPulse.latestInsight && (
              <p className="text-xs text-muted-foreground truncate">
                Latest: {brainPulse.latestInsight}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── STRATEGY (WHAT) Section ── */}
      <div>
        <h2 className="text-sm font-semibold tracking-wider uppercase text-teal-500 dark:text-teal-400 mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4" /> Strategy (What)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/portfolio')}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Active Initiatives</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{activeInitiatives}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-500/15 flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/portfolio')}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Pending Approvals</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{byStage.definition}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-500/15 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/assessment')}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Active Risks</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{criticalRisks}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-500/15 flex items-center justify-center">
                  <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/meetings')}>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Upcoming Meetings</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{meetings.filter(m => m.status === 'scheduled').length}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-emerald-500/15 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-green-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Health Bar */}
        {initiatives.length > 0 && (
          <Card className="mt-3">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Portfolio Health</p>
                <p className="text-xs text-muted-foreground">{initiatives.length} total</p>
              </div>
              <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                {byStage.idea > 0 && <div className="bg-slate-400" style={{ width: `${(byStage.idea / initiatives.length) * 100}%` }} title={`Ideas: ${byStage.idea}`} />}
                {byStage.definition > 0 && <div className="bg-blue-500" style={{ width: `${(byStage.definition / initiatives.length) * 100}%` }} title={`Definition: ${byStage.definition}`} />}
                {byStage.discovery > 0 && <div className="bg-amber-500" style={{ width: `${(byStage.discovery / initiatives.length) * 100}%` }} title={`Discovery: ${byStage.discovery}`} />}
                {byStage.approved > 0 && <div className="bg-green-500" style={{ width: `${(byStage.approved / initiatives.length) * 100}%` }} title={`Approved: ${byStage.approved}`} />}
                {byStage.delivered > 0 && <div className="bg-purple-500" style={{ width: `${(byStage.delivered / initiatives.length) * 100}%` }} title={`Delivered: ${byStage.delivered}`} />}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-400" /> Idea ({byStage.idea})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Definition ({byStage.definition})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Discovery ({byStage.discovery})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" /> Approved ({byStage.approved})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500" /> Delivered ({byStage.delivered})</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Initiatives */}
        {initiatives.length === 0 && (
          <Card className="mt-3">
            <CardContent className="py-8 text-center">
              <Briefcase className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No initiatives yet</p>
              <Button size="sm" onClick={() => setShowNewInitiative(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create your first initiative
              </Button>
            </CardContent>
          </Card>
        )}
        {initiatives.length > 0 && (
          <Card className="mt-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Initiatives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {initiatives
                  .filter(i => i.businessValue === 'high')
                  .slice(0, 4)
                  .map((initiative) => (
                    <div key={initiative.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer" onClick={() => router.push('/portfolio')}>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-foreground">{initiative.title}</p>
                            {isSampleData(initiative.id) && <ExampleBadge />}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-xs">{initiative.status}</Badge>
                    </div>
                  ))}
                {initiatives.filter(i => i.businessValue === 'high').length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No high-value initiatives yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── ALERTS Section ── */}
      <div>
        <h2 className="text-sm font-semibold tracking-wider uppercase text-red-500 dark:text-red-400 mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4" /> Alerts & Attention
        </h2>

        {(() => {
          const attentionItems = [
            ...risks.filter(r => r.status === 'identified').map(r => ({ type: 'risk' as const, item: r })),
            ...initiatives.filter(i => i.status === 'definition').map(i => ({ type: 'initiative' as const, item: i })),
            ...meetings.filter(m => m.status === 'scheduled').map(m => ({ type: 'meeting' as const, item: m })),
          ];

          if (attentionItems.length === 0) {
            return (
              <Card>
                <CardContent className="py-6 text-center text-muted-foreground">
                  <p className="text-sm">No items requiring attention right now.</p>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-500/8 dark:border-amber-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Items Requiring Your Attention ({attentionItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attentionItems.slice(0, 5).map(({ type, item }) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-white dark:bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={type === 'risk' ? 'destructive' : type === 'initiative' ? 'default' : 'secondary'}>
                          {type}
                        </Badge>
                        <span className="font-medium text-sm">{item.title}</span>
                        {isSampleData(item.id) && <ExampleBadge />}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => router.push(type === 'risk' ? '/assessment' : type === 'meeting' ? '/meetings' : '/portfolio')}>
                        View <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Quick Actions & Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { key: 'PRD', icon: FileText, label: 'Generate PRD' },
              { key: 'Interview', icon: Users, label: 'Prepare User Interview' },
              { key: 'OKRs', icon: Target, label: 'Update OKRs' },
              { key: 'Jira Sync', icon: Workflow, label: 'Sync with Jira' },
            ].map(({ key, icon: Icon, label }) => (
              <Button key={key} variant="outline" className="w-full justify-start" onClick={() => handleQuickAction(key)}>
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" /> Active Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {risks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">No risks identified yet.</p>
            ) : (
              <div className="space-y-2">
                {risks.slice(0, 4).map((risk) => (
                  <div key={risk.id} className="flex items-start gap-3 p-2 bg-red-50 dark:bg-red-500/8 rounded-lg cursor-pointer" onClick={() => router.push('/assessment')}>
                    <Badge className={cn('shrink-0 text-xs', risk.severity === 'high' || risk.severity === 'critical' ? 'bg-red-500' : risk.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-500')}>
                      {risk.severity.toUpperCase()}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{risk.title}</p>
                        {isSampleData(risk.id) && <ExampleBadge />}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{risk.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Initiative Dialog */}
      <Dialog open={showNewInitiative} onOpenChange={setShowNewInitiative}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Initiative</DialogTitle>
            <DialogDescription>Add a new initiative to your pipeline</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Title</Label><Input value={newInitiative.title} onChange={(e) => setNewInitiative({ ...newInitiative, title: e.target.value })} placeholder="Enter initiative title..." /></div>
            <div><Label>Description</Label><Textarea value={newInitiative.description} onChange={(e) => setNewInitiative({ ...newInitiative, description: e.target.value })} placeholder="Describe your initiative..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Business Value</Label>
                <Select value={newInitiative.businessValue} onValueChange={(v) => setNewInitiative({ ...newInitiative, businessValue: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Effort</Label>
                <Select value={newInitiative.effort} onValueChange={(v) => setNewInitiative({ ...newInitiative, effort: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewInitiative(false)}>Cancel</Button>
            <Button onClick={handleAddInitiative}>Create Initiative</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ViewShell>
  );
}
