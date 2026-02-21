import { NextRequest, NextResponse } from 'next/server';
import { SlackService } from '@/lib/services/slack';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, channel, credentials, ...data } = body;

    const botToken = credentials?.botToken || process.env.SLACK_BOT_TOKEN || '';
    if (!botToken) throw new Error('Slack Bot Token is not configured. Set it in Settings > Integrations.');

    const slack = new SlackService(botToken);
    const targetChannel = channel || credentials?.channelId || process.env.SLACK_CHANNEL_ID || '';

    switch (action) {
      case 'message':
        const result = await slack.postMessage(targetChannel, data.text, data.blocks);
        return NextResponse.json(result);
      case 'meeting-summary':
        await slack.sendMeetingSummary(targetChannel, data.meeting);
        return NextResponse.json({ success: true });
      case 'initiative-update':
        await slack.sendInitiativeUpdate(targetChannel, data.initiative);
        return NextResponse.json({ success: true });
      case 'history':
        const messages = await slack.getChannelHistory(targetChannel, data.limit);
        return NextResponse.json({ messages });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Slack API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
