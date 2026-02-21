import { NextRequest, NextResponse } from 'next/server';
import { LLMService } from '@/lib/services/llm';
import { LLMConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, apiKey, apiEndpoint, model } = body;

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    const llmConfig: LLMConfig = {
      provider,
      apiKey: apiKey || '',
      apiEndpoint: apiEndpoint || undefined,
      model: model || undefined,
    };

    // This will throw if config is invalid (missing API key, endpoint, etc.)
    const llm = LLMService.create(llmConfig);

    // Send a minimal test message
    const response = await llm.chat(
      [
        { role: 'user', content: 'Reply with exactly: CONNECTION_OK' },
      ],
      { temperature: 0, maxTokens: 20 }
    );

    return NextResponse.json({
      success: true,
      provider,
      model: model || '(default)',
      preview: response.substring(0, 100),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
