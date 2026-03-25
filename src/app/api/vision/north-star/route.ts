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

    return NextResponse.json(northStar);
  } catch (error) {
    console.error('[VISION_NORTH_STAR_GET]', error);
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
    const { statement, context, confidence } = body;

    if (!statement) {
      return NextResponse.json({ error: 'Statement is required' }, { status: 400 });
    }

    const northStar = await db.northStar.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        statement,
        context: context ?? null,
        confidence: confidence ?? 0,
      },
      update: {
        statement,
        ...(context !== undefined && { context }),
        ...(confidence !== undefined && { confidence }),
        version: { increment: 1 },
      },
    });

    // Set visionComplete on user if northStar exists
    await db.user.update({
      where: { id: session.user.id },
      data: { visionComplete: true },
    });

    return NextResponse.json(northStar);
  } catch (error) {
    console.error('[VISION_NORTH_STAR_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
