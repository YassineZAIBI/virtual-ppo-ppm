import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { processDriftDetection } from '@/lib/services/drift-detector';

export async function POST(req: NextRequest) {
  // Validate cron secret — rejects calls not from Cloud Scheduler
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all users with an AlignmentScore
    const usersWithAlignment = await db.alignmentScore.findMany({
      where: {},
      select: { userId: true },
      distinct: ['userId'],
    });

    await Promise.allSettled(
      usersWithAlignment.map((u) => processDriftDetection(u.userId))
    );

    return NextResponse.json({ success: true, usersProcessed: usersWithAlignment.length });
  } catch (err) {
    console.error('[cron/strategy-eval] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
