/**
 * Competitor-specific query builders for the data pipeline.
 *
 * Used by the competitor_scan cron job to generate search queries
 * that are fed into the data adapters (DuckDuckGo, HN, Reddit, etc.).
 */

interface CompetitorQueryInput {
  name: string;
  website?: string | null;
  tags?: string | null; // JSON array string
}

/**
 * Build a set of search queries for a given competitor.
 * Each query targets a different aspect of competitive intelligence.
 *
 * Uses "software" context for single-word generic names to reduce false positives
 * (e.g. "Linear software news" instead of "Linear news" which matches "linear TV").
 */
export function buildCompetitorQueries(competitor: CompetitorQueryInput): string[] {
  const queries: string[] = [];
  const name = competitor.name;

  // For single-word names that are common English words, add "software" context
  const isSingleWord = !name.includes(' ');
  const qualifier = isSingleWord ? ' software' : '';

  // General news
  queries.push(`"${name}"${qualifier} news`);

  // Product launches and updates
  queries.push(`"${name}"${qualifier} product launch OR update OR release`);

  // Funding, M&A, partnerships
  queries.push(`"${name}" funding OR acquisition OR partnership`);

  // Pricing changes
  queries.push(`"${name}"${qualifier} pricing OR plans`);

  // Hiring signals (growth indicator)
  queries.push(`"${name}" hiring OR jobs OR careers`);

  // Site-specific if website is known
  if (competitor.website) {
    const domain = competitor.website
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '');
    queries.push(`site:${domain} changelog OR "what's new"`);
  }

  return queries;
}

/**
 * Map a search query category to a CompetitorFeed type.
 */
export function inferFeedTypeFromQuery(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes('product launch') || lower.includes('update') || lower.includes('release') || lower.includes('changelog')) {
    return 'product_update';
  }
  if (lower.includes('funding') || lower.includes('acquisition') || lower.includes('partnership')) {
    return 'news';
  }
  if (lower.includes('pricing') || lower.includes('plans')) {
    return 'pricing';
  }
  if (lower.includes('hiring') || lower.includes('jobs') || lower.includes('careers')) {
    return 'hiring';
  }
  return 'news';
}

/**
 * Build queries to discover potential competitors from the user's context.
 */
export function buildDiscoveryQueries(northStar: string, productNames: string[]): string[] {
  const queries: string[] = [];

  // Search for alternatives and competitors
  for (const product of productNames.slice(0, 3)) {
    queries.push(`"${product}" alternatives`);
    queries.push(`"${product}" competitors`);
  }

  // Industry-level search from North Star
  if (northStar) {
    // Extract key terms (naive: first 5 significant words)
    const words = northStar
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 5);
    if (words.length > 0) {
      queries.push(`${words.join(' ')} market leaders`);
    }
  }

  return queries;
}
