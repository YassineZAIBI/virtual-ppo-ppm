import { NextRequest, NextResponse } from 'next/server';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8100';

export async function POST(request: NextRequest) {
  let body: any;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { message, history, settings, storeData, agentId, pendingActionId, pendingActionDecision } = body;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // Try Python agent service first
  try {
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
      signal: AbortSignal.timeout(30000),
    });

    if (agentResponse.ok) {
      const data = await agentResponse.json();
      return NextResponse.json(data);
    }

    // Agent service returned an error — fall through to fallback
    const errorData = await agentResponse.json().catch(() => ({}));
    console.error('Agent service error:', agentResponse.status, errorData);
  } catch (err: any) {
    console.error('Agent service unreachable:', err.message);
  }

  // Fallback: direct LLM call when Python agent service is unavailable
  try {
    return await fallbackDirectLLM(message, history, settings);
  } catch (error: any) {
    console.error('Fallback LLM error:', error);
    return NextResponse.json(
      { error: `LLM request failed: ${error.message}` },
      { status: 500 }
    );
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
      content: `You are Azmyra, an intelligent AI-powered product management assistant. Help product managers with strategy, planning, meetings, initiatives, documentation, and communication. Be concise and actionable.

STRICT MARKDOWN FORMATTING RULES (follow these exactly):
- Use ## for main section headers, ### for subsections — NOT "1. Title" as plain numbered text
- Tables MUST use GitHub-Flavored Markdown: header row, then separator row (| --- | --- |), then data rows. NO blank lines between table rows.
- Bold text: use **double asterisks** only (NOT triple ***)
- Do NOT use LaTeX notation ($...$) — write formulas in plain text
- Leave a blank line between sections for readability
- Use bullet lists (- item) for unordered items, numbered lists (1. item) only for sequential steps

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
