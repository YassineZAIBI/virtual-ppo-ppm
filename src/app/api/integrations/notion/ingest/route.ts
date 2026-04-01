import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ingestNotionPages } from '@/lib/services/notion';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const query = body.query ?? '';

  // notionAccessToken is auto-decrypted by Prisma middleware
  const settings = await db.userSettingsRecord.findUnique({
    where: { userId: session.user.id },
    select: { notionAccessToken: true },
  });

  if (!settings?.notionAccessToken) {
    return NextResponse.json({ error: 'Notion not connected' }, { status: 400 });
  }

  try {
    const ingested = await ingestNotionPages(session.user.id, settings.notionAccessToken, query);

    // Update lastSyncAt
    await db.integrationConnection.update({
      where: {
        userId_integrationType: {
          userId: session.user.id,
          integrationType: 'notion',
        },
      },
      data: { lastSyncAt: new Date() },
    }).catch(() => {});

    return NextResponse.json({ success: true, ingested });
  } catch (err) {
    console.error('[notion/ingest] Failed:', err);
    return NextResponse.json({ error: 'Notion ingestion failed' }, { status: 500 });
  }
}
