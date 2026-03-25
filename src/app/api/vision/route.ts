import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/vision
 * Returns a summary of the user's vision data for dashboard/banner checks.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    const [northStar, businessGoalCount, targetGroupCount, needCount, productCount] = await Promise.all([
      db.northStar.findUnique({ where: { userId } }),
      db.businessGoal.count({ where: { userId } }),
      db.targetGroup.count({ where: { userId } }),
      db.need.count({ where: { userId } }),
      db.productMapping.count({ where: { userId } }),
    ]);

    return NextResponse.json({
      northStar: northStar?.statement || null,
      mission: northStar?.context || null,
      confidence: northStar?.confidence || null,
      version: northStar?.version || null,
      businessGoalCount,
      targetGroupCount,
      needCount,
      productCount,
    });
  } catch (error) {
    console.error('[VISION_SUMMARY_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
