import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/chat/sessions/[id]
 * Retrieve a single chat session with the last 50 messages.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const chatSession = await db.chatSession.findFirst({
      where: { id, userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json(chatSession);
  } catch (error) {
    console.error('[CHAT_SESSION_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/chat/sessions/[id]
 * Update session title and/or pillar.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, pillar } = body as { title?: string; pillar?: string };

    // Verify ownership
    const existing = await db.chatSession.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updated = await db.chatSession.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(pillar !== undefined && { pillar }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[CHAT_SESSION_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/sessions/[id]
 * Delete a chat session and cascade-delete all its messages.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.chatSession.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Delete messages first, then the session
    await db.chatMessage.deleteMany({
      where: { chatSessionId: id },
    });

    await db.chatSession.delete({
      where: { id },
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[CHAT_SESSION_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
