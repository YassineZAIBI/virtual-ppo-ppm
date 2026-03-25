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

    const count = await db.userAlert.count({
      where: {
        userId: session.user.id,
        isRead: false,
        isDismissed: false,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Failed to get unread alert count:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
