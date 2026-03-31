import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processWatchTopics } from '@/lib/services/watch-topic-processor';

export async function POST(req: NextRequest) {
  // Validate cron secret — rejects calls not from Cloud Scheduler
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all users with active WatchTopics
    const usersWithTopics = await db.watchTopic.findMany({
      where: { isActive: true },
      select: { userId: true },
      distinct: ['userId'],
    });

    const results = await Promise.allSettled(
      usersWithTopics.map((u) => processWatchTopics(u.userId))
    );

    const summary = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { topicsProcessed: 0, insightsCreated: 0, error: String(r.reason) }
    );

    return NextResponse.json({ success: true, usersProcessed: usersWithTopics.length, results: summary });
  } catch (err) {
    console.error('[cron/market-pulse] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
