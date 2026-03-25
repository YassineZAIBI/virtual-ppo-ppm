import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { LLMService, getUserLLMConfig } from '@/lib/services/llm';
import type { LLMConfig, LLMProvider } from '@/lib/types';

// VAS weight constants
const WEIGHTS = {
  northStarRelevance: 0.35,
  businessGoalCoverage: 0.25,
  targetGroupImpact: 0.20,
  needFulfillment: 0.20,
} as const;

function computeOverallScore(subScores: {
  northStarRelevance: number;
  businessGoalCoverage: number;
  targetGroupImpact: number;
  needFulfillment: number;
}): number {
  return Math.round(
    subScores.northStarRelevance * WEIGHTS.northStarRelevance +
    subScores.businessGoalCoverage * WEIGHTS.businessGoalCoverage +
    subScores.targetGroupImpact * WEIGHTS.targetGroupImpact +
    subScores.needFulfillment * WEIGHTS.needFulfillment
  );
}

function buildAlignmentPrompt(
  entity: Record<string, unknown>,
  entityType: string,
  northStar: { statement: string; context?: string | null } | null,
  businessGoals: { title: string; description?: string | null }[],
  targetGroups: { name: string; role?: string | null }[],
  needs: { title: string; description?: string | null }[],
): string {
  const entityTitle = entity.title as string || 'Untitled';
  const entityDesc = entity.description as string || 'No description';

  return `You are a product strategy alignment evaluator. Score how well this ${entityType} aligns with the product vision.

## ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Being Evaluated
**Title:** ${entityTitle}
**Description:** ${entityDesc}

## Product Vision

### North Star
${northStar?.statement || 'Not defined'}
${northStar?.context ? `Context: ${northStar.context}` : ''}

### Business Goals (${businessGoals.length})
${businessGoals.length > 0 ? businessGoals.map((g, i) => `${i + 1}. ${g.title}${g.description ? ': ' + g.description : ''}`).join('\n') : 'None defined'}

### Target Groups (${targetGroups.length})
${targetGroups.length > 0 ? targetGroups.map((t, i) => `${i + 1}. ${t.name}${t.role ? ' (' + t.role + ')' : ''}`).join('\n') : 'None defined'}

### Customer Needs (${needs.length})
${needs.length > 0 ? needs.map((n, i) => `${i + 1}. ${n.title}${n.description ? ': ' + n.description : ''}`).join('\n') : 'None defined'}

## Scoring Instructions
Rate each dimension from 0-100:

1. **northStarRelevance** (weight: 35%): How directly does this ${entityType} contribute to achieving the North Star? 90+ = core enabler, 70-89 = strong contributor, 50-69 = indirect, 30-49 = weak link, <30 = misaligned.

2. **businessGoalCoverage** (weight: 25%): How many business goals does this ${entityType} advance? 90+ = addresses most goals, 70-89 = addresses several, 50-69 = addresses one, <50 = unclear connection.

3. **targetGroupImpact** (weight: 20%): How much value does this deliver to the defined target groups? 90+ = transformative for multiple groups, 70-89 = significant for one group, 50-69 = moderate, <50 = minimal.

4. **needFulfillment** (weight: 20%): How well does this address identified customer needs? 90+ = directly solves critical needs, 70-89 = addresses important needs, 50-69 = partially relevant, <50 = doesn't address known needs.

Also provide:
- **strengths**: 2-3 bullet points on how this aligns well
- **concerns**: 1-2 bullet points on alignment gaps or risks
- **reasoning**: A 2-3 sentence summary of the overall alignment assessment

Respond in EXACTLY this JSON format (no markdown, no code fences):
{"northStarRelevance":NUMBER,"businessGoalCoverage":NUMBER,"targetGroupImpact":NUMBER,"needFulfillment":NUMBER,"strengths":["...","..."],"concerns":["..."],"reasoning":"..."}`;
}

