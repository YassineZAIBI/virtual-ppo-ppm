import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const shareLink = await db.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }

    if (!shareLink.isActive) {
      return NextResponse.json({ error: 'This share link has been revoked' }, { status: 410 });
    }

    if (new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
    }

    // Increment view count
    await db.shareLink.update({
      where: { id: shareLink.id },
      data: { viewCount: { increment: 1 } },
    });

    return NextResponse.json({
      resourceType: shareLink.resourceType,
      resourceId: shareLink.resourceId,
      accessLevel: shareLink.accessLevel,
      expiresAt: shareLink.expiresAt,
      viewCount: shareLink.viewCount + 1,
      dataSnapshot: (shareLink as any).dataSnapshot || null,
    });
  } catch (error: any) {
    console.error('Share link validation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
