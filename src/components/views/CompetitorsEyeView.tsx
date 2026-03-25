'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompetitorCard, type Competitor } from '@/components/competitors/CompetitorCard';
import { CompetitorFeedTimeline } from '@/components/competitors/CompetitorFeedTimeline';
import { CompetitorRadarView } from '@/components/competitors/CompetitorRadarView';
import { CompetitorAddDialog } from '@/components/competitors/CompetitorAddDialog';
import { Eye, Plus, Radar, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

export function CompetitorsEyeView() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const fetchCompetitors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/competitors');
      if (!res.ok) throw new Error('Failed to fetch competitors');
      const data = await res.json();
      setCompetitors(data.competitors ?? data ?? []);
    } catch (err) {
      toast.error('Could not load competitors');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitors();
  }, [fetchCompetitors]);

  const handleUpdate = async (id: string, data: Partial<Competitor>) => {
    try {
      const res = await fetch(`/api/competitors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update competitor');
      await fetchCompetitors();
    } catch (err) {
      toast.error('Could not update competitor');
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/competitors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete competitor');
      toast.success('Competitor removed');
      await fetchCompetitors();
    } catch (err) {
      toast.error('Could not delete competitor');
      console.error(err);
    }
  };

  const handleScanAll = async () => {
    setScanning(true);
    try {
      const res = await fetch('/api/competitors/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Scan failed');
      const data = await res.json();
      if (data.newItems > 0) {
        toast.success(`Found ${data.newItems} new intel items across ${data.scanned} competitor(s).`);
      } else {
        toast.info(`Scanned ${data.scanned} competitor(s). No new items found.`);
      }
      await fetchCompetitors();
    } catch (err) {
      toast.error('Could not complete competitor scan');
      console.error(err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Eye className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Competitors Eye</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScanAll}
            disabled={scanning || competitors.length === 0}
          >
            {scanning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Scanning...
              </>
            ) : (
              <>
                <Radar className="h-3.5 w-3.5 mr-1.5" />
                Scan All
              </>
            )}
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Competitor
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="competitors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="feed">Feed Timeline</TabsTrigger>
          <TabsTrigger value="radar">Radar</TabsTrigger>
        </TabsList>

        {/* Competitors tab */}
        <TabsContent value="competitors">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading competitors...</span>
            </div>
          ) : competitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium">No competitors tracked yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Start by adding your key competitors to monitor their moves, product updates,
                and strategic shifts.
              </p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Your First Competitor
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {competitors.map((c) => (
                <CompetitorCard
                  key={c.id}
                  competitor={c}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Feed Timeline tab */}
        <TabsContent value="feed">
          <CompetitorFeedTimeline />
        </TabsContent>

        {/* Radar tab */}
        <TabsContent value="radar">
          <CompetitorRadarView />
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <CompetitorAddDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdded={fetchCompetitors}
      />
    </div>
  );
}
