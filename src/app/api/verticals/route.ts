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
    const status = searchParams.get('status');

    const verticals = await db.productVertical.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      include: {
        _count: { select: { initiatives: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(verticals);
  } catch (error) {
    console.error('[VERTICALS_GET]', error);
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
    const { name, description, strategy, color, icon, status } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const vertical = await db.productVertical.upsert({
      where: { userId_name_vertical: { userId: session.user.id, name: name.trim() } },
      create: {
        userId: session.user.id,
        name: name.trim(),
        description: description || '',
        strategy: strategy || '',
        color: color || '#6366F1',
        icon: icon || '',
        status: status || 'active',
      },
      update: {
        description: description || undefined,
        strategy: strategy || undefined,
        color: color || undefined,
        icon: icon || undefined,
        status: status || undefined,
      },
      include: {
        _count: { select: { initiatives: true } },
      },
    });

    return NextResponse.json(vertical, { status: 201 });
  } catch (error) {
    console.error('[VERTICALS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
