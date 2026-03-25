import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const risks = await db.risk.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(risks);
  } catch (error) {
    console.error('[RISKS_GET]', error);
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
    const { title, description, severity, probability, impact, status, relatedItems, mitigationPlan } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const risk = await db.risk.create({
      data: {
        userId: session.user.id,
        title,
        description: description ?? '',
        severity: severity ?? 'medium',
        probability: probability ?? 'medium',
        impact: impact ?? 'medium',
        status: status ?? 'identified',
        relatedItems: typeof relatedItems === 'string' ? relatedItems : JSON.stringify(relatedItems ?? []),
        mitigationPlan: mitigationPlan ?? null,
      },
    });

    return NextResponse.json(risk, { status: 201 });
  } catch (error) {
    console.error('[RISKS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
