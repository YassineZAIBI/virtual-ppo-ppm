import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { LLMService } from '@/lib/services/llm';
import { extractLLMJSON } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { llmConfig, preview } = body as {
      llmConfig?: { provider: string; apiKey: string; model?: string; apiEndpoint?: string };
      preview?: boolean;
    };

    if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
      return NextResponse.json(
        { error: 'LLM configuration required. Please configure your LLM provider in Settings.' },
        { status: 400 }
      );
    }

    // Fetch the user's North Star — required for generation
    const northStar = await db.northStar.findUnique({
      where: { userId: session.user.id },
    });

    if (!northStar) {
      return NextResponse.json(
        { error: 'North Star must be set before generating the pyramid.' },
        { status: 400 }
      );
    }

    const llm = LLMService.create({
      provider: llmConfig.provider as Parameters<typeof LLMService.create>[0]['provider'],
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
      apiEndpoint: llmConfig.apiEndpoint,
    });

    const systemPrompt = `You are a Product Management expert. Given a North Star statement, generate a complete Vision Pyramid.

Respond in valid JSON only (no markdown, no code fences):
{
  "businessGoals": [
    {
      "title": "...",
      "description": "...",
      "targetGroups": [
        {
          "name": "...",
          "description": "...",
          "role": "...",
          "needs": [
            {
              "title": "...",
              "description": "...",
              "severity": "high" | "medium" | "low",
              "product": { "name": "...", "type": "existing" | "planned" | "idea" }
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Generate 2-3 business goals that directly support the North Star
- Each goal should have 1-2 target user groups
- Each target group should have 2-3 needs/pain points
- Each need should have one product/solution mapped to it
- Be specific and actionable, not generic
- Severity should reflect real user impact`;

    const userPrompt = `North Star: "${northStar.statement}"${northStar.context ? `\nContext: ${northStar.context}` : ''}

Generate a complete Vision Pyramid for this product.`;

    const response = await llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ], { temperature: 0.5 });

    // Parse LLM response
    let parsed: {
      businessGoals: Array<{
        title: string;
        description?: string;
        targetGroups: Array<{
          name: string;
          description?: string;
          role?: string;
          needs: Array<{
            title: string;
            description?: string;
            severity?: string;
            product?: { name: string; type?: string };
          }>;
        }>;
      }>;
    };

    const extracted = extractLLMJSON<typeof parsed>(response);
    if (!extracted) {
      return NextResponse.json(
        { error: 'AI returned an invalid response. Please try again.' },
        { status: 502 }
      );
    }
    parsed = extracted;

    if (!parsed.businessGoals || !Array.isArray(parsed.businessGoals)) {
      return NextResponse.json(
        { error: 'AI response missing businessGoals. Please try again.' },
        { status: 502 }
      );
    }

    // Preview mode: return generated data without saving to DB
    if (preview) {
      return NextResponse.json({
        status: 'preview',
        pyramid: parsed,
      });
    }

    // Save the generated pyramid to the database
    const userId = session.user.id;

    for (let gi = 0; gi < parsed.businessGoals.length; gi++) {
      const goalData = parsed.businessGoals[gi];

      const goal = await db.businessGoal.create({
        data: {
          userId,
          northStarId: northStar.id,
          title: goalData.title,
          description: goalData.description || '',
          priority: gi + 1,
        },
      });

      if (!goalData.targetGroups) continue;

      for (const groupData of goalData.targetGroups) {
        // Use upsert to avoid unique constraint crash on re-generation
        const group = await db.targetGroup.upsert({
          where: {
            userId_name: { userId, name: groupData.name },
          },
          create: {
            userId,
            businessGoalId: goal.id,
            name: groupData.name,
            role: groupData.role || '',
            goals: groupData.description || '',
            source: 'ai_generated',
          },
          update: {
            businessGoalId: goal.id,
            role: groupData.role || undefined,
            goals: groupData.description || undefined,
            updatedAt: new Date(),
          },
        });

        if (!groupData.needs) continue;

        // Map severity string to int: high=8, medium=5, low=2
        const severityMap: Record<string, number> = { high: 8, medium: 5, low: 2 };

        for (const needData of groupData.needs) {
          const need = await db.need.create({
            data: {
              userId,
              targetGroupId: group.id,
              title: needData.title,
              description: needData.description || '',
              severity: severityMap[needData.severity || 'medium'] ?? 5,
            },
          });

          if (needData.product) {
            await db.productMapping.create({
              data: {
                userId,
                needId: need.id,
                name: needData.product.name,
                type: needData.product.type || 'idea',
              },
            });
          }
        }
      }
    }

    return NextResponse.json({ status: 'success', goalsCreated: parsed.businessGoals.length });
  } catch (error) {
    console.error('[VISION_PYRAMID_GENERATE]', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
    });
    const message = error instanceof Error ? error.message : 'Failed to generate vision pyramid';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
