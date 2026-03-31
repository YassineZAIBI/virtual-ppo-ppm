import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify ownership
    const job = await db.cronJob.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!job) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const now = new Date();

    // Create a CronRun with status "running"
    const run = await db.cronRun.create({
      data: {
        userId: session.user.id,
        jobType: job.jobType,
        status: 'running',
        startedAt: now,
      },
    });

    // Update the CronJob's lastRun
    await db.cronJob.update({
      where: { id },
      data: { lastRun: now },
    });

    return NextResponse.json({
      runId: run.id,
      jobType: job.jobType,
      status: 'triggered',
    });
  } catch (error) {
    console.error('[CRON_JOB_TRIGGER]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
