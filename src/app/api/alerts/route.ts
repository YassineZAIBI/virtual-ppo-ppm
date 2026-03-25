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
    const unread = searchParams.get('unread');
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {
      userId: session.user.id,
      isDismissed: false, // filter out dismissed by default
    };

    if (unread === 'true') {
      where.isRead = false;
    }
    if (severity) {
      where.severity = severity;
    }
    if (type) {
      where.type = type;
    }

    const [alerts, total] = await Promise.all([
      db.userAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.userAlert.count({ where }),
    ]);

    return NextResponse.json({
      alerts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to list alerts:', error);
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
    const { type, severity, title, message, source, entityType, entityId } = body;

    if (!type || !severity || !title || !message) {
      return NextResponse.json(
        { error: 'type, severity, title, and message are required' },
        { status: 400 }
      );
    }

    const validTypes = ['competitor_move', 'strategy_risk', 'alignment_drift', 'market_shift', 'action_required'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const validSeverities = ['info', 'warning', 'critical'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { error: `severity must be one of: ${validSeverities.join(', ')}` },
        { status: 400 }
      );
    }

    const alert = await db.userAlert.create({
      data: {
        userId: session.user.id,
        type,
        severity,
        title,
        message,
        ...(source && { source }),
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error('Failed to create alert:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
