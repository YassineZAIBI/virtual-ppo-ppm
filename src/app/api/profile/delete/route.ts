import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/profile/delete
 * Permanently delete the authenticated user's account and ALL associated data.
 * Deletion is performed in a transaction respecting foreign key constraints.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Verify user exists
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete ALL user data in a transaction, ordered to respect foreign keys.
    // Deepest children first, then parents, finally the User record.
    await db.$transaction([
      // --- Layer 1: Leaf models (no children depend on them) ---
      db.competitorFeed.deleteMany({ where: { userId } }),
      db.cronRun.deleteMany({ where: { userId } }),
      db.cronJob.deleteMany({ where: { userId } }),
      db.userAlert.deleteMany({ where: { userId } }),
      db.alignmentScore.deleteMany({ where: { userId } }),
      db.businessImpact.deleteMany({ where: { userId } }),

      // --- Layer 2: Vision hierarchy (children before parents) ---
      db.productMapping.deleteMany({ where: { userId } }),
      db.need.deleteMany({ where: { userId } }),
      db.targetGroup.deleteMany({ where: { userId } }),
      db.businessGoal.deleteMany({ where: { userId } }),
      db.northStar.deleteMany({ where: { userId } }),

      // --- Layer 3: Other user-owned entities ---
      db.competitor.deleteMany({ where: { userId } }),
      db.chatMessage.deleteMany({ where: { userId } }),
      db.chatSession.deleteMany({ where: { userId } }),
      db.initiative.deleteMany({ where: { userId } }),
      db.risk.deleteMany({ where: { userId } }),
      db.meeting.deleteMany({ where: { userId } }),

      // --- Layer 4: Market research & data points ---
      // DataPoints cascade from MarketResearch, but delete explicitly for safety
      db.dataPoint.deleteMany({
        where: { research: { userId } },
      }),
      db.marketResearch.deleteMany({ where: { userId } }),

      // --- Layer 5: Supporting models ---
      db.contentVersion.deleteMany({ where: { userId } }),
      db.dataConnectorConfig.deleteMany({ where: { userId } }),
      db.dataJob.deleteMany({ where: { userId } }),
      db.knowledgeDocument.deleteMany({ where: { userId } }),
      db.pendingAction.deleteMany({ where: { userId } }),
      db.onboardingProgress.deleteMany({ where: { userId } }),
      db.userSettingsRecord.deleteMany({ where: { userId } }),
      db.syncRecord.deleteMany({ where: { userId } }),

      // --- Layer 6: Auth models ---
      db.shareComment.deleteMany({
        where: { shareLink: { createdBy: userId } },
      }),
      db.shareLink.deleteMany({ where: { createdBy: userId } }),
      db.session.deleteMany({ where: { userId } }),
      db.account.deleteMany({ where: { userId } }),

      // --- Final: Delete the User record itself ---
      db.user.delete({ where: { id: userId } }),
    ]);

    return NextResponse.json({
      deleted: true,
      message: 'Account and all data permanently deleted',
    });
  } catch (error) {
    console.error('[PROFILE_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
