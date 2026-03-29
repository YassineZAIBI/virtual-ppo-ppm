import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { LLMService } from '@/lib/services/llm';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { llmConfig } = body as {
      llmConfig?: { provider: string; apiKey: string; model?: string; apiEndpoint?: string };
    };

    if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
      return NextResponse.json(
        { error: 'LLM configuration required. Please configure your LLM provider in Settings.' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Fetch context: North Star, products, existing competitors
    const [northStar, productMappings, existingCompetitors] = await Promise.all([
      db.northStar.findUnique({ where: { userId } }),
      db.productMapping.findMany({ where: { userId } }),
      db.competitor.findMany({ where: { userId }, select: { name: true } }),
    ]);

    if (!northStar) {
      return NextResponse.json(
        { error: 'Set your North Star first to enable AI competitor suggestions.' },
        { status: 400 }
      );
    }

    const llm = LLMService.create({
      provider: llmConfig.provider as Parameters<typeof LLMService.create>[0]['provider'],
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
      apiEndpoint: llmConfig.apiEndpoint,
    });

    const existingNames = existingCompetitors.map((c) => c.name);
    const productNames = productMappings.map((p) => p.name);

    const systemPrompt = `You are a competitive intelligence expert.
Given a company's North Star and product portfolio, suggest their key competitors.

Respond in valid JSON only (no markdown, no code fences):
{
  "competitors": [
    {
      "name": "Company Name",
      "website": "https://example.com",
      "description": "One paragraph describing what they do and why they compete",
      "tags": ["direct" or "indirect" or "emerging"],
      "estimatedUsers": "e.g. 10M+",
      "marketTrend": "growing" or "stable" or "declining"
    }
  ]
}

Rules:
- Suggest 3-5 real, existing companies
- Include a mix of direct, indirect, and emerging competitors
- Do NOT suggest these already-tracked companies: ${existingNames.length > 0 ? existingNames.join(', ') : 'none'}
- Focus on companies that compete for the same users or market
- Use real company websites`;

    const userPrompt = `North Star: "${northStar.statement}"${northStar.context ? `\nContext: ${northStar.context}` : ''}${productNames.length > 0 ? `\nProducts: ${productNames.join(', ')}` : ''}

Suggest competitors for this company.`;

    const response = await llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.4 });

    // Parse LLM response
    let parsed: {
      competitors: Array<{
        name: string;
        website?: string;
        description?: string;
        tags?: string[];
        estimatedUsers?: string;
        marketTrend?: string;
      }>;
    };

    try {
      const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'AI returned an invalid response. Please try again.' },
        { status: 500 }
      );
    }

    if (!parsed.competitors || !Array.isArray(parsed.competitors)) {
      return NextResponse.json(
        { error: 'AI response missing competitors. Please try again.' },
        { status: 500 }
      );
    }

    // Filter out duplicates (case-insensitive)
    const existingLower = new Set(existingNames.map((n) => n.toLowerCase()));
    const newCompetitors = parsed.competitors.filter(
      (c) => c.name && !existingLower.has(c.name.toLowerCase())
    );

    // Save to database
    let added = 0;
    for (const comp of newCompetitors) {
      await db.competitor.create({
        data: {
          userId,
          name: comp.name,
          website: comp.website || '',
          description: comp.description || '',
          tags: JSON.stringify(comp.tags || ['direct']),
          estimatedUsers: comp.estimatedUsers || null,
          marketTrend: comp.marketTrend || null,
        },
      });
      added++;
    }

    return NextResponse.json({
      added,
      suggestions: newCompetitors.map((c) => c.name),
    });
  } catch (error) {
    console.error('[COMPETITORS_SUGGEST_POST]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
