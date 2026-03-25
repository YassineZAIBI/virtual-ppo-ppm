import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const DEFAULT_JOBS = [
  { jobType: 'competitor_scan', schedule: '0 2 * * *' },
  { jobType: 'strategy_eval', schedule: '0 6 * * *' },
  { jobType: 'risk_reassess', schedule: '0 6 * * *' },
  { jobType: 'market_pulse', schedule: '0 8 * * *' },
  { jobType: 'full_portfolio_review', schedule: '0 2 * * 0' },
  { jobType: 'vision_guard', schedule: '0 12 * * *' },
] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find which job types already exist for this user
    const existingJobs = await db.cronJob.findMany({
      where: { userId: session.user.id },
      select: { jobType: true },
    });
    const existingTypes = new Set(existingJobs.map((j) => j.jobType));

    // Create missing jobs
    const toCreate = DEFAULT_JOBS.filter((j) => !existingTypes.has(j.jobType));

    if (toCreate.length > 0) {
      await db.cronJob.createMany({
        data: toCreate.map((j) => ({
          userId: session.user.id,
          jobType: j.jobType,
          schedule: j.schedule,
          status: 'paused',
        })),
      });
    }

    return NextResponse.json({
      initialized: toCreate.length,
      existing: existingTypes.size,
    });
  } catch (error) {
    console.error('[CRON_INITIALIZE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
