import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { fetchFromSources } from '@/lib/services/data-pipeline/pipeline';
import {
  buildCompetitorQueries,
  inferFeedTypeFromQuery,
} from '@/lib/services/data-pipeline/competitor-queries';
import '@/lib/services/data-pipeline/adapters';

// Adapters that work reliably without the Python scraper service
const SCAN_ADAPTERS = [
  'duckduckgo',
  'hackernews',
  'reddit',
  'techcrunch',
  'producthunt-scrape',
  'g2-reviews',
  'stackoverflow-scrape',
];

function classifySentiment(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase();
  const positiveWords = ['launch', 'growth', 'raised', 'partnership', 'award', 'milestone', 'success', 'revenue', 'expansion', 'innovative'];
  const negativeWords = ['layoff', 'decline', 'lawsuit', 'breach', 'outage', 'controversy', 'failed', 'shut down', 'loss', 'cut'];
  const posCount = positiveWords.filter(w => lower.includes(w)).length;
  const negCount = negativeWords.filter(w => lower.includes(w)).length;
  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}

/**
 * Check if a data result is actually about the competitor (not a false positive).
 * Prevents irrelevant results like "Cyberpunk 2077 review" showing up for competitor "Linear".
 */
function isResultAboutCompetitor(
  title: string,
  content: string,
  competitorName: string,
  competitorWebsite?: string | null,
  sourceUrl?: string | null,
): boolean {
  const nameLower = competitorName.toLowerCase().trim();
  const titleLower = (title || '').toLowerCase();
  const contentSnippet = (content || '').toLowerCase().slice(0, 1500);

  // 1. URL-based match — if result comes from competitor's own domain
  if (competitorWebsite && sourceUrl) {
    const domain = competitorWebsite
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .toLowerCase();
    if (sourceUrl.toLowerCase().includes(domain)) return true;
  }

  // 2. Multi-word names (e.g. "Aha Product Management")
  const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);
  if (nameWords.length >= 2) {
    // Full name match
    if (titleLower.includes(nameLower) || contentSnippet.includes(nameLower)) return true;
    // At least 2 significant name words in title
    const titleHits = nameWords.filter(w => titleLower.includes(w));
    if (titleHits.length >= 2) return true;
    // First name word in title + another in content
    if (titleLower.includes(nameWords[0]) && nameWords.slice(1).some(w => contentSnippet.includes(w))) return true;
    return false;
  }

  // 3. Single-word names — require in title (stricter to reduce false positives)
  if (!titleLower.includes(nameLower)) return false;

  // For very common English words, add extra context validation
  const ambiguousNames = new Set([
    'linear', 'notion', 'monday', 'base', 'height', 'amplitude',
    'segment', 'frame', 'craft', 'pitch', 'loop', 'maze', 'loom',
    'miro', 'airtable', 'coda', 'figma', 'slack',
  ]);

  if (ambiguousNames.has(nameLower)) {
    // Name is in the title — check if tech/software context exists nearby
    const combined = titleLower + ' ' + contentSnippet;
    const techContextWords = [
      'software', 'app', 'tool', 'platform', 'saas', 'startup',
      'project management', 'product management', 'pm tool',
      'alternative', 'competitor', 'vs ', 'review', 'feature',
      'integration', 'workflow', 'pricing', 'enterprise', 'team',
      'roadmap', 'sprint', 'agile', 'kanban', 'issue tracker',
      'task management', 'jira', 'backlog', 'api', 'sdk',
      'plugin', 'extension', 'dashboard', 'analytics', 'b2b',
    ];
    return techContextWords.some(ctx => combined.includes(ctx));
  }

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { competitorId } = body;

    // Fetch competitors to scan
    const where: Record<string, unknown> = {
      userId: session.user.id,
      isActive: true,
    };
    if (competitorId) {
      where.id = competitorId;
    }

    const competitors = await db.competitor.findMany({ where });

    if (competitors.length === 0) {
      return NextResponse.json({
        scanned: 0,
        newItems: 0,
        message: competitorId ? 'Competitor not found' : 'No active competitors to scan',
      });
    }

    let totalNewItems = 0;

    for (const competitor of competitors) {
      const queries = buildCompetitorQueries({
        name: competitor.name,
        website: competitor.website,
        tags: competitor.tags,
      });

      // Run each query through the data pipeline
      for (const query of queries) {
        const feedType = inferFeedTypeFromQuery(query);

        try {
          const results = await fetchFromSources(query, SCAN_ADAPTERS, {
            maxResults: 10,
            rawQuery: true,
            relevanceThreshold: 0.12,
            useCache: true,
          });

          if (results.length === 0) continue;

          // Filter: result must actually be about this competitor
          const relevant = results.filter(r =>
            isResultAboutCompetitor(
              r.title,
              r.content,
              competitor.name,
              competitor.website,
              r.sourceUrl,
            )
          );

          if (relevant.length === 0) continue;

          // Deduplicate against existing feed items by title
          const existingTitles = await db.competitorFeed.findMany({
            where: {
              userId: session.user.id,
              competitorId: competitor.id,
            },
            select: { title: true },
          });
          const existingSet = new Set(existingTitles.map(e => e.title.toLowerCase()));

          // Filter: dedup + reject items older than 90 days
          const maxAgeMs = 90 * 24 * 60 * 60 * 1000;
          const cutoff = new Date(Date.now() - maxAgeMs);
          const newResults = relevant.filter(r => {
            if (existingSet.has((r.title || '').toLowerCase())) return false;
            // Reject items with a known publishedAt older than 90 days
            if (r.publishedAt && new Date(r.publishedAt) < cutoff) return false;
            return true;
          });

          if (newResults.length === 0) continue;

          // Create feed items (cap at 5 per query)
          const feedItems = newResults.slice(0, 5).map(result => ({
            userId: session.user.id,
            competitorId: competitor.id,
            type: feedType,
            title: (result.title || 'Untitled').slice(0, 255),
            summary: (result.content || result.title || '').slice(0, 2000),
            source: result.sourceUrl || null,
            sourceAdapter: result.sourceKey || null,
            relevance: result.relevanceHint ?? 0.5,
            sentiment: classifySentiment(
              (result.title || '') + ' ' + (result.content || '')
            ),
            publishedAt: result.publishedAt || null,
          }));

          await db.competitorFeed.createMany({ data: feedItems });
          totalNewItems += feedItems.length;
        } catch (error) {
          console.error(
            `[COMPETITORS_SCAN] Query failed for "${competitor.name}" (${query}):`,
            error instanceof Error ? error.message : error
          );
        }
      }
    }

    return NextResponse.json({
      scanned: competitors.length,
      newItems: totalNewItems,
      message: totalNewItems > 0
        ? `Found ${totalNewItems} new intel items across ${competitors.length} competitor(s).`
        : `Scanned ${competitors.length} competitor(s). No new items found.`,
    });
  } catch (error) {
    console.error('[COMPETITORS_SCAN_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
