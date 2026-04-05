import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { JiraService } from '@/lib/services/jira';

/**
 * POST /api/integrations/jira/discover
 * Scans connected Jira for projects and returns suggestions for ProductVerticals.
 * Does NOT auto-create anything — returns suggestions only.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await db.userSettingsRecord.findUnique({
      where: { userId: session.user.id },
      select: { jiraUrl: true, jiraEmail: true, jiraApiToken: true },
    });

    if (!settings?.jiraUrl || !settings?.jiraEmail || !settings?.jiraApiToken) {
      return NextResponse.json({ error: 'Jira not connected' }, { status: 400 });
    }

    // jiraApiToken is auto-decrypted by Prisma middleware
    const jira = new JiraService(settings.jiraUrl, settings.jiraEmail, settings.jiraApiToken);
    const projects = await jira.getProjects();

    const suggestions = projects.slice(0, 10).map((p) => ({
      jiraProjectKey: p.key,
      jiraProjectName: p.name,
      suggestedVerticalName: p.name,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[JIRA_DISCOVER]', error);
    return NextResponse.json({ error: 'Failed to discover Jira projects' }, { status: 500 });
  }
}
