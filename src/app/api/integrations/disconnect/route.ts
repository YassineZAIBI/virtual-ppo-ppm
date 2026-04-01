import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  integrationType: z.enum([
    'notion', 'linear', 'github', 'jira', 'confluence', 'slack', 'mixpanel', 'amplitude', 'ga4'
  ]),
});

// Maps integration type to UserSettingsRecord credential fields to clear on disconnect
const CREDENTIAL_FIELDS: Record<string, string[]> = {
  notion: ['notionAccessToken'],
  linear: ['linearApiKey'],
  github: ['githubAccessToken', 'githubOrgName'],
  jira: ['jiraUrl', 'jiraEmail', 'jiraApiToken'],
  confluence: ['confluenceUrl', 'confluenceEmail', 'confluenceApiToken'],
  slack: ['slackBotToken'],
  mixpanel: ['mixpanelProjectId', 'mixpanelSecret'],
  amplitude: ['amplitudeApiKey'],
  ga4: ['ga4PropertyId', 'ga4CredentialsJson'],
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid integration type' }, { status: 400 });
  }

  const fieldsToBlank = CREDENTIAL_FIELDS[parsed.data.integrationType] ?? [];
  const updateData: Record<string, string> = {};
  for (const field of fieldsToBlank) {
    updateData[field] = '';
  }

  await db.userSettingsRecord.update({
    where: { userId: session.user.id },
    data: updateData,
  }).catch(() => {});

  await db.integrationConnection.upsert({
    where: {
      userId_integrationType: {
        userId: session.user.id,
        integrationType: parsed.data.integrationType,
      },
    },
    create: {
      userId: session.user.id,
      integrationType: parsed.data.integrationType,
      status: 'disconnected',
    },
    update: {
      status: 'disconnected',
      lastSyncAt: null,
    },
  });

  return NextResponse.json({ success: true });
}
