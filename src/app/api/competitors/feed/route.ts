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

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const competitorId = searchParams.get('competitorId');
    const relevance = searchParams.get('relevance');
    const sentimentParam = searchParams.get('sentiment');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId: session.user.id };
    if (type) where.type = type;
    if (competitorId) where.competitorId = competitorId;

    // Relevance range filter
    if (relevance === 'high') {
      where.relevance = { gte: 0.7 };
    } else if (relevance === 'medium') {
      where.relevance = { gte: 0.4, lt: 0.7 };
    } else if (relevance === 'low') {
      where.relevance = { lt: 0.4 };
    }

    // Sentiment multi-select filter
    const sentiments = sentimentParam
      ? sentimentParam.split(',').filter(Boolean)
      : [];
    if (sentiments.length > 0) {
      where.sentiment = { in: sentiments };
    }

    // Date range filter
    const dateRange = searchParams.get('dateRange');
    if (dateRange === 'week') {
      where.createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (dateRange === 'month') {
      where.createdAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    } else if (dateRange === 'quarter') {
      where.createdAt = { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) };
    }

    const [items, total] = await Promise.all([
      db.competitorFeed.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          competitor: {
            select: { name: true },
          },
        },
      }),
      db.competitorFeed.count({ where }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[COMPETITORS_FEED_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
