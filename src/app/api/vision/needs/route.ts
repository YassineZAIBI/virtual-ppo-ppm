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
    const targetGroupId = searchParams.get('targetGroupId');

    const needs = await db.need.findMany({
      where: {
        userId: session.user.id,
        ...(targetGroupId && { targetGroupId }),
      },
    });

    return NextResponse.json(needs);
  } catch (error) {
    console.error('[VISION_NEEDS_GET]', error);
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
    const { targetGroupId, title, description, severity, frequency } = body;

    if (!targetGroupId || !title) {
      return NextResponse.json({ error: 'targetGroupId and title are required' }, { status: 400 });
    }

    // Verify the targetGroup belongs to the user
    const targetGroup = await db.targetGroup.findFirst({
      where: { id: targetGroupId, userId: session.user.id },
    });
    if (!targetGroup) {
      return NextResponse.json({ error: 'TargetGroup not found' }, { status: 404 });
    }

    const need = await db.need.create({
      data: {
        userId: session.user.id,
        targetGroupId,
        title,
        description: description ?? null,
        severity: severity ?? 5,
        frequency: frequency ?? null,
      },
    });

    // Fire-and-forget: sync to brain graph
    try {
      db.brainNode.upsert({
        where: { userId_type_title: { userId: session.user.id, type: 'need', title } },
        create: { userId: session.user.id, type: 'need', title, content: description || title, summary: severity ? `Severity: ${severity}/10` : '', source: 'onboarding', confidence: 1.0 },
        update: { content: description || title, summary: severity ? `Severity: ${severity}/10` : '' },
      }).catch((err: unknown) => console.error('BrainNode upsert failed (need):', err));
    } catch (err) {
      console.error('BrainNode upsert error (need):', err);
    }

    return NextResponse.json(need, { status: 201 });
  } catch (error) {
    console.error('[VISION_NEEDS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
