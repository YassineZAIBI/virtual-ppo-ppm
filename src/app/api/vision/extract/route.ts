import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface SourceInput {
  type: 'document' | 'url' | 'text';
  content: string;
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
      llmConfig?: { provider: string; apiKey: string; model?: string };
    };

    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json(
        { error: 'sources array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate source entries
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

    // LLM config is required for extraction
    if (!llmConfig || !llmConfig.provider || !llmConfig.apiKey) {
      return NextResponse.json(
        { error: 'LLM configuration required for vision extraction' },
        { status: 400 }
      );
    }

    // Aggregate all source content
    const _aggregatedContent = sources
      .map((s, i) => `--- Source ${i + 1} (${s.type}) ---\n${s.content}`)
      .join('\n\n');

    // Placeholder response -- LLM extraction will be wired in a future phase
    return NextResponse.json({
      proposed: {
        northStar: {
          statement: 'Extracted from your documents...',
          confidence: 0,
        },
        businessGoals: [],
        targetGroups: [],
        needs: [],
        products: [],
      },
      status: 'placeholder',
      message: 'LLM extraction will be wired in a future phase',
      sourceCount: sources.length,
    });
  } catch (error) {
    console.error('Failed to extract vision:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
