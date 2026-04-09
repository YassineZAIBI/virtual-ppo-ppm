'use client';

import { useState, useEffect, useCallback } from 'react';
import { ViewShell } from '@/components/views/shared/ViewShell';
import { Button } from '@/components/ui/button';
import { BrainStoryCanvas } from '@/components/brain/BrainStoryCanvas';
import { BrainValueCanvas } from '@/components/brain/BrainValueCanvas';
import { BrainRegion } from '@/components/brain/BrainRegion';
import { BrainDetail } from '@/components/brain/BrainDetail';
import { BrainBreadcrumb } from '@/components/brain/BrainBreadcrumb';
import { BookOpen, BarChart3 } from 'lucide-react';
import type { BrainOverviewData, BrainViewMode } from '@/lib/types';

export function BrainView() {
  const [data, setData] = useState<BrainOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<BrainViewMode>('story');
  const [depth, setDepth] = useState<0 | 1 | 2>(0);
  const [currentRegion, setCurrentRegion] = useState<string | null>(null);
  const [currentItemKey, setCurrentItemKey] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<unknown>(null);

  useEffect(() => {
    fetch('/api/brain')
      .then(r => {
        if (!r.ok) throw new Error('Failed to load brain data');
        return r.json();
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const goToRegion = useCallback((key: string) => {
    setCurrentRegion(key);
    setCurrentItemKey(null);
    setDetailData(null);
    setDepth(1);
  }, []);

  const goToDetail = useCallback(async (regionKey: string, itemKey: string) => {
    setCurrentRegion(regionKey);
    setCurrentItemKey(itemKey);
    setDepth(2);

    // Fetch detail for initiatives
    if (regionKey.startsWith('v-') || regionKey === 'orphans') {
      try {
        const r = await fetch(`/api/brain/initiative/${itemKey}`);
        if (r.ok) setDetailData(await r.json());
      } catch { /* detail will render from canvas data */ }
    }
  }, []);

  const goBack = useCallback(() => {
    if (depth === 2) {
      setDepth(1);
      setCurrentItemKey(null);
      setDetailData(null);
    } else if (depth === 1) {
      setDepth(0);
      setCurrentRegion(null);
    }
  }, [depth]);

  const isEmpty = !data || (
    !data.northStar &&
    data.verticals.length === 0 &&
    data.orphanInitiatives.length === 0 &&
    data.risks.length === 0 &&
    data.competitors.length === 0
  );

  return (
    <ViewShell
      title="Company Brain"
      description={
        data
          ? `${data.stats.totalInitiatives} initiatives \u2022 ${data.stats.totalVerticals} verticals \u2022 ${data.stats.totalRisks} risks`
          : 'Your strategy canvas'
      }
      loading={loading}
      error={error}
      empty={isEmpty}
      emptyMessage="Brain is empty"
      emptyDescription="Set up your Vision and create initiatives to see your strategy canvas. Start with Settings \u2192 Vision."
      actions={
        depth === 0 ? (
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            <Button
              variant={viewMode === 'story' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('story')}
              className="h-7 text-xs"
            >
              <BookOpen className="h-3.5 w-3.5 mr-1" /> Story
            </Button>
            <Button
              variant={viewMode === 'value' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('value')}
              className="h-7 text-xs"
            >
              <BarChart3 className="h-3.5 w-3.5 mr-1" /> Value
            </Button>
          </div>
        ) : undefined
      }
    >
      {data && (
        <>
          <BrainBreadcrumb
            depth={depth}
            regionKey={currentRegion}
            itemKey={currentItemKey}
            data={data}
            onNavigate={(d) => {
              if (d === 0) { setDepth(0); setCurrentRegion(null); setCurrentItemKey(null); setDetailData(null); }
              else if (d === 1) { setDepth(1); setCurrentItemKey(null); setDetailData(null); }
            }}
          />

          {depth === 0 && viewMode === 'story' && (
            <BrainStoryCanvas data={data} onNavigate={goToRegion} />
          )}
          {depth === 0 && viewMode === 'value' && (
            <BrainValueCanvas data={data} onNavigate={goToRegion} onNavigateDetail={goToDetail} />
          )}
          {depth === 1 && currentRegion && (
            <BrainRegion
              regionKey={currentRegion}
              data={data}
              onNavigate={goToRegion}
              onNavigateDetail={goToDetail}
            />
          )}
          {depth === 2 && currentRegion && currentItemKey && (
            <BrainDetail
              regionKey={currentRegion}
              itemKey={currentItemKey}
              data={data}
              detailData={detailData}
              onNavigate={goToRegion}
              onNavigateDetail={goToDetail}
              onBack={goBack}
            />
          )}
        </>
      )}
    </ViewShell>
  );
}
