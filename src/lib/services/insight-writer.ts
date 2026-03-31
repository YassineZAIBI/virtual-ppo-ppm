import { db } from '@/lib/db';

interface InsightPayload {
  userId: string;
  agentType: string;
  title: string;
  content: string;
  summary?: string;
  priority?: 'high' | 'medium' | 'low';
  sourceType?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write a proactive insight to the database.
 * Deduplicates by userId + agentType + title within the last 24 hours.
 * Never throws — safe to fire-and-forget.
 */
export async function writeInsight(payload: InsightPayload): Promise<void> {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Deduplicate: skip if same title written in last 24h
    const existing = await db.proactiveInsight.findFirst({
      where: {
        userId: payload.userId,
        agentType: payload.agentType,
        title: payload.title,
        createdAt: { gte: yesterday },
      },
      select: { id: true },
    });

    if (existing) return; // Already written today, skip

    await db.proactiveInsight.create({
      data: {
        userId: payload.userId,
        agentType: payload.agentType,
        title: payload.title,
        content: payload.content,
        summary: payload.summary ?? payload.content.slice(0, 120),
        priority: payload.priority ?? 'medium',
        sourceType: payload.sourceType ?? '',
        sourceId: payload.sourceId ?? '',
        metadata: JSON.stringify(payload.metadata ?? {}),
      },
    });
  } catch (err) {
    console.error('[insight-writer] Failed to write insight:', err);
  }
}

/**
 * Write multiple insights in parallel. Never throws.
 */
export async function writeInsights(payloads: InsightPayload[]): Promise<void> {
  await Promise.allSettled(payloads.map(writeInsight));
}
