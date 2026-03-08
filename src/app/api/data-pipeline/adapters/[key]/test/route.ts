import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { registry } from '@/lib/services/data-pipeline/registry';

import '@/lib/services/data-pipeline/adapters';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await params;
    const adapter = registry.get(key);

    if (!adapter) {
      return NextResponse.json({ error: `Adapter "${key}" not found` }, { status: 404 });
    }

    if (!adapter.testConnection) {
      return NextResponse.json({ ok: true, message: 'Adapter does not implement testConnection, assumed available' });
    }

    const body = await req.json().catch(() => ({}));
    const result = await adapter.testConnection(body.config);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to test adapter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
