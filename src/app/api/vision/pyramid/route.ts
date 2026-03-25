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

    const northStar = await db.northStar.findUnique({
      where: { userId: session.user.id },
    });

    const businessGoals = await db.businessGoal.findMany({
      where: { userId: session.user.id },
      orderBy: { priority: 'asc' },
      include: {
        targetGroups: {
          include: {
            needs: {
              include: {
                products: true,
              },
            },
          },
        },
      },
    });

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { visionComplete: true },
    });

    return NextResponse.json({
      northStar: northStar ?? null,
      businessGoals,
      visionComplete: user?.visionComplete ?? false,
    });
  } catch (error) {
    console.error('[VISION_PYRAMID_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
