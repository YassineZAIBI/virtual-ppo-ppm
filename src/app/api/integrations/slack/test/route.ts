import { NextRequest, NextResponse } from 'next/server';
import { SlackService } from '@/lib/services/slack';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const botToken = body.botToken || process.env.SLACK_BOT_TOKEN || '';
    const channelId = body.channelId || process.env.SLACK_CHANNEL_ID || '';

    if (!botToken) {
      return NextResponse.json(
        { error: 'Slack Bot Token is required. Please enter your Slack bot token (starts with xoxb-).' },
        { status: 400 }
      );
    }
    if (!channelId) {
      return NextResponse.json(
        { error: 'Slack Channel ID is required.' },
        { status: 400 }
      );
    }

    const slack = new SlackService(botToken);
    const info = await slack.getChannelInfo(channelId);
    return NextResponse.json({ success: true, channel: info.name });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
