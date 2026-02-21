import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8100';
const MAX_URLS = 10;
const MAX_CONTENT_CHARS = 50000;

/**
 * Scrape a URL directly in Node.js (fallback when Python service is unavailable).
 */
async function scrapeDirectly(url: string) {
  let targetUrl = url;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const resp = await fetch(targetUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  });

  if (!resp.ok) {
    if (resp.status === 401 || resp.status === 403) {
      throw new Error(`URL requires authentication (HTTP ${resp.status}). Only public pages are supported.`);
    }
    throw new Error(`URL returned error: HTTP ${resp.status}`);
  }

  // Check for login redirects
  const finalUrl = resp.url;
  if (/login|signin|auth|sso/i.test(finalUrl)) {
    throw new Error('URL redirected to a login page. Only public pages without authentication are supported.');
  }

  const html = await resp.text();

  // Simple HTML → text extraction without external dependencies
  // Remove script, style, nav, footer, header, aside tags and their content
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : url;

  // Try to find main/article content first
  const mainMatch = cleaned.match(/<main[\s\S]*?<\/main>/i)
    || cleaned.match(/<article[\s\S]*?<\/article>/i)
    || cleaned.match(/<div[^>]*role=["']main["'][\s\S]*?<\/div>/i);

  const contentHtml = mainMatch ? mainMatch[0] : cleaned;

  // Strip all remaining HTML tags
  let text = contentHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .trim();

  if (!text || text.length < 50) {
    throw new Error('Could not extract meaningful content from URL');
  }

  // Truncate
  if (text.length > MAX_CONTENT_CHARS) {
    text = text.substring(0, MAX_CONTENT_CHARS) + '\n\n[Content truncated at 50,000 characters]';
  }

  // Simple chunking (~500 words per chunk)
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length; i += 450) {
    const chunk = words.slice(i, i + 500).join(' ');
    if (chunk.trim()) chunks.push(chunk);
  }

  const domain = new URL(targetUrl).hostname;

  return {
    source_name: title.substring(0, 200),
    source_url: targetUrl,
    content: text,
    content_chunks: chunks,
    char_count: text.length,
    chunk_count: chunks.length,
    domain,
  };
}

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

    let result: any;

    // Try Python service first, fall back to direct scraping
    try {
      const pyResp = await fetch(`${AGENT_SERVICE_URL}/knowledge/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(15000),
      });

      if (pyResp.ok) {
        result = await pyResp.json();
      } else {
        throw new Error('Python service returned error');
      }
    } catch {
      // Fallback: scrape directly in Node.js
      result = await scrapeDirectly(url);
    }

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
    return NextResponse.json({ error: error.message || 'Scrape failed' }, { status: 500 });
  }
}
