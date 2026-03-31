import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processCompetitorFeed } from '@/lib/services/competitor-scorer';

export async function POST(req: NextRequest) {
  // Validate cron secret — rejects calls not from Cloud Scheduler
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all users with competitor tracking enabled
    const usersWithCompetitors = await db.competitor.findMany({
      where: {},
      select: { userId: true },
      distinct: ['userId'],
    });

    const results = await Promise.allSettled(
      usersWithCompetitors.map((u) => processCompetitorFeed(u.userId))
    );

    const summary = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { processed: 0, escalated: 0, error: String(r.reason) }
    );

    return NextResponse.json({ success: true, processed: summary });
  } catch (err) {
    console.error('[cron/competitor-scan] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
