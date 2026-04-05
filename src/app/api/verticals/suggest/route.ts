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

    const { llmConfig } = await req.json();

    if (!llmConfig?.provider) {
      return NextResponse.json({ error: 'llmConfig with provider is required' }, { status: 400 });
    }

    // Gather context: existing products from Vision + initiatives
    const [products, initiatives, existingVerticals] = await Promise.all([
      db.productMapping.findMany({
        where: { userId: session.user.id },
        select: { name: true, type: true },
      }),
      db.initiative.findMany({
        where: { userId: session.user.id },
        select: { title: true, level: true, description: true },
      }),
      db.productVertical.findMany({
        where: { userId: session.user.id },
        select: { name: true },
      }),
    ]);

    const existingNames = existingVerticals.map((v) => v.name);

    const llm = LLMService.create(llmConfig);
    const response = await llm.complete([
      {
        role: 'system',
        content: 'You are a senior product strategist. Return only valid JSON.',
      },
      {
        role: 'user',
        content: `Given these products and initiatives, suggest 3-5 strategic product verticals that group them logically.

Products: ${JSON.stringify(products.map((p) => p.name))}
Initiatives: ${JSON.stringify(initiatives.map((i) => ({ title: i.title, level: i.level })))}
Already existing verticals (don't duplicate): ${JSON.stringify(existingNames)}

Return JSON array:
[
  {
    "name": "Vertical name",
    "description": "One sentence explaining this vertical's strategic focus",
    "strategy": "Why this vertical matters to the business",
    "color": "#hex color",
    "initiatives": ["initiative title that belongs here"]
  }
]

Make verticals strategic — not just grouping by feature area. Think product lines, market segments, or value streams.`,
      },
    ]);

    const clean = response.replace(/```json\n?|\n?```/g, '').trim();
    const suggestions = JSON.parse(clean);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[VERTICALS_SUGGEST]', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}
