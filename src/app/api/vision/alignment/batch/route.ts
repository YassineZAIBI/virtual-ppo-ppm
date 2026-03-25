import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// VAS weight constants (duplicated here for self-contained batch computation)
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

const DRIFT_THRESHOLD = 10;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    // userId can be overridden by cron jobs; otherwise use session
    const userId = body.userId || session.user.id;

    // Security: only allow userId override if the session user matches or is admin
    // For now, restrict to own userId unless we add admin checks later
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Cannot batch-score for another user' },
        { status: 403 }
      );
    }

    // Fetch all user's initiatives
    const initiatives = await db.initiative.findMany({
      where: { userId },
    });

    if (initiatives.length === 0) {
      return NextResponse.json({
        evaluated: 0,
        drifted: 0,
        scores: [],
        message: 'No initiatives found for this user',
      });
    }

    const scores = [];
    let drifted = 0;

    for (const initiative of initiatives) {
      // Placeholder sub-scores (LLM will be wired later)
      const subScores = {
        northStarRelevance: 50,
        businessGoalCoverage: 50,
        targetGroupImpact: 50,
        needFulfillment: 50,
      };
      const overallScore = computeOverallScore(subScores);

      // Check for drift against cached score
      const previousScore = initiative.alignmentScore;
      if (previousScore !== null && previousScore !== undefined) {
        const delta = Math.abs(overallScore - previousScore);
        if (delta > DRIFT_THRESHOLD) {
          drifted++;
        }
      }

      // Find existing for version bumping
      const existing = await db.alignmentScore.findFirst({
        where: {
          userId,
          entityType: 'initiative',
          entityId: initiative.id,
        },
        orderBy: { version: 'desc' },
      });

      const nextVersion = existing ? existing.version + 1 : 1;

      // Create alignment score record
      const score = await db.alignmentScore.create({
        data: {
          userId,
          entityType: 'initiative',
          entityId: initiative.id,
          overallScore,
          northStarRelevance: subScores.northStarRelevance,
          businessGoalCoverage: subScores.businessGoalCoverage,
          targetGroupImpact: subScores.targetGroupImpact,
          needFulfillment: subScores.needFulfillment,
          reasoning: 'Batch placeholder scoring. LLM-based analysis pending.',
          computedBy: 'placeholder',
          version: nextVersion,
        },
      });

      // Update cached alignment score on the initiative
      await db.initiative.update({
        where: { id: initiative.id },
        data: { alignmentScore: overallScore },
      });

      scores.push(score);
    }

    return NextResponse.json({
      evaluated: initiatives.length,
      drifted,
      scores,
    });
  } catch (error) {
    console.error('Failed to batch compute alignment scores:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
