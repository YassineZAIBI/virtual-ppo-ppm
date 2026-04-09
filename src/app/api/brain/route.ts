import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  const [
    northStar, businessGoals, targetGroups,
    verticals, initiatives, alignmentScores,
    competitors, risks, insights, brainNodeCount, brainRelCount,
  ] = await Promise.all([
    db.northStar.findFirst({ where: { userId }, select: {
      id: true, statement: true, updatedAt: true,
    }}),
    db.businessGoal.findMany({ where: { userId }, select: {
      id: true, title: true, description: true, metric: true, target: true, updatedAt: true,
    }, orderBy: { createdAt: 'asc' }, take: 5 }),
    db.targetGroup.findMany({ where: { userId }, select: {
      id: true, name: true, description: true,
    }, take: 5 }),
    db.productVertical.findMany({ where: { userId }, select: {
      id: true, name: true, description: true,
    }, orderBy: { name: 'asc' } }),
    db.initiative.findMany({ where: { userId }, select: {
      id: true, title: true, description: true, status: true, businessValue: true,
      verticalId: true, updatedAt: true,
    }, orderBy: { updatedAt: 'desc' }, take: 50 }),
    db.alignmentScore.findMany({ where: { userId, entityType: 'initiative' }, select: {
      entityId: true, overallScore: true,
    }}),
    db.competitor.findMany({ where: { userId }, select: {
      id: true, name: true, website: true, description: true, updatedAt: true,
    }, take: 10 }),
    db.risk.findMany({ where: { userId, status: { not: 'resolved' } }, select: {
      id: true, title: true, description: true, severity: true, probability: true, updatedAt: true,
    }, orderBy: { severity: 'desc' }, take: 10 }),
    db.proactiveInsight.findMany({ where: { userId, status: { not: 'dismissed' } }, select: {
      id: true, title: true, summary: true, agentType: true, priority: true, createdAt: true,
    }, orderBy: { createdAt: 'desc' }, take: 10 }),
    db.brainNode.count({ where: { userId } }),
    db.brainRelation.count({ where: { fromNode: { userId } } }),
  ]);

  // Build alignment map: initiativeId -> score
  const alignmentMap: Record<string, number> = {};
  alignmentScores.forEach(a => {
    alignmentMap[a.entityId] = a.overallScore;
  });

  // Group initiatives by vertical
  const initiativesByVertical: Record<string, typeof initiatives> = {};
  const orphanInitiatives: typeof initiatives = [];
  initiatives.forEach(i => {
    if (i.verticalId) {
      if (!initiativesByVertical[i.verticalId]) initiativesByVertical[i.verticalId] = [];
      initiativesByVertical[i.verticalId].push(i);
    } else {
      orphanInitiatives.push(i);
    }
  });

  // Build verticals with nested initiatives
  const verticalsWithInitiatives = verticals.map(v => ({
    ...v,
    initiatives: (initiativesByVertical[v.id] || []).map(i => ({
      ...i, alignmentScore: alignmentMap[i.id] ?? null,
    })),
    initiativeCount: (initiativesByVertical[v.id] || []).length,
  }));

  // Portfolio alignment average
  const scores = alignmentScores.filter(a => alignmentMap[a.entityId] != null);
  const portfolioAlignment = scores.length > 0
    ? Math.round(scores.reduce((sum, a) => sum + a.overallScore, 0) / scores.length)
    : null;

  return NextResponse.json({
    northStar,
    goals: businessGoals,
    verticals: verticalsWithInitiatives,
    orphanInitiatives: orphanInitiatives.map(i => ({
      ...i, alignmentScore: alignmentMap[i.id] ?? null,
    })),
    personas: targetGroups,
    risks,
    competitors,
    insights,
    value: {
      portfolioAlignment,
      risksAtRisk: risks.filter(r => r.severity === 'critical' || r.severity === 'high').length,
    },
    stats: {
      totalNodes: brainNodeCount,
      totalRelations: brainRelCount,
      totalInitiatives: initiatives.length,
      totalRisks: risks.length,
      totalVerticals: verticals.length,
      portfolioAlignment,
    },
  });
}
