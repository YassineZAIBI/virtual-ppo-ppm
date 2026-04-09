import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

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

  const vertical = await db.productVertical.findFirst({
    where: { id, userId },
    select: { id: true, name: true, description: true, strategy: true, color: true, status: true },
  });

  if (!vertical) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [initiatives, alignmentScores, risks] = await Promise.all([
    db.initiative.findMany({
      where: { userId, verticalId: id },
      select: {
        id: true, title: true, description: true, status: true, businessValue: true,
        effort: true, verticalId: true, updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    }),
    db.alignmentScore.findMany({
      where: { userId, entityType: 'initiative' },
      select: { entityId: true, overallScore: true },
    }),
    db.risk.findMany({
      where: { userId, status: { not: 'resolved' } },
      select: { id: true, title: true, severity: true, relatedItems: true },
    }),
  ]);

  const alignmentMap: Record<string, number> = {};
  alignmentScores.forEach(a => { alignmentMap[a.entityId] = a.overallScore; });

  // Find risks linked to this vertical's initiatives
  const initiativeIds = new Set(initiatives.map(i => i.id));
  const linkedRisks = risks.filter(r => {
    try {
      const items: string[] = JSON.parse(r.relatedItems || '[]');
      return items.some(itemId => initiativeIds.has(itemId));
    } catch { return false; }
  });

  return NextResponse.json({
    vertical,
    initiatives: initiatives.map(i => ({
      ...i,
      alignmentScore: alignmentMap[i.id] ?? null,
    })),
    risks: linkedRisks.map(({ relatedItems, ...r }) => r),
    stats: {
      initiativeCount: initiatives.length,
      avgAlignment: initiatives.length > 0
        ? Math.round(initiatives.reduce((sum, i) => sum + (alignmentMap[i.id] || 0), 0) / initiatives.length)
        : null,
      riskCount: linkedRisks.length,
    },
  });
}
