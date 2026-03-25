import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/chat/sessions
 * List all chat sessions for the authenticated user, ordered by most recent.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chatSessions = await db.chatSession.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(chatSessions);
  } catch (error) {
    console.error('[CHAT_SESSIONS_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/chat/sessions
 * Create a new chat session.
 * Body: { title?: string, pillar?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, pillar } = body as { title?: string; pillar?: string };

    const chatSession = await db.chatSession.create({
      data: {
        userId: session.user.id,
        title: title || 'New conversation',
        pillar: pillar || 'general',
      },
    });

    return NextResponse.json(chatSession, { status: 201 });
  } catch (error) {
    console.error('[CHAT_SESSIONS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
