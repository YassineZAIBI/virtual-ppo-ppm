'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Target, Users, AlertTriangle, Plus, X, Loader2, ArrowRight } from 'lucide-react';

interface VisionGoal {
  title: string;
  description: string;
  metric: string;
}

interface VisionGroup {
  name: string;
  role: string;
  description: string;
  primaryNeed: string;
}

interface VisionNeed {
  title: string;
  severity: string;
  description: string;
}

interface VisionPreview {
  northStar: string;
  mission?: string;
  goals: VisionGoal[];
  targetGroups: VisionGroup[];
  coreNeeds: VisionNeed[];
}

interface VisionPreviewModalProps {
  open: boolean;
  onClose: () => void;
  preview: VisionPreview;
  onConfirm: (edited: VisionPreview) => void;
  confirming: boolean;
}

export function VisionPreviewModal({ open, onClose, preview, onConfirm, confirming }: VisionPreviewModalProps) {
  const [data, setData] = useState<VisionPreview>(preview);

  const updateGoal = (i: number, field: keyof VisionGoal, value: string) => {
    const goals = [...data.goals];
    goals[i] = { ...goals[i], [field]: value };
    setData({ ...data, goals });
  };

  const removeGoal = (i: number) => {
    setData({ ...data, goals: data.goals.filter((_, idx) => idx !== i) });
  };

  const addGoal = () => {
    setData({ ...data, goals: [...data.goals, { title: '', description: '', metric: '' }] });
  };

  const updateGroup = (i: number, field: keyof VisionGroup, value: string) => {
    const targetGroups = [...data.targetGroups];
    targetGroups[i] = { ...targetGroups[i], [field]: value };
    setData({ ...data, targetGroups });
  };

  const removeGroup = (i: number) => {
    setData({ ...data, targetGroups: data.targetGroups.filter((_, idx) => idx !== i) });
  };

  const addGroup = () => {
    setData({ ...data, targetGroups: [...data.targetGroups, { name: '', role: '', description: '', primaryNeed: '' }] });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" style={{ display: 'flex', flexDirection: 'column' }}>
        <DialogHeader>
          <DialogTitle>Your Vision Preview</DialogTitle>
          <p className="text-sm text-muted-foreground">Review and edit before we build your Vision Board</p>
        </DialogHeader>

        <div className="space-y-5 flex-1">
          {/* North Star */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase">North Star</label>
            <Textarea
              value={data.northStar}
              onChange={(e) => setData({ ...data, northStar: e.target.value })}
              className="mt-1 min-h-[60px]"
            />
          </div>

          <Separator />

          {/* Goals */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-teal-500" />
                <span className="text-sm font-medium">Business Goals ({data.goals.length})</span>
              </div>
              <Button size="sm" variant="ghost" onClick={addGoal} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {data.goals.map((goal, i) => (
                <div key={i} className="rounded-md border p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      value={goal.title}
                      onChange={(e) => updateGoal(i, 'title', e.target.value)}
                      placeholder="Goal title"
                      className="h-7 text-xs"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeGoal(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={goal.description}
                    onChange={(e) => updateGoal(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="h-7 text-xs"
                  />
                  <Input
                    value={goal.metric}
                    onChange={(e) => updateGoal(i, 'metric', e.target.value)}
                    placeholder="Metric"
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Target Groups */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Target Groups ({data.targetGroups.length})</span>
              </div>
              <Button size="sm" variant="ghost" onClick={addGroup} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-2">
              {data.targetGroups.map((g, i) => (
                <div key={i} className="rounded-md border p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Input
                      value={g.name}
                      onChange={(e) => updateGroup(i, 'name', e.target.value)}
                      placeholder="Persona name"
                      className="h-7 text-xs"
                    />
                    <Input
                      value={g.role}
                      onChange={(e) => updateGroup(i, 'role', e.target.value)}
                      placeholder="Role"
                      className="h-7 text-xs w-32"
                    />
                    <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeGroup(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    value={g.description}
                    onChange={(e) => updateGroup(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="h-7 text-xs"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Core Needs */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Core Needs ({data.coreNeeds.length})</span>
            </div>
            <div className="space-y-1.5">
              {data.coreNeeds.map((need, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] shrink-0">{need.severity}</Badge>
                  <span className="text-xs text-foreground">{need.title}</span>
                  <span className="text-xs text-muted-foreground truncate">{need.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} disabled={confirming}>Start over</Button>
          <Button onClick={() => onConfirm(data)} disabled={confirming || !data.northStar.trim()}>
            {confirming ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Generating...</>
            ) : (
              <>Generate Vision Board <ArrowRight className="h-4 w-4 ml-1" /></>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
