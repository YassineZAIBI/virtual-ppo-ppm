import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LLMService } from '@/lib/services/llm';

/**
 * POST /api/vision/preview
 * Generates a vision preview using AI — does NOT write to DB.
 * Body: { prompt, company, llmConfig }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, company, llmConfig } = await req.json();

    if (!llmConfig?.provider) {
      return NextResponse.json({ error: 'llmConfig with provider is required' }, { status: 400 });
    }

    const llm = LLMService.create(llmConfig);
    const response = await llm.complete([
      {
        role: 'system',
        content: 'You are a senior product strategist generating a vision framework. Return only valid JSON.',
      },
      {
        role: 'user',
        content: `Generate a complete product vision framework for:
Company: ${company || prompt || 'a technology company'}

Return JSON with:
{
  "northStar": "One clear sentence describing the ultimate mission",
  "mission": "Why this company exists",
  "goals": [
    { "title": "Goal title", "description": "What success looks like", "metric": "How to measure it" }
  ],
  "targetGroups": [
    { "name": "Persona name", "role": "Job title", "description": "One-sentence description", "primaryNeed": "Main job to be done" }
  ],
  "coreNeeds": [
    { "title": "Need", "severity": "high", "description": "Why this need matters" }
  ]
}
Return 3-5 goals, 3-4 target groups, 4-6 core needs. Make it specific and actionable.`,
      },
    ]);

    const clean = response.replace(/```json\n?|\n?```/g, '').trim();
    const preview = JSON.parse(clean);

    // Do NOT save — return preview only
    return NextResponse.json({ preview });
  } catch (error) {
    console.error('[VISION_PREVIEW]', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}
