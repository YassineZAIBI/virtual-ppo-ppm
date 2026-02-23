import { NextRequest, NextResponse } from 'next/server';
import { JiraService } from '@/lib/services/jira';

function createJiraService(credentials?: { url?: string; email?: string; apiToken?: string }) {
  const url = credentials?.url || process.env.JIRA_BASE_URL || '';
  const email = credentials?.email || process.env.JIRA_EMAIL || '';
  const apiToken = credentials?.apiToken || process.env.JIRA_API_TOKEN || '';

  if (!url) throw new Error('Jira URL is not configured. Set it in Settings > Integrations.');
  return new JiraService(url, email, apiToken);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const projectKey = searchParams.get('projectKey') || process.env.JIRA_PROJECT_KEY || '';

    // Read credentials from query params (sent by Settings UI) or fall back to env vars
    const credentials = {
      url: searchParams.get('url') || undefined,
      email: searchParams.get('email') || undefined,
      apiToken: searchParams.get('apiToken') || undefined,
    };

    const jira = createJiraService(credentials);

    switch (action) {
      case 'projects':
        const projects = await jira.getProjects();
        return NextResponse.json({ projects });
      case 'issues':
        const jql = searchParams.get('jql') || undefined;
        const issues = await jira.getIssues(projectKey, jql);
        return NextResponse.json({ issues });
      case 'issue':
        const issueKey = searchParams.get('issueKey') || '';
        const issue = await jira.getIssue(issueKey);
        return NextResponse.json({ issue });
      default:
        return NextResponse.json({ error: 'Invalid action. Use: projects, issues, issue' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Jira API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, projectKey, credentials, ...data } = body;

    const jira = createJiraService(credentials);

    switch (action) {
      case 'create':
        const issue = await jira.createIssue(projectKey || process.env.JIRA_PROJECT_KEY || '', {
          summary: data.summary,
          description: data.description || '',
          issueType: data.issueType || 'Story',
          labels: data.labels || [],
          storyPoints: data.storyPoints,
        });
        return NextResponse.json({ issue }, { status: 201 });
      case 'update':
        await jira.updateIssue(data.issueKey, data.updates);
        return NextResponse.json({ success: true });
      case 'comment':
        await jira.addComment(data.issueKey, data.body);
        return NextResponse.json({ success: true });
      case 'transition':
        await jira.transitionIssue(data.issueKey, data.transitionId);
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Jira POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
