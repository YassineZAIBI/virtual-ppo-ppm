'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { Initiative } from '@/lib/types';
import { ShareButton } from '@/components/share/ShareButton';

const stages = [
  { id: 'idea', label: 'Ideas', color: 'bg-slate-100 dark:bg-slate-800', headerColor: 'bg-slate-200 dark:bg-slate-700' },
  { id: 'discovery', label: 'Discovery', color: 'bg-blue-50 dark:bg-blue-950', headerColor: 'bg-blue-100 dark:bg-blue-900' },
  { id: 'validation', label: 'Validation', color: 'bg-amber-50 dark:bg-amber-950', headerColor: 'bg-amber-100 dark:bg-amber-900' },
  { id: 'definition', label: 'Definition', color: 'bg-purple-50 dark:bg-purple-950', headerColor: 'bg-purple-100 dark:bg-purple-900' },
  { id: 'approved', label: 'Approved', color: 'bg-green-50 dark:bg-green-950', headerColor: 'bg-green-100 dark:bg-green-900' },
];

export function InitiativesPipeline() {
  const { initiatives, moveInitiative, addInitiative, updateInitiative, deleteInitiative } = useAppStore();
  const router = useRouter();
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);
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

  const handleAddIdea = () => {
    if (!newIdea.title.trim()) return;
    addInitiative({
      id: crypto.randomUUID(),
      title: newIdea.title,
      description: newIdea.description,
      status: 'idea',
      businessValue: newIdea.businessValue,
      effort: newIdea.effort,
      stakeholders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      risks: [],
      dependencies: [],
      whyNeeded: newIdea.whyNeeded,
      whatIfNot: newIdea.whatIfNot,
      expectedValue: newIdea.expectedValue,
      expectedTimeToMarket: newIdea.expectedTimeToMarket,
    });
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Initiatives Pipeline</h1>
          <p className="text-slate-500">Manage ideas from conception to approval</p>
        </div>
        <div className="flex items-center gap-2">
          <ShareButton resourceType="initiatives" />
          <Button onClick={() => setShowNewIdea(true)}>
            <Plus className="h-4 w-4 mr-2" />New Idea
          </Button>
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
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-blue-500" />
                  Business Case Questions
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400">Why do you need this initiative?</Label>
                    <Textarea
                      value={newIdea.whyNeeded}
                      onChange={(e) => setNewIdea({ ...newIdea, whyNeeded: e.target.value })}
                      placeholder="What problem does it solve? What opportunity does it unlock?"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400">What if this initiative is not approved or we don't have a solution?</Label>
                    <Textarea
                      value={newIdea.whatIfNot}
                      onChange={(e) => setNewIdea({ ...newIdea, whatIfNot: e.target.value })}
                      placeholder="What happens if we don't do this? What is the cost of inaction?"
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
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
                    <Label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={editingInitiative.status} onValueChange={(v) => setEditingInitiative({ ...editingInitiative, status: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{stages.map((s) => (<SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>))}</SelectContent>
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

                {/* Business Case Questions */}
                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-blue-500" />
                    Business Case Questions
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-slate-600 dark:text-slate-400">Why do you need this initiative?</Label>
                      <Textarea
                        value={editingInitiative.whyNeeded || ''}
                        onChange={(e) => setEditingInitiative({ ...editingInitiative, whyNeeded: e.target.value })}
                        placeholder="What problem does it solve? What opportunity does it unlock?"
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 dark:text-slate-400">What if this initiative is not approved or we don't have a solution?</Label>
                      <Textarea
                        value={editingInitiative.whatIfNot || ''}
                        onChange={(e) => setEditingInitiative({ ...editingInitiative, whatIfNot: e.target.value })}
                        placeholder="What happens if we don't do this? What is the cost of inaction?"
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
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
                      <Label className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
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
          const stageInitiatives = initiatives.filter((i) => i.status === stage.id);
          return (
            <div key={stage.id} className="min-w-[220px]">
              <div className={cn('rounded-t-lg p-2 text-center font-medium text-sm', stage.color)}>
                {stage.label}
                <Badge variant="secondary" className="ml-2">{stageInitiatives.length}</Badge>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-b-lg p-2 space-y-2 min-h-[400px]">
                {stageInitiatives.map((initiative) => (
                  <Card key={initiative.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setEditingInitiative({ ...initiative })}>
                    <CardContent className="pt-4 pb-3">
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-1">{initiative.title}</h4>
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

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={cn('text-xs',
                          initiative.businessValue === 'high' && 'border-green-500 text-green-600',
                          initiative.businessValue === 'medium' && 'border-amber-500 text-amber-600',
                        )}>
                          {initiative.businessValue} value
                        </Badge>
                        <div className="flex items-center gap-1">
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
