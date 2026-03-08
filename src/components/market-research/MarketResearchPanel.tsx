'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StyledMarkdown } from '@/components/ui/styled-markdown';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  FileText,
  Database,
  Link2,
  Sparkles,
  Loader2,
  Trash2,
  RefreshCw,
} from 'lucide-react';

import { AdapterSelector } from './AdapterSelector';
import { DataPointCard } from './DataPointCard';
import { SourceAttribution } from './SourceAttribution';
import { JobProgress } from './JobProgress';

import type { MarketResearchReport, MarketDataPoint } from '@/lib/types';

interface MarketResearchPanelProps {
  initiativeId?: string;
  initiativeTitle?: string;
}

export function MarketResearchPanel({
  initiativeId,
  initiativeTitle,
}: MarketResearchPanelProps) {
  const {
    marketResearches,
    addMarketResearch,
    updateMarketResearch,
    deleteMarketResearch,
  } = useAppStore();

  // Dialog state
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [selectedAdapters, setSelectedAdapters] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Active research tracking
  const [activeResearchId, setActiveResearchId] = useState<string | null>(null);
  const [gatherJobId, setGatherJobId] = useState<string | null>(null);
  const [synthesizeJobId, setSynthesizeJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('report');
  const [synthesizing, setSynthesizing] = useState(false);

  // Filter researches for this initiative (or show all if no initiativeId)
  const filteredResearches = initiativeId
    ? marketResearches.filter((r) => r.initiativeId === initiativeId)
    : marketResearches;

  const activeResearch = activeResearchId
    ? marketResearches.find((r) => r.id === activeResearchId) || null
    : null;

  // Load existing researches on mount
  useEffect(() => {
    async function loadResearches() {
      try {
        const url = initiativeId
          ? `/api/market-research?initiativeId=${initiativeId}`
          : '/api/market-research';
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        // Merge into store (replace set for this initiative context)
        if (Array.isArray(data)) {
          data.forEach((r: MarketResearchReport) => {
            const exists = marketResearches.find((mr) => mr.id === r.id);
            if (!exists) addMarketResearch(r);
            else updateMarketResearch(r.id, r);
          });
        }
      } catch {
        // silent
      }
    }
    loadResearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initiativeId]);

  // Prefill query from initiative title
  const openNewDialog = () => {
    setNewTitle(initiativeTitle ? `Research: ${initiativeTitle}` : '');
    setNewQuery(
      initiativeTitle
        ? `Market analysis and competitive landscape for "${initiativeTitle}"`
        : ''
    );
    setSelectedAdapters([]);
    setShowNewDialog(true);
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newQuery.trim()) {
      toast.error('Title and query are required');
      return;
    }
    if (selectedAdapters.length === 0) {
      toast.error('Select at least one data adapter');
      return;
    }

    setCreating(true);
    try {
      // Step 1: Create the research record
      const createRes = await fetch('/api/market-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          query: newQuery.trim(),
          initiativeId: initiativeId || undefined,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create research');
      }

      const research: MarketResearchReport = await createRes.json();
      addMarketResearch(research);
      setActiveResearchId(research.id);

      // Step 2: Start gathering
      const gatherRes = await fetch(`/api/market-research/${research.id}/gather`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adapterKeys: selectedAdapters }),
      });

      if (!gatherRes.ok) {
        const err = await gatherRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to start data gathering');
      }

      const { jobId } = await gatherRes.json();
      setGatherJobId(jobId);
      updateMarketResearch(research.id, { status: 'gathering' });
      setShowNewDialog(false);
      toast.success('Research started! Gathering data...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create research');
    } finally {
      setCreating(false);
    }
  };

  const handleGatherComplete = useCallback(async () => {
    setGatherJobId(null);
    if (!activeResearchId) return;

    // Refresh the research to get data points
    try {
      const res = await fetch(`/api/market-research/${activeResearchId}`);
      if (res.ok) {
        const data = await res.json();
        updateMarketResearch(activeResearchId, {
          ...data,
          status: 'gathered' as any, // intermediate state before synthesis
        });
      }
    } catch {
      // silent
    }
    toast.success('Data gathering complete! You can now synthesize a report.');
  }, [activeResearchId, updateMarketResearch]);

  const handleGatherFail = useCallback(
    (error: string) => {
      setGatherJobId(null);
      if (activeResearchId) {
        updateMarketResearch(activeResearchId, { status: 'failed' });
      }
      toast.error(`Gathering failed: ${error}`);
    },
    [activeResearchId, updateMarketResearch]
  );

  const handleSynthesize = async () => {
    if (!activeResearchId) return;
    setSynthesizing(true);
    try {
      const res = await fetch(
        `/api/market-research/${activeResearchId}/synthesize`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to start synthesis');
      }
      const { jobId } = await res.json();
      setSynthesizeJobId(jobId);
      updateMarketResearch(activeResearchId, { status: 'synthesizing' });
      toast.success('Synthesizing report...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Synthesis failed');
    } finally {
      setSynthesizing(false);
    }
  };

  const handleSynthesizeComplete = useCallback(async () => {
    setSynthesizeJobId(null);
    if (!activeResearchId) return;

    try {
      const res = await fetch(`/api/market-research/${activeResearchId}`);
      if (res.ok) {
        const data = await res.json();
        updateMarketResearch(activeResearchId, {
          ...data,
          status: 'completed',
        });
      }
    } catch {
      // silent
    }
    toast.success('Research report synthesized!');
    setActiveTab('report');
  }, [activeResearchId, updateMarketResearch]);

  const handleSynthesizeFail = useCallback(
    (error: string) => {
      setSynthesizeJobId(null);
      if (activeResearchId) {
        updateMarketResearch(activeResearchId, { status: 'failed' });
      }
      toast.error(`Synthesis failed: ${error}`);
    },
    [activeResearchId, updateMarketResearch]
  );

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/market-research/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      deleteMarketResearch(id);
      if (activeResearchId === id) setActiveResearchId(null);
      toast.success('Research deleted');
    } catch {
      toast.error('Failed to delete research');
    }
  };

  const dataPoints: MarketDataPoint[] = activeResearch?.dataPoints || [];
  const canSynthesize =
    activeResearch &&
    dataPoints.length > 0 &&
    !synthesizeJobId &&
    activeResearch.status !== 'synthesizing' &&
    activeResearch.status !== 'completed';

  const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pending', variant: 'secondary' },
    gathering: { label: 'Gathering', variant: 'outline' },
    synthesizing: { label: 'Synthesizing', variant: 'outline' },
    completed: { label: 'Completed', variant: 'default' },
    failed: { label: 'Failed', variant: 'destructive' },
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Search className="h-5 w-5" />
            Market Research
          </h3>
          <p className="text-sm text-muted-foreground">
            Gather and synthesize market intelligence from multiple data sources.
          </p>
        </div>
        <Button onClick={openNewDialog} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Run Research
        </Button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Sidebar: research list */}
        <div className="w-64 shrink-0 space-y-2">
          <ScrollArea className="h-full">
            {filteredResearches.length === 0 ? (
              <Card className="border-dashed border-border">
                <CardContent className="py-8 text-center">
                  <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No research yet. Click &quot;Run Research&quot; to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredResearches.map((r) => {
                  const badge = STATUS_BADGE[r.status] || STATUS_BADGE.pending;
                  const isActive = r.id === activeResearchId;
                  return (
                    <Card
                      key={r.id}
                      className={`cursor-pointer transition-colors border ${
                        isActive
                          ? 'border-primary bg-primary/5 dark:bg-primary/10'
                          : 'border-border bg-card hover:bg-muted/50'
                      }`}
                      onClick={() => setActiveResearchId(r.id)}
                    >
                      <CardContent className="p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-sm font-medium text-foreground line-clamp-2">
                            {r.title}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(r.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={badge.variant} className="text-[10px]">
                            {badge.label}
                          </Badge>
                          {r.dataPoints && (
                            <span className="text-[10px] text-muted-foreground">
                              {r.dataPoints.length} data points
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main content area */}
        <div className="flex-1 min-w-0">
          {!activeResearch ? (
            <Card className="h-full border-border">
              <CardContent className="flex flex-col items-center justify-center h-full py-16">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-sm text-center">
                  Select a research from the sidebar or run a new one.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 h-full flex flex-col">
              {/* Research header */}
              <Card className="border-border shrink-0">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {activeResearch.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {activeResearch.query}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        (STATUS_BADGE[activeResearch.status] || STATUS_BADGE.pending)
                          .variant
                      }
                    >
                      {(STATUS_BADGE[activeResearch.status] || STATUS_BADGE.pending)
                        .label}
                    </Badge>
                  </div>
                </CardHeader>

                {/* Progress bars */}
                {gatherJobId && (
                  <CardContent className="pt-0 pb-3">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Data Gathering
                    </Label>
                    <JobProgress
                      jobId={gatherJobId}
                      onComplete={handleGatherComplete}
                      onFail={handleGatherFail}
                    />
                  </CardContent>
                )}
                {synthesizeJobId && (
                  <CardContent className="pt-0 pb-3">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Report Synthesis
                    </Label>
                    <JobProgress
                      jobId={synthesizeJobId}
                      onComplete={handleSynthesizeComplete}
                      onFail={handleSynthesizeFail}
                    />
                  </CardContent>
                )}

                {/* Synthesize button */}
                {canSynthesize && (
                  <CardContent className="pt-0 pb-3">
                    <Button
                      onClick={handleSynthesize}
                      disabled={synthesizing}
                      size="sm"
                    >
                      {synthesizing ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      Synthesize Report
                    </Button>
                  </CardContent>
                )}
              </Card>

              {/* Results tabs */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col min-h-0"
              >
                <TabsList className="shrink-0">
                  <TabsTrigger value="report" className="gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    Report
                  </TabsTrigger>
                  <TabsTrigger value="raw-data" className="gap-1">
                    <Database className="h-3.5 w-3.5" />
                    Raw Data
                    {dataPoints.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] ml-1">
                        {dataPoints.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="sources" className="gap-1">
                    <Link2 className="h-3.5 w-3.5" />
                    Sources
                  </TabsTrigger>
                </TabsList>

                {/* Report tab */}
                <TabsContent value="report" className="flex-1 min-h-0 mt-3">
                  <ScrollArea className="h-full">
                    {activeResearch.synthesizedReport ? (
                      <Card className="border-border">
                        <CardContent className="p-6">
                          <StyledMarkdown>
                            {activeResearch.synthesizedReport}
                          </StyledMarkdown>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-border border-dashed">
                        <CardContent className="py-12 text-center">
                          <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">
                            {dataPoints.length > 0
                              ? 'Data gathered. Click "Synthesize Report" to generate an AI analysis.'
                              : 'No report yet. Gather data first, then synthesize.'}
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Raw Data tab */}
                <TabsContent value="raw-data" className="flex-1 min-h-0 mt-3">
                  <ScrollArea className="h-full">
                    {dataPoints.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {dataPoints.map((dp) => (
                          <DataPointCard key={dp.id} {...dp} />
                        ))}
                      </div>
                    ) : (
                      <Card className="border-border border-dashed">
                        <CardContent className="py-12 text-center">
                          <Database className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">
                            No data points yet. Run a research to gather data.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </ScrollArea>
                </TabsContent>

                {/* Sources tab */}
                <TabsContent value="sources" className="flex-1 min-h-0 mt-3">
                  <ScrollArea className="h-full">
                    {dataPoints.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {/* Deduplicate by sourceUrl */}
                        {Array.from(
                          new Map(
                            dataPoints.map((dp) => [dp.sourceUrl || dp.id, dp])
                          ).values()
                        ).map((dp) => (
                          <SourceAttribution
                            key={dp.id}
                            sourceName={dp.sourceName}
                            sourceUrl={dp.sourceUrl}
                            adapterKey={dp.adapterKey}
                            fetchedAt={dp.fetchedAt}
                          />
                        ))}
                      </div>
                    ) : (
                      <Card className="border-border border-dashed">
                        <CardContent className="py-12 text-center">
                          <Link2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">
                            No sources yet. Run a research to discover data sources.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* New Research Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Run Market Research</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="research-title">Title</Label>
              <Input
                id="research-title"
                placeholder="e.g., Competitive Analysis - Q1 2026"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="research-query">Research Query</Label>
              <Textarea
                id="research-query"
                placeholder="Describe what you want to research..."
                value={newQuery}
                onChange={(e) => setNewQuery(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Sources</Label>
              <AdapterSelector
                selectedKeys={selectedAdapters}
                onChange={setSelectedAdapters}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewDialog(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-1" />
              )}
              Start Research
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
