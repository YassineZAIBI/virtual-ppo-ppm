import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/insights — get insights for current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'new';
  const limit = parseInt(searchParams.get('limit') || '10');
  const priority = searchParams.get('priority');

  const where: Record<string, unknown> = {
    userId: session.user.id,
    status,
  };
  if (priority) where.priority = priority;

  const [insights, total] = await Promise.all([
    db.proactiveInsight.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    }),
    db.proactiveInsight.count({ where }),
  ]);

  return NextResponse.json({ insights, total });
}
