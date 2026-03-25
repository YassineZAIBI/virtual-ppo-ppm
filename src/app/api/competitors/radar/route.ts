import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Compute market positioning metrics for each competitor from their feed data.
 *
 * Dimensions:
 * - activityScore:    How frequently this competitor appears in news/feeds (0-100)
 * - sentimentScore:   Overall sentiment direction (0=negative, 50=neutral, 100=positive)
 * - relevanceScore:   Average relevance of feed items (0-100)
 * - productVelocity:  Rate of product updates vs other content (0-100)
 * - marketPresence:   Breadth of coverage across source types (0-100)
 * - threatLevel:      Combined signal of negative actions toward your space (0-100)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const competitors = await db.competitor.findMany({
      where: { userId: session.user.id, isActive: true },
      select: {
        id: true, name: true, website: true, tags: true,
        estimatedMarketCap: true, estimatedUsers: true,
        marketTrend: true, predictedGrowth: true,
        marketAnalysis: true, marketAnalysisAt: true,
      },
    });

    if (competitors.length === 0) {
      return NextResponse.json({ competitors: [], metrics: [] });
    }

    // Fetch all feeds grouped by competitor
    const allFeeds = await db.competitorFeed.findMany({
      where: {
        userId: session.user.id,
        competitorId: { in: competitors.map(c => c.id) },
      },
      select: {
        competitorId: true,
        type: true,
        relevance: true,
        sentiment: true,
        sourceAdapter: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group feeds by competitor
    const feedsByCompetitor = new Map<string, typeof allFeeds>();
    for (const feed of allFeeds) {
      const existing = feedsByCompetitor.get(feed.competitorId) ?? [];
      existing.push(feed);
      feedsByCompetitor.set(feed.competitorId, existing);
    }

    // Find the max feed count for normalizing activity score
    let maxFeedCount = 1;
    for (const feeds of feedsByCompetitor.values()) {
      if (feeds.length > maxFeedCount) maxFeedCount = feeds.length;
    }

    const metrics = competitors.map(comp => {
      const feeds = feedsByCompetitor.get(comp.id) ?? [];
      const feedCount = feeds.length;

      // Activity score: normalized by the most active competitor
      const activityScore = Math.round((feedCount / maxFeedCount) * 100);

      // Sentiment score: average sentiment direction
      let sentimentSum = 0;
      let sentimentCount = 0;
      for (const f of feeds) {
        if (f.sentiment === 'positive') { sentimentSum += 100; sentimentCount++; }
        else if (f.sentiment === 'negative') { sentimentSum += 0; sentimentCount++; }
        else if (f.sentiment === 'neutral') { sentimentSum += 50; sentimentCount++; }
      }
      const sentimentScore = sentimentCount > 0 ? Math.round(sentimentSum / sentimentCount) : 50;

      // Relevance score: average relevance of all feeds
      const avgRelevance = feedCount > 0
        ? feeds.reduce((sum, f) => sum + (f.relevance ?? 0.5), 0) / feedCount
        : 0;
      const relevanceScore = Math.round(avgRelevance * 100);

      // Product velocity: ratio of product_update items to total
      const productUpdates = feeds.filter(f => f.type === 'product_update').length;
      const productVelocity = feedCount > 0
        ? Math.round((productUpdates / feedCount) * 100)
        : 0;

      // Market presence: how many unique source adapters cover this competitor
      const uniqueSources = new Set(feeds.map(f => f.sourceAdapter).filter(Boolean));
      const maxPossibleSources = 7; // duckduckgo, hackernews, reddit, techcrunch, producthunt, g2, stackoverflow
      const marketPresence = Math.round(Math.min(1, uniqueSources.size / maxPossibleSources) * 100);

      // Threat level: combination of activity + negative sentiment + product velocity
      const negativeRatio = feedCount > 0
        ? feeds.filter(f => f.sentiment === 'negative').length / feedCount
        : 0;
      const threatLevel = Math.round(
        activityScore * 0.4 + productVelocity * 0.3 + (1 - negativeRatio) * 100 * 0.3
      );

      // Parse tags
      let tags: string[] = [];
      try {
        tags = comp.tags ? JSON.parse(comp.tags) : [];
      } catch { tags = []; }

      return {
        id: comp.id,
        name: comp.name,
        website: comp.website,
        tags,
        feedCount,
        activityScore,
        sentimentScore,
        relevanceScore,
        productVelocity,
        marketPresence,
        threatLevel,
        estimatedMarketCap: comp.estimatedMarketCap ?? null,
        estimatedUsers: comp.estimatedUsers ?? null,
        marketTrend: comp.marketTrend ?? null,
        predictedGrowth: comp.predictedGrowth ?? null,
        marketAnalysis: comp.marketAnalysis ?? null,
        marketAnalysisAt: comp.marketAnalysisAt?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ competitors: metrics });
  } catch (error) {
    console.error('[COMPETITORS_RADAR_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
