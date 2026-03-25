import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { LLMService, getUserLLMConfig } from '@/lib/services/llm';
import type { LLMConfig, LLMProvider } from '@/lib/types';
import { fetchFromSources } from '@/lib/services/data-pipeline/pipeline';
import { isScraperAvailable, callScraper } from '@/lib/services/data-pipeline/adapters/scraper-bridge';

// ── helpers ────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// ── data gathering ─────────────────────────────────────────────────────

interface GatheredIntel {
  officialSite: string[];
  crunchbase: string[];
  twitter: string[];
  marketData: string[];
  reviews: string[];
  feedSummary: string;
}

async function gatherCompetitorIntel(
  competitor: { id: string; name: string; website: string | null; description: string | null; tags: string | null },
  feeds: { type: string; title: string; sentiment: string | null }[],
  scraperUp: boolean,
): Promise<GatheredIntel> {
  const name = competitor.name;
  const website = competitor.website;
  const intel: GatheredIntel = {
    officialSite: [],
    crunchbase: [],
    twitter: [],
    marketData: [],
    reviews: [],
    feedSummary: '',
  };

  // Build DDG queries
  const ddgQueries: { label: keyof GatheredIntel; query: string }[] = [];

  // 1. Official site
  if (website) {
    const domain = website.replace(/^https?:\/\//, '').replace(/\/$/, '');
    ddgQueries.push({
      label: 'officialSite',
      query: `site:${domain} about OR pricing OR customers OR team`,
    });
  }

  // 2. Crunchbase
  ddgQueries.push({
    label: 'crunchbase',
    query: `site:crunchbase.com "${name}" funding OR valuation OR employees`,
  });

  // 3. X / Twitter
  ddgQueries.push({
    label: 'twitter',
    query: `site:x.com "${name}" OR site:twitter.com "${name}"`,
  });

  // 4. Market data (press / valuation / users)
  ddgQueries.push({
    label: 'marketData',
    query: `"${name}" valuation OR funding OR revenue OR users OR customers 2024 2025`,
  });

  // 5. Reviews / comparison
  ddgQueries.push({
    label: 'reviews',
    query: `"${name}" product review OR comparison OR alternative`,
  });

  // Run all DDG queries in parallel
  const ddgResults = await Promise.allSettled(
    ddgQueries.map(async ({ label, query }) => {
      const results = await fetchFromSources(query, ['duckduckgo'], {
        maxResults: 5,
        rawQuery: true,
        relevanceThreshold: 0,
        useCache: true,
      });
      return { label, results };
    }),
  );

  for (const result of ddgResults) {
    if (result.status === 'fulfilled') {
      const { label, results } = result.value;
      intel[label] = results.map(
        (r) => `[${r.sourceName}] ${r.title}: ${truncate(r.content, 300)}`,
      );
    }
  }

  // Tier 2: Crunchbase scraper (if available) — enriches funding data
  if (scraperUp) {
    try {
      const slug = toSlug(name);
      const data = await callScraper({
        url: `https://www.crunchbase.com/organization/${slug}`,
        mode: 'stealth',
        profile_type: 'company',
        max_items: 1,
      });
      const company = data.results?.[0] ?? data;
      if (company) {
        const parts: string[] = [];
        if (company.funding_total ?? company.total_funding)
          parts.push(`Total Funding: ${company.funding_total ?? company.total_funding}`);
        if (company.last_funding_type ?? company.last_round)
          parts.push(`Last Round: ${company.last_funding_type ?? company.last_round}`);
        if (company.num_employees ?? company.employee_count)
          parts.push(`Employees: ${company.num_employees ?? company.employee_count}`);
        if (company.founded_on ?? company.founded)
          parts.push(`Founded: ${company.founded_on ?? company.founded}`);
        if (company.headquarters ?? company.location)
          parts.push(`HQ: ${company.headquarters ?? company.location}`);
        if (parts.length > 0) {
          intel.crunchbase.unshift(`[Crunchbase Profile] ${parts.join(' | ')}`);
        }
      }
    } catch {
      // Scraper failed — DDG fallback already collected
    }
  }

  // Feed summary
  if (feeds.length > 0) {
    const typeCounts: Record<string, number> = {};
    const sentCounts: Record<string, number> = {};
    for (const f of feeds) {
      typeCounts[f.type] = (typeCounts[f.type] ?? 0) + 1;
      if (f.sentiment) sentCounts[f.sentiment] = (sentCounts[f.sentiment] ?? 0) + 1;
    }
    const typeStr = Object.entries(typeCounts).map(([t, c]) => `${c} ${t}`).join(', ');
    const sentStr = Object.entries(sentCounts).map(([s, c]) => `${c} ${s}`).join(', ');
    const titles = feeds.slice(0, 8).map((f) => f.title).join('; ');
    intel.feedSummary = `${feeds.length} items (${typeStr}). Sentiment: ${sentStr}. Recent: ${titles}`;
  }

  return intel;
}

// ── LLM prompt ─────────────────────────────────────────────────────────

function buildMarketAnalysisPrompt(
  competitors: {
    name: string;
    website: string | null;
    description: string | null;
    tags: string[];
    intel: GatheredIntel;
  }[],
): string {
  let prompt = `Analyze these competitors using the gathered real-world intelligence below.
For each competitor, provide structured market estimates.

IMPORTANT:
- Base your estimates ONLY on the data provided. If data is insufficient, use "Unknown".
- Cite which sources (Official Site, Crunchbase, Twitter, Market Data, Reviews) informed each estimate.
- estimatedMarketCap = company valuation or market cap estimate (e.g. "$400M", "$2.5B", "Unknown")
- estimatedUsers = estimated number of active users/customers (e.g. "~500K", "5M+", "Unknown")
- marketTrend = "growing" | "stable" | "declining"
- predictedGrowth = estimated annual growth rate as a number from -100 to 100 (e.g. 25 means +25%)
- analysis = 2-3 sentence analysis citing specific data points

`;

  for (const comp of competitors) {
    prompt += `\n## Competitor: ${comp.name}\n`;
    if (comp.website) prompt += `Website: ${comp.website}\n`;
    if (comp.description) prompt += `Description: ${comp.description}\n`;
    if (comp.tags.length > 0) prompt += `Tags: ${comp.tags.join(', ')}\n`;

    prompt += `\n### Gathered Intelligence:\n`;
    if (comp.intel.officialSite.length > 0) {
      prompt += `**Official Site:**\n${comp.intel.officialSite.join('\n')}\n\n`;
    }
    if (comp.intel.crunchbase.length > 0) {
      prompt += `**Crunchbase:**\n${comp.intel.crunchbase.join('\n')}\n\n`;
    }
    if (comp.intel.twitter.length > 0) {
      prompt += `**X/Twitter:**\n${comp.intel.twitter.join('\n')}\n\n`;
    }
    if (comp.intel.marketData.length > 0) {
      prompt += `**Market Data:**\n${comp.intel.marketData.join('\n')}\n\n`;
    }
    if (comp.intel.reviews.length > 0) {
      prompt += `**Reviews/Comparisons:**\n${comp.intel.reviews.join('\n')}\n\n`;
    }
    if (comp.intel.feedSummary) {
      prompt += `**Feed Intel:** ${comp.intel.feedSummary}\n\n`;
    }
  }

  prompt += `\nRespond with ONLY a valid JSON array, one object per competitor (same order):
[{
  "name": "CompetitorName",
  "estimatedMarketCap": "$X",
  "estimatedUsers": "~XK",
  "marketTrend": "growing",
  "predictedGrowth": 25,
  "analysis": "Based on ... (source)...",
  "confidence": "high|medium|low"
}]`;

  return prompt;
}

// ── route handler ──────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;

    // Get LLM config (body → DB fallback)
    let body: Record<string, any> = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine
    }

    let config: LLMConfig;
    const llmDirect = body.llmConfig;
    if (llmDirect?.provider && llmDirect?.apiKey) {
      config = {
        provider: llmDirect.provider as LLMProvider,
        apiKey: llmDirect.apiKey,
        apiEndpoint: llmDirect.apiEndpoint || undefined,
        model: llmDirect.model || undefined,
      };
    } else {
      try {
        config = await getUserLLMConfig(userId);
      } catch {
        return NextResponse.json(
          { error: 'LLM not configured. Please set up your LLM provider in Settings.' },
          { status: 400 },
        );
      }
    }

    // Fetch competitors
    const competitors = await db.competitor.findMany({
      where: { userId, isActive: true },
    });

    if (competitors.length === 0) {
      return NextResponse.json({ competitors: [], message: 'No competitors to analyze.' });
    }

    // Fetch recent feeds per competitor
    const allFeeds = await db.competitorFeed.findMany({
      where: {
        userId,
        competitorId: { in: competitors.map((c) => c.id) },
      },
      select: {
        competitorId: true,
        type: true,
        title: true,
        sentiment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: competitors.length * 20,
    });

    const feedsByComp = new Map<string, typeof allFeeds>();
    for (const f of allFeeds) {
      const arr = feedsByComp.get(f.competitorId) ?? [];
      arr.push(f);
      feedsByComp.set(f.competitorId, arr);
    }

    // Phase A: Gather real data
    const scraperUp = await isScraperAvailable();

    const intelByComp = new Map<string, GatheredIntel>();
    const gatherResults = await Promise.allSettled(
      competitors.map(async (comp) => {
        const feeds = (feedsByComp.get(comp.id) ?? []).slice(0, 20);
        const intel = await gatherCompetitorIntel(comp, feeds, scraperUp);
        return { id: comp.id, intel };
      }),
    );

    for (const r of gatherResults) {
      if (r.status === 'fulfilled') {
        intelByComp.set(r.value.id, r.value.intel);
      }
    }

    // Phase B: LLM synthesis
    const promptData = competitors.map((comp) => {
      let tags: string[] = [];
      try {
        tags = comp.tags ? JSON.parse(comp.tags) : [];
      } catch {
        tags = [];
      }
      return {
        name: comp.name,
        website: comp.website,
        description: comp.description,
        tags,
        intel: intelByComp.get(comp.id) ?? {
          officialSite: [],
          crunchbase: [],
          twitter: [],
          marketData: [],
          reviews: [],
          feedSummary: '',
        },
      };
    });

    const prompt = buildMarketAnalysisPrompt(promptData);
    const llm = LLMService.create(config);
    const response = await llm.chat(
      [
        {
          role: 'system',
          content:
            'You are a market intelligence analyst specializing in tech and SaaS products. Always respond with valid JSON only, no markdown fences.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.2, maxTokens: 3000 },
    );

    // Parse LLM response
    let analyses: Array<{
      name: string;
      estimatedMarketCap?: string;
      estimatedUsers?: string;
      marketTrend?: string;
      predictedGrowth?: number;
      analysis?: string;
      confidence?: string;
    }> = [];

    try {
      const cleaned = response.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      analyses = JSON.parse(cleaned);
    } catch {
      console.error('[MARKET_ANALYSIS] Could not parse LLM response:', response.slice(0, 500));
      return NextResponse.json(
        { error: 'Could not parse AI response. Please try again.' },
        { status: 502 },
      );
    }

    // Phase C: Persist to DB
    const now = new Date();
    const updated = await Promise.all(
      competitors.map(async (comp) => {
        const analysis = analyses.find(
          (a) => a.name?.toLowerCase() === comp.name.toLowerCase(),
        );
        if (!analysis) return comp;

        return db.competitor.update({
          where: { id: comp.id },
          data: {
            estimatedMarketCap: analysis.estimatedMarketCap || null,
            estimatedUsers: analysis.estimatedUsers || null,
            marketTrend: analysis.marketTrend || null,
            predictedGrowth: analysis.predictedGrowth ?? null,
            marketAnalysis: analysis.analysis || null,
            marketAnalysisAt: now,
          },
        });
      }),
    );

    return NextResponse.json({
      competitors: updated,
      analyzed: analyses.length,
      scraperAvailable: scraperUp,
    });
  } catch (error) {
    console.error('[MARKET_ANALYSIS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
