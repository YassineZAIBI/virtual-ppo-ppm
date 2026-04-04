'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Trash2, Users, Save, X, AlertTriangle, Sparkles, Loader2, Quote, Briefcase, Heart, Brain } from 'lucide-react';
import { toast } from 'sonner';
import type { TargetGroupData } from '@/lib/types';

function parseJsonArray(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function BulletList({ items, label }: { items: string[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <span className="text-[10px] font-medium text-muted-foreground uppercase">{label}</span>
      <ul className="mt-1 space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
            <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface TargetGroupCardProps {
  group: TargetGroupData;
  onUpdate: (id: string, updates: Partial<TargetGroupData>) => void;
  onDelete: (id: string) => void;
}

export function TargetGroupCard({ group, onUpdate, onDelete }: TargetGroupCardProps) {
  const { settings } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [form, setForm] = useState({
    name: group.name,
    role: group.role || '',
    goals: group.goals || '',
    painPoints: group.painPoints || '',
  });

  const needsCount = group.needs?.length ?? 0;
  const isEnriched = !!group.lastEnrichedAt;

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      const res = await fetch(`/api/vision/target-groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to update');
      onUpdate(group.id, form);
      setEditing(false);
      toast.success('Target group updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/vision/target-groups/${group.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onDelete(group.id);
      toast.success('Target group deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleEnrich = async () => {
    setEnriching(true);
    try {
      const res = await fetch(`/api/vision/target-groups/${group.id}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          llmConfig: {
            provider: settings.llm.provider,
            apiKey: settings.llm.apiKey,
            model: settings.llm.model,
            apiEndpoint: settings.llm.apiEndpoint,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Enrichment failed');
      }
      const updated = await res.json();
      onUpdate(group.id, updated);
      toast.success('Persona enriched — 4 dimensions generated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to enrich persona');
    } finally {
      setEnriching(false);
    }
  };

  if (editing) {
    return (
      <Card className="border-purple-500/30">
        <CardContent className="pt-4 space-y-3">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Group name" />
          <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role (e.g., Product Manager)" />
          <Textarea value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} placeholder="Goals" className="min-h-[50px]" />
          <Textarea value={form.painPoints} onChange={(e) => setForm({ ...form, painPoints: e.target.value })} placeholder="Pain points" className="min-h-[50px]" />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="h-3.5 w-3.5 mr-1" />Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border hover:border-purple-500/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-4 w-4 text-purple-500 shrink-0" />
            <CardTitle className="text-sm">{group.name}</CardTitle>
            {group.role && <Badge variant="outline" className="text-[10px]">{group.role}</Badge>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isEnriched ? (
              <Badge variant="secondary" className="text-[10px] text-green-600">Full persona</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Basic profile</Badge>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {(group.companyStage || group.teamSize) && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {[group.companyStage, group.teamSize].filter(Boolean).join(' · ')}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full h-8">
            <TabsTrigger value="overview" className="text-xs flex-1">Overview</TabsTrigger>
            <TabsTrigger value="jtbd" className="text-xs flex-1">JTBD</TabsTrigger>
            <TabsTrigger value="empathy" className="text-xs flex-1">Empathy</TabsTrigger>
            <TabsTrigger value="behavior" className="text-xs flex-1">Behavior</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-3 space-y-3">
            {group.typicalQuote && (
              <div className="bg-muted/50 rounded-md p-2.5">
                <Quote className="h-3 w-3 text-muted-foreground mb-1" />
                <p className="text-xs italic text-foreground">&ldquo;{group.typicalQuote}&rdquo;</p>
              </div>
            )}
            {group.dayInLife && (
              <div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Day in the life</span>
                <p className="text-xs text-foreground mt-0.5">{group.dayInLife}</p>
              </div>
            )}
            {group.goals && (
              <div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Goals</span>
                <p className="text-xs text-foreground line-clamp-2">{group.goals}</p>
              </div>
            )}
            {group.painPoints && (
              <div>
                <span className="text-[10px] font-medium text-muted-foreground uppercase">Pain Points</span>
                <p className="text-xs text-foreground line-clamp-2">{group.painPoints}</p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {needsCount} need{needsCount !== 1 ? 's' : ''}
              </Badge>
              {!isEnriched && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleEnrich} disabled={enriching}>
                  {enriching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {enriching ? 'Enriching...' : 'Enrich with AI'}
                </Button>
              )}
              {isEnriched && group.lastEnrichedAt && (
                <span className="text-[10px] text-muted-foreground">
                  Enriched {new Date(group.lastEnrichedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </TabsContent>

          <TabsContent value="jtbd" className="mt-3 space-y-3">
            {group.jtbdStatement ? (
              <>
                <div className="bg-muted/50 rounded-md p-2.5">
                  <Briefcase className="h-3 w-3 text-teal-500 mb-1" />
                  <p className="text-xs text-foreground">{group.jtbdStatement}</p>
                </div>
                <BulletList items={parseJsonArray(group.jtbdFunctional)} label="Functional jobs" />
                <BulletList items={parseJsonArray(group.jtbdEmotional)} label="Emotional jobs" />
                <BulletList items={parseJsonArray(group.jtbdSocial)} label="Social jobs" />
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No JTBD data yet. Click &ldquo;Enrich with AI&rdquo; on the Overview tab.
              </p>
            )}
          </TabsContent>

          <TabsContent value="empathy" className="mt-3 space-y-3">
            {parseJsonArray(group.empathyThinks).length > 0 ? (
              <>
                <BulletList items={parseJsonArray(group.empathyThinks)} label="Thinks" />
                <BulletList items={parseJsonArray(group.empathySays)} label="Says" />
                <BulletList items={parseJsonArray(group.empathyFeels)} label="Feels" />
                <BulletList items={parseJsonArray(group.empathyDoes)} label="Does" />
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No empathy map yet. Click &ldquo;Enrich with AI&rdquo; on the Overview tab.
              </p>
            )}
          </TabsContent>

          <TabsContent value="behavior" className="mt-3 space-y-3">
            {parseJsonArray(group.triggers).length > 0 ? (
              <>
                <BulletList items={parseJsonArray(group.triggers)} label="Triggers" />
                <BulletList items={parseJsonArray(group.decisionDrivers)} label="Decision drivers" />
                <BulletList items={parseJsonArray(group.currentWorkarounds)} label="Current workarounds" />
                <BulletList items={parseJsonArray(group.churnRisks)} label="Churn risks" />
                <BulletList items={parseJsonArray(group.successMetrics)} label="Success metrics" />
                <BulletList items={parseJsonArray(group.preferredChannels)} label="Preferred channels" />
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No behavioral data yet. Click &ldquo;Enrich with AI&rdquo; on the Overview tab.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
