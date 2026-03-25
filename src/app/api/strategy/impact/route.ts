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

    // Verify initiative exists and is owned by user
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

    // Placeholder impact — LLM will be wired later
    const impactData = {
      userId: session.user.id,
      entityType: 'initiative' as const,
      entityId: initiativeId,
      revenueEstimate: 0,
      roiPercent: 0,
      timeToValueWeeks: 12,
      marketShareDelta: 0,
      confidenceLevel: 'low',
      assumptions: 'Placeholder — LLM analysis pending',
      computedBy: 'placeholder',
    };

    // Upsert BusinessImpact record
    const existing = await db.businessImpact.findFirst({
      where: {
        entityType: 'initiative',
        entityId: initiativeId,
        userId: session.user.id,
      },
    });

    let impact;
    if (existing) {
      impact = await db.businessImpact.update({
        where: { id: existing.id },
        data: impactData,
      });
    } else {
      impact = await db.businessImpact.create({
        data: impactData,
      });
    }

    // Update initiative's businessImpactId field
    await db.initiative.update({
      where: { id: initiativeId },
      data: { businessImpactId: impact.id },
    });

    return NextResponse.json(impact);
  } catch (error) {
    console.error('[STRATEGY_IMPACT_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
