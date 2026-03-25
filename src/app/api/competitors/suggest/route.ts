import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's NorthStar to understand their market
    const northStar = await db.northStar.findUnique({
      where: { userId: session.user.id },
    });

    if (!northStar) {
      return NextResponse.json(
        { error: 'Set your North Star first to enable AI competitor suggestions' },
        { status: 400 }
      );
    }

    // Fetch user's ProductMappings for additional market context
    const productMappings = await db.productMapping.findMany({
      where: { userId: session.user.id },
    });

    // Placeholder until LLM is wired
    return NextResponse.json({
      suggestions: [],
      context: {
        northStar: northStar.statement,
        productCount: productMappings.length,
      },
      message: 'AI competitor suggestions require LLM configuration. Add competitors manually for now.',
    });
  } catch (error) {
    console.error('[COMPETITORS_SUGGEST_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
