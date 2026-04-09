import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseJSON } from '@/lib/utils';
import type { BrainDomain } from '@/lib/types';

const VALID_DOMAINS: BrainDomain[] = ['vision', 'product', 'market', 'risk', 'operations', 'general'];

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

  const node = await db.brainNode.findUnique({
    where: { id, userId },
    include: {
      relations: {
        include: { toNode: { select: { id: true, title: true, type: true, domain: true } } },
      },
      relatedBy: {
        include: { fromNode: { select: { id: true, title: true, type: true, domain: true } } },
      },
    },
  });

  if (!node) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const relatedNodes = [
    ...node.relations.map(r => ({
      ...r.toNode,
      relationType: r.relationType,
      direction: 'outgoing' as const,
    })),
    ...node.relatedBy.map(r => ({
      ...r.fromNode,
      relationType: r.relationType,
      direction: 'incoming' as const,
    })),
  ];

  return NextResponse.json({
    id: node.id,
    type: node.type,
    title: node.title,
    content: node.content,
    summary: node.summary,
    source: node.source,
    sourceUrl: node.sourceUrl,
    domain: node.domain,
    importance: node.importance,
    stale: node.stale,
    agentType: node.agentType,
    confidence: node.confidence,
    metadata: parseJSON(node.metadata, {}),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    relatedNodes,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.importance === 'number' && body.importance >= 0 && body.importance <= 1) {
    updates.importance = body.importance;
  }
  if (typeof body.stale === 'boolean') {
    updates.stale = body.stale;
  }
  if (typeof body.domain === 'string' && VALID_DOMAINS.includes(body.domain as BrainDomain)) {
    updates.domain = body.domain;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const updated = await db.brainNode.updateMany({
    where: { id, userId },
    data: updates,
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
