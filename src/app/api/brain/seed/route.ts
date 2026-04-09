import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import type { BrainDomain } from '@/lib/types';

/**
 * POST /api/brain/seed — Idempotent seed endpoint.
 * Creates BrainNodes from existing data (Vision, Competitors, Risks, Initiatives, Insights).
 * Deduplicates by (userId, type, title) unique constraint.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  let created = 0;
  let skipped = 0;
  let relationsCreated = 0;

  // Helper: upsert a brain node, return its id
  async function upsertNode(
    type: string,
    title: string,
    content: string,
    domain: BrainDomain,
    source: string,
    sourceId: string = '',
    importance: number = 0.5
  ): Promise<string | null> {
    try {
      const node = await db.brainNode.upsert({
        where: { userId_type_title: { userId, type, title } },
        create: { userId, type, title, content, summary: content.slice(0, 120), source, sourceId, domain, importance },
        update: { content, domain, importance },
      });
      created++;
      return node.id;
    } catch {
      skipped++;
      return null;
    }
  }

  // Helper: create relation, ignore duplicates
  async function createRelation(fromId: string, toId: string, relationType: string, strength: number = 0.5) {
    try {
      await db.brainRelation.create({
        data: { fromNodeId: fromId, toNodeId: toId, relationType, strength },
      });
      relationsCreated++;
    } catch {
      // Duplicate — ignore
    }
  }

  // 1. Vision: NorthStar
  const northStar = await db.northStar.findFirst({ where: { userId } });
  let northStarNodeId: string | null = null;
  if (northStar) {
    northStarNodeId = await upsertNode(
      'vision', 'North Star: ' + (northStar.statement || 'Company Vision'),
      northStar.statement || '', 'vision', 'onboarding', northStar.id, 0.9
    );
  }

  // 2. Vision: BusinessGoals
  const goals = await db.businessGoal.findMany({ where: { userId } });
  const goalNodeIds: Record<string, string> = {};
  for (const g of goals) {
    const id = await upsertNode('goal', g.title, g.description || g.title, 'vision', 'onboarding', g.id, 0.8);
    if (id) goalNodeIds[g.id] = id;
    // Link goal → north star
    if (id && northStarNodeId) {
      await createRelation(id, northStarNodeId, 'supports', 0.8);
    }
  }

  // 3. Vision: TargetGroups
  const groups = await db.targetGroup.findMany({ where: { userId } });
  for (const g of groups) {
    await upsertNode('persona', g.name, g.description || g.name, 'vision', 'onboarding', g.id, 0.7);
  }

  // 4. Competitors → market domain
  const competitors = await db.competitor.findMany({ where: { userId } });
  const competitorNodeIds: Record<string, string> = {};
  for (const c of competitors) {
    const id = await upsertNode(
      'market_signal', 'Competitor: ' + c.name,
      `${c.name}${c.website ? ' (' + c.website + ')' : ''}. ${c.description || ''}`.trim(),
      'market', 'manual', c.id, 0.6
    );
    if (id) competitorNodeIds[c.id] = id;
  }

  // 5. Risks → risk domain
  const risks = await db.risk.findMany({ where: { userId } });
  const riskNodeIds: Record<string, string> = {};
  for (const r of risks) {
    const importance = r.severity === 'critical' ? 0.95 : r.severity === 'high' ? 0.8 : r.severity === 'medium' ? 0.6 : 0.4;
    const id = await upsertNode(
      'risk', r.title, r.description || r.title, 'risk', 'manual', r.id, importance
    );
    if (id) riskNodeIds[r.id] = id;
  }

  // 6. Initiatives → product domain
  const initiatives = await db.initiative.findMany({ where: { userId } });
  const initNodeIds: Record<string, string> = {};
  for (const i of initiatives) {
    const importance = i.businessValue === 'high' ? 0.85 : i.businessValue === 'medium' ? 0.6 : 0.4;
    const id = await upsertNode(
      'initiative', i.title, i.description || i.title, 'product', 'manual', i.id, importance
    );
    if (id) initNodeIds[i.id] = id;
  }

  // 7. Create cross-domain relations

  // Risk ↔ Initiative: link risks to initiatives via relatedItems field (JSON string of initiative IDs)
  for (const r of risks) {
    const relatedItems: string[] = (() => {
      try { return JSON.parse(r.relatedItems || '[]'); } catch { return []; }
    })();
    for (const initId of relatedItems) {
      if (riskNodeIds[r.id] && initNodeIds[initId]) {
        await createRelation(riskNodeIds[r.id], initNodeIds[initId], 'related_to', 0.7);
      }
    }
  }

  // Initiative → Goal (link each to first goal as approximation)
  const firstGoalId = Object.values(goalNodeIds)[0];
  if (firstGoalId) {
    for (const nodeId of Object.values(initNodeIds)) {
      await createRelation(nodeId, firstGoalId, 'supports', 0.5);
    }
  }

  // 8. ProactiveInsights → analysis nodes
  const insights = await db.proactiveInsight.findMany({
    where: { userId },
    take: 50,
    orderBy: { createdAt: 'desc' },
  });
  const agentDomainMap: Record<string, BrainDomain> = {
    strategy: 'vision',
    discovery: 'market',
    risk: 'risk',
    communications: 'operations',
    expert: 'product',
    competitor: 'market',
    market: 'market',
  };
  for (const ins of insights) {
    const domain = agentDomainMap[ins.agentType] || 'general';
    const importance = ins.priority === 'high' ? 0.8 : ins.priority === 'medium' ? 0.6 : 0.4;
    await upsertNode(
      'agent_learning', ins.title, ins.content, domain, 'agent', ins.id, importance
    );
  }

  return NextResponse.json({
    created,
    skipped,
    relationsCreated,
    message: `Seeded ${created} nodes, ${relationsCreated} relations (${skipped} skipped/duplicates)`,
  }, { status: 201 });
}
