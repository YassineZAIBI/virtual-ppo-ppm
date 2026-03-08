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
    const initiativeId = searchParams.get('initiativeId');

    const where: any = { userId: session.user.id };
    if (initiativeId) where.initiativeId = initiativeId;

    const reports = await db.marketResearch.findMany({
      where,
      include: { dataPoints: { select: { id: true, adapterKey: true, sourceName: true, sourceUrl: true, title: true, contentType: true, fetchedAt: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Failed to list market research:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, query, initiativeId } = body;

    if (!title || !query) {
      return NextResponse.json({ error: 'Title and query are required' }, { status: 400 });
    }

    const research = await db.marketResearch.create({
      data: {
        userId: session.user.id,
        title,
        query,
        initiativeId: initiativeId || null,
        status: 'pending',
      },
    });

    return NextResponse.json(research, { status: 201 });
  } catch (error) {
    console.error('Failed to create market research:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
