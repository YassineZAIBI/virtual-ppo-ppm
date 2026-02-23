import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { resourceType, resourceId, accessLevel, expiryHours, dataSnapshot } = await request.json();

    if (!resourceType) {
      return NextResponse.json({ error: 'resourceType is required' }, { status: 400 });
    }

    // Enforce max 24h expiry
    const hours = Math.min(Math.max(expiryHours || 24, 1), 24);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    // Generate secure token
    const token = randomBytes(32).toString('base64url');

    const shareLink = await db.shareLink.create({
      data: {
        token,
        createdBy: userId,
        resourceType,
        resourceId: resourceId || null,
        accessLevel: accessLevel || 'view_comment',
        expiresAt,
        dataSnapshot: dataSnapshot || undefined,
      },
    });

    const url = `/share/${token}`;

    return NextResponse.json({
      id: shareLink.id,
      token: shareLink.token,
      url,
      resourceType: shareLink.resourceType,
      accessLevel: shareLink.accessLevel,
      expiresAt: shareLink.expiresAt,
      isActive: shareLink.isActive,
    });
  } catch (error: any) {
    console.error('Share link creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const links = await db.shareLink.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { comments: true } } },
    });

    return NextResponse.json({
      links: links.map((link) => ({
        id: link.id,
        token: link.token,
        url: `/share/${link.token}`,
        resourceType: link.resourceType,
        resourceId: link.resourceId,
        accessLevel: link.accessLevel,
        expiresAt: link.expiresAt,
        isActive: link.isActive && new Date(link.expiresAt) > new Date(),
        viewCount: link.viewCount,
        commentCount: link._count.comments,
        createdAt: link.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Share link list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
