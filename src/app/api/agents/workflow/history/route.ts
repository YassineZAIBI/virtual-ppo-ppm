import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/agents/workflow/history — get workflow history
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50);
  const initiativeId = searchParams.get('initiativeId');

  const where: Record<string, unknown> = { userId: session.user.id };
  if (initiativeId) where.initiativeId = initiativeId;

  // Get unique workflow IDs ordered by most recent
  const recentMessages = await db.agentMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: { workflowId: true, workflowType: true, createdAt: true, status: true },
    take: limit * 6,
  });

  // Deduplicate workflow IDs preserving order
  const seen = new Set<string>();
  const workflowIds: string[] = [];
  for (const msg of recentMessages) {
    if (msg.workflowId && !seen.has(msg.workflowId)) {
      seen.add(msg.workflowId);
      workflowIds.push(msg.workflowId);
    }
    if (workflowIds.length >= limit) break;
  }

  // Load all steps for these workflows
  const allMessages = await db.agentMessage.findMany({
    where: { workflowId: { in: workflowIds } },
    orderBy: [{ workflowId: 'asc' }, { stepIndex: 'asc' }],
  });

  // Group by workflowId
  const grouped: Record<string, typeof allMessages> = {};
  for (const msg of allMessages) {
    if (!grouped[msg.workflowId]) grouped[msg.workflowId] = [];
    grouped[msg.workflowId].push(msg);
  }

  const workflows = workflowIds.map((id) => ({
    workflowId: id,
    steps: grouped[id] ?? [],
    workflowType: grouped[id]?.[0]?.workflowType ?? '',
    startedAt: grouped[id]?.[0]?.createdAt ?? null,
    completedAt: grouped[id]?.at(-1)?.completedAt ?? null,
    status: grouped[id]?.every((m) => m.status === 'completed')
      ? 'completed'
      : grouped[id]?.some((m) => m.status === 'failed')
      ? 'failed'
      : 'running',
  }));

  return NextResponse.json({ workflows, total: workflows.length });
}
