'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CompetitorFeedItem, type FeedItem } from './CompetitorFeedItem';
import { Loader2, Inbox, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface CompetitorFeedTimelineProps {
  competitorId?: string;
}

const FEED_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'news', label: 'News' },
  { value: 'product_update', label: 'Product Update' },
  { value: 'vision_shift', label: 'Vision Shift' },
  { value: 'rumor', label: 'Rumor' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'hiring', label: 'Hiring' },
] as const;

const RELEVANCE_LEVELS = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
] as const;

const SENTIMENT_OPTIONS = [
  { value: 'positive', label: 'Positive' },
  { value: 'negative', label: 'Negative' },
  { value: 'neutral', label: 'Neutral' },
] as const;

const DATE_RANGE_OPTIONS = [
  { value: 'week', label: 'Last week' },
  { value: 'month', label: 'Last month' },
  { value: 'quarter', label: 'Last quarter' },
  { value: 'all', label: 'All time' },
] as const;

const PAGE_SIZE = 20;

export function CompetitorFeedTimeline({ competitorId }: CompetitorFeedTimelineProps) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [relevanceFilter, setRelevanceFilter] = useState('all');
  const [sentimentFilters, setSentimentFilters] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState('month');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = useCallback(async (
    pageNum: number,
    type: string,
    relevance: string,
    sentiments: string[],
    dateRange: string,
    append: boolean,
  ) => {
    const isInitial = !append;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        page: String(pageNum),
        limit: String(PAGE_SIZE),
      });
      if (type !== 'all') params.set('type', type);
      if (competitorId) params.set('competitorId', competitorId);
      if (relevance !== 'all') params.set('relevance', relevance);
      if (sentiments.length > 0) params.set('sentiment', sentiments.join(','));
      if (dateRange !== 'all') params.set('dateRange', dateRange);

      const res = await fetch(`/api/competitors/feed?${params}`);
      if (!res.ok) throw new Error('Failed to fetch feed');

      const data = await res.json();
      const newItems: FeedItem[] = data.items ?? data ?? [];

      if (append) {
        setItems((prev) => [...prev, ...newItems]);
      } else {
        setItems(newItems);
      }

      setHasMore(newItems.length >= PAGE_SIZE);
    } catch (err) {
      toast.error('Could not load feed');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [competitorId]);

  useEffect(() => {
    setPage(1);
    fetchFeed(1, typeFilter, relevanceFilter, sentimentFilters, dateFilter, false);
  }, [typeFilter, relevanceFilter, sentimentFilters, dateFilter, fetchFeed]);

  const handleRefresh = async () => {
    if (!competitorId) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/competitors/${competitorId}/scan`, { method: 'POST' });
      if (!res.ok) throw new Error('Scan failed');
      toast.success('Scan triggered — refreshing feed');
      // Reload feed after scan
      setPage(1);
      await fetchFeed(1, typeFilter, relevanceFilter, sentimentFilters, dateFilter, false);
    } catch {
      toast.error('Could not trigger scan');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeed(nextPage, typeFilter, relevanceFilter, sentimentFilters, dateFilter, true);
  };

  const toggleSentiment = (value: string) => {
    setSentimentFilters((prev) =>
      prev.includes(value)
        ? prev.filter((s) => s !== value)
        : [...prev, value]
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        {/* Top row: type filters + refresh */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {FEED_TYPES.map((ft) => (
              <Button
                key={ft.value}
                variant={typeFilter === ft.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter(ft.value)}
                className="text-xs"
              >
                {ft.label}
              </Button>
            ))}
          </div>
          {competitorId && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs shrink-0"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', refreshing && 'animate-spin')} />
              {refreshing ? 'Scanning...' : 'Refresh'}
            </Button>
          )}
        </div>

        {/* Relevance & Impact filters */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Relevance filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Relevance:</span>
            <div className="flex gap-1">
              {RELEVANCE_LEVELS.map((rl) => (
                <Button
                  key={rl.value}
                  variant={relevanceFilter === rl.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRelevanceFilter(rl.value)}
                  className={cn(
                    'text-xs',
                    relevanceFilter !== rl.value && rl.value === 'high' && 'border-green-200 dark:border-green-900/50',
                    relevanceFilter !== rl.value && rl.value === 'medium' && 'border-amber-200 dark:border-amber-900/50',
                    relevanceFilter !== rl.value && rl.value === 'low' && 'border-gray-200 dark:border-gray-700',
                  )}
                >
                  {rl.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Impact / Sentiment filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Impact:</span>
            <div className="flex gap-1">
              {SENTIMENT_OPTIONS.map((so) => (
                <Button
                  key={so.value}
                  variant={sentimentFilters.includes(so.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleSentiment(so.value)}
                  className={cn(
                    'text-xs',
                    !sentimentFilters.includes(so.value) && so.value === 'positive' && 'border-green-200 dark:border-green-900/50',
                    !sentimentFilters.includes(so.value) && so.value === 'negative' && 'border-red-200 dark:border-red-900/50',
                    !sentimentFilters.includes(so.value) && so.value === 'neutral' && 'border-gray-200 dark:border-gray-700',
                  )}
                >
                  {so.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Period:</span>
            <div className="flex gap-1">
              {DATE_RANGE_OPTIONS.map((dr) => (
                <Button
                  key={dr.value}
                  variant={dateFilter === dr.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter(dr.value)}
                  className="text-xs"
                >
                  {dr.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Feed list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading feed...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No feed items yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Run a scan to gather competitor intelligence.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <CompetitorFeedItem key={item.id} item={item} />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
