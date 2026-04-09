import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { LLMService } from '@/lib/services/llm';
import type { BrainDomain } from '@/lib/types';

const VALID_DOMAINS: BrainDomain[] = ['vision', 'product', 'market', 'risk', 'operations'];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  let llmConfig;
  try {
    const body = await req.json();
    llmConfig = body.llmConfig;
  } catch {
    return NextResponse.json({ error: 'llmConfig required in request body' }, { status: 400 });
  }

  if (!llmConfig?.provider || !llmConfig?.apiKey) {
    return NextResponse.json({ error: 'llmConfig with provider and apiKey required' }, { status: 400 });
  }

  const unclassified = await db.brainNode.findMany({
    where: { userId, domain: 'general' },
    take: 50,
    select: { id: true, title: true, content: true, type: true, source: true },
  });

  if (unclassified.length === 0) {
    return NextResponse.json({ classified: 0, message: 'No unclassified nodes' });
  }

  const llm = LLMService.create(llmConfig);

  const nodeList = unclassified.map((n, i) =>
    `${i + 1}. [${n.type}] "${n.title}" — ${n.content.slice(0, 150)}`
  ).join('\n');

  const prompt = `Classify each knowledge node into exactly one domain. Valid domains: vision, product, market, risk, operations.

Rules:
- vision: company direction, north star, goals, strategy
- product: features, initiatives, user needs, personas, decisions
- market: competitors, market signals, trends, research
- risk: risks, threats, mitigations, compliance
- operations: meetings, communications, processes, team coordination

Nodes:
${nodeList}

Respond with ONLY a JSON array of objects: [{"id": "<node_id>", "domain": "<domain>"}]
No explanation.`;

  try {
    const response = await llm.chat([{ role: 'user', content: prompt }]);
    const classifications: Array<{ id: string; domain: string }> = JSON.parse(
      response.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    );

    let classified = 0;
    for (const c of classifications) {
      const node = unclassified.find(n => n.id === c.id);
      if (node && VALID_DOMAINS.includes(c.domain as BrainDomain)) {
        await db.brainNode.update({
          where: { id: c.id },
          data: { domain: c.domain },
        });
        classified++;
      }
    }

    return NextResponse.json({ classified, total: unclassified.length });
  } catch (e) {
    console.error('[brain/classify] LLM classification failed:', e);
    return NextResponse.json(
      { error: 'Classification failed', classified: 0 },
      { status: 500 }
    );
  }
}
