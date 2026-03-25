'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Target, Save, X, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import type { BusinessGoalData, TargetGroupData } from '@/lib/types';

interface BusinessGoalCardProps {
  goal: BusinessGoalData;
  targetGroups: TargetGroupData[];
  onUpdate: (id: string, updates: Partial<BusinessGoalData>) => void;
  onDelete: (id: string) => void;
  onSelectTargetGroup?: (groupId: string) => void;
}

export function BusinessGoalCard({ goal, targetGroups, onUpdate, onDelete, onSelectTargetGroup }: BusinessGoalCardProps) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({
    title: goal.title,
    description: goal.description || '',
    metric: goal.metric || '',
    target: goal.target || '',
  });

  const linkedGroups = targetGroups.filter((g) => g.businessGoalId === goal.id);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    try {
      const res = await fetch(`/api/vision/business-goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to update');
      onUpdate(goal.id, form);
      setEditing(false);
      toast.success('Goal updated');
    } catch {
      toast.error('Failed to update goal');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/vision/business-goals/${goal.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onDelete(goal.id);
      toast.success('Goal deleted');
    } catch {
      toast.error('Failed to delete goal');
    }
  };

  if (editing) {
    return (
      <Card className="border-teal-500/30">
        <CardContent className="pt-4 space-y-3">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Goal title"
          />
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description"
            className="min-h-[60px]"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={form.metric}
              onChange={(e) => setForm({ ...form, metric: e.target.value })}
              placeholder="Metric (e.g., ARR)"
            />
            <Input
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              placeholder="Target (e.g., $10M)"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="h-3.5 w-3.5 mr-1" />Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border hover:border-teal-500/30 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Target className="h-4 w-4 text-teal-500 shrink-0" />
            <CardTitle className="text-sm">{goal.title}</CardTitle>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {goal.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{goal.description}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {goal.metric && (
            <Badge variant="secondary" className="text-[10px]">
              {goal.metric}: {goal.target || '—'}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">
            <Users className="h-3 w-3 mr-1" />
            {linkedGroups.length} target group{linkedGroups.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        {linkedGroups.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-1"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {expanded ? 'Hide' : 'Show'} target groups
            </Button>
            {expanded && (
              <div className="mt-1 space-y-1">
                {linkedGroups.map((g) => (
                  <button
                    key={g.id}
                    className="block w-full text-left text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                    onClick={() => onSelectTargetGroup?.(g.id)}
                  >
                    {g.name} {g.role && <span className="text-muted-foreground">— {g.role}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
