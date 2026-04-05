import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

function parseJsonField(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
  }
  return [];
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try { const parsed = JSON.parse(value); return typeof parsed === 'object' && parsed !== null ? parsed : {}; } catch { return {}; }
  }
  return {};
}

function normalizeInitiative(init: Record<string, unknown>) {
  return {
    ...init,
    tags: parseJsonField(init.tags),
    stakeholders: parseJsonField(init.stakeholders),
    risks: parseJsonField(init.risks),
    dependencies: parseJsonField(init.dependencies),
    personaIds: parseJsonField(init.personaIds),
    discovery: parseJsonObject(init.discovery),
  };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const level = searchParams.get('level');
    const pillar = searchParams.get('pillar');

    const verticalId = searchParams.get('verticalId');

    const where: Record<string, unknown> = { userId: session.user.id };
    if (status) where.status = status;
    if (level) where.level = level;
    if (pillar) where.pillar = pillar;
    if (verticalId) where.verticalId = verticalId;

    const initiatives = await db.initiative.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(initiatives.map(i => normalizeInitiative(i as unknown as Record<string, unknown>)));
  } catch (error) {
    console.error('[INITIATIVES_GET]', error);
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
    const {
      title,
      description,
      status,
      businessValue,
      effort,
      stakeholders,
      tags,
      risks,
      dependencies,
      level,
      pillar,
      whyNeeded,
      whatIfNot,
      expectedValue,
      expectedTimeToMarket,
      personaIds,
      verticalId,
      granularity,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const initiative = await db.initiative.create({
      data: {
        userId: session.user.id,
        title,
        description: description ?? '',
        status: status ?? 'idea',
        businessValue: businessValue ?? 'medium',
        effort: effort ?? 'medium',
        stakeholders: typeof stakeholders === 'string' ? stakeholders : JSON.stringify(stakeholders ?? []),
        tags: typeof tags === 'string' ? tags : JSON.stringify(tags ?? []),
        risks: typeof risks === 'string' ? risks : JSON.stringify(risks ?? []),
        dependencies: typeof dependencies === 'string' ? dependencies : JSON.stringify(dependencies ?? []),
        level: level ?? 'idea',
        pillar: pillar ?? 'strategy',
        ...(verticalId && { verticalId }),
        ...(granularity && { granularity }),
      },
    });

    return NextResponse.json(normalizeInitiative(initiative as unknown as Record<string, unknown>), { status: 201 });
  } catch (error) {
    console.error('[INITIATIVES_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
