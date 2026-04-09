'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, AlertTriangle, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import type { NeedData } from '@/lib/types';

interface NeedCardProps {
  need: NeedData;
  verticals?: Array<{ id: string; name: string }>;
  onUpdate: (id: string, updates: Partial<NeedData>) => void;
  onDelete: (id: string) => void;
}

function getSeverityColor(severity: number): string {
  if (severity >= 8) return 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30';
  if (severity >= 5) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30';
  return 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30';
}

export function NeedCard({ need, verticals = [], onUpdate, onDelete }: NeedCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: need.title,
    description: need.description || '',
    severity: need.severity,
    frequency: need.frequency || '',
    verticalId: (need as unknown as Record<string, unknown>).verticalId as string || '',
  });

  const handleSave = async () => {
    if (!form.title.trim()) return;
    try {
      const res = await fetch(`/api/vision/needs/${need.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to update');
      onUpdate(need.id, form);
      setEditing(false);
      toast.success('Need updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/vision/needs/${need.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      onDelete(need.id);
      toast.success('Need deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (editing) {
    return (
      <Card className="border-amber-500/30">
        <CardContent className="pt-3 space-y-2">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Need title" />
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="min-h-[50px]" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="number" min={1} max={10} value={form.severity} onChange={(e) => setForm({ ...form, severity: parseInt(e.target.value) || 5 })} placeholder="Severity (1-10)" />
            <Input value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} placeholder="Frequency" />
          </div>
          {verticals.length > 0 && (
            <Select value={form.verticalId || 'none'} onValueChange={(v) => setForm({ ...form, verticalId: v === 'none' ? '' : v })}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Link to vertical..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No vertical</SelectItem>
                {verticals.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save className="h-3.5 w-3.5 mr-1" />Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardContent className="pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-sm font-medium">{need.title}</span>
            </div>
            {need.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{need.description}</p>
            )}
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className={getSeverityColor(need.severity) + ' text-[10px]'}>
                Severity: {need.severity}/10
              </Badge>
              {need.frequency && (
                <Badge variant="outline" className="text-[10px]">{need.frequency}</Badge>
              )}
            </div>
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
      </CardContent>
    </Card>
  );
}
