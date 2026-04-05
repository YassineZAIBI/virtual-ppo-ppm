import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/competitors/alerts?competitorId=&status=new
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const competitorId = searchParams.get('competitorId');
  const status = searchParams.get('status');

  const alerts = await db.competitorAlert.findMany({
    where: {
      userId: session.user.id,
      ...(competitorId ? { competitorId } : {}),
      ...(status ? { status } : {}),
      dismissed: false,
    },
    orderBy: [
      { significance: 'desc' },
      { createdAt: 'desc' },
    ],
    take: 50,
    include: {
      competitor: { select: { name: true, website: true } },
    },
  });

  return NextResponse.json({ alerts });
}

/**
 * PATCH /api/competitors/alerts — bulk update status
 * Body: { ids: string[], status: "read" | "dismissed" | "actioned" }
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ids, status } = await req.json();

  if (!Array.isArray(ids) || !status) {
    return NextResponse.json({ error: 'ids and status required' }, { status: 400 });
  }

  await db.competitorAlert.updateMany({
    where: { id: { in: ids }, userId: session.user.id },
    data: { status, ...(status === 'dismissed' ? { dismissed: true } : {}) },
  });

  return NextResponse.json({ success: true });
}
