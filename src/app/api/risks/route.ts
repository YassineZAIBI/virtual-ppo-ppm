import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

function parseJsonField(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

function normalizeRisk(risk: Record<string, unknown>) {
  return {
    ...risk,
    relatedItems: parseJsonField(risk.relatedItems),
  };
}

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

    return NextResponse.json(risks.map(r => normalizeRisk(r as unknown as Record<string, unknown>)));
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
