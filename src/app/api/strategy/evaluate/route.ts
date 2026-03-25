import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { initiativeId } = body;

    if (!initiativeId) {
      return NextResponse.json({ error: 'initiativeId is required' }, { status: 400 });
    }

    // Verify ownership
    const initiative = await db.initiative.findFirst({
      where: { id: initiativeId, userId: session.user.id },
    });
    if (!initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
    }

    // Fetch vision context (for future LLM usage)
    const northStar = await db.northStar.findUnique({
      where: { userId: session.user.id },
    });
    const businessGoals = await db.businessGoal.findMany({
      where: { userId: session.user.id },
    });

    // Placeholder evaluation — LLM analysis pending
    return NextResponse.json({
      initiativeId,
      evaluation: {
        strategicFit: 50,
        marketReadiness: 50,
        executionRisk: 50,
        overallRecommendation: 'evaluate',
        reasoning: 'Placeholder evaluation. LLM analysis pending.',
        suggestedActions: [],
      },
      computedBy: 'placeholder',
    });
  } catch (error) {
    console.error('[STRATEGY_EVALUATE_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
