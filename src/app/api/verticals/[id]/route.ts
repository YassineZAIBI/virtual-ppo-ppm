import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const vertical = await db.productVertical.findFirst({
      where: { id, userId: session.user.id },
      include: {
        initiatives: { orderBy: { updatedAt: 'desc' } },
        _count: { select: { initiatives: true } },
      },
    });

    if (!vertical) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(vertical);
  } catch (error) {
    console.error('[VERTICAL_GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.productVertical.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, strategy, color, icon, status, sortOrder } = body;

    const updated = await db.productVertical.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(strategy !== undefined && { strategy }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(status !== undefined && { status }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        _count: { select: { initiatives: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[VERTICAL_PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.productVertical.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Unlink initiatives before deleting (don't cascade-delete initiatives)
    await db.initiative.updateMany({
      where: { verticalId: id },
      data: { verticalId: null },
    });

    await db.productVertical.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[VERTICAL_DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
