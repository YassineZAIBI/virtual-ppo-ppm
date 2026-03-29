import { db } from '@/lib/db';

/**
 * Fire-and-forget: upsert a summary of the agent response as an agent_learning BrainNode.
 * Call without await — errors are logged but never thrown to the caller.
 */
export function writeAgentMemory(
  userId: string,
  agentType: string,
  message: string,
  response: string
): void {
  const title = message.length > 120 ? message.slice(0, 117) + '...' : message;
  const summary = response.length > 300 ? response.slice(0, 297) + '...' : response;
  const content = response.slice(0, 2000);

  db.brainNode.upsert({
    where: {
      userId_type_title: {
        userId,
        type: 'agent_learning',
        title,
      },
    },
    create: {
      userId,
      type: 'agent_learning',
      title,
      content,
      summary,
      source: 'agent',
      agentType,
      confidence: 1.0,
    },
    update: {
      content,
      summary,
      // updatedAt is auto-set by @updatedAt
    },
  }).catch((err) => console.error('Failed to write agent memory:', err));
}
