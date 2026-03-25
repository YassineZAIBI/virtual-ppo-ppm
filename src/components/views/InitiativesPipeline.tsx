'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus, ArrowRight, Save, Trash2, Search, DollarSign,
  AlertTriangle, Clock, HelpCircle, ExternalLink,
  CheckSquare, Square, X, Target, Loader2, BarChart3,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { Initiative } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShareButton } from '@/components/share/ShareButton';
import { isSampleData } from '@/lib/sample-data';
import { ExampleBadge } from '@/components/ui/example-badge';
import { AlignmentBadge } from '@/components/vision/AlignmentBadge';
import { VisionGateBanner } from '@/components/layout/VisionGateBanner';

const stages = [
  { id: 'idea', label: 'Ideas', color: 'bg-muted', headerColor: 'bg-accent' },
  { id: 'discovery', label: 'Discovery', color: 'bg-blue-50 dark:bg-blue-950', headerColor: 'bg-blue-100 dark:bg-blue-900' },
  { id: 'validation', label: 'Validation', color: 'bg-amber-50 dark:bg-amber-950', headerColor: 'bg-amber-100 dark:bg-amber-900' },
  { id: 'definition', label: 'Definition', color: 'bg-purple-50 dark:bg-purple-950', headerColor: 'bg-purple-100 dark:bg-purple-900' },
  { id: 'approved', label: 'Approved', color: 'bg-green-50 dark:bg-green-950', headerColor: 'bg-green-100 dark:bg-green-900' },
];

const LEVEL_OPTIONS = [
  { id: 'all', label: 'All', color: 'text-foreground' },
  { id: 'solution', label: 'Solution', color: 'text-green-600' },
  { id: 'epic', label: 'Epic', color: 'text-purple-600' },
  { id: 'idea', label: 'Idea', color: 'text-muted-foreground' },
] as const;

