import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Optional cron secret check — if CRON_API_KEY is set, require it
    const cronApiKey = process.env.CRON_API_KEY;
    if (cronApiKey) {
      const headerSecret = req.headers.get('x-cron-secret');
      if (headerSecret !== cronApiKey) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const now = new Date();

    const jobs = await db.cronJob.findMany({
      where: {
        status: 'active',
        OR: [
          { nextRun: null },
          { nextRun: { lte: now } },
        ],
      },
      select: {
        id: true,
        userId: true,
        jobType: true,
        schedule: true,
        config: true,
        lastRun: true,
      },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('[CRON_JOBS_DUE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
