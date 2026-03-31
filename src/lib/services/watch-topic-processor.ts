import { db } from '@/lib/db';
import { writeInsight } from '@/lib/services/insight-writer';

/**
 * Process all WatchTopics for a user.
 * Queries the data pipeline for each topic and stores findings.
 * Called by market_pulse cron job.
 */
export async function processWatchTopics(userId: string): Promise<{
  topicsProcessed: number;
  insightsCreated: number;
}> {
  try {
    const watchTopics = await db.watchTopic.findMany({
      where: { userId, isActive: true },
      orderBy: { lastCheckedAt: 'asc' },
      take: 10, // Process max 10 topics per cron run
    });

    if (watchTopics.length === 0) return { topicsProcessed: 0, insightsCreated: 0 };

    let insightsCreated = 0;

    for (const topic of watchTopics) {
      try {
        // Call the data pipeline API to fetch results for this topic
        const results = await fetchTopicData(topic.query || topic.name);

        if (results.length === 0) continue;

        // Write top result as BrainNode
        const topResult = results[0];
        await db.brainNode.upsert({
          where: {
            userId_type_title: {
              userId,
              type: 'market_signal',
              title: `[${topic.name}] ${topResult.title.slice(0, 100)}`,
            },
          },
          create: {
            userId,
            type: 'market_signal',
            title: `[${topic.name}] ${topResult.title.slice(0, 100)}`,
            content: topResult.content || topResult.title,
            summary: topResult.title.slice(0, 120),
            source: 'agent',
            agentType: 'market',
            confidence: 0.8,
            sourceUrl: topResult.url || '',
            metadata: JSON.stringify({ topic: topic.name, query: topic.query }),
          },
          update: {
            content: topResult.content || topResult.title,
            summary: topResult.title.slice(0, 120),
            updatedAt: new Date(),
          },
        }).catch(() => {});

        // Write ProactiveInsight if results are significant
        if (results.length >= 3) {
          await writeInsight({
            userId,
            agentType: 'market',
            title: `Market update: ${topic.name}`,
            content: results
              .slice(0, 3)
              .map((r: { title: string; content?: string }) => `• ${r.title}`)
              .join('\n'),
            summary: `${results.length} new signals for "${topic.name}"`,
            priority: 'low',
            sourceType: 'market',
            sourceId: topic.id,
            metadata: { topicName: topic.name, resultCount: results.length },
          });
          insightsCreated++;
        }

        // Update lastCheckedAt
        await db.watchTopic.update({
          where: { id: topic.id },
          data: { lastCheckedAt: new Date() },
        }).catch(() => {});
      } catch (topicErr) {
        console.error(`[watch-topic] Failed to process topic ${topic.name}:`, topicErr);
      }
    }

    return { topicsProcessed: watchTopics.length, insightsCreated };
  } catch (err) {
    console.error('[watch-topic] Processing failed:', err);
    return { topicsProcessed: 0, insightsCreated: 0 };
  }
}

/**
 * Stub for data pipeline fetch.
 * Uses internal API — replace with direct adapter calls if needed.
 */
async function fetchTopicData(query: string): Promise<Array<{ title: string; content?: string; url?: string }>> {
  try {
    // In cron context, we can't use relative URLs — use the app URL from env
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/market-research/search?q=${encodeURIComponent(query)}&limit=5`,
      { headers: { 'x-internal': 'cron' } }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}
