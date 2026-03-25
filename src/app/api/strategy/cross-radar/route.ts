import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active strategies (status != "idea")
    const initiatives = await db.initiative.findMany({
      where: {
        userId: session.user.id,
        status: { not: 'idea' },
      },
    });

    // Placeholder cross-strategy analysis — LLM-powered analysis coming soon
    return NextResponse.json({
      conflicts: [],
      synergies: [],
      orphanGoals: [],
      overloadedGoals: [],
      summary: 'Cross-strategy analysis placeholder. LLM-powered analysis coming soon.',
      analyzedCount: initiatives.length,
    });
  } catch (error) {
    console.error('[STRATEGY_CROSS_RADAR_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
