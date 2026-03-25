import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { registry } from '@/lib/services/data-pipeline/registry';

// Import adapters to ensure they're registered
import '@/lib/services/data-pipeline/adapters';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adapters = registry.list().map(a => ({
      key: a.key,
      metadata: a.metadata,
    }));

    return NextResponse.json(adapters);
  } catch (error) {
    console.error('Failed to list adapters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
