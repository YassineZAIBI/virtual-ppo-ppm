import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const VALID_JOB_TYPES = [
  'competitor_scan',
  'strategy_eval',
  'risk_reassess',
  'market_pulse',
  'full_portfolio_review',
  'vision_guard',
] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await db.cronJob.findMany({
      where: { userId: session.user.id },
      orderBy: { jobType: 'asc' },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('[CRON_JOBS_LIST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Validate cron secret — rejects calls not from Cloud Scheduler
    const cronSecret = req.headers.get('x-cron-secret');
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { jobType, schedule, config } = body;

    if (!jobType || !schedule) {
      return NextResponse.json(
        { error: 'jobType and schedule are required' },
        { status: 400 }
      );
    }

    if (!VALID_JOB_TYPES.includes(jobType)) {
      return NextResponse.json(
        { error: `jobType must be one of: ${VALID_JOB_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate job type
    const existing = await db.cronJob.findFirst({
      where: { userId: session.user.id, jobType },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A ${jobType} job already exists for this user` },
        { status: 409 }
      );
    }

    const job = await db.cronJob.create({
      data: {
        userId: session.user.id,
        jobType,
        schedule,
        status: 'active',
        ...(config && { config: typeof config === 'string' ? config : JSON.stringify(config) }),
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('[CRON_JOBS_CREATE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
