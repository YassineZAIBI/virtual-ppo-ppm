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
    const needId = searchParams.get('needId');

    const products = await db.productMapping.findMany({
      where: {
        userId: session.user.id,
        ...(needId && { needId }),
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('[VISION_PRODUCTS_GET]', error);
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
    const { needId, name, type } = body;

    if (!needId || !name || !type) {
      return NextResponse.json({ error: 'needId, name, and type are required' }, { status: 400 });
    }

    // Verify the need belongs to the user
    const need = await db.need.findFirst({
      where: { id: needId, userId: session.user.id },
    });
    if (!need) {
      return NextResponse.json({ error: 'Need not found' }, { status: 404 });
    }

    const product = await db.productMapping.create({
      data: {
        userId: session.user.id,
        needId,
        name,
        type,
      },
    });

    // Fire-and-forget: sync to brain graph
    try {
      db.brainNode.upsert({
        where: { userId_type_title: { userId: session.user.id, type: 'initiative', title: name } },
        create: { userId: session.user.id, type: 'initiative', title: name, content: `${type}: ${name}`, summary: type, source: 'onboarding', confidence: 1.0 },
        update: { content: `${type}: ${name}`, summary: type },
      }).catch((err: unknown) => console.error('BrainNode upsert failed (product):', err));
    } catch (err) {
      console.error('BrainNode upsert error (product):', err);
    }

    // Fire-and-forget: sync to ProductVertical (Vision → Portfolio bridge)
    db.productVertical.upsert({
      where: { userId_name_vertical: { userId: session.user.id, name } },
      create: {
        userId: session.user.id,
        name,
        description: body.description || '',
        strategy: body.rationale || '',
        productMappingId: product.id,
      },
      update: {
        description: body.description || '',
        updatedAt: new Date(),
      },
    }).catch((err: unknown) => console.error('ProductVertical sync failed:', err));

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('[VISION_PRODUCTS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
