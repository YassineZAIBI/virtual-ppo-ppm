import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessGoalId = searchParams.get('businessGoalId');

    const targetGroups = await db.targetGroup.findMany({
      where: {
        userId: session.user.id,
        ...(businessGoalId && { businessGoalId }),
      },
      include: {
        _count: {
          select: { needs: true },
        },
      },
    });

    return NextResponse.json(targetGroups);
  } catch (error) {
    console.error('[VISION_TARGET_GROUPS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { businessGoalId, name, role, demographics, behaviors, goals, painPoints } = body;

    if (!businessGoalId || !name) {
      return NextResponse.json({ error: 'businessGoalId and name are required' }, { status: 400 });
    }

    // Verify the businessGoal belongs to the user
    const businessGoal = await db.businessGoal.findFirst({
      where: { id: businessGoalId, userId: session.user.id },
    });
    if (!businessGoal) {
      return NextResponse.json({ error: 'BusinessGoal not found' }, { status: 404 });
    }

    const targetGroup = await db.targetGroup.create({
      data: {
        userId: session.user.id,
        businessGoalId,
        name,
        role: role ?? null,
        demographics: demographics ?? null,
        behaviors: behaviors ?? null,
        goals: goals ?? null,
        painPoints: painPoints ?? null,
      },
    });

    // Fire-and-forget: sync to brain graph
    try {
      const parts = [role && `Role: ${role}`, goals && `Goals: ${goals}`, painPoints && `Pain points: ${painPoints}`].filter(Boolean);
      db.brainNode.upsert({
        where: { userId_type_title: { userId: session.user.id, type: 'persona', title: name } },
        create: { userId: session.user.id, type: 'persona', title: name, content: parts.join('. ') || name, summary: role || '', source: 'onboarding', confidence: 1.0 },
        update: { content: parts.join('. ') || name, summary: role || '' },
      }).catch((err: unknown) => console.error('BrainNode upsert failed (target-group):', err));
    } catch (err) {
      console.error('BrainNode upsert error (target-group):', err);
    }

    return NextResponse.json(targetGroup, { status: 201 });
  } catch (error) {
    console.error('[VISION_TARGET_GROUPS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
