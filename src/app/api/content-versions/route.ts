import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId are required' }, { status: 400 });
    }

    const versions = await db.contentVersion.findMany({
      where: { userId: session.user.id, entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Failed to list content versions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
