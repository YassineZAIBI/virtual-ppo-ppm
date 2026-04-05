import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { runCompetitorScan } from '@/lib/services/competitor-monitor/scanner';

export async function POST(req: NextRequest) {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all distinct userIds with competitors
    const usersWithCompetitors = await db.competitor.findMany({
      where: {},
      select: { userId: true },
      distinct: ['userId'],
    });

    const results = [];
    for (const { userId } of usersWithCompetitors) {
      // Cron runs without user llmConfig — website scanning only (no LLM synthesis)
      const summary = await runCompetitorScan({
        userId,
        llmConfig: null,
        forceFullScan: false,
      }).catch((err) => ({ competitorsScanned: 0, alertsGenerated: 0, errors: [String(err)] }));
      results.push({ userId, ...summary });
    }

    return NextResponse.json({ success: true, processed: results });
  } catch (err) {
    console.error('[cron/competitor-scan] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
