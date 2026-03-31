import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Validate cron secret — rejects calls not from Cloud Scheduler
    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
