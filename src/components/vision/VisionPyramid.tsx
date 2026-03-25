'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Star, Target, Users, AlertTriangle, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BusinessGoalCard } from './BusinessGoalCard';
import { TargetGroupCard } from './TargetGroupCard';
import { NeedCard } from './NeedCard';
import type {
  NorthStarData,
  BusinessGoalData,
  TargetGroupData,
  NeedData,
  ProductMappingData,
} from '@/lib/types';

interface VisionPyramidProps {
  northStar: NorthStarData | null;
  businessGoals: BusinessGoalData[];
  targetGroups: TargetGroupData[];
  needs: NeedData[];
  products: ProductMappingData[];
  onRefresh: () => void;
}

const LEVELS = [
  { key: 'goals', label: 'Business Goals', icon: Target, color: 'text-teal-500', border: 'border-teal-500/30' },
  { key: 'groups', label: 'Target Groups', icon: Users, color: 'text-purple-500', border: 'border-purple-500/30' },
  { key: 'needs', label: 'Needs', icon: AlertTriangle, color: 'text-amber-500', border: 'border-amber-500/30' },
  { key: 'products', label: 'Products', icon: Package, color: 'text-blue-500', border: 'border-blue-500/30' },
] as const;

export function VisionPyramid({
  northStar,
  businessGoals,
  targetGroups,
  needs,
  products,
  onRefresh,
}: VisionPyramidProps) {
  const [expandedLevel, setExpandedLevel] = useState<string | null>('goals');
  const [addingGoal, setAddingGoal] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [addingNeed, setAddingNeed] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [saving, setSaving] = useState(false);

  if (!northStar) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Star className="h-8 w-8 mx-auto mb-2 text-amber-500/40" />
        <p className="text-sm">Set your North Star above to start building the Vision Pyramid</p>
      </div>
    );
  }

  const handleAddGoal = async () => {
    if (!newTitle.trim() || !northStar) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vision/business-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ northStarId: northStar.id, title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setNewTitle('');
      setAddingGoal(false);
      onRefresh();
      toast.success('Business goal added');
    } catch {
      toast.error('Failed to add goal');
    } finally {
      setSaving(false);
    }
  };

  const handleAddGroup = async (goalId: string) => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vision/target-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessGoalId: goalId, name: newTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setNewTitle('');
      setAddingGroup(false);
      onRefresh();
      toast.success('Target group added');
    } catch {
      toast.error('Failed to add target group');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNeed = async (groupId: string) => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vision/needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetGroupId: groupId, title: newTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setNewTitle('');
      setAddingNeed(false);
      onRefresh();
      toast.success('Need added');
    } catch {
      toast.error('Failed to add need');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProduct = async (needId: string) => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/vision/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ needId, name: newTitle.trim(), type: 'existing' }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setNewTitle('');
      setAddingProduct(false);
      onRefresh();
      toast.success('Product added');
    } catch {
      toast.error('Failed to add product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Business Goals Level */}
      <Card className="border-teal-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedLevel(expandedLevel === 'goals' ? null : 'goals')}>
              <Target className="h-4 w-4 text-teal-500" />
              <CardTitle className="text-sm">Business Goals</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{businessGoals.length}</Badge>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setAddingGoal(true); setExpandedLevel('goals'); }}>
              <Plus className="h-3 w-3 mr-1" />Add Goal
            </Button>
          </div>
        </CardHeader>
        {expandedLevel === 'goals' && (
          <CardContent className="space-y-3">
            {addingGoal && (
              <div className="flex gap-2">
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Goal title..." autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()} />
                <Button size="sm" onClick={handleAddGoal} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingGoal(false); setNewTitle(''); }}>Cancel</Button>
              </div>
            )}
            {businessGoals.map((goal) => (
              <BusinessGoalCard
                key={goal.id}
                goal={goal}
                targetGroups={targetGroups}
                onUpdate={() => onRefresh()}
                onDelete={() => onRefresh()}
              />
            ))}
            {businessGoals.length === 0 && !addingGoal && (
              <p className="text-xs text-muted-foreground text-center py-3">No business goals yet. Add one to continue building your vision.</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Target Groups Level */}
      <Card className="border-purple-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedLevel(expandedLevel === 'groups' ? null : 'groups')}>
              <Users className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm">Target Groups</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{targetGroups.length}</Badge>
            </div>
            {businessGoals.length > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setAddingGroup(true); setExpandedLevel('groups'); }}>
                <Plus className="h-3 w-3 mr-1" />Add Group
              </Button>
            )}
          </div>
        </CardHeader>
        {expandedLevel === 'groups' && (
          <CardContent className="space-y-3">
            {addingGroup && businessGoals.length > 0 && (
              <div className="flex gap-2">
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Group name..." autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAddGroup(businessGoals[0].id)} />
                <Button size="sm" onClick={() => handleAddGroup(businessGoals[0].id)} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingGroup(false); setNewTitle(''); }}>Cancel</Button>
              </div>
            )}
            {targetGroups.map((group) => (
              <TargetGroupCard
                key={group.id}
                group={group}
                onUpdate={() => onRefresh()}
                onDelete={() => onRefresh()}
              />
            ))}
            {targetGroups.length === 0 && !addingGroup && (
              <p className="text-xs text-muted-foreground text-center py-3">
                {businessGoals.length > 0 ? 'Add target groups to your business goals.' : 'Create business goals first.'}
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Needs Level */}
      <Card className="border-amber-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedLevel(expandedLevel === 'needs' ? null : 'needs')}>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-sm">Needs & Pain Points</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{needs.length}</Badge>
            </div>
            {targetGroups.length > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setAddingNeed(true); setExpandedLevel('needs'); }}>
                <Plus className="h-3 w-3 mr-1" />Add Need
              </Button>
            )}
          </div>
        </CardHeader>
        {expandedLevel === 'needs' && (
          <CardContent className="space-y-3">
            {addingNeed && targetGroups.length > 0 && (
              <div className="flex gap-2">
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Need title..." autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAddNeed(targetGroups[0].id)} />
                <Button size="sm" onClick={() => handleAddNeed(targetGroups[0].id)} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingNeed(false); setNewTitle(''); }}>Cancel</Button>
              </div>
            )}
            {needs.map((need) => (
              <NeedCard key={need.id} need={need} onUpdate={() => onRefresh()} onDelete={() => onRefresh()} />
            ))}
            {needs.length === 0 && !addingNeed && (
              <p className="text-xs text-muted-foreground text-center py-3">
                {targetGroups.length > 0 ? 'Add needs for your target groups.' : 'Create target groups first.'}
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Products Level */}
      <Card className="border-blue-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedLevel(expandedLevel === 'products' ? null : 'products')}>
              <Package className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm">Products & Solutions</CardTitle>
              <Badge variant="secondary" className="text-[10px]">{products.length}</Badge>
            </div>
            {needs.length > 0 && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setAddingProduct(true); setExpandedLevel('products'); }}>
                <Plus className="h-3 w-3 mr-1" />Add Product
              </Button>
            )}
          </div>
        </CardHeader>
        {expandedLevel === 'products' && (
          <CardContent className="space-y-2">
            {addingProduct && needs.length > 0 && (
              <div className="flex gap-2">
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Product name..." autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAddProduct(needs[0].id)} />
                <Button size="sm" onClick={() => handleAddProduct(needs[0].id)} disabled={saving}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Add'}</Button>
                <Button size="sm" variant="ghost" onClick={() => { setAddingProduct(false); setNewTitle(''); }}>Cancel</Button>
              </div>
            )}
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-md border border-border">
                <div className="flex items-center gap-2">
                  <Package className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-sm">{p.name}</span>
                  <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
                  await fetch(`/api/vision/products/${p.id}`, { method: 'DELETE' });
                  onRefresh();
                  toast.success('Product removed');
                }}>
                  <span className="text-xs">x</span>
                </Button>
              </div>
            ))}
            {products.length === 0 && !addingProduct && (
              <p className="text-xs text-muted-foreground text-center py-3">
                {needs.length > 0 ? 'Map products to your identified needs.' : 'Identify needs first.'}
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
