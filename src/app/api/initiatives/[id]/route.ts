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

const VALID_STATUSES = ['idea', 'discovery', 'validation', 'definition', 'approved'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const initiative = await db.initiative.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!initiative) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(normalizeInitiative(initiative as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('[INITIATIVE_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.initiative.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Validate status if being changed
    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await db.initiative.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.businessValue !== undefined && { businessValue: body.businessValue }),
        ...(body.effort !== undefined && { effort: body.effort }),
        ...(body.stakeholders !== undefined && {
          stakeholders: typeof body.stakeholders === 'string'
            ? body.stakeholders
            : JSON.stringify(body.stakeholders),
        }),
        ...(body.tags !== undefined && {
          tags: typeof body.tags === 'string' ? body.tags : JSON.stringify(body.tags),
        }),
        ...(body.risks !== undefined && {
          risks: typeof body.risks === 'string' ? body.risks : JSON.stringify(body.risks),
        }),
        ...(body.dependencies !== undefined && {
          dependencies: typeof body.dependencies === 'string'
            ? body.dependencies
            : JSON.stringify(body.dependencies),
        }),
        ...(body.level !== undefined && { level: body.level }),
        ...(body.pillar !== undefined && { pillar: body.pillar }),
        ...(body.alignmentScore !== undefined && { alignmentScore: body.alignmentScore }),
        ...(body.businessImpactId !== undefined && { businessImpactId: body.businessImpactId }),
        ...(body.competitiveRank !== undefined && { competitiveRank: body.competitiveRank }),
        ...(body.jiraKey !== undefined && { jiraKey: body.jiraKey }),
        ...(body.discovery !== undefined && {
          discovery: typeof body.discovery === 'string' ? body.discovery : JSON.stringify(body.discovery),
        }),
        ...(body.verticalId !== undefined && { verticalId: body.verticalId || null }),
        ...(body.granularity !== undefined && { granularity: body.granularity }),
        ...(body.whyNeeded !== undefined && { whyNeeded: body.whyNeeded }),
        ...(body.whatIfNot !== undefined && { whatIfNot: body.whatIfNot }),
        ...(body.expectedValue !== undefined && { expectedValue: body.expectedValue }),
        ...(body.expectedTimeToMarket !== undefined && { expectedTimeToMarket: body.expectedTimeToMarket }),
        ...(body.personaIds !== undefined && {
          personaIds: typeof body.personaIds === 'string' ? body.personaIds : JSON.stringify(body.personaIds),
        }),
      },
    });

    return NextResponse.json(normalizeInitiative(updated as unknown as Record<string, unknown>));
  } catch (error) {
    console.error('[INITIATIVE_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.initiative.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Delete related AlignmentScore and BusinessImpact records for this entity
    await db.alignmentScore.deleteMany({
      where: { entityType: 'initiative', entityId: id, userId: session.user.id },
    });
    await db.businessImpact.deleteMany({
      where: { entityType: 'initiative', entityId: id, userId: session.user.id },
    });

    await db.initiative.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[INITIATIVE_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
