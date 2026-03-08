import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { synthesizeReport } from '@/lib/services/market-research';
import { createJob, startJob, completeJob, failJob } from '@/lib/services/data-pipeline/job-queue';
import { getUserLLMConfig } from '@/lib/services/llm';

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

    // Verify ownership and that data exists
    const research = await db.marketResearch.findFirst({
      where: { id, userId: session.user.id },
      include: { dataPoints: { select: { id: true } } },
    });
    if (!research) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (research.dataPoints.length === 0) {
      return NextResponse.json({ error: 'No data points gathered yet. Run gather first.' }, { status: 400 });
    }

    // Get user's LLM config
    const llmConfig = await getUserLLMConfig(session.user.id);

    // Create async job
    const job = await createJob({
      userId: session.user.id,
      jobType: 'research_synthesize',
      input: { researchId: id },
    });

    // Synthesize in background
    (async () => {
      try {
        await startJob(job.id);
        await synthesizeReport(id, llmConfig);
        await completeJob(job.id, { researchId: id });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        await failJob(job.id, msg);
      }
    })();

    return NextResponse.json({ jobId: job.id, researchId: id }, { status: 202 });
  } catch (error) {
    console.error('Failed to start synthesis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