const LEVEL_BADGE_COLORS: Record<string, string> = {
  solution: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30',
  epic: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  idea: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

export function InitiativesPipeline() {
  const { initiatives, setInitiatives, moveInitiative, addInitiative, updateInitiative, deleteInitiative, personas } = useAppStore();
  const router = useRouter();

  // Load initiatives from API on mount (replaces demo data with real DB data)
  useEffect(() => {
    fetch('/api/initiatives')
      .then((res) => res.ok ? res.json() : Promise.reject())
      .then((data) => { if (Array.isArray(data)) setInitiatives(data); })
      .catch(() => {}); // keep store data as fallback
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [computingImpactId, setComputingImpactId] = useState<string | null>(null);
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    businessValue: 'medium' as const,
    effort: 'medium' as const,
    whyNeeded: '',
    whatIfNot: '',
    expectedValue: '',
    expectedTimeToMarket: '',
  });

  const handleAddIdea = async () => {
    if (!newIdea.title.trim()) return;
    const payload = {
      title: newIdea.title,
      description: newIdea.description,
      status: 'idea',
      businessValue: newIdea.businessValue,
      effort: newIdea.effort,
      whyNeeded: newIdea.whyNeeded,
      whatIfNot: newIdea.whatIfNot,
      expectedValue: newIdea.expectedValue,
      expectedTimeToMarket: newIdea.expectedTimeToMarket,
    };
    try {
      const res = await fetch('/api/initiatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = await res.json();
        addInitiative({ ...saved, stakeholders: [], tags: [], risks: [], dependencies: [] });
      } else {
        // Fallback to local-only
        addInitiative({
          id: crypto.randomUUID(), ...payload,
          stakeholders: [], createdAt: new Date(), updatedAt: new Date(),
          tags: [], risks: [], dependencies: [],
        });
      }
    } catch {
      addInitiative({
        id: crypto.randomUUID(), ...payload,
        stakeholders: [], createdAt: new Date(), updatedAt: new Date(),
        tags: [], risks: [], dependencies: [],
      });
    }
    setNewIdea({
      title: '', description: '', businessValue: 'medium', effort: 'medium',
      whyNeeded: '', whatIfNot: '', expectedValue: '', expectedTimeToMarket: '',
    });
    setShowNewIdea(false);
    toast.success('Idea added successfully!');
  };

  const handleSaveEdit = () => {
    if (!editingInitiative) return;
    updateInitiative(editingInitiative.id, editingInitiative);
    setEditingInitiative(null);
    toast.success('Initiative updated!');
  };

  const handleDelete = () => {
    if (!editingInitiative) return;
    deleteInitiative(editingInitiative.id);
    setEditingInitiative(null);
    toast.success('Initiative deleted');
  };

  const handleOpenDiscovery = (initiativeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/discovery?id=${initiativeId}`);
  };

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllInStage = (stageId: string) => {
    const stageItems = initiatives.filter((i) => i.status === stageId);
    const allSelected = stageItems.every((i) => selectedIds.has(i.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of stageItems) {
        if (allSelected) next.delete(item.id);
        else next.add(item.id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(initiatives.map((i) => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    const count = selectedIds.size;
    for (const id of selectedIds) {
      deleteInitiative(id);
    }
    setSelectedIds(new Set());
    setSelectionMode(false);
    toast.success(`Deleted ${count} initiative${count > 1 ? 's' : ''}`);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleScoreAlignment = async (initiativeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setScoringId(initiativeId);
    try {
      const res = await fetch('/api/vision/alignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'initiative', entityId: initiativeId }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      updateInitiative(initiativeId, { alignmentScore: data.overallScore });
      toast.success(`Alignment score: ${data.overallScore}/100`);
    } catch {
      toast.error('Failed to score alignment');
    } finally {
      setScoringId(null);
    }
  };

  const handleComputeImpact = async (initiativeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setComputingImpactId(initiativeId);
    try {
      const res = await fetch('/api/strategy/impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initiativeId }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      updateInitiative(initiativeId, { businessImpactId: data.id });
      toast.success('Business impact computed');
    } catch {
      toast.error('Failed to compute impact');
    } finally {
      setComputingImpactId(null);
    }
  };

  // Filter initiatives by level
  const filteredInitiatives = levelFilter === 'all'
    ? initiatives
    : initiatives.filter((i) => (i.level || 'idea') === levelFilter);

  return (
    <div className="p-6 space-y-6">
      <VisionGateBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Initiatives Pipeline</h1>
          <p className="text-slate-500">Manage ideas from conception to approval</p>
          {/* Level Filter */}
          <div className="flex items-center gap-1 mt-2">
            <Layers className="h-3.5 w-3.5 text-muted-foreground mr-1" />
            {LEVEL_OPTIONS.map((opt) => (
              <Button
                key={opt.id}
                variant={levelFilter === opt.id ? 'default' : 'ghost'}
                size="sm"
                className={cn('h-7 text-xs', levelFilter !== opt.id && opt.color)}
                onClick={() => setLevelFilter(opt.id)}
              >
                {opt.label}
                {opt.id !== 'all' && (
                  <Badge variant="secondary" className="ml-1 text-[9px] px-1 py-0">
                    {initiatives.filter((i) => (i.level || 'idea') === opt.id).length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton resourceType="initiatives" />
          {selectionMode ? (
            <>
              <span className="text-sm text-slate-500">{selectedIds.size} selected</span>
              <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
              <Button variant="destructive" size="sm" disabled={selectedIds.size === 0} onClick={handleBulkDelete}>
                <Trash2 className="h-4 w-4 mr-1" />Delete ({selectedIds.size})
              </Button>
              <Button variant="ghost" size="sm" onClick={exitSelectionMode}>
                <X className="h-4 w-4 mr-1" />Cancel
              </Button>
            </>
          ) : (
            <>
              {initiatives.length > 0 && (
                <Button variant="outline" onClick={() => setSelectionMode(true)}>
                  <CheckSquare className="h-4 w-4 mr-2" />Select
                </Button>
              )}
              <Button onClick={() => setShowNewIdea(true)}>
                <Plus className="h-4 w-4 mr-2" />New Idea
              </Button>
            </>
          )}
        </div>
      </div>

      {/* New Idea Dialog */}
      <Dialog open={showNewIdea} onOpenChange={setShowNewIdea}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader><DialogTitle>Submit New Idea</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-4 py-4">
              <div>
                <Label>Title</Label>
                <Input value={newIdea.title} onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })} placeholder="Enter idea title..." />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newIdea.description} onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })} placeholder="Describe your idea..." rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Business Value</Label>
                  <Select value={newIdea.businessValue} onValueChange={(v) => setNewIdea({ ...newIdea, businessValue: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Effort</Label>
                  <Select value={newIdea.effort} onValueChange={(v) => setNewIdea({ ...newIdea, effort: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              {/* Business Case Questions */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                  Business Case Questions
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Why do you need this initiative?</Label>
                    <Textarea
                      value={newIdea.whyNeeded}
                      onChange={(e) => setNewIdea({ ...newIdea, whyNeeded: e.target.value })}
                      placeholder="What problem does it solve? What opportunity does it unlock?"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">What if this initiative is not approved or we don't have a solution?</Label>
                    <Textarea
                      value={newIdea.whatIfNot}
                      onChange={(e) => setNewIdea({ ...newIdea, whatIfNot: e.target.value })}
                      placeholder="What happens if we don't do this? What is the cost of inaction?"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Expected Business Value (mandays, revenue, time saved...)
                    </Label>
                    <Input
                      value={newIdea.expectedValue}
                      onChange={(e) => setNewIdea({ ...newIdea, expectedValue: e.target.value })}
                      placeholder="e.g., Save 200 mandays/year, +$500K ARR, reduce churn by 15%"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Expected Time to Market
                    </Label>
                    <Input
                      value={newIdea.expectedTimeToMarket}
                      onChange={(e) => setNewIdea({ ...newIdea, expectedTimeToMarket: e.target.value })}
                      placeholder="e.g., 3 months, Q3 2026, 6 sprints"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewIdea(false)}>Cancel</Button>
            <Button onClick={handleAddIdea}>Submit Idea</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingInitiative} onOpenChange={() => setEditingInitiative(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
          <DialogHeader><DialogTitle>Edit Initiative</DialogTitle></DialogHeader>
          {editingInitiative && (
            <ScrollArea className="max-h-[65vh] pr-4">
              <div className="space-y-4 py-4">
                <div>
                  <Label>Title</Label>
                  <Input value={editingInitiative.title} onChange={(e) => setEditingInitiative({ ...editingInitiative, title: e.target.value })} />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={editingInitiative.description} onChange={(e) => setEditingInitiative({ ...editingInitiative, description: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={editingInitiative.status} onValueChange={(v) => setEditingInitiative({ ...editingInitiative, status: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{stages.map((s) => (<SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Level</Label>
                    <Select value={editingInitiative.level || 'idea'} onValueChange={(v) => setEditingInitiative({ ...editingInitiative, level: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solution">Solution</SelectItem>
                        <SelectItem value="epic">Epic</SelectItem>
                        <SelectItem value="idea">Idea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Business Value</Label>
                    <Select value={editingInitiative.businessValue} onValueChange={(v) => setEditingInitiative({ ...editingInitiative, businessValue: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Tags (comma separated)</Label>
                  <Input value={editingInitiative.tags.join(', ')} onChange={(e) => setEditingInitiative({ ...editingInitiative, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} />
                </div>
                <div>
                  <Label>Stakeholders (comma separated)</Label>
                  <Input value={editingInitiative.stakeholders.join(', ')} onChange={(e) => setEditingInitiative({ ...editingInitiative, stakeholders: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} />
                </div>

                {/* Personas */}
                {personas.length > 0 && (
                  <div>
                    <Label>Personas</Label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {(editingInitiative.personaIds || []).map((pid) => {
                        const p = personas.find((x) => x.id === pid);
                        if (!p) return null;
                        return (
                          <Badge
                            key={pid}
                            variant="secondary"
                            className="text-xs cursor-pointer hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900 dark:hover:text-red-300 group pr-1"
                            onClick={() => setEditingInitiative({
                              ...editingInitiative,
                              personaIds: (editingInitiative.personaIds || []).filter((id) => id !== pid),
                            })}
                          >
                            {p.name}
                            <span className="ml-1 opacity-50 group-hover:opacity-100">&times;</span>
                          </Badge>
                        );
                      })}
                    </div>
                    <Select
                      value=""
                      onValueChange={(pid) => {
                        const current = editingInitiative.personaIds || [];
                        if (!current.includes(pid)) {
                          setEditingInitiative({ ...editingInitiative, personaIds: [...current, pid] });
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Add a persona..." />
                      </SelectTrigger>
                      <SelectContent>
                        {personas
                          .filter((p) => !(editingInitiative.personaIds || []).includes(p.id))
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name} — {p.role}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Business Case Questions */}
                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-500" />
                    Business Case Questions
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Why do you need this initiative?</Label>
                      <Textarea
                        value={editingInitiative.whyNeeded || ''}
                        onChange={(e) => setEditingInitiative({ ...editingInitiative, whyNeeded: e.target.value })}
                        placeholder="What problem does it solve? What opportunity does it unlock?"
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">What if this initiative is not approved or we don't have a solution?</Label>
                      <Textarea
                        value={editingInitiative.whatIfNot || ''}
                        onChange={(e) => setEditingInitiative({ ...editingInitiative, whatIfNot: e.target.value })}
                        placeholder="What happens if we don't do this? What is the cost of inaction?"
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Expected Business Value (mandays, revenue, time saved...)
                      </Label>
                      <Input
                        value={editingInitiative.expectedValue || ''}
                        onChange={(e) => setEditingInitiative({ ...editingInitiative, expectedValue: e.target.value })}
                        placeholder="e.g., Save 200 mandays/year, +$500K ARR"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Expected Time to Market
                      </Label>
                      <Input
                        value={editingInitiative.expectedTimeToMarket || ''}
                        onChange={(e) => setEditingInitiative({ ...editingInitiative, expectedTimeToMarket: e.target.value })}
                        placeholder="e.g., 3 months, Q3 2026, 6 sprints"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </Button>
            <Button variant="outline" onClick={() => setEditingInitiative(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}><Save className="h-4 w-4 mr-2" />Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Kanban Board */}
      <div className="grid grid-cols-5 gap-4 min-h-[500px]">
        {stages.map((stage) => {
          const stageInitiatives = filteredInitiatives.filter((i) => i.status === stage.id);
          return (
            <div key={stage.id} className="min-w-[220px]">
              <div className={cn('rounded-t-lg p-2 text-center font-medium text-sm flex items-center justify-center gap-1', stage.color)}>
                {selectionMode && stageInitiatives.length > 0 && (
                  <button onClick={() => toggleSelectAllInStage(stage.id)} className="hover:opacity-80">
                    {stageInitiatives.every((i) => selectedIds.has(i.id))
                      ? <CheckSquare className="h-4 w-4 text-blue-600" />
                      : <Square className="h-4 w-4 text-slate-400" />
                    }
                  </button>
                )}
                {stage.label}
                <Badge variant="secondary" className="ml-1">{stageInitiatives.length}</Badge>
              </div>
              <div className="bg-background rounded-b-lg p-2 space-y-2 min-h-[400px]">
                {stageInitiatives.map((initiative) => (
                  <Card
                    key={initiative.id}
                    className={cn(
                      'cursor-pointer hover:shadow-md transition-shadow',
                      selectionMode && selectedIds.has(initiative.id) && 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                    )}
                    onClick={() => selectionMode ? toggleSelection(initiative.id, { stopPropagation: () => {} } as React.MouseEvent) : setEditingInitiative({ ...initiative })}
                  >
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        {selectionMode && (
                          <button onClick={(e) => toggleSelection(initiative.id, e)} className="shrink-0">
                            {selectedIds.has(initiative.id)
                              ? <CheckSquare className="h-4 w-4 text-blue-600" />
                              : <Square className="h-4 w-4 text-slate-400" />
                            }
                          </button>
                        )}
                        <h4 className="font-medium text-foreground text-sm">{initiative.title}</h4>
                        {isSampleData(initiative.id) && <ExampleBadge />}
                        {initiative.jiraIssueType && (
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 font-medium shrink-0",
                            initiative.jiraIssueType === 'Epic' ? 'text-purple-600 border-purple-300 dark:text-purple-400 dark:border-purple-700' :
                            initiative.jiraIssueType === 'Feature' ? 'text-green-600 border-green-300 dark:text-green-400 dark:border-green-700' :
                            'text-indigo-600 border-indigo-300 dark:text-indigo-400 dark:border-indigo-700'
                          )}>
                            {initiative.jiraIssueType}
                          </Badge>
                        )}
                        {initiative.jiraKey && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700 font-mono shrink-0">
                            {initiative.jiraKey}
                          </Badge>
                        )}
                      </div>
                      {/* Persona avatars */}
                      {initiative.personaIds && initiative.personaIds.length > 0 && (
                        <div className="flex items-center gap-0.5 mb-1.5">
                          {initiative.personaIds.map((pid) => {
                            const p = personas.find((x) => x.id === pid);
                            if (!p) return null;
                            return (
                              <Tooltip key={pid}>
                                <TooltipTrigger asChild>
                                  <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[10px] font-semibold text-blue-600 dark:text-blue-300 border border-border">
                                    {p.name.charAt(0)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {p.name} — {p.role}
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{initiative.description}</p>

                      {/* Business case indicators */}
                      <div className="space-y-1 mb-2">
                        {initiative.whyNeeded && (
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 line-clamp-1 flex items-start gap-1">
                            <HelpCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            <span>{initiative.whyNeeded}</span>
                          </p>
                        )}
                        {initiative.expectedValue && (
                          <p className="text-[11px] text-green-600 dark:text-green-400 line-clamp-1 flex items-start gap-1">
                            <DollarSign className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            <span>{initiative.expectedValue}</span>
                          </p>
                        )}
                        {initiative.expectedTimeToMarket && (
                          <p className="text-[11px] text-purple-600 dark:text-purple-400 line-clamp-1 flex items-start gap-1">
                            <Clock className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            <span>{initiative.expectedTimeToMarket}</span>
                          </p>
                        )}
                        {initiative.whatIfNot && (
                          <p className="text-[11px] text-red-600 dark:text-red-400 line-clamp-1 flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                            <span>{initiative.whatIfNot}</span>
                          </p>
                        )}
                      </div>

                      {/* Level + VAS badges row */}
                      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                        <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', LEVEL_BADGE_COLORS[(initiative.level || 'idea')])}>
                          {(initiative.level || 'idea').charAt(0).toUpperCase() + (initiative.level || 'idea').slice(1)}
                        </Badge>
                        <AlignmentBadge score={initiative.alignmentScore ?? null} />
                        {initiative.competitiveRank != null && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                            #{initiative.competitiveRank}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={cn('text-xs',
                          initiative.businessValue === 'high' && 'border-green-500 text-green-600',
                          initiative.businessValue === 'medium' && 'border-amber-500 text-amber-600',
                        )}>
                          {initiative.businessValue} value
                        </Badge>
                        <div className="flex items-center gap-1">
                          {/* Score Alignment button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950"
                            onClick={(e) => handleScoreAlignment(initiative.id, e)}
                            disabled={scoringId === initiative.id}
                            title="Score vision alignment"
                          >
                            {scoringId === initiative.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Target className="h-3 w-3" />}
                          </Button>
                          {/* Compute Impact button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950"
                            onClick={(e) => handleComputeImpact(initiative.id, e)}
                            disabled={computingImpactId === initiative.id}
                            title="Compute business impact"
                          >
                            {computingImpactId === initiative.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <BarChart3 className="h-3 w-3" />}
                          </Button>
                          {/* Discovery link for discovery-stage items */}
                          {stage.id === 'discovery' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={(e) => handleOpenDiscovery(initiative.id, e)}
                              title="Open Discovery workspace"
                            >
                              <Search className="h-3 w-3 mr-0.5" />
                              <span className="text-[10px]">Explore</span>
                            </Button>
                          )}
                          {stage.id !== 'approved' && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => {
                              e.stopPropagation();
                              const nextStage = stages[stages.findIndex((s) => s.id === stage.id) + 1];
                              if (nextStage) moveInitiative(initiative.id, nextStage.id as any);
                            }}>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {initiative.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {initiative.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs py-0">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
