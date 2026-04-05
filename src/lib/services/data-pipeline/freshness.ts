/**
 * Freshness scoring and source quality tiers for competitor intelligence.
 * Used to rank data points by recency + authority + relevance.
 */

export function calculateFreshness(publishedAt: Date | undefined): number {
  if (!publishedAt) return 0.5; // unknown date = neutral
  const ageMs = Date.now() - publishedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 1)   return 1.0;   // today
  if (ageDays <= 7)   return 0.9;   // this week
  if (ageDays <= 30)  return 0.7;   // this month
  if (ageDays <= 90)  return 0.5;   // this quarter
  if (ageDays <= 365) return 0.3;   // this year
  return 0.1;                        // older than 1 year
}

export const SOURCE_QUALITY_TIERS: Record<string, number> = {
  'competitor-site': 1.0,  // official competitor website = highest trust
  'techcrunch': 0.9,
  'g2-reviews': 0.85,
  'capterra-reviews': 0.85,
  'producthunt': 0.8,
  'hackernews': 0.75,
  'reddit': 0.65,
  'duckduckgo': 0.5,       // general search = lower trust
  'default': 0.5,
};

export function calculateCompositeScore(
  relevanceScore: number,
  publishedAt: Date | undefined,
  sourceKey: string
): number {
  const freshness = calculateFreshness(publishedAt);
  const quality = SOURCE_QUALITY_TIERS[sourceKey] ?? SOURCE_QUALITY_TIERS['default'];
  return (relevanceScore * 0.4) + (freshness * 0.4) + (quality * 0.2);
}
