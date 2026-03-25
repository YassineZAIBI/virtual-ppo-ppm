/**
 * Intelligent query router — recommends adapters based on research intent.
 * Uses keyword-based intent classification (fast, no LLM needed).
 */

export type ResearchIntent =
  | 'market_sizing'
  | 'competitive_analysis'
  | 'user_sentiment'
  | 'technology_trends'
  | 'hiring_demand'
  | 'general';

interface AdapterRecommendation {
  intent: ResearchIntent;
  label: string;
  adapters: string[];
  priority: number; // 1 = most relevant
}

// ── Intent Detection Keywords ──

const INTENT_KEYWORDS: Record<ResearchIntent, string[]> = {
  market_sizing: [
    'market size', 'market growth', 'tam', 'sam', 'som', 'revenue',
    'market share', 'market value', 'billion', 'million', 'forecast',
    'industry size', 'market opportunity', 'addressable market',
    'market report', 'cagr', 'projection', 'valuation',
  ],
  competitive_analysis: [
    'competitor', 'competitive', 'alternative', 'vs', 'versus',
    'compare', 'comparison', 'feature matrix', 'pricing',
    'market leader', 'landscape', 'positioning', 'differentiat',
    'rival', 'benchmark', 'g2', 'capterra',
  ],
  user_sentiment: [
    'review', 'feedback', 'sentiment', 'opinion', 'satisfaction',
    'nps', 'user experience', 'ux', 'pain point', 'complaint',
    'love', 'hate', 'frustrat', 'deligh', 'rating', 'star',
    'customer voice', 'user need', 'demand',
  ],
  technology_trends: [
    'trend', 'emerging', 'innovation', 'technology', 'tech stack',
    'ai', 'machine learning', 'blockchain', 'cloud', 'saas',
    'framework', 'architecture', 'patent', 'research paper',
    'academic', 'state of the art', 'cutting edge', 'breakthrough',
  ],
  hiring_demand: [
    'hiring', 'job', 'recruit', 'talent', 'workforce',
    'salary', 'compensation', 'headcount', 'team size',
    'engineer', 'developer', 'product manager', 'designer',
    'glassdoor', 'linkedin', 'career',
  ],
  general: [], // fallback
};

// ── Adapter Mappings per Intent ──

const INTENT_ADAPTERS: Record<ResearchIntent, string[]> = {
  market_sizing: [
    'duckduckgo', 'statista-scrape', 'worldbank', 'bls', 'fred',
    'wikipedia', 'openalex', 'techcrunch',
  ],
  competitive_analysis: [
    'g2-reviews', 'capterra-reviews', 'crunchbase', 'producthunt-scrape',
    'competitor-site', 'pricing-page', 'duckduckgo',
  ],
  user_sentiment: [
    'g2-reviews', 'capterra-reviews', 'reddit', 'hackernews',
    'app-store-reviews', 'play-store-reviews', 'stackoverflow-scrape',
    'quora',
  ],
  technology_trends: [
    'arxiv', 'semantic-scholar', 'openalex', 'hackernews',
    'google-patents', 'stackoverflow-scrape', 'duckduckgo',
    'techcrunch',
  ],
  hiring_demand: [
    'linkedin-jobs', 'glassdoor', 'duckduckgo',
  ],
  general: [
    'duckduckgo', 'reddit', 'hackernews', 'wikipedia',
    'arxiv', 'semantic-scholar',
  ],
};

/**
 * Detect research intents from a query string.
 * Returns intents sorted by match strength (most matching keywords first).
 */
export function detectIntents(query: string): ResearchIntent[] {
  const queryLower = query.toLowerCase();
  const scores: { intent: ResearchIntent; score: number }[] = [];

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [ResearchIntent, string[]][]) {
    if (intent === 'general') continue;
    const score = keywords.filter(kw => queryLower.includes(kw)).length;
    if (score > 0) {
      scores.push({ intent, score });
    }
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // If no specific intent detected, return general
  if (scores.length === 0) return ['general'];

  return scores.map(s => s.intent);
}

/**
 * Get adapter recommendations for a research query.
 * Returns groups of adapters sorted by relevance to the detected intents.
 */
export function getRecommendedAdapters(query: string): AdapterRecommendation[] {
  const intents = detectIntents(query);
  const recommendations: AdapterRecommendation[] = [];
  const seenAdapters = new Set<string>();

  const INTENT_LABELS: Record<ResearchIntent, string> = {
    market_sizing: 'Market Size & Growth',
    competitive_analysis: 'Competitive Analysis',
    user_sentiment: 'User Sentiment',
    technology_trends: 'Technology Trends',
    hiring_demand: 'Hiring & Demand',
    general: 'General Research',
  };

  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i];
    const adapters = INTENT_ADAPTERS[intent].filter(a => !seenAdapters.has(a));
    adapters.forEach(a => seenAdapters.add(a));

    if (adapters.length > 0) {
      recommendations.push({
        intent,
        label: INTENT_LABELS[intent],
        adapters,
        priority: i + 1,
      });
    }
  }

  // Always include general adapters that weren't already recommended
  const generalExtras = INTENT_ADAPTERS.general.filter(a => !seenAdapters.has(a));
  if (generalExtras.length > 0) {
    recommendations.push({
      intent: 'general',
      label: 'General Research',
      adapters: generalExtras,
      priority: recommendations.length + 1,
    });
  }

  return recommendations;
}

/**
 * Get a flat list of recommended adapter keys for a query.
 * Convenience function for auto-selection in the UI.
 */
export function getRecommendedAdapterKeys(query: string): string[] {
  return getRecommendedAdapters(query).flatMap(r => r.adapters);
}
