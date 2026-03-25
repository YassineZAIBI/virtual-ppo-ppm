import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // For Zoom, optionally proxy to the bot service for more detailed status
    let botStatus: any = null;
    if (meeting.platform === 'zoom' && meeting.botSessionId) {
      const botServiceUrl = process.env.MEETING_BOT_SERVICE_URL || 'http://meeting-bot:8300';
      try {
        const res = await fetch(`${botServiceUrl}/bot/status/${meeting.botSessionId}`);
        if (res.ok) botStatus = await res.json();
      } catch {
        // Bot service might not be available
      }
    }

    const transcriptPreview = meeting.liveTranscript
      ? meeting.liveTranscript.slice(-500)
      : null;

    return NextResponse.json({
      meetingId: meeting.id,
      status: meeting.status,
      platform: meeting.platform,
      botSessionId: meeting.botSessionId,
      transcriptPreview,
      transcriptLength: meeting.liveTranscript?.length || 0,
      botStatus,
      startedAt: meeting.date,
    });
  } catch (error: any) {
    console.error('[BOT_STATUS]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
