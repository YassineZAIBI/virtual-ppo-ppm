import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { token } = await params;

    const shareLink = await db.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    if (shareLink.createdBy !== userId) {
      return NextResponse.json({ error: 'Only the creator can revoke this link' }, { status: 403 });
    }

    await db.shareLink.update({
      where: { id: shareLink.id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Share link revoke error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
