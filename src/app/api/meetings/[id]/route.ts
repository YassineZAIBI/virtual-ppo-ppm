import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const meeting = await db.meeting.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!meeting) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('[MEETING_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await db.meeting.findFirst({ where: { id, userId: session.user.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { title, date, duration, participants, status, transcript, summary, actionItems, decisions, challenges } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (date !== undefined) data.date = new Date(date);
    if (duration !== undefined) data.duration = duration;
    if (participants !== undefined) data.participants = typeof participants === 'string' ? participants : JSON.stringify(participants);
    if (status !== undefined) data.status = status;
    if (transcript !== undefined) data.transcript = transcript;
    if (summary !== undefined) data.summary = summary;
    if (actionItems !== undefined) data.actionItems = typeof actionItems === 'string' ? actionItems : JSON.stringify(actionItems);
    if (decisions !== undefined) data.decisions = typeof decisions === 'string' ? decisions : JSON.stringify(decisions);
    if (challenges !== undefined) data.challenges = typeof challenges === 'string' ? challenges : JSON.stringify(challenges);

    const meeting = await db.meeting.update({ where: { id }, data });

    return NextResponse.json(meeting);
  } catch (error) {
    console.error('[MEETING_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.meeting.findFirst({ where: { id, userId: session.user.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.meeting.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[MEETING_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
