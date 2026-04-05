import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrichPersona } from '@/lib/services/persona-enricher';

/**
 * POST /api/vision/target-groups/[id]/enrich
 * Generates rich persona data using AI and saves to TargetGroup.
 * Body: { llmConfig: { provider, apiKey, model, ... } }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { llmConfig } = await req.json();

    if (!llmConfig?.provider) {
      return NextResponse.json({ error: 'llmConfig with provider is required' }, { status: 400 });
    }

    const group = await db.targetGroup.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!group) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Get company context from brain graph
    const [northStarNode, companyNode] = await Promise.all([
      db.brainNode.findFirst({
        where: { userId: session.user.id, type: 'vision' },
        select: { content: true },
      }),
      db.brainNode.findFirst({
        where: { userId: session.user.id, type: 'company' },
        select: { content: true, summary: true },
      }),
    ]);

    const enriched = await enrichPersona(
      { name: group.name, role: group.role || '', description: group.description || '' },
      { northStar: northStarNode?.content || '', industry: companyNode?.summary || companyNode?.content || '' },
      llmConfig
    );

    if (Object.keys(enriched).length === 0) {
      return NextResponse.json({ error: 'AI enrichment returned no data' }, { status: 502 });
    }

    // Convert arrays to JSON strings for Prisma storage
    const updateData: Record<string, unknown> = { lastEnrichedAt: new Date() };
    for (const [key, value] of Object.entries(enriched)) {
      updateData[key] = Array.isArray(value) ? JSON.stringify(value) : value;
    }

    const updated = await db.targetGroup.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[VISION_TARGET_GROUP_ENRICH]', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
    });
    const message = error instanceof Error ? error.message : 'Enrichment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
