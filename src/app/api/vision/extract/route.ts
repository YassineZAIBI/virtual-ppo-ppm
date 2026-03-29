import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LLMService } from '@/lib/services/llm';

interface SourceInput {
  type: 'document' | 'url' | 'text';
  content: string;
}

/** Block private/internal IPs and non-http(s) schemes to prevent SSRF */
function isAllowedUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  // Only allow http and https
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const hostname = url.hostname.toLowerCase();

  // Block localhost variants
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '0.0.0.0') {
    return false;
  }

  // Block private/reserved IP ranges (IPv4)
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return false;                          // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return false;   // 172.16.0.0/12
    if (a === 192 && b === 168) return false;             // 192.168.0.0/16
    if (a === 169 && b === 254) return false;             // 169.254.0.0/16 (link-local / cloud metadata)
    if (a === 0) return false;                            // 0.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return false;  // 100.64.0.0/10 (CGNAT)
    if (a === 127) return false;                          // 127.0.0.0/8
  }

  // Block cloud metadata endpoints
  if (hostname === 'metadata.google.internal') return false;

  return true;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sources, llmConfig } = body as {
      sources?: SourceInput[];
      llmConfig?: { provider: string; apiKey: string; model?: string; apiEndpoint?: string };
    };

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json(
        { error: 'sources array is required and must not be empty' },
        { status: 400 }
      );
    }

    for (const source of sources) {
      if (!source.type || !['document', 'url', 'text'].includes(source.type)) {
        return NextResponse.json(
          { error: 'Each source must have a type of "document", "url", or "text"' },
          { status: 400 }
        );
      }
      if (!source.content || typeof source.content !== 'string') {
        return NextResponse.json(
          { error: 'Each source must have a non-empty content string' },
          { status: 400 }
        );
      }
    }

    if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
      return NextResponse.json(
        { error: 'LLM configuration required for vision extraction' },
        { status: 400 }
      );
    }

    // Scrape URL sources to get their text content
    const resolvedSources: string[] = [];
    for (const source of sources) {
      if (source.type === 'url') {
        // SSRF protection: only allow public HTTP(S) URLs
        if (!isAllowedUrl(source.content)) {
          resolvedSources.push(`--- Source (URL: ${source.content}) ---\n[Blocked: only public http/https URLs are allowed]`);
          continue;
        }
        try {
          const res = await fetch(source.content, {
            headers: { 'User-Agent': 'Azmyra/1.0 (Vision Extractor)' },
            signal: AbortSignal.timeout(10000),
          });
          if (res.ok) {
            const html = await res.text();
            // Strip HTML tags for a rough text extraction
            const text = html
              .replace(/<script[\s\S]*?<\/script>/gi, '')
              .replace(/<style[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 8000); // Cap to avoid blowing up the prompt
            resolvedSources.push(`--- Source (URL: ${source.content}) ---\n${text}`);
          } else {
            resolvedSources.push(`--- Source (URL: ${source.content}) ---\n[Failed to fetch: HTTP ${res.status}]`);
          }
        } catch {
          resolvedSources.push(`--- Source (URL: ${source.content}) ---\n[Failed to fetch: timeout or network error]`);
        }
      } else {
        resolvedSources.push(`--- Source (${source.type}) ---\n${source.content}`);
      }
    }

    const aggregatedContent = resolvedSources.join('\n\n');

    const llm = LLMService.create({
      provider: llmConfig.provider as Parameters<typeof LLMService.create>[0]['provider'],
      apiKey: llmConfig.apiKey,
      model: llmConfig.model,
      apiEndpoint: llmConfig.apiEndpoint,
    });

    const systemPrompt = `You are a Product Management expert specializing in vision and strategy.
Given company information, extract or propose:
1. A North Star statement — a single, measurable outcome that guides all product decisions
2. A mission statement — the company's purpose in one sentence
3. Up to 3 business goals that support the North Star
4. Up to 3 target user groups

Respond in valid JSON only (no markdown, no code fences):
{
  "northStar": { "statement": "...", "confidence": 0.0-1.0 },
  "mission": "...",
  "businessGoals": [{ "title": "...", "description": "..." }],
  "targetGroups": [{ "name": "...", "description": "...", "role": "..." }]
}`;

    const response = await llm.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extract or propose a product vision from the following:\n\n${aggregatedContent}` },
    ], { temperature: 0.4 });

    // Parse the LLM JSON response
    let parsed;
    try {
      // Strip markdown fences if the LLM wraps it
      const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({
        proposed: {
          northStar: { statement: response.trim(), confidence: 0.5 },
          mission: '',
          businessGoals: [],
          targetGroups: [],
        },
        status: 'partial',
        message: 'LLM response was not valid JSON — raw text returned as North Star',
        sourceCount: sources.length,
      });
    }

    return NextResponse.json({
      proposed: {
        northStar: parsed.northStar || { statement: '', confidence: 0 },
        mission: parsed.mission || '',
        businessGoals: parsed.businessGoals || [],
        targetGroups: parsed.targetGroups || [],
      },
      status: 'success',
      sourceCount: sources.length,
    });
  } catch (error) {
    console.error('Failed to extract vision:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
