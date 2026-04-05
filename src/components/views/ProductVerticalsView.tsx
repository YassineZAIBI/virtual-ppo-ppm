'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Boxes, Plus, Pencil, Trash2, Sparkles, Loader2,
  ArrowRight, Check, X, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProductVerticalData } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  paused: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  archived: 'bg-muted text-muted-foreground border-border',
};

export function ProductVerticalsView() {
  const { settings } = useAppStore();
  const router = useRouter();
  const [verticals, setVerticals] = useState<ProductVerticalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [acceptingIdx, setAcceptingIdx] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', strategy: '', color: '#6366F1' });

  const fetchVerticals = useCallback(async () => {
    try {
      const res = await fetch('/api/verticals');
      if (res.ok) setVerticals(await res.json());
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVerticals(); }, [fetchVerticals]);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      const res = await fetch('/api/verticals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to create');
      const created = await res.json();
      setVerticals((prev) => [created, ...prev]);
      setForm({ name: '', description: '', strategy: '', color: '#6366F1' });
      setShowCreate(false);
      toast.success('Product vertical created');
    } catch {
      toast.error('Failed to create vertical');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/verticals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setVerticals((prev) => prev.map((v) => (v.id === id ? updated : v)));
      setEditingId(null);
      setForm({ name: '', description: '', strategy: '', color: '#6366F1' });
      toast.success('Vertical updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/verticals/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      setVerticals((prev) => prev.filter((v) => v.id !== id));
      toast.success('Vertical deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleSuggest = async () => {
    setSuggesting(true);
    try {
      const res = await fetch('/api/verticals/suggest', {
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
        throw new Error(data.error || 'Failed');
      }
      const { suggestions: s } = await res.json();
      setSuggestions(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate suggestions');
    } finally {
      setSuggesting(false);
    }
  };

  const handleAcceptSuggestion = async (idx: number) => {
    if (!suggestions) return;
    setAcceptingIdx(idx);
    const s = suggestions[idx];
    try {
      const res = await fetch('/api/verticals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: s.name,
          description: s.description,
          strategy: s.strategy,
          color: s.color || '#6366F1',
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const created = await res.json();
      setVerticals((prev) => [created, ...prev]);
      setSuggestions((prev) => prev!.filter((_, i) => i !== idx));
      toast.success(`Created "${s.name}"`);
    } catch {
      toast.error('Failed to create vertical');
    } finally {
      setAcceptingIdx(null);
    }
  };

  const startEdit = (v: ProductVerticalData) => {
    setEditingId(v.id);
    setForm({ name: v.name, description: v.description, strategy: v.strategy, color: v.color });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="h-6 w-6 text-indigo-500" />
            Product Verticals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Strategic groupings for your product portfolio
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSuggest} disabled={suggesting}>
            {suggesting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
            AI Suggest
          </Button>
          <Button size="sm" onClick={() => { setForm({ name: '', description: '', strategy: '', color: '#6366F1' }); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Create Vertical
          </Button>
        </div>
      </div>

      {/* AI Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <Card className="border-indigo-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              AI Suggestions ({suggestions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-md border">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color || '#6366F1' }} />
                    <span className="text-sm font-medium">{s.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                  {s.strategy && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{s.strategy}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAcceptSuggestion(i)} disabled={acceptingIdx === i}>
                    {acceptingIdx === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-green-600" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSuggestions((prev) => prev!.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSuggestions(null)}>
              Dismiss all
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {verticals.length === 0 && !suggestions && (
        <Card>
          <CardContent className="py-12 text-center">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No product verticals yet</p>
            <p className="text-xs text-muted-foreground/70 mb-4 max-w-sm mx-auto">
              Create verticals to group your initiatives into strategic product lines.
              Vision products are automatically linked.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleSuggest} disabled={suggesting}>
                {suggesting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                AI Suggest Verticals
              </Button>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4 mr-1" /> Create Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verticals Grid */}
      {verticals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {verticals.map((v) => (
            <Card key={v.id} className="hover:border-indigo-500/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                    <CardTitle className="text-sm truncate">{v.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className={STATUS_COLORS[v.status] || ''}>{v.status}</Badge>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(v)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {v.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{v.description}</p>
                )}
                {v.strategy && (
                  <p className="text-[10px] text-muted-foreground/70 line-clamp-2 mb-3">{v.strategy}</p>
                )}
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">
                    <Layers className="h-3 w-3 mr-1" />
                    {v._count?.initiatives ?? 0} initiative{(v._count?.initiatives ?? 0) !== 1 ? 's' : ''}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => router.push(`/initiatives?vertical=${v.id}`)}
                  >
                    View <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={showCreate || !!editingId}
        onOpenChange={(open) => {
          if (!open) { setShowCreate(false); setEditingId(null); }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Vertical' : 'Create Product Vertical'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Vertical name"
              />
            </div>
            <div>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description"
                className="min-h-[60px]"
              />
            </div>
            <div>
              <Textarea
                value={form.strategy}
                onChange={(e) => setForm({ ...form, strategy: e.target.value })}
                placeholder="Strategic rationale"
                className="min-h-[60px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-8 w-8 rounded border cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowCreate(false); setEditingId(null); }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
              disabled={!form.name.trim()}
            >
              {editingId ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
