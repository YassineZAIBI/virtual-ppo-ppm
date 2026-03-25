import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { meetingId, chunk, timestamp } = await request.json();

    if (!meetingId || !chunk) {
      return NextResponse.json({ error: 'Missing meetingId or chunk' }, { status: 400 });
    }

    const meeting = await db.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    const currentTranscript = meeting.liveTranscript || '';
    const updatedTranscript = currentTranscript + (currentTranscript ? '\n' : '') + chunk;

    await db.meeting.update({
      where: { id: meetingId },
      data: { liveTranscript: updatedTranscript },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[TRANSCRIPT_CHUNK]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
