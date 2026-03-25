import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/profile/export
 * Generate a full data export as JSON for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Fetch ALL user data in parallel
    const [
      user,
      northStar,
      businessGoals,
      initiatives,
      risks,
      competitors,
      competitorFeed,
      alignmentScores,
      businessImpacts,
      chatSessions,
      meetings,
      cronJobs,
      cronRuns,
    ] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          createdAt: true,
        },
      }),
      db.northStar.findUnique({
        where: { userId },
      }),
      db.businessGoal.findMany({
        where: { userId },
        include: {
          targetGroups: {
            include: {
              needs: {
                include: {
                  products: true,
                },
              },
            },
          },
        },
      }),
      db.initiative.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
      db.risk.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
      db.competitor.findMany({
        where: { userId },
        include: {
          feeds: {
            where: {
              createdAt: { gte: ninetyDaysAgo },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      db.competitorFeed.findMany({
        where: {
          userId,
          createdAt: { gte: ninetyDaysAgo },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.alignmentScore.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      db.businessImpact.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      db.chatSession.findMany({
        where: { userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      db.meeting.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
      }),
      db.cronJob.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      }),
      db.cronRun.findMany({
        where: { userId },
        orderBy: { startedAt: 'desc' },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract nested target groups, needs, and products from business goals
    const targetGroups = businessGoals.flatMap((bg) => bg.targetGroups);
    const needs = targetGroups.flatMap((tg) => tg.needs);
    const products = needs.flatMap((n) => n.products);

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '3.0',
      user: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      vision: {
        northStar,
        businessGoals: businessGoals.map(({ targetGroups: _tg, ...bg }) => bg),
        targetGroups: targetGroups.map(({ needs: _n, ...tg }) => tg),
        needs: needs.map(({ products: _p, ...n }) => n),
        products,
      },
      strategy: {
        initiatives,
        risks,
        alignmentScores,
        businessImpacts,
      },
      competitors: {
        competitors: competitors.map(({ feeds: _f, ...c }) => c),
        feed: competitorFeed,
      },
      conversations: chatSessions,
      meetings,
      cronJobs: cronJobs.map((job) => ({
        ...job,
        runs: cronRuns.filter((r) => r.jobType === job.jobType),
      })),
    };

    const today = new Date().toISOString().split('T')[0];

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="azmyra-export-${today}.json"`,
      },
    });
  } catch (error) {
    console.error('[PROFILE_EXPORT]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
