import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const risk = await db.risk.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!risk) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(risk);
  } catch (error) {
    console.error('[RISK_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.risk.findFirst({ where: { id, userId: session.user.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { title, description, severity, probability, impact, status, relatedItems, mitigationPlan } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (severity !== undefined) data.severity = severity;
    if (probability !== undefined) data.probability = probability;
    if (impact !== undefined) data.impact = impact;
    if (status !== undefined) data.status = status;
    if (relatedItems !== undefined) data.relatedItems = typeof relatedItems === 'string' ? relatedItems : JSON.stringify(relatedItems);
    if (mitigationPlan !== undefined) data.mitigationPlan = mitigationPlan;

    const risk = await db.risk.update({ where: { id }, data });

    return NextResponse.json(risk);
  } catch (error) {
    console.error('[RISK_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.risk.findFirst({ where: { id, userId: session.user.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.risk.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[RISK_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
