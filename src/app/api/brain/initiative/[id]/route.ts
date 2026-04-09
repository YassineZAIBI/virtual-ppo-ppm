import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseJSON } from '@/lib/utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const initiative = await db.initiative.findFirst({
    where: { id, userId },
    include: {
      vertical: { select: { id: true, name: true } },
    },
  });

  if (!initiative) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [alignmentScore, risks, brainNodes, northStar, personas] = await Promise.all([
    db.alignmentScore.findFirst({
      where: { userId, entityType: 'initiative', entityId: id },
      orderBy: { version: 'desc' },
      select: { overallScore: true, reasoning: true, northStarRelevance: true,
        businessGoalCoverage: true, targetGroupImpact: true, needFulfillment: true },
    }),
    db.risk.findMany({
      where: { userId, status: { not: 'resolved' } },
      select: { id: true, title: true, severity: true, relatedItems: true },
    }),
    db.brainNode.findMany({
      where: { userId, OR: [
        { title: { contains: initiative.title.slice(0, 30) } },
        { sourceId: id },
      ]},
      select: { id: true, title: true, type: true, domain: true, createdAt: true, summary: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    db.northStar.findFirst({ where: { userId }, select: { statement: true } }),
    db.targetGroup.findMany({
      where: { userId },
      select: { id: true, name: true },
      take: 5,
    }),
  ]);

  // Find risks linked to this initiative
  const linkedRisks = risks.filter(r => {
    try {
      const items: string[] = JSON.parse(r.relatedItems || '[]');
      return items.includes(id);
    } catch { return false; }
  }).map(({ relatedItems, ...r }) => r);

  // Parse persona IDs from initiative
  const personaIds: string[] = parseJSON(initiative.personaIds, []);
  const linkedPersonas = personas.filter(p => personaIds.includes(p.id));

  // Build connections array
  const connections: Array<{
    type: string; label: string; value: string; description: string;
    targetSection: string; targetIndex: number;
  }> = [];

  if (northStar?.statement) {
    connections.push({
      type: 'vision', label: 'North Star', value: northStar.statement.slice(0, 60),
      description: 'Aligned to company vision',
      targetSection: 'vision', targetIndex: 0,
    });
  }
  if (initiative.vertical) {
    connections.push({
      type: 'vertical', label: 'Vertical', value: initiative.vertical.name,
      description: `Part of ${initiative.vertical.name}`,
      targetSection: `v-${initiative.vertical.id}`, targetIndex: 0,
    });
  }
  linkedRisks.forEach((r, i) => {
    connections.push({
      type: 'risk', label: 'Risk', value: r.title,
      description: `${r.severity} severity risk`,
      targetSection: 'risks', targetIndex: i,
    });
  });
  linkedPersonas.forEach((p, i) => {
    connections.push({
      type: 'persona', label: 'Persona', value: p.name,
      description: `Serves ${p.name}`,
      targetSection: 'personas', targetIndex: i,
    });
  });

  return NextResponse.json({
    initiative: {
      id: initiative.id,
      title: initiative.title,
      description: initiative.description,
      status: initiative.status,
      businessValue: initiative.businessValue,
      effort: initiative.effort,
      verticalId: initiative.verticalId,
      vertical: initiative.vertical,
      updatedAt: initiative.updatedAt,
      createdAt: initiative.createdAt,
    },
    alignment: alignmentScore,
    risks: linkedRisks,
    connections,
    timeline: brainNodes,
  });
}
