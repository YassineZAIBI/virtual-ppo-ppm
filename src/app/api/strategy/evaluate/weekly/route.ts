import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all non-idea initiatives for weekly re-evaluation
    const initiatives = await db.initiative.findMany({
      where: {
        userId: session.user.id,
        status: { not: 'idea' },
      },
    });

    // Placeholder — weekly evaluation will trigger LLM for each initiative
    return NextResponse.json({
      evaluated: initiatives.length,
      flagged: 0,
      evaluations: [],
    });
  } catch (error) {
    console.error('[STRATEGY_EVALUATE_WEEKLY_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
