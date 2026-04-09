'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ViewShell } from '@/components/views/shared/ViewShell';
import { VerticalSelector } from '@/components/portfolio/VerticalSelector';
import { InitiativesPipeline } from '@/components/views/InitiativesPipeline';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface VerticalData {
  id: string;
  name: string;
  description?: string;
  _count?: { initiatives: number };
}

export function PortfolioView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verticals, setVerticals] = useState<VerticalData[]>([]);
  const [totalInitiatives, setTotalInitiatives] = useState(0);
  const [unclassifiedCount, setUnclassifiedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedVertical, setSelectedVertical] = useState<string | null>(
    searchParams.get('verticalId') || null
  );
  const [showAddVertical, setShowAddVertical] = useState(false);
  const [newVertical, setNewVertical] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch('/api/verticals').then(r => r.ok ? r.json() : []),
      fetch('/api/initiatives').then(r => r.ok ? r.json() : []),
    ])
      .then(([verts, inits]) => {
        if (Array.isArray(verts)) setVerticals(verts);
        if (Array.isArray(inits)) {
          setTotalInitiatives(inits.length);
          setUnclassifiedCount(inits.filter((i: { verticalId?: string | null }) => !i.verticalId).length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (id: string | null) => {
    setSelectedVertical(id);
    const params = new URLSearchParams(window.location.search);
    if (id) params.set('verticalId', id);
    else params.delete('verticalId');
    router.replace(`/portfolio?${params.toString()}`, { scroll: false });
  };

  const handleAddVertical = async () => {
    if (!newVertical.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/verticals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVertical),
      });
      if (!res.ok) throw new Error('Failed to create vertical');
      toast.success('Vertical created');
      setShowAddVertical(false);
      setNewVertical({ name: '', description: '' });
      fetchData();
    } catch {
      toast.error('Failed to create vertical');
    } finally {
      setSaving(false);
    }
  };

  // Determine initialVertical for pipeline
  const pipelineVertical = selectedVertical === 'unassigned'
    ? 'unassigned'
    : selectedVertical || undefined;

  return (
    <ViewShell
      title="Portfolio"
      description="Product verticals and initiative pipeline."
      loading={loading}
    >
      <div className="flex gap-6">
        {/* Left: Vertical selector */}
        <div className="w-48 flex-shrink-0 hidden md:block">
          <VerticalSelector
            verticals={verticals}
            selected={selectedVertical}
            onSelect={handleSelect}
            unclassifiedCount={unclassifiedCount}
            totalCount={totalInitiatives}
            onAddVertical={() => setShowAddVertical(true)}
          />

          {unclassifiedCount > 0 && selectedVertical !== 'unassigned' && (
            <p className="text-[10px] text-muted-foreground mt-3 px-2">
              {unclassifiedCount} initiative{unclassifiedCount > 1 ? 's' : ''} not assigned to a vertical.
            </p>
          )}
        </div>

        {/* Right: Pipeline */}
        <div className="flex-1 min-w-0">
          <InitiativesPipeline
            embedded
            initialVertical={pipelineVertical ?? null}
          />
        </div>
      </div>

      {/* Add Vertical Dialog */}
      <Dialog open={showAddVertical} onOpenChange={setShowAddVertical}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Vertical</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={newVertical.name}
                onChange={e => setNewVertical(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Core Product, AI Features"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newVertical.description}
                onChange={e => setNewVertical(prev => ({ ...prev, description: e.target.value }))}
                placeholder="What does this vertical focus on?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddVertical(false)}>Cancel</Button>
            <Button onClick={handleAddVertical} disabled={saving || !newVertical.name.trim()}>
              {saving ? 'Creating...' : 'Create Vertical'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ViewShell>
  );
}
