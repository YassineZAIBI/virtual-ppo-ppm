import { NextRequest, NextResponse } from 'next/server';
import { ConfluenceService } from '@/lib/services/confluence';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = body.url || process.env.CONFLUENCE_BASE_URL || '';
    const email = body.email || process.env.CONFLUENCE_EMAIL || '';
    const apiToken = body.apiToken || process.env.CONFLUENCE_API_TOKEN || '';

    if (!url) {
      return NextResponse.json(
        { error: 'Confluence URL is required. Please enter your Confluence instance URL (e.g., https://your-domain.atlassian.net).' },
        { status: 400 }
      );
    }
    if (!email || !apiToken) {
      return NextResponse.json(
        { error: 'Confluence email and API token are required.' },
        { status: 400 }
      );
    }

    const confluence = new ConfluenceService(url, email, apiToken);
    const spaces = await confluence.getSpaces();
    return NextResponse.json({ success: true, spaceCount: spaces.length, spaces: spaces.slice(0, 5) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
