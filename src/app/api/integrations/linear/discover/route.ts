import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getLinearTeams } from '@/lib/services/linear';

/**
 * POST /api/integrations/linear/discover
 * Scans connected Linear for teams and returns suggestions for ProductVerticals.
 * Does NOT auto-create anything — returns suggestions only.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await db.userSettingsRecord.findUnique({
      where: { userId: session.user.id },
      select: { linearApiKey: true },
    });

    if (!settings?.linearApiKey) {
      return NextResponse.json({ error: 'Linear not connected' }, { status: 400 });
    }

    // linearApiKey is auto-decrypted by Prisma middleware
    const teams = await getLinearTeams(settings.linearApiKey);

    const suggestions = teams.slice(0, 10).map((t: { key: string; name: string }) => ({
      linearTeamKey: t.key,
      linearTeamName: t.name,
      suggestedVerticalName: t.name,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('[LINEAR_DISCOVER]', error);
    return NextResponse.json({ error: 'Failed to discover Linear teams' }, { status: 500 });
  }
}
