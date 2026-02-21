import { NextRequest, NextResponse } from 'next/server';
import { ConfluenceService } from '@/lib/services/confluence';

function createConfluenceService(credentials?: { url?: string; email?: string; apiToken?: string }) {
  const url = credentials?.url || process.env.CONFLUENCE_BASE_URL || '';
  const email = credentials?.email || process.env.CONFLUENCE_EMAIL || '';
  const apiToken = credentials?.apiToken || process.env.CONFLUENCE_API_TOKEN || '';

  if (!url) throw new Error('Confluence URL is not configured. Set it in Settings > Integrations.');
  return new ConfluenceService(url, email, apiToken);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const confluence = createConfluenceService();

    switch (action) {
      case 'spaces':
        const spaces = await confluence.getSpaces();
        return NextResponse.json({ spaces });
      case 'pages':
        const spaceKey = searchParams.get('spaceKey') || process.env.CONFLUENCE_SPACE_KEY || '';
        const pages = await confluence.getPages(spaceKey);
        return NextResponse.json({ pages });
      case 'page':
        const pageId = searchParams.get('pageId') || '';
        const page = await confluence.getPage(pageId);
        return NextResponse.json({ page });
      case 'search':
        const query = searchParams.get('q') || '';
        const results = await confluence.searchContent(query);
        return NextResponse.json({ results });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Confluence API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, credentials, ...data } = body;

    const confluence = createConfluenceService(credentials);

    switch (action) {
      case 'create-page':
        const page = await confluence.createPage(
          data.spaceKey || process.env.CONFLUENCE_SPACE_KEY || '',
          data.title,
          data.body,
          data.parentId
        );
        return NextResponse.json({ page }, { status: 201 });
      case 'meeting-notes':
        const notesPage = await confluence.createMeetingNotesPage(
          data.spaceKey || process.env.CONFLUENCE_SPACE_KEY || '',
          data.meeting
        );
        return NextResponse.json({ page: notesPage }, { status: 201 });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Confluence POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
