import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { gatherMarketData } from '@/lib/services/market-research';
import { createJob, startJob, updateJobProgress, completeJob, failJob } from '@/lib/services/data-pipeline/job-queue';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { adapterKeys } = body;

    if (!adapterKeys || !Array.isArray(adapterKeys) || adapterKeys.length === 0) {
      return NextResponse.json({ error: 'adapterKeys array is required' }, { status: 400 });
    }

    // Verify ownership
    const research = await db.marketResearch.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!research) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Create async job
    const job = await createJob({
      userId: session.user.id,
      jobType: 'research_gather',
      input: { researchId: id, query: research.query, adapterKeys },
    });

    // Start gathering in background (non-blocking)
    (async () => {
      try {
        await startJob(job.id);
        await gatherMarketData(id, research.query, adapterKeys, async (completed, total) => {
          const progress = Math.round((completed / total) * 100);
          await updateJobProgress(job.id, progress).catch(() => {});
        });
        await completeJob(job.id, { researchId: id, adapterKeys });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[Gather] Job ${job.id} failed:`, msg);
        await failJob(job.id, msg);
      }
    })();

    return NextResponse.json({ jobId: job.id, researchId: id }, { status: 202 });
  } catch (error) {
    console.error('Failed to start gather:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
