'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Map, Plus, Download, ChevronLeft, ChevronRight,
  Calendar, Target, AlertTriangle, CheckCircle2, Clock, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Initiative } from '@/lib/types';
import { ShareButton } from '@/components/share/ShareButton';

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface QuarterAssignment {
  [initiativeId: string]: { quarter: Quarter; year: number };
}

const QUARTER_MONTHS: Record<Quarter, string> = {
  Q1: 'Jan - Mar',
  Q2: 'Apr - Jun',
  Q3: 'Jul - Sep',
  Q4: 'Oct - Dec',
};

const QUARTER_COLORS: Record<Quarter, { bg: string; border: string; header: string }> = {
  Q1: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', header: 'bg-blue-600' },
  Q2: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', header: 'bg-emerald-600' },
  Q3: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', header: 'bg-amber-600' },
  Q4: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', header: 'bg-purple-600' },
};

const STATUS_CONFIG: Record<string, { color: string; bgColor: string; icon: typeof CheckCircle2; label: string }> = {
  approved: { color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-500', icon: CheckCircle2, label: 'Approved' },
  definition: { color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-500', icon: Target, label: 'Definition' },
  validation: { color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-500', icon: Clock, label: 'Validating' },
  discovery: { color: 'text-sky-700 dark:text-sky-400', bgColor: 'bg-sky-500', icon: Map, label: 'Discovery' },
  idea: { color: 'text-slate-600 dark:text-slate-400', bgColor: 'bg-slate-400', icon: Target, label: 'Idea' },
};

export function RoadmapView() {
  const { initiatives, addInitiative } = useAppStore();
  const currentYear = new Date().getFullYear();
  const currentQuarter = (`Q${Math.ceil((new Date().getMonth() + 1) / 3)}`) as Quarter;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Initiative | null>(null);
  const [assignDialog, setAssignDialog] = useState<Initiative | null>(null);
  const [newItem, setNewItem] = useState({ title: '', description: '', quarter: currentQuarter as string });

  // Quarter assignments stored in localStorage-compatible state
  const [quarterAssignments, setQuarterAssignments] = useState<QuarterAssignment>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vppo-roadmap-quarters');
      if (saved) return JSON.parse(saved);
    }
    // Default: auto-assign based on status
    const defaults: QuarterAssignment = {};
    initiatives.forEach((init, idx) => {
      if (['approved', 'definition', 'validation'].includes(init.status)) {
        const qIdx = Math.min(idx, 3);
        defaults[init.id] = { quarter: (['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[])[qIdx], year: currentYear };
      }
    });
    return defaults;
  });

  const saveAssignments = (updated: QuarterAssignment) => {
    setQuarterAssignments(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vppo-roadmap-quarters', JSON.stringify(updated));
    }
  };

  const roadmapInitiatives = initiatives.filter(
    (i) => ['approved', 'definition', 'validation', 'discovery'].includes(i.status)
  );

  const unassigned = roadmapInitiatives.filter(
    (i) => !quarterAssignments[i.id] || quarterAssignments[i.id].year !== selectedYear
  );

  const getQuarterItems = (quarter: Quarter) => {
    return roadmapInitiatives.filter(
      (i) => quarterAssignments[i.id]?.quarter === quarter && quarterAssignments[i.id]?.year === selectedYear
    );
  };

  const assignToQuarter = (initiativeId: string, quarter: Quarter) => {
    const updated = { ...quarterAssignments, [initiativeId]: { quarter, year: selectedYear } };
    saveAssignments(updated);
    toast.success(`Assigned to ${quarter} ${selectedYear}`);
  };

  const removeFromQuarter = (initiativeId: string) => {
    const updated = { ...quarterAssignments };
    delete updated[initiativeId];
    saveAssignments(updated);
  };

  const handleAddItem = () => {
    if (!newItem.title.trim()) return;
    const id = crypto.randomUUID();
    addInitiative({
      id,
      title: newItem.title,
      description: newItem.description,
      status: 'approved',
      businessValue: 'medium',
      effort: 'medium',
      stakeholders: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      risks: [],
      dependencies: [],
    });
    if (newItem.quarter) {
      const updated = { ...quarterAssignments, [id]: { quarter: newItem.quarter as Quarter, year: selectedYear } };
      saveAssignments(updated);
    }
    setNewItem({ title: '', description: '', quarter: currentQuarter });
    setShowAddItem(false);
    toast.success('Roadmap item added!');
  };

  const handleExport = () => {
    const exportData = {
      year: selectedYear,
      quarters: (['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).map((q) => ({
        quarter: q,
        months: QUARTER_MONTHS[q],
        initiatives: getQuarterItems(q).map((i) => ({
          title: i.title,
          description: i.description,
          status: i.status,
          businessValue: i.businessValue,
          effort: i.effort,
          stakeholders: i.stakeholders,
          tags: i.tags,
          risks: i.risks,
        })),
      })),
      unassigned: unassigned.map((i) => ({ title: i.title, status: i.status })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roadmap-${selectedYear}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Roadmap exported!');
  };

  // Stats
  const stats = useMemo(() => ({
    total: roadmapInitiatives.length,
    approved: roadmapInitiatives.filter((i) => i.status === 'approved').length,
    inProgress: roadmapInitiatives.filter((i) => ['definition', 'validation'].includes(i.status)).length,
    atRisk: roadmapInitiatives.filter((i) => i.risks.length > 0).length,
    assigned: Object.keys(quarterAssignments).filter(
      (id) => quarterAssignments[id]?.year === selectedYear
    ).length,
  }), [roadmapInitiatives, quarterAssignments, selectedYear]);

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Product Roadmap</h1>
            <p className="text-slate-500">Plan and visualize your product initiatives across quarters</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Year selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedYear(selectedYear - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-bold px-3 min-w-[60px] text-center">{selectedYear}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedYear(selectedYear + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <ShareButton resourceType="roadmap" />
            <Button variant="outline" onClick={handleExport} disabled={roadmapInitiatives.length === 0}>
              <Download className="h-4 w-4 mr-2" />Export
            </Button>
            <Button onClick={() => setShowAddItem(true)}>
              <Plus className="h-4 w-4 mr-2" />Add Item
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                <p className="text-xs text-slate-500">Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 dark:border-purple-800">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.inProgress}</p>
                <p className="text-xs text-slate-500">In Progress</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.atRisk}</p>
                <p className="text-xs text-slate-500">At Risk</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Map className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.assigned}</p>
                <p className="text-xs text-slate-500">Assigned</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quarterly Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as Quarter[]).map((quarter) => {
            const items = getQuarterItems(quarter);
            const colors = QUARTER_COLORS[quarter];
            const isCurrent = quarter === currentQuarter && selectedYear === currentYear;

            return (
              <Card
                key={quarter}
                className={cn(
                  'border-2 transition-all min-h-[300px]',
                  colors.border,
                  isCurrent && 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-slate-950'
                )}
              >
                {/* Quarter Header */}
                <div className={cn('px-4 py-3 text-white rounded-t-lg', colors.header)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">{quarter}</h3>
                      <p className="text-xs opacity-80">{QUARTER_MONTHS[quarter]}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCurrent && (
                        <Badge className="bg-white/20 text-white border-0 text-xs">Current</Badge>
                      )}
                      <Badge className="bg-white/20 text-white border-0 text-xs">{items.length}</Badge>
                    </div>
                  </div>
                </div>

                {/* Quarter Body */}
                <CardContent className={cn('p-3 space-y-2', colors.bg)}>
                  {items.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">No items planned</p>
                      <p className="text-xs mt-1">Assign initiatives below</p>
                    </div>
                  ) : (
                    items.map((item) => {
                      const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.idea;
                      const StatusIcon = config.icon;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
                            'hover:shadow-md transition-all cursor-pointer group'
                          )}
                          onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <StatusIcon className={cn('h-3.5 w-3.5 flex-shrink-0', config.color)} />
                                <h4 className="font-medium text-sm text-slate-900 dark:text-white truncate">
                                  {item.title}
                                </h4>
                                {item.jiraKey && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-blue-600 border-blue-300 dark:text-blue-400 dark:border-blue-700 font-mono shrink-0">
                                    {item.jiraKey}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-2">{item.description || 'No description'}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); removeFromQuarter(item.id); }}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all text-xs"
                              title="Remove from quarter"
                            >
                              x
                            </button>
                          </div>

                          {/* Tags row */}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Badge className={cn('text-[10px] px-1.5 py-0', config.bgColor, 'text-white')}>
                              {config.label}
                            </Badge>
                            <Badge variant="outline" className={cn(
                              'text-[10px] px-1.5 py-0',
                              item.businessValue === 'high' && 'border-green-500 text-green-600',
                              item.businessValue === 'medium' && 'border-amber-500 text-amber-600',
                              item.businessValue === 'low' && 'border-slate-400 text-slate-500',
                            )}>
                              {item.businessValue} value
                            </Badge>
                            {item.risks.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertTriangle className="h-3 w-3 text-red-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">{item.risks.length} risk(s): {item.risks.join(', ')}</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>

                          {/* Expanded details */}
                          {selectedItem?.id === item.id && (
                            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-xs">
                              {item.stakeholders.length > 0 && (
                                <p className="text-slate-500"><span className="font-medium">Stakeholders:</span> {item.stakeholders.join(', ')}</p>
                              )}
                              {item.dependencies.length > 0 && (
                                <p className="text-blue-600"><span className="font-medium">Dependencies:</span> {item.dependencies.join(', ')}</p>
                              )}
                              {item.tags.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {item.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                                  ))}
                                </div>
                              )}
                              <p className="text-slate-400">Effort: {item.effort}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Unassigned Initiatives */}
        {unassigned.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Unassigned Initiatives ({unassigned.length})
                <span className="text-xs font-normal ml-2">Click to assign to a quarter</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {unassigned.map((item) => {
                  const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.idea;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <h4 className="font-medium text-sm text-slate-900 dark:text-white truncate">{item.title}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge className={cn('text-[10px] px-1.5 py-0', config.bgColor, 'text-white')}>
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.businessValue}</Badge>
                        </div>
                      </div>
                      <Select onValueChange={(val) => assignToQuarter(item.id, val as Quarter)}>
                        <SelectTrigger className="w-20 h-8 text-xs">
                          <SelectValue placeholder="Assign" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Q1">Q1</SelectItem>
                          <SelectItem value="Q2">Q2</SelectItem>
                          <SelectItem value="Q3">Q3</SelectItem>
                          <SelectItem value="Q4">Q4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {roadmapInitiatives.length === 0 && (
          <Card>
            <CardContent className="py-16">
              <div className="text-center text-slate-500">
                <Map className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <h3 className="text-lg font-medium mb-2">No Roadmap Items Yet</h3>
                <p className="text-sm mb-4">Add initiatives or move items through the pipeline to populate your roadmap.</p>
                <Button onClick={() => setShowAddItem(true)}>
                  <Plus className="h-4 w-4 mr-2" />Add First Item
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add Item Dialog */}
        <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Roadmap Item</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Title</Label>
                <Input value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} placeholder="Initiative title..." />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} placeholder="What is this about..." />
              </div>
              <div>
                <Label>Target Quarter</Label>
                <Select value={newItem.quarter} onValueChange={(val) => setNewItem({ ...newItem, quarter: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1 ({QUARTER_MONTHS.Q1})</SelectItem>
                    <SelectItem value="Q2">Q2 ({QUARTER_MONTHS.Q2})</SelectItem>
                    <SelectItem value="Q3">Q3 ({QUARTER_MONTHS.Q3})</SelectItem>
                    <SelectItem value="Q4">Q4 ({QUARTER_MONTHS.Q4})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancel</Button>
              <Button onClick={handleAddItem}>Add to Roadmap</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
