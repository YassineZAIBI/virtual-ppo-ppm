'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Trash2, Users, Save, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { safeJsonParse } from '@/lib/types';
import type { TargetGroupData } from '@/lib/types';

interface TargetGroupCardProps {
  group: TargetGroupData;
  onUpdate: (id: string, updates: Partial<TargetGroupData>) => void;
  onDelete: (id: string) => void;
}

export function TargetGroupCard({ group, onUpdate, onDelete }: TargetGroupCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: group.name,
    role: group.role || '',
    goals: group.goals || '',
    painPoints: group.painPoints || '',
  });

  const needsCount = group.needs?.length ?? 0;

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
        <Badge variant="secondary" className="text-[10px]">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {needsCount} need{needsCount !== 1 ? 's' : ''}
        </Badge>
      </CardContent>
    </Card>
  );
}
