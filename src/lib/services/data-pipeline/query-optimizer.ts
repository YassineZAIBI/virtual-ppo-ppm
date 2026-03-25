/**
 * Query optimization and relevance scoring for the data pipeline.
 *
 * - optimizeQuery(): transforms a generic user query into adapter-specific searches
 * - scoreRelevance(): scores results against the original query keywords
 * - filterByRelevance(): removes results below a threshold
 */

// ---- Query Optimization ----

/**
 * Extract meaningful search keywords from a user query.
 * Strips filler words and returns core terms for better API results.
 */
export function extractKeywords(query: string): string[] {
  const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'shall', 'it', 'its', 'this',
    'that', 'these', 'those', 'i', 'we', 'you', 'he', 'she', 'they', 'what',
    'which', 'who', 'whom', 'how', 'when', 'where', 'why', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'some', 'any', 'no', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about',
    'above', 'after', 'again', 'also', 'am', 'as', 'because', 'before',
    'between', 'during', 'into', 'through', 'up', 'out', 'over', 'under',
    // domain-specific filler words from generic market research queries
    'market', 'analysis', 'competitive', 'landscape', 'research', 'report',
    'overview', 'industry', 'sector', 'trends', 'insights',
  ]);

  return query
    .toLowerCase()
    .replace(/["""'']/g, '') // strip quotes
    .replace(/[^a-z0-9\s\-]/g, ' ') // keep only alphanumeric + hyphens
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    // deduplicate
    .filter((w, i, arr) => arr.indexOf(w) === i);
}

type AdapterCategory = 'search' | 'social' | 'research' | 'government' | 'mcp' | 'feed' | 'activity' | 'custom';

/**
 * Transform a user query into an adapter-optimized query.
 * Different APIs respond best to different query formats.
 */
export function optimizeQuery(
  originalQuery: string,
  adapterKey: string,
  category: AdapterCategory
): string {
  const keywords = extractKeywords(originalQuery);
  const coreTerms = keywords.slice(0, 6).join(' ');

  // If the user already crafted a specific query (no "market analysis" filler), use it as-is
  const isGenericTemplate =
    originalQuery.toLowerCase().includes('market analysis') ||
    originalQuery.toLowerCase().includes('competitive landscape');

  if (!isGenericTemplate) {
    // User wrote a custom query; minor adapter-specific tweaks only
    switch (category) {
      case 'research':
        // Research APIs respond better to clean keyword queries
        return keywords.length > 0 ? keywords.slice(0, 8).join(' ') : originalQuery;
      default:
        return originalQuery;
    }
  }

  // For generic template queries, build adapter-specific queries from keywords
  switch (adapterKey) {
    // -- Search --
    case 'duckduckgo':
      return coreTerms + ' market size trends 2024 2025';

    // -- Social --
    case 'hackernews':
      return coreTerms; // HN Algolia works best with plain keywords
    case 'reddit':
      return coreTerms + ' discussion experience review';

    // -- Research/Academic --
    case 'arxiv':
    case 'semantic-scholar':
    case 'openalex':
    case 'crossref':
      return coreTerms; // Academic APIs work best with clean terms
    case 'pubmed':
      return coreTerms; // NCBI works well with keyword queries

    // -- Government/Economic --
    case 'bls':
    case 'fred':
    case 'worldbank':
    case 'eurostat':
      // Government APIs need industry terms, not generic market phrases
      return coreTerms;

    // -- Wikipedia --
    case 'wikipedia':
      // Wikipedia works best with a concise topic
      return keywords.slice(0, 3).join(' ');

    // -- Google Trends --
    case 'google-trends':
      return keywords.slice(0, 5).join(','); // Trends uses comma-separated terms

    // -- Deep scraping adapters (Scrapling-powered) --
    case 'g2-reviews':
    case 'capterra-reviews':
      return coreTerms; // Review sites: product name as slug
    case 'producthunt-scrape':
      return coreTerms;
    case 'crunchbase':
    case 'glassdoor':
      return coreTerms; // Company name
    case 'techcrunch':
      return coreTerms + ' startup funding';
    case 'stackoverflow-scrape':
      return coreTerms + ' how to best practice';
    case 'quora':
      return coreTerms + ' experience advice';
    case 'app-store-reviews':
    case 'play-store-reviews':
      return coreTerms;
    case 'linkedin-jobs':
      return coreTerms + ' jobs hiring';
    case 'google-patents':
      return coreTerms + ' patent innovation';
    case 'statista-scrape':
      return coreTerms + ' statistics market data';
    case 'competitor-site':
    case 'pricing-page':
      return coreTerms; // These use URLs, not search queries

    default:
      return coreTerms || originalQuery;
  }
}

// ---- Relevance Scoring ----

/**
 * Score how relevant a result is to the original query.
 * Returns 0-1 where 1 is a perfect match.
 *
 * Uses keyword overlap between query terms and result title + content.
 * Weighs title matches higher than content matches.
 */
export function scoreRelevance(
  result: { title: string; content: string; metadata?: Record<string, any> },
  queryKeywords: string[]
): number {
  if (queryKeywords.length === 0) return 0.5; // can't score without keywords

  const titleLower = result.title.toLowerCase();
  const contentLower = result.content.toLowerCase().slice(0, 2000); // limit for performance
  const combined = titleLower + ' ' + contentLower;

  let titleHits = 0;
  let contentHits = 0;

  for (const kw of queryKeywords) {
    if (titleLower.includes(kw)) titleHits++;
    if (contentLower.includes(kw)) contentHits++;
  }

  // Title match: worth 60%, content match: worth 40%
  const titleScore = titleHits / queryKeywords.length;
  const contentScore = contentHits / queryKeywords.length;
  const keywordScore = titleScore * 0.6 + contentScore * 0.4;

  // Bonus for exact phrase match (2+ consecutive keywords) in title
  let phraseBonus = 0;
  for (let i = 0; i < queryKeywords.length - 1; i++) {
    const phrase = queryKeywords[i] + ' ' + queryKeywords[i + 1];
    if (titleLower.includes(phrase)) {
      phraseBonus = 0.15;
      break;
    }
  }

  // Recency bonus for social/news content
  const publishedAt = result.metadata?.created_utc
    ? new Date(result.metadata.created_utc * 1000)
    : result.metadata?.publishedAt
      ? new Date(result.metadata.publishedAt)
      : null;

  let recencyBonus = 0;
  if (publishedAt) {
    const ageMs = Date.now() - publishedAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < 30) recencyBonus = 0.1;
    else if (ageDays < 90) recencyBonus = 0.05;
  }

  return Math.min(1, keywordScore + phraseBonus + recencyBonus);
}

/**
 * Filter results, keeping only those above the relevance threshold.
 * Also re-sorts by the computed relevance score (descending).
 */
export function filterByRelevance<T extends { title: string; content: string; metadata?: Record<string, any>; relevanceHint?: number }>(
  results: T[],
  queryKeywords: string[],
  threshold: number = 0.15
): T[] {
  const scored = results.map(r => {
    const computedScore = scoreRelevance(r, queryKeywords);
    // Blend with adapter's own relevanceHint if present (30% adapter, 70% keyword)
    const blended = r.relevanceHint !== undefined
      ? r.relevanceHint * 0.3 + computedScore * 0.7
      : computedScore;
    return { result: r, score: blended };
  });

  return scored
    .filter(s => s.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(s => ({
      ...s.result,
      relevanceHint: s.score,
    }));
}
