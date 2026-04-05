/**
 * Fetches recent news about competitors from multiple free sources.
 * DuckDuckGo news, HackerNews Algolia API.
 * All queries are year-qualified to prevent stale results.
 */

const CURRENT_YEAR = new Date().getFullYear();
const PREV_YEAR = CURRENT_YEAR - 1;

export interface NewsItem {
  title: string;
  url: string;
  summary: string;
  publishedAt: Date | null;
  source: string;
  relevanceType: string; // "funding" | "launch" | "pricing" | "partnership" | "hiring" | "reputation" | "general"
}

function classifyNewsItem(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  if (/fund|raise|series|invest|million|billion|valuat/.test(text)) return 'funding';
  if (/launch|ship|release|announce|introduce|new feature|now available/.test(text)) return 'launch';
  if (/pric|plan|tier|subscript|paid|free|cost/.test(text)) return 'pricing';
  if (/partner|integrat|acqui|merge/.test(text)) return 'partnership';
  if (/hire|hiring|job|recruit|team|headcount/.test(text)) return 'hiring';
  if (/review|complain|issue|problem|broken|fail/.test(text)) return 'reputation';
  return 'general';
}

/**
 * Search DuckDuckGo with mandatory date filtering.
 * Uses df=m (past month) or df=y (past year).
 */
export async function searchDuckDuckGoNews(
  competitorName: string,
  dateRange: 'm' | 'y' = 'm'
): Promise<NewsItem[]> {
  const queries = [
    `"${competitorName}" ${CURRENT_YEAR}`,
    `"${competitorName}" new feature ${CURRENT_YEAR}`,
    `"${competitorName}" pricing ${CURRENT_YEAR}`,
    `"${competitorName}" funding ${CURRENT_YEAR} OR ${PREV_YEAR}`,
  ];

  const allItems: NewsItem[] = [];

  for (const query of queries.slice(0, 2)) {
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&df=${dateRange}&t=azmyra`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;

      const data = await res.json();
      const results = [...(data.Results ?? []), ...(data.RelatedTopics ?? [])];

      for (const item of results.slice(0, 5)) {
        const title = item.Text ?? item.FirstURL ?? '';
        const itemUrl = item.FirstURL ?? '';
        if (!title || !itemUrl) continue;

        allItems.push({
          title: title.slice(0, 200),
          url: itemUrl,
          summary: title.slice(0, 300),
          publishedAt: null,
          source: 'duckduckgo',
          relevanceType: classifyNewsItem(title, ''),
        });
      }
    } catch {
      // Skip failed query — non-blocking
    }
  }

  return allItems;
}

/**
 * Check HackerNews for competitor mentions in the last 30 days.
 * Uses HN Algolia API which supports date filtering.
 */
export async function searchHackerNews(competitorName: string): Promise<NewsItem[]> {
  try {
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const query = encodeURIComponent(competitorName);
    const url = `https://hn.algolia.com/api/v1/search?query=${query}&numericFilters=created_at_i>${thirtyDaysAgo}&hitsPerPage=10&tags=story`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];

    const data = await res.json();
    return (data.hits ?? []).slice(0, 5).map((hit: Record<string, unknown>) => ({
      title: String(hit.title ?? ''),
      url: String(hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`),
      summary: `${hit.points ?? 0} points, ${hit.num_comments ?? 0} comments`,
      publishedAt: hit.created_at ? new Date(hit.created_at as string) : null,
      source: 'hackernews',
      relevanceType: classifyNewsItem(String(hit.title ?? ''), ''),
    }));
  } catch {
    return [];
  }
}

/**
 * Aggregate all news for a competitor.
 * Returns items deduped by URL.
 */
export async function fetchCompetitorNews(competitorName: string): Promise<NewsItem[]> {
  const [ddgItems, hnItems] = await Promise.all([
    searchDuckDuckGoNews(competitorName, 'm'),
    searchHackerNews(competitorName),
  ]);

  const allItems = [...ddgItems, ...hnItems];

  const seen = new Set<string>();
  return allItems.filter(item => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
