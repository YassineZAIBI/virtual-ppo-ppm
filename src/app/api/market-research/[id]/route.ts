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

    const research = await db.marketResearch.findFirst({
      where: { id, userId: session.user.id },
      include: { dataPoints: true },
    });

    if (!research) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(research);
  } catch (error) {
    console.error('Failed to get market research:', error);
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
    const body = await req.json();

    // Verify ownership
    const existing = await db.marketResearch.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // If editing the synthesized report, save a content version
    if (body.synthesizedReport && body.synthesizedReport !== existing.synthesizedReport) {
      await db.contentVersion.create({
        data: {
          userId: session.user.id,
          entityType: 'market_research',
          entityId: id,
          content: body.synthesizedReport,
          editedBy: 'user',
          changeDescription: body.changeDescription || 'User edit',
        },
      });
    }

    const updated = await db.marketResearch.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.synthesizedReport !== undefined && { synthesizedReport: body.synthesizedReport }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update market research:', error);
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

    const existing = await db.marketResearch.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.marketResearch.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete market research:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
