import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8100';
const MAX_URLS = 10;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Check URL count limit
    const existingUrls = await db.knowledgeDocument.count({
      where: { userId, sourceType: 'url' },
    });

    if (existingUrls >= MAX_URLS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_URLS} URLs allowed. Delete a URL first.` },
        { status: 400 }
      );
    }

    // Forward to Python service for scraping
    const pyResp = await fetch(`${AGENT_SERVICE_URL}/knowledge/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!pyResp.ok) {
      const err = await pyResp.json().catch(() => ({ detail: 'Scrape failed' }));
      return NextResponse.json({ error: err.detail || 'Scrape failed' }, { status: 400 });
    }

    const result = await pyResp.json();

    // Store in database
    const doc = await db.knowledgeDocument.create({
      data: {
        userId,
        sourceType: 'url',
        sourceName: result.source_name,
        sourceUrl: result.source_url,
        content: result.content,
        contentChunks: JSON.stringify(result.content_chunks),
        metadata: JSON.stringify({
          fetchedAt: new Date().toISOString(),
          domain: result.domain,
        }),
      },
    });

    return NextResponse.json({
      id: doc.id,
      sourceName: doc.sourceName,
      sourceUrl: doc.sourceUrl,
      chunkCount: result.chunk_count,
      charCount: result.char_count,
    });
  } catch (error: any) {
    console.error('Knowledge scrape error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}