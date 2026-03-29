import { db } from '@/lib/db';

const TYPE_LABELS: Record<string, string> = {
  vision: 'Vision',
  goal: 'Goals',
  persona: 'Target Personas',
  need: 'Needs',
  decision: 'Decisions',
  initiative: 'Initiatives',
  risk: 'Risks',
  market_signal: 'Market Signals',
};

// Ordered display — types appear in this sequence
const TYPE_ORDER = [
  'vision', 'goal', 'persona', 'need',
  'decision', 'initiative', 'risk', 'market_signal',
];

/**
 * Build a structured context string from the user's brain graph
 * for injection into agent system prompts.
 */
export async function buildAgentContext(userId: string, agentType: string): Promise<string> {
  try {
    const [contextNodes, learningNodes] = await Promise.all([
      db.brainNode.findMany({
        where: {
          userId,
          NOT: { type: 'agent_learning' },
        },
        orderBy: { updatedAt: 'desc' },
        take: 40,
        select: { type: true, title: true, content: true },
      }),
      db.brainNode.findMany({
        where: {
          userId,
          type: 'agent_learning',
          agentType: { in: [agentType, 'global'] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: { title: true, summary: true },
      }),
    ]);

    if (contextNodes.length === 0 && learningNodes.length === 0) {
      return '';
    }

    // Group context nodes by type
    const grouped = new Map<string, Array<{ title: string; content: string }>>();
    for (const node of contextNodes) {
      const list = grouped.get(node.type) || [];
      list.push({ title: node.title, content: node.content });
      grouped.set(node.type, list);
    }

    // Build company context section
    const sections: string[] = [];
    for (const type of TYPE_ORDER) {
      const nodes = grouped.get(type);
      if (!nodes || nodes.length === 0) continue;
      const label = TYPE_LABELS[type] || type;
      const lines = nodes.map((n) => `- ${n.title}: ${n.content}`);
      sections.push(`${label}:\n${lines.join('\n')}`);
    }

    // Include any types not in TYPE_ORDER (future-proof)
    grouped.forEach((nodes, type) => {
      if (TYPE_ORDER.includes(type)) return;
      const label = TYPE_LABELS[type] || type;
      const lines = nodes.map((n) => `- ${n.title}: ${n.content}`);
      sections.push(`${label}:\n${lines.join('\n')}`);
    });

    const parts: string[] = [];

    if (sections.length > 0) {
      parts.push(`--- COMPANY CONTEXT ---\n${sections.join('\n\n')}`);
    }

    if (learningNodes.length > 0) {
      const memoryLines = learningNodes.map((n) => `- ${n.title}: ${n.summary}`);
      parts.push(`--- AGENT MEMORY ---\n${memoryLines.join('\n')}`);
    }

    if (parts.length === 0) return '';

    return `${parts.join('\n\n')}\n\n--- END CONTEXT ---`;
  } catch (err) {
    console.error('Failed to build agent context:', err);
    return '';
  }
}
