import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const BUSINESS_VALUE_RANK: Record<string, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { initiativeId } = body;

    // Fetch user's competitors (for future use)
    const competitors = await db.competitor.findMany({
      where: { userId: session.user.id },
    });

    let initiatives;
    if (initiativeId) {
      // Rank single initiative
      const initiative = await db.initiative.findFirst({
        where: { id: initiativeId, userId: session.user.id },
      });
      if (!initiative) {
        return NextResponse.json({ error: 'Initiative not found' }, { status: 404 });
      }
      initiatives = [initiative];
    } else {
      // Rank all initiatives
      initiatives = await db.initiative.findMany({
        where: { userId: session.user.id },
      });
    }

    // Assign placeholder rank based on businessValue: high=1, medium=2, low=3
    const results = [];
    for (const init of initiatives) {
      const rank = BUSINESS_VALUE_RANK[init.businessValue] ?? 2;

      await db.initiative.update({
        where: { id: init.id },
        data: { competitiveRank: rank },
      });

      results.push({
        id: init.id,
        title: init.title,
        competitiveRank: rank,
      });
    }

    return NextResponse.json({
      ranked: results.length,
      results,
    });
  } catch (error) {
    console.error('[STRATEGY_COMPETITIVE_RANK_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
