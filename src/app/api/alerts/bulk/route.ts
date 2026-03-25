import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { alertIds, action } = body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: 'alertIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (action !== 'read' && action !== 'dismiss') {
      return NextResponse.json(
        { error: 'action must be "read" or "dismiss"' },
        { status: 400 }
      );
    }

    // Verify all alerts belong to the user
    const ownedCount = await db.userAlert.count({
      where: {
        id: { in: alertIds },
        userId: session.user.id,
      },
    });

    if (ownedCount !== alertIds.length) {
      return NextResponse.json(
        { error: 'One or more alerts not found or not owned by user' },
        { status: 403 }
      );
    }

    const updateData =
      action === 'read'
        ? { isRead: true }
        : { isDismissed: true };

    const result = await db.userAlert.updateMany({
      where: {
        id: { in: alertIds },
        userId: session.user.id,
      },
      data: updateData,
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('[ALERTS_BULK]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
