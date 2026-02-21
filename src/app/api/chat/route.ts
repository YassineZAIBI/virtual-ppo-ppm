import { NextRequest, NextResponse } from 'next/server';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8100';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, settings, storeData, agentId, pendingActionId, pendingActionDecision } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Forward to Python agent service
    const agentResponse = await fetch(`${AGENT_SERVICE_URL}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: (history || []).slice(-10).map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        settings: settings || {},
        store_data: storeData || null,
        agent_id: agentId || null,
        pending_action_id: pendingActionId || null,
        pending_action_decision: pendingActionDecision || null,
      }),
    });

    if (!agentResponse.ok) {
      const errorData = await agentResponse.json().catch(() => ({}));
      console.error('Agent service error:', agentResponse.status, errorData);

      // Fallback to direct LLM call if agent service is down
      return await fallbackDirectLLM(message, history, settings);
    }

    const data = await agentResponse.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Chat API error:', error);

    // Fallback to direct LLM call
    try {
      const body = await request.clone().json();
      return await fallbackDirectLLM(body.message, body.history, body.settings);
    } catch {
      return NextResponse.json(
        { error: 'Failed to process message', details: error.message },
        { status: 500 }
      );
    }
  }
}

/**
 * Fallback: direct LLM call when Python agent service is unavailable.
 * Preserves basic chat functionality without agents.
 */
async function fallbackDirectLLM(
  message: string,
  history: any[],
  settings: any
): Promise<NextResponse> {
  const { LLMService } = await import('@/lib/services/llm');
  const llmConfig = {
    provider: settings?.llm?.provider || 'openai',
    apiKey: settings?.llm?.apiKey || '',
    apiEndpoint: settings?.llm?.apiEndpoint,
    model: settings?.llm?.model || undefined,
  };

  const llm = LLMService.create(llmConfig as any);

  const messages: Array<{ role: string; content: string }> = [
    {
      role: 'system',
      content: `You are an intelligent Virtual Product Owner/Manager (PPO/PPM) assistant. Help product managers with strategy, planning, meetings, initiatives, documentation, and communication. Be concise and actionable. Use markdown formatting.

Note: The multi-agent system is currently offline. Responding in single-agent fallback mode.`
    }
  ];

  if (history && Array.isArray(history)) {
    for (const msg of history.slice(-10)) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: message });

  const response = await llm.chat(messages, { temperature: 0.7, maxTokens: 2000 });

  return NextResponse.json({
    response,
    agent_id: 'strategy',
    agent_name: 'Fallback Assistant',
    tools_executed: [],
    pending_actions: [],
    rag_context: [],
    sources: [],
  });
}
