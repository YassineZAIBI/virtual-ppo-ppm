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
      include: { comments: { orderBy: { createdAt: 'asc' } } },
    });

    if (!shareLink || !shareLink.isActive || new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 410 });
    }

    return NextResponse.json({
      comments: shareLink.comments.map((c) => ({
        id: c.id,
        guestName: c.guestName,
        content: c.content,
        targetSection: c.targetSection,
        createdAt: c.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Share comments fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const shareLink = await db.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink || !shareLink.isActive || new Date(shareLink.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired share link' }, { status: 410 });
    }

    if (shareLink.accessLevel === 'view_only') {
      return NextResponse.json({ error: 'Comments are not allowed on this share link' }, { status: 403 });
    }

    const { guestName, content, targetSection } = await request.json();

    if (!guestName || !content) {
      return NextResponse.json({ error: 'guestName and content are required' }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 });
    }

    const comment = await db.shareComment.create({
      data: {
        shareLinkId: shareLink.id,
        guestName: guestName.substring(0, 100),
        content: content.substring(0, 2000),
        targetSection: targetSection || null,
      },
    });

    return NextResponse.json({
      id: comment.id,
      guestName: comment.guestName,
      content: comment.content,
      targetSection: comment.targetSection,
      createdAt: comment.createdAt,
    });
  } catch (error: any) {
    console.error('Share comment creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
