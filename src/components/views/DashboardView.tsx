'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAppStore, loadSampleData } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Briefcase, Clock, AlertTriangle, Calendar, Plus, FileText, Users,
  Target, Workflow, Loader2, ArrowRight, Bot, Sparkles, BookOpen, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { ShareButton } from '@/components/share/ShareButton';
import { isSampleData } from '@/lib/sample-data';
import { ExampleBadge } from '@/components/ui/example-badge';

export function DashboardView() {
  const router = useRouter();
  const { initiatives, meetings, risks, addInitiative, settings } = useAppStore();
  const [showNewInitiative, setShowNewInitiative] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState<string | null>(null);
  const [guideDismissed, setGuideDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('azmyra-guide-dismissed') === 'true';
    }
    return false;
  });
  const [newInitiative, setNewInitiative] = useState({ title: '', description: '', businessValue: 'medium' as const, effort: 'medium' as const });

  useEffect(() => { loadSampleData(); }, []);

  const activeInitiatives = initiatives.filter((i) => i.status !== 'idea').length;
  const pendingApprovals = initiatives.filter((i) => i.status === 'definition').length;
  const criticalRisks = risks.filter((r) => r.severity === 'critical' || r.severity === 'high').length;
  const upcomingMeetings = meetings.filter((m) => m.status === 'scheduled').length;

  const handleAddInitiative = () => {
    if (!newInitiative.title.trim()) return;
    addInitiative({
      id: crypto.randomUUID(),
      title: newInitiative.title,
      description: newInitiative.description,
      status: 'idea',
      businessValue: newInitiative.businessValue,
      effort: newInitiative.effort,
      stakeholders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      risks: [],
      dependencies: [],
    });
    setNewInitiative({ title: '', description: '', businessValue: 'medium', effort: 'medium' });
    setShowNewInitiative(false);
    toast.success('Initiative created successfully!');
  };

  const handleQuickAction = async (action: string) => {
    setShowQuickAction(action);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a ${action} based on current product context. Initiatives: ${initiatives.map(i => i.title).join(', ')}. Risks: ${risks.map(r => r.title).join(', ')}.`,
          history: [],
          settings: { llm: settings.llm },
        }),
      });
      if (response.ok) {
        toast.success(`${action} generated successfully! Check the AI Assistant for details.`);
      } else {
        toast.error(`Failed to generate ${action}`);
      }
    } catch {
      toast.error(`Failed to generate ${action}`);
    } finally {
      setShowQuickAction(null);
    }
  };

  const attentionItems = [
    ...risks.filter(r => r.status === 'identified').map(r => ({ type: 'risk' as const, item: r })),
    ...initiatives.filter(i => i.status === 'definition').map(i => ({ type: 'initiative' as const, item: i })),
    ...meetings.filter(m => m.status === 'scheduled').map(m => ({ type: 'meeting' as const, item: m })),
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back!</h1>
          <p className="text-slate-500 dark:text-slate-400">Here&apos;s what&apos;s happening with your products</p>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton resourceType="dashboard" />
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setShowNewInitiative(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Initiative
          </Button>
        </div>
      </div>

      {/* Getting Started Banner */}
      {!guideDismissed && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">New to Azmyra?</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Check out our getting started guide to learn how to use each feature.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100" onClick={() => router.push('/guide')}>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/initiatives')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-slate-500">Active Initiatives</p><p className="text-3xl font-bold text-slate-900 dark:text-white">{activeInitiatives}</p></div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"><Briefcase className="h-6 w-6 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/initiatives')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-slate-500">Pending Approvals</p><p className="text-3xl font-bold text-slate-900 dark:text-white">{pendingApprovals}</p></div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center"><Clock className="h-6 w-6 text-amber-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-slate-500">Active Risks</p><p className="text-3xl font-bold text-slate-900 dark:text-white">{criticalRisks}</p></div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/meetings')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-medium text-slate-500">Upcoming Meetings</p><p className="text-3xl font-bold text-slate-900 dark:text-white">{upcomingMeetings}</p></div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center"><Calendar className="h-6 w-6 text-green-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items Needing PM Attention */}
      {attentionItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Items Requiring Your Attention ({attentionItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {attentionItems.slice(0, 5).map(({ type, item }) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={type === 'risk' ? 'destructive' : type === 'initiative' ? 'default' : 'secondary'}>
                      {type}
                    </Badge>
                    <span className="font-medium">{item.title}</span>
                    {isSampleData(item.id) && <ExampleBadge />}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => router.push(type === 'meeting' ? '/meetings' : '/initiatives')}>
                    View <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { key: 'PRD', icon: FileText, label: 'Generate PRD' },
              { key: 'Interview', icon: Users, label: 'Prepare User Interview' },
              { key: 'OKRs', icon: Target, label: 'Update OKRs' },
              { key: 'Jira Sync', icon: Workflow, label: 'Sync with Jira' },
            ].map(({ key, icon: Icon, label }) => (
              <Button key={key} variant="outline" className="w-full justify-start" onClick={() => handleQuickAction(key)}>
                {showQuickAction === key ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Icon className="h-4 w-4 mr-2" />}
                {label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Recent Initiatives</CardTitle></CardHeader>
          <CardContent>
            {initiatives.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No initiatives yet. Create your first one!</p>
            ) : (
              <div className="space-y-3">
                {initiatives.slice(0, 4).map((initiative) => (
                  <div key={initiative.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer" onClick={() => router.push('/initiatives')}>
                    <div className="flex items-center gap-3">
                      <div className={cn('h-2 w-2 rounded-full', initiative.businessValue === 'high' ? 'bg-green-500' : initiative.businessValue === 'medium' ? 'bg-amber-500' : 'bg-slate-400')} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 dark:text-white">{initiative.title}</p>
                          {isSampleData(initiative.id) && <ExampleBadge />}
                        </div>
                        <p className="text-sm text-slate-500">{initiative.stakeholders.join(', ') || 'No stakeholders'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn('capitalize', initiative.status === 'approved' && 'border-green-500 text-green-600', initiative.status === 'definition' && 'border-blue-500 text-blue-600', initiative.status === 'discovery' && 'border-amber-500 text-amber-600')}>
                      {initiative.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risks Section */}
      {risks.length > 0 && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Active Risks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {risks.map((risk) => (
                <div key={risk.id} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <Badge className={cn('shrink-0', risk.severity === 'high' || risk.severity === 'critical' ? 'bg-red-500' : risk.severity === 'medium' ? 'bg-amber-500' : 'bg-slate-500')}>
                    {risk.severity.toUpperCase()}
                  </Badge>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white">{risk.title}</p>
                      {isSampleData(risk.id) && <ExampleBadge />}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{risk.description}</p>
                    {risk.mitigationPlan && <p className="text-sm text-green-700 dark:text-green-400 mt-1">Mitigation: {risk.mitigationPlan}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
