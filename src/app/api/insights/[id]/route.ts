import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// PATCH /api/insights/[id] — update status (read, dismissed, actioned)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!['new', 'read', 'dismissed', 'actioned'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const insight = await db.proactiveInsight.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!insight) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = await db.proactiveInsight.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json(updated);
}
