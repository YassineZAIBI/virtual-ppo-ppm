import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  integrationType: z.enum([
    'notion', 'linear', 'github', 'jira', 'confluence', 'slack', 'mixpanel', 'amplitude', 'ga4'
  ]),
  credentials: z.record(z.string(), z.string()),
  displayName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { integrationType, credentials, displayName } = parsed.data;

  // Map credential fields to UserSettingsRecord columns
  // Encryption is handled by Prisma middleware automatically
  const updateData: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    updateData[key] = value;
  }

  try {
    // Update UserSettingsRecord with credentials
    await db.userSettingsRecord.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...updateData },
      update: updateData,
    });

    // Upsert IntegrationConnection status
    await db.integrationConnection.upsert({
      where: {
        userId_integrationType: {
          userId: session.user.id,
          integrationType,
        },
      },
      create: {
        userId: session.user.id,
        integrationType,
        status: 'connected',
        displayName: displayName ?? integrationType,
        lastSyncAt: new Date(),
      },
      update: {
        status: 'connected',
        displayName: displayName ?? integrationType,
        lastSyncAt: new Date(),
        errorMessage: '',
      },
    });

    return NextResponse.json({ success: true, integrationType });
  } catch (err) {
    console.error('[integrations/connect] Failed:', err);
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
  }
}
