'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompetitorCard, type Competitor } from '@/components/competitors/CompetitorCard';
import { CompetitorFeedTimeline } from '@/components/competitors/CompetitorFeedTimeline';
import { CompetitorRadarView } from '@/components/competitors/CompetitorRadarView';
import { CompetitorAlertFeed } from '@/components/competitors/CompetitorAlertFeed';
import { CompetitorAddDialog } from '@/components/competitors/CompetitorAddDialog';
import { Eye, Plus, Radar, Loader2, Users, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';

export function CompetitorsEyeView() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const { settings } = useAppStore();

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

  const handleSuggestCompetitors = async () => {
    if (!settings?.llm?.apiKey) {
      toast.error('Please configure your LLM provider in Settings first.');
      return;
    }

    setSuggesting(true);
    try {
      const res = await fetch('/api/competitors/suggest', {
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
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'Suggestion failed');
      }

      const data = await res.json();
      if (data.added > 0) {
        toast.success(`Added ${data.added} suggested competitor(s)!`);
        await fetchCompetitors();
      } else {
        toast.info('No new competitors to suggest. Try adding more context to your North Star.');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to suggest competitors.');
    } finally {
      setSuggesting(false);
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggestCompetitors}
            disabled={suggesting}
          >
            {suggesting ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Suggesting...</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Suggest Competitors</>
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
          <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
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
              <div className="flex items-center gap-2 mt-4">
                <Button
                  variant="default"
                  onClick={handleSuggestCompetitors}
                  disabled={suggesting}
                >
                  {suggesting ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Suggesting...</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Suggest Competitors with AI</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Manually
                </Button>
              </div>
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

        {/* Intelligence tab */}
        <TabsContent value="intelligence">
          <div className="space-y-4">
            {competitors.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={selectedCompetitorId === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCompetitorId(null)}
                >
                  All
                </Button>
                {competitors.map(c => (
                  <Button
                    key={c.id}
                    variant={selectedCompetitorId === c.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCompetitorId(c.id)}
                  >
                    {c.name}
                  </Button>
                ))}
              </div>
            )}
            <CompetitorAlertFeed
              key={selectedCompetitorId ?? 'all'}
              competitorId={selectedCompetitorId ?? undefined}
            />
          </div>
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
