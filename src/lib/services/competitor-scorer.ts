import { db } from '@/lib/db';
import { writeInsight } from '@/lib/services/insight-writer';
import { calculateFreshness } from '@/lib/services/data-pipeline/freshness';

// Threat scores by feed item type
const THREAT_SCORES: Record<string, number> = {
  pricing_change: 5,
  new_feature: 4,
  product_launch: 5,
  acquisition: 5,
  funding: 4,
  hiring_surge: 3,
  partnership: 3,
  blog_post: 1,
  social_media: 1,
  news: 2,
};

const ESCALATION_THRESHOLD = 4; // Score >= this creates a UserAlert

interface ScoredFeedItem {
  id: string;
  competitorId: string;
  competitorName: string;
  type: string;
  title: string;
  content: string;
  score: number;
  shouldEscalate: boolean;
}

/**
 * Score a feed item incorporating freshness, source quality, and change detection.
 * Items older than 30 days are downranked; detected changes get a bonus.
 */
export function scoreFeedItem(item: {
  id: string;
  type: string;
  title: string;
  content: string;
  competitorId: string;
  competitor?: { name: string } | null;
  publishedAt?: Date | null;
  freshnessScore?: number | null;
  sourceQuality?: number | null;
  isNew?: boolean | null;
}): ScoredFeedItem {
  const baseScore = THREAT_SCORES[item.type] ?? 2;

  // Use provided freshnessScore or calculate from publishedAt
  const freshness = item.freshnessScore ?? calculateFreshness(item.publishedAt ?? undefined);
  const quality = item.sourceQuality ?? 0.5;
  const changeBonus = item.isNew ? 1.5 : 0;

  // Weighted score: base threat * freshness * quality + change bonus, capped at 5
  const score = Math.min(5, Math.round(((baseScore * freshness * quality) + changeBonus) * 10) / 10);

  return {
    id: item.id,
    competitorId: item.competitorId,
    competitorName: item.competitor?.name ?? 'Unknown competitor',
    type: item.type,
    title: item.title,
    content: item.content,
    score,
    shouldEscalate: score >= ESCALATION_THRESHOLD,
  };
}

/**
 * Process unscored competitor feed items for a user.
 * Creates UserAlert and ProactiveInsight for high-threat items.
 * Called by the competitor_scan cron job.
 */
export async function processCompetitorFeed(userId: string): Promise<{
  processed: number;
  escalated: number;
}> {
  try {
    // Get recent unprocessed feed items (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const feedItems = await db.competitorFeed.findMany({
      where: {
        competitor: { userId },
        createdAt: { gte: yesterday },
      },
      include: { competitor: { select: { name: true, id: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (feedItems.length === 0) return { processed: 0, escalated: 0 };

    const scored = feedItems.map((item) => {
      // Parse metadata for freshness/change signals if available
      const meta = typeof item.raw === 'string' ? (() => { try { return JSON.parse(item.raw); } catch { return {}; } })() : {};

      return scoreFeedItem({
        id: item.id,
        type: item.type,
        title: item.title,
        content: item.summary || item.title,
        competitorId: item.competitorId,
        competitor: item.competitor,
        publishedAt: item.publishedAt,
        freshnessScore: meta.freshnessScore ?? null,
        sourceQuality: meta.sourceQuality ?? null,
        isNew: meta.isNew ?? null,
      });
    });

    // Sort by score descending so highest-threat items are processed first
    scored.sort((a, b) => b.score - a.score);
    const toEscalate = scored.filter((item) => item.shouldEscalate);

    // Create UserAlerts and ProactiveInsights for high-threat items
    const escalationTasks = toEscalate.map(async (item) => {
      // Create UserAlert
      await db.userAlert.create({
        data: {
          userId,
          type: 'competitor_move',
          title: `Competitor move: ${item.competitorName}`,
          message: item.title,
          severity: item.score >= 5 ? 'high' : 'medium',
          entityType: 'competitor',
          entityId: item.competitorId,
        },
      }).catch((err: unknown) => console.error('[competitor-scorer] Alert create failed:', err));

      // Create ProactiveInsight
      await writeInsight({
        userId,
        agentType: 'competitor',
        title: `${item.competitorName}: ${item.title}`,
        content: item.content || item.title,
        summary: `${item.competitorName} — ${item.type.replace(/_/g, ' ')} (threat score: ${item.score}/5)`,
        priority: item.score >= 5 ? 'high' : 'medium',
        sourceType: 'competitor',
        sourceId: item.competitorId,
        metadata: { feedItemId: item.id, score: item.score, type: item.type },
      });
    });

    await Promise.allSettled(escalationTasks);

    return { processed: feedItems.length, escalated: toEscalate.length };
  } catch (err) {
    console.error('[competitor-scorer] Processing failed:', err);
    return { processed: 0, escalated: 0 };
  }
}
