import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTeamsAccessToken, joinTeamsMeeting } from '@/lib/services/teams-bot';

function detectPlatform(url: string): 'zoom' | 'teams' | null {
  if (url.includes('zoom.us')) return 'zoom';
  if (url.includes('teams.microsoft.com') || url.includes('teams.live.com')) return 'teams';
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { meetingUrl, credentials } = await request.json();
    if (!meetingUrl) {
      return NextResponse.json({ error: 'Meeting URL is required' }, { status: 400 });
    }

    const platform = detectPlatform(meetingUrl);
    if (!platform) {
      return NextResponse.json({ error: 'Unsupported platform. Use a Zoom or Teams meeting link.' }, { status: 400 });
    }

    // Create meeting record
    const meeting = await db.meeting.create({
      data: {
        userId: session.user.id,
        title: 'Live Meeting',
        status: 'recording',
        platform,
        meetingUrl,
        date: new Date(),
      },
    });

    let botSessionId: string | undefined;

    if (platform === 'zoom') {
      const botServiceUrl = process.env.MEETING_BOT_SERVICE_URL || 'http://meeting-bot:8300';
      try {
        const res = await fetch(`${botServiceUrl}/bot/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingUrl,
            meetingId: meeting.id,
            callbackUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/meetings/bot/transcript-chunk`,
            credentials: {
              accountId: credentials?.zoom?.accountId,
              clientId: credentials?.zoom?.clientId,
              clientSecret: credentials?.zoom?.clientSecret,
            },
          }),
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Meeting bot service error: ${err}`);
        }
        const data = await res.json();
        botSessionId = data.sessionId;
      } catch (err: any) {
        // Update meeting to reflect failure
        await db.meeting.update({ where: { id: meeting.id }, data: { status: 'scheduled' } });
        return NextResponse.json({ error: `Failed to join Zoom meeting: ${err.message}` }, { status: 500 });
      }
    } else if (platform === 'teams') {
      try {
        const accessToken = await getTeamsAccessToken({
          clientId: process.env.AZURE_AD_CLIENT_ID!,
          tenantId: process.env.AZURE_AD_TENANT_ID!,
          clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
        });
        const callId = await joinTeamsMeeting(accessToken, meetingUrl);
        botSessionId = callId;
      } catch (err: any) {
        await db.meeting.update({ where: { id: meeting.id }, data: { status: 'scheduled' } });
        return NextResponse.json({ error: `Failed to join Teams meeting: ${err.message}` }, { status: 500 });
      }
    }

    if (botSessionId) {
      await db.meeting.update({ where: { id: meeting.id }, data: { botSessionId } });
    }

    return NextResponse.json({
      meetingId: meeting.id,
      botSessionId,
      platform,
      status: 'recording',
    });
  } catch (error: any) {
    console.error('[BOT_JOIN]', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
