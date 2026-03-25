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

    const businessGoals = await db.businessGoal.findMany({
      where: { userId: session.user.id },
      orderBy: { priority: 'asc' },
      include: {
        _count: {
          select: { targetGroups: true },
        },
      },
    });

    return NextResponse.json(businessGoals);
  } catch (error) {
    console.error('[VISION_BUSINESS_GOALS_GET]', error);
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
    const { northStarId, title, description, metric, target, deadline, priority } = body;

    if (!northStarId || !title) {
      return NextResponse.json({ error: 'northStarId and title are required' }, { status: 400 });
    }

    // Verify the northStar belongs to the user
    const northStar = await db.northStar.findFirst({
      where: { id: northStarId, userId: session.user.id },
    });
    if (!northStar) {
      return NextResponse.json({ error: 'NorthStar not found' }, { status: 404 });
    }

    const businessGoal = await db.businessGoal.create({
      data: {
        userId: session.user.id,
        northStarId,
        title,
        description: description ?? null,
        metric: metric ?? null,
        target: target ?? null,
        deadline: deadline ? new Date(deadline) : null,
        priority: priority ?? 0,
      },
    });

    return NextResponse.json(businessGoal, { status: 201 });
  } catch (error) {
    console.error('[VISION_BUSINESS_GOALS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
