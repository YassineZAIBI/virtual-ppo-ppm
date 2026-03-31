import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runWorkflow } from '@/lib/services/agent-orchestrator';
import { getWorkflow } from '@/lib/services/workflow-definitions';
import { z } from 'zod';

const schema = z.object({
  workflowType: z.enum([
    'initiative_deep_dive',
    'market_threat_response',
    'risk_escalation',
    'competitive_response',
  ]),
  initialContext: z.string().min(10).max(5000),
  initiativeId: z.string().optional(),
  llmConfig: z.object({
    provider: z.string(),
    apiKey: z.string(),
    model: z.string().optional(),
  }),
  autonomyLevel: z.enum(['full', 'oversight', 'advisory', 'manual']).default('oversight'),
});

// POST /api/agents/workflow — start a new workflow
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const workflow = getWorkflow(parsed.data.workflowType);
  if (!workflow) {
    return NextResponse.json({ error: 'Unknown workflow type' }, { status: 400 });
  }

  const result = await runWorkflow({
    userId: session.user.id,
    workflowType: parsed.data.workflowType,
    initiativeId: parsed.data.initiativeId,
    initialContext: parsed.data.initialContext,
    llmConfig: parsed.data.llmConfig,
    autonomyLevel: parsed.data.autonomyLevel,
  });

  const statusCode = result.status === 'completed' ? 200 : result.status === 'paused' ? 202 : 500;
  return NextResponse.json(result, { status: statusCode });
}
