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

    const userId = session.user.id;

    // Fetch all user initiatives
    const initiatives = await db.initiative.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    // For each initiative, join latest AlignmentScore and BusinessImpact
    const portfolio = await Promise.all(
      initiatives.map(async (init) => {
        const alignment = await db.alignmentScore.findFirst({
          where: {
            entityType: 'initiative',
            entityId: init.id,
            userId,
            NOT: { computedBy: 'placeholder' },
          },
          orderBy: { version: 'desc' },
        });

        const impact = await db.businessImpact.findFirst({
          where: { entityType: 'initiative', entityId: init.id, userId },
        });

        return {
          ...init,
          alignment: alignment ?? null,
          impact: impact ?? null,
        };
      })
    );

    // Build summary
    const byLevel: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let alignmentSum = 0;
    let alignmentCount = 0;
    let withImpact = 0;

    for (const item of portfolio) {
      const level = item.level ?? 'idea';
      byLevel[level] = (byLevel[level] ?? 0) + 1;

      const status = item.status;
      byStatus[status] = (byStatus[status] ?? 0) + 1;

      if (item.alignment) {
        alignmentSum += item.alignment.overallScore;
        alignmentCount++;
      }

      if (item.impact) {
        withImpact++;
      }
    }

    return NextResponse.json({
      portfolio,
      summary: {
        total: portfolio.length,
        byLevel,
        byStatus,
        avgAlignment: alignmentCount > 0 ? alignmentSum / alignmentCount : null,
        withImpact,
      },
    });
  } catch (error) {
    console.error('[STRATEGY_PORTFOLIO_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
