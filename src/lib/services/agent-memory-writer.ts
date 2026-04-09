import { db } from '@/lib/db';
import type { BrainDomain } from '@/lib/types';

// Map agent types to brain domains for automatic classification
const AGENT_DOMAIN_MAP: Record<string, BrainDomain> = {
  strategy: 'vision',
  discovery: 'market',
  'market-research': 'market',
  'competitor-analysis': 'market',
  risk: 'risk',
  'risk-assessment': 'risk',
  communications: 'operations',
  'meeting-analyst': 'operations',
  expert: 'product',
  'initiative-planner': 'product',
  thinker: 'general',
  global: 'general',
};

/**
 * Fire-and-forget: upsert a summary of the agent response as an agent_learning BrainNode.
 * Call without await — errors are logged but never thrown to the caller.
 */
export function writeAgentMemory(
  userId: string,
  agentType: string,
  message: string,
  response: string
): void {
  const title = message.length > 120 ? message.slice(0, 117) + '...' : message;
  const summary = response.length > 300 ? response.slice(0, 297) + '...' : response;
  const content = response.slice(0, 2000);
  const domain = AGENT_DOMAIN_MAP[agentType] || 'general';

  db.brainNode.upsert({
    where: {
      userId_type_title: {
        userId,
        type: 'agent_learning',
        title,
      },
    },
    create: {
      userId,
      type: 'agent_learning',
      title,
      content,
      summary,
      source: 'agent',
      agentType,
      confidence: 1.0,
      domain,
      importance: 0.5,
    },
    update: {
      content,
      summary,
      domain,
      // updatedAt is auto-set by @updatedAt
    },
  }).then((node) => {
    // After successfully creating/updating the node, create relations to related nodes
    createBrainRelations(node.id, userId, agentType).catch((err) =>
      console.error('Failed to create brain relations:', err)
    );
  }).catch((err) => console.error('Failed to write agent memory:', err));
}

/**
 * Fire-and-forget: create BrainRelation edges from a newly created node
 * to existing relevant nodes. Non-fatal — node exists even if relations fail.
 */
async function createBrainRelations(
  nodeId: string,
  userId: string,
  agentType: string,
): Promise<void> {
  // Strategy 1: Link to recent nodes from the same agent type (created_by)
  const sameAgentNodes = await db.brainNode.findMany({
    where: {
      userId,
      id: { not: nodeId },
      agentType,
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
    take: 3,
  });

  for (const related of sameAgentNodes) {
    await db.brainRelation.create({
      data: {
        fromNodeId: nodeId,
        toNodeId: related.id,
        relationType: 'created_by',
        strength: 0.7,
      },
    }).catch(() => {}); // Ignore duplicate relation errors
  }

  // Strategy 2: Link to recent nodes of complementary types (related_to)
  const complementMap: Record<string, string[]> = {
    'market-research': ['initiative', 'risk'],
    'competitor-analysis': ['initiative', 'market_signal'],
    'strategy': ['initiative', 'vision', 'goal'],
    'risk-assessment': ['initiative', 'risk'],
    'initiative-planner': ['vision', 'goal', 'need'],
    'meeting-analyst': ['decision', 'initiative'],
  };
  const complementTypes = complementMap[agentType] || [];

  if (complementTypes.length > 0) {
    const complementNodes = await db.brainNode.findMany({
      where: {
        userId,
        id: { not: nodeId },
        type: { in: complementTypes },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
      take: 3,
    });

    for (const related of complementNodes) {
      await db.brainRelation.create({
        data: {
          fromNodeId: nodeId,
          toNodeId: related.id,
          relationType: 'related_to',
          strength: 0.5,
        },
      }).catch(() => {}); // Ignore duplicate relation errors
    }
  }
}
