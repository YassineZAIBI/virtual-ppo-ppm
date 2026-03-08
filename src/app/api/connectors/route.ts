import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connectors = await db.dataConnectorConfig.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(connectors);
  } catch (error) {
    console.error('Failed to list connectors:', error);
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
    const { name, adapterKey, type, config, dataMapping, refreshSchedule } = body;

    if (!name || !adapterKey) {
      return NextResponse.json({ error: 'name and adapterKey are required' }, { status: 400 });
    }

    const connector = await db.dataConnectorConfig.create({
      data: {
        userId: session.user.id,
        name,
        adapterKey,
        type: type || 'preset',
        config: config ? JSON.stringify(config) : '{}',
        dataMapping: dataMapping ? JSON.stringify(dataMapping) : '{}',
        refreshSchedule: refreshSchedule || 'manual',
      },
    });

    return NextResponse.json(connector, { status: 201 });
  } catch (error) {
    console.error('Failed to create connector:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