function parseScores(response: string): {
  subScores: { northStarRelevance: number; businessGoalCoverage: number; targetGroupImpact: number; needFulfillment: number };
  strengths: string[];
  concerns: string[];
  reasoning: string;
} | null {
  try {
    // Try to extract JSON from the response
    let jsonStr = response.trim();
    // Handle markdown code fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    // Handle cases where there's text before/after JSON
    const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (braceMatch) jsonStr = braceMatch[0];

    const parsed = JSON.parse(jsonStr);

    const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 50)));

    return {
      subScores: {
        northStarRelevance: clamp(parsed.northStarRelevance),
        businessGoalCoverage: clamp(parsed.businessGoalCoverage),
        targetGroupImpact: clamp(parsed.targetGroupImpact),
        needFulfillment: clamp(parsed.needFulfillment),
      },
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.map(String) : [],
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'Alignment analysis complete.',
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    if (!['initiative', 'risk'].includes(entityType)) {
      return NextResponse.json(
        { error: 'entityType must be "initiative" or "risk"' },
        { status: 400 }
      );
    }

    // Fetch user's vision data
    const [northStar, businessGoals, targetGroups, needs] = await Promise.all([
      db.northStar.findUnique({ where: { userId: session.user.id } }),
      db.businessGoal.findMany({ where: { userId: session.user.id } }),
      db.targetGroup.findMany({ where: { userId: session.user.id } }),
      db.need.findMany({ where: { userId: session.user.id } }),
    ]);

    // Fetch the entity
    let entity: Record<string, unknown> | null = null;
    if (entityType === 'initiative') {
      entity = await db.initiative.findFirst({
        where: { id: entityId, userId: session.user.id },
      });
    } else if (entityType === 'risk') {
      entity = await db.risk.findFirst({
        where: { id: entityId, userId: session.user.id },
      });
    }

    if (!entity) {
      return NextResponse.json(
        { error: `${entityType} not found` },
        { status: 404 }
      );
    }

    // Get LLM config — try request body (settings.llm or llmConfig), then database
    let config: LLMConfig;
    const llmFromSettings = body.settings?.llm;
    const llmDirect = body.llmConfig;
    if (llmFromSettings?.provider && llmFromSettings?.apiKey) {
      config = {
        provider: llmFromSettings.provider as LLMProvider,
        apiKey: llmFromSettings.apiKey,
        apiEndpoint: llmFromSettings.apiEndpoint || undefined,
        model: llmFromSettings.model || undefined,
      };
    } else if (llmDirect?.provider && llmDirect?.apiKey) {
      config = {
        provider: llmDirect.provider as LLMProvider,
        apiKey: llmDirect.apiKey,
        apiEndpoint: llmDirect.apiEndpoint || undefined,
        model: llmDirect.model || undefined,
      };
    } else {
      try {
        config = await getUserLLMConfig(session.user.id);
      } catch {
        return NextResponse.json(
          { error: 'LLM not configured. Please set up your LLM provider in Settings.' },
          { status: 400 }
        );
      }
    }

    // Build prompt and call LLM
    const prompt = buildAlignmentPrompt(
      entity, entityType,
      northStar as { statement: string; context?: string | null } | null,
      businessGoals as { title: string; description?: string | null }[],
      targetGroups as { name: string; role?: string | null }[],
      needs as { title: string; description?: string | null }[],
    );

    const llm = LLMService.create(config);
    const response = await llm.chat(
      [
        { role: 'system', content: 'You are a product strategy alignment evaluator. Always respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.3, maxTokens: 1000 }
    );

    const parsed = parseScores(response);

    let subScores: { northStarRelevance: number; businessGoalCoverage: number; targetGroupImpact: number; needFulfillment: number };
    let strengths: string[] = [];
    let concerns: string[] = [];
    let reasoning: string;
    let computedBy: string;

    if (parsed) {
      subScores = parsed.subScores;
      strengths = parsed.strengths;
      concerns = parsed.concerns;
      reasoning = parsed.reasoning;
      computedBy = config.provider;
    } else {
      // Fallback if LLM response couldn't be parsed
      subScores = { northStarRelevance: 50, businessGoalCoverage: 50, targetGroupImpact: 50, needFulfillment: 50 };
      reasoning = 'Could not parse LLM response. Using default scores.';
      computedBy = 'fallback';
    }

    const overallScore = computeOverallScore(subScores);

    // Store reasoning + strengths + concerns as JSON for persistence
    const reasoningJson = JSON.stringify({ text: reasoning, strengths, concerns });

    // Find existing alignment score for version bumping
    const existing = await db.alignmentScore.findFirst({
      where: {
        userId: session.user.id,
        entityType,
        entityId,
      },
      orderBy: { version: 'desc' },
    });

    const nextVersion = existing ? existing.version + 1 : 1;

    // Create the AlignmentScore record
    const alignmentScore = await db.alignmentScore.create({
      data: {
        userId: session.user.id,
        entityType,
        entityId,
        overallScore,
        northStarRelevance: subScores.northStarRelevance,
        businessGoalCoverage: subScores.businessGoalCoverage,
        targetGroupImpact: subScores.targetGroupImpact,
        needFulfillment: subScores.needFulfillment,
        reasoning: reasoningJson,
        computedBy,
        version: nextVersion,
      },
    });

    // If entity is an initiative, update its cached alignmentScore field
    if (entityType === 'initiative') {
      await db.initiative.update({
        where: { id: entityId },
        data: { alignmentScore: overallScore },
      });
    }

    return NextResponse.json({
      ...alignmentScore,
      reasoning,
      strengths,
      concerns,
      visionContext: {
        hasNorthStar: !!northStar,
        businessGoalCount: businessGoals.length,
        targetGroupCount: targetGroups.length,
        needCount: needs.length,
      },
    });
  } catch (error) {
    console.error('Failed to compute alignment score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper to parse the reasoning field which may be:
 * - JSON: { text, strengths, concerns } (new format)
 * - Plain string (legacy records)
 */
function parseReasoningField(reasoning: string | null): {
  reasoning: string;
  strengths: string[];
  concerns: string[];
} {
  if (!reasoning) return { reasoning: '', strengths: [], concerns: [] };
  try {
    const parsed = JSON.parse(reasoning);
    if (parsed && typeof parsed.text === 'string') {
      return {
        reasoning: parsed.text,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      };
    }
  } catch {
    // Not JSON — legacy plain-text reasoning
  }
  return { reasoning, strengths: [], concerns: [] };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') || 'initiative';

    // Fetch the latest alignment score for each entity (grouped by entityId)
    const scores = await db.alignmentScore.findMany({
      where: {
        userId: session.user.id,
        entityType,
      },
      orderBy: { version: 'desc' },
    });

    // Keep only the latest version per entityId
    const latestByEntity = new Map<string, typeof scores[0]>();
    for (const score of scores) {
      if (!latestByEntity.has(score.entityId)) {
        latestByEntity.set(score.entityId, score);
      }
    }

    // Parse reasoning field and return enriched records
    const results = Array.from(latestByEntity.values()).map(score => {
      const parsed = parseReasoningField(score.reasoning);
      return {
        ...score,
        reasoning: parsed.reasoning,
        strengths: parsed.strengths,
        concerns: parsed.concerns,
      };
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Failed to fetch alignment scores:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
