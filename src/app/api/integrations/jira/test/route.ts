import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { JiraService } from '@/lib/services/jira';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const url = body.url || process.env.JIRA_BASE_URL || '';
    const email = body.email || process.env.JIRA_EMAIL || '';
    const apiToken = body.apiToken || process.env.JIRA_API_TOKEN || '';

    if (!url) {
      return NextResponse.json(
        { error: 'Jira URL is required. Please enter your Jira instance URL (e.g., https://your-domain.atlassian.net).' },
        { status: 400 }
      );
    }
    if (!email || !apiToken) {
      return NextResponse.json(
        { error: 'Jira email and API token are required.' },
        { status: 400 }
      );
    }

    const jira = new JiraService(url, email, apiToken);

    // Verify authentication first — getProjects can return 200 with 0 results even with bad creds
    const user = await jira.verifyAuth();

    const projects = await jira.getProjects();
    return NextResponse.json({
      success: true,
      user: user.displayName,
      projectCount: projects.length,
      projects: projects.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
