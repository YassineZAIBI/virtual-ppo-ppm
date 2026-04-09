import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import type { BrainDomain } from '@/lib/types';

const VALID_DOMAINS: BrainDomain[] = ['vision', 'product', 'market', 'risk', 'operations', 'general'];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { domain } = await params;

  if (!VALID_DOMAINS.includes(domain as BrainDomain)) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
  }

  const nodes = await db.brainNode.findMany({
    where: { userId, domain },
    orderBy: { importance: 'desc' },
    select: {
      id: true, title: true, content: true, type: true, domain: true,
      importance: true, source: true, summary: true, stale: true,
      agentType: true, confidence: true, metadata: true,
      createdAt: true, updatedAt: true,
      relations: {
        select: { id: true, relationType: true, toNodeId: true, strength: true },
      },
      relatedBy: {
        select: { id: true, relationType: true, fromNodeId: true, strength: true },
      },
    },
  });

  // Build edge list (deduplicated)
  const edgeSet = new Set<string>();
  const edges: Array<{ source: string; target: string; type: string; strength: number }> = [];
  for (const node of nodes) {
    for (const r of node.relations) {
      const key = `${node.id}-${r.toNodeId}-${r.relationType}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ source: node.id, target: r.toNodeId, type: r.relationType, strength: r.strength });
      }
    }
    for (const r of node.relatedBy) {
      const key = `${r.fromNodeId}-${node.id}-${r.relationType}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push({ source: r.fromNodeId, target: node.id, type: r.relationType, strength: r.strength });
      }
    }
  }

  // Strip relation arrays from nodes (edges are separate)
  const cleanNodes = nodes.map(({ relations, relatedBy, ...rest }) => rest);

  return NextResponse.json({ nodes: cleanNodes, edges, domain });
}
