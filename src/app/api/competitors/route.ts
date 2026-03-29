import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { parseTags } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const competitors = await db.competitor.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { feeds: true },
        },
      },
    });

    // Parse tags from JSON string to array for frontend consumption
    const parsed = competitors.map((c) => ({
      ...c,
      tags: parseTags(c.tags),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[COMPETITORS_GET]', error);
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
    const { name, website, description, tags } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const competitor = await db.competitor.create({
      data: {
        userId: session.user.id,
        name,
        website: website ?? null,
        description: description ?? null,
        tags: typeof tags === 'string' ? tags : JSON.stringify(tags ?? []),
      },
    });

    return NextResponse.json(competitor, { status: 201 });
  } catch (error) {
    console.error('[COMPETITORS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
