import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { SyncAgent } from '@/lib/services/sync-agent';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { action, credentials, llmConfig, selectedIds } = await request.json();

    const agent = new SyncAgent(credentials, llmConfig);

    if (action === 'preview') {
      const items = await agent.preview();
      return NextResponse.json({ items });
    }

    if (action === 'execute') {
      // Mark sync as started
      await db.onboardingProgress.update({
        where: { userId },
        data: { syncStarted: true },
      });

      const results = await agent.execute(selectedIds || []);

      // Create sync records for each item
      for (const result of results) {
        for (const item of result.items) {
          if (item.status === 'synced') {
            await db.syncRecord.create({
              data: {
                userId,
                source: result.source,
                itemType: result.source === 'jira' ? 'initiative' : result.source === 'confluence' ? 'document' : 'insight',
                externalId: item.externalId,
                localId: item.localId || null,
                status: item.status,
                metadata: JSON.stringify({ title: item.title }),
              },
            });
          }
        }
      }

      // Mark sync as completed
      await db.onboardingProgress.update({
        where: { userId },
        data: { syncCompleted: true },
      });

      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Onboarding sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
