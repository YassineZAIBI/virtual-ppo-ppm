import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const run = await db.cronRun.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!run) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error('[CRON_RUN_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existing = await db.cronRun.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const runUpdate: Record<string, unknown> = {};

    if (body.status) {
      runUpdate.status = body.status;
    }
    if (body.result !== undefined) {
      runUpdate.result = typeof body.result === 'string'
        ? body.result
        : JSON.stringify(body.result);
    }
    if (body.error !== undefined) {
      runUpdate.error = body.error;
    }
    if (typeof body.duration === 'number') {
      runUpdate.duration = body.duration;
    }
    if (typeof body.tokensUsed === 'number') {
      runUpdate.tokensUsed = body.tokensUsed;
    }

    // If terminal status, set endedAt
    if (body.status === 'completed' || body.status === 'failed') {
      runUpdate.endedAt = new Date();
    }

    const updatedRun = await db.cronRun.update({
      where: { id },
      data: runUpdate,
    });

    // Also update the parent CronJob
    if (body.status === 'completed' || body.status === 'failed') {
      const jobUpdate: Record<string, unknown> = {
        runCount: { increment: 1 },
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      };

      if (body.status === 'completed' && body.result !== undefined) {
        jobUpdate.lastResult = typeof body.result === 'string'
          ? body.result
          : JSON.stringify(body.result);
        jobUpdate.lastError = null;
      }
      if (body.status === 'failed' && body.error !== undefined) {
        jobUpdate.lastError = body.error;
      }

      // Find the parent job by userId + jobType
      await db.cronJob.updateMany({
        where: {
          userId: session.user.id,
          jobType: existing.jobType,
        },
        data: jobUpdate,
      });
    }

    return NextResponse.json(updatedRun);
  } catch (error) {
    console.error('[CRON_RUN_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
