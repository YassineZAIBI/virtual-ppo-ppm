import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { JiraService } from '@/lib/services/jira';
import { ConfluenceService } from '@/lib/services/confluence';
import { SlackService } from '@/lib/services/slack';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, credentials } = await request.json();

    switch (type) {
      case 'jira': {
        if (!credentials.url || !credentials.email || !credentials.apiToken) {
          return NextResponse.json({ success: false, details: 'URL, email, and API token are required' }, { status: 400 });
        }
        const jira = new JiraService(credentials.url, credentials.email, credentials.apiToken);
        const projects = await jira.getProjects();
        return NextResponse.json({
          success: true,
          details: `Connected! Found ${projects.length} project${projects.length !== 1 ? 's' : ''}.`,
          preview: { projectCount: projects.length, projects: projects.slice(0, 5).map(p => ({ key: p.key, name: p.name })) },
        });
      }

      case 'confluence': {
        if (!credentials.url || !credentials.email || !credentials.apiToken) {
          return NextResponse.json({ success: false, details: 'URL, email, and API token are required' }, { status: 400 });
        }
        const confluence = new ConfluenceService(credentials.url, credentials.email, credentials.apiToken);
        const spaces = await confluence.getSpaces();
        return NextResponse.json({
          success: true,
          details: `Connected! Found ${spaces.length} space${spaces.length !== 1 ? 's' : ''}.`,
          preview: { spaceCount: spaces.length, spaces: spaces.slice(0, 5) },
        });
      }

      case 'slack': {
        if (!credentials.botToken || !credentials.channelId) {
          return NextResponse.json({ success: false, details: 'Bot token and channel ID are required' }, { status: 400 });
        }
        const slack = new SlackService(credentials.botToken);
        const info = await slack.getChannelInfo(credentials.channelId);
        return NextResponse.json({
          success: true,
          details: `Connected to #${info.name} (${info.memberCount} members).`,
          preview: { channelName: info.name, memberCount: info.memberCount, topic: info.topic },
        });
      }

      default:
        return NextResponse.json({ success: false, details: 'Invalid integration type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Onboarding test connection error:', error);
    return NextResponse.json({
      success: false,
      details: error.message || 'Connection failed',
    }, { status: 200 }); // Return 200 so client can show the error message
  }
}
