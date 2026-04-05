import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { runCompetitorScan } from '@/lib/services/competitor-monitor/scanner';

/**
 * POST /api/competitors/[id]/scan
 * User-triggered scan — has access to llmConfig from request body.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { llmConfig } = await req.json();

    const competitor = await db.competitor.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!competitor) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const summary = await runCompetitorScan({
      userId: session.user.id,
      competitorId: id,
      llmConfig: llmConfig ?? null,
      forceFullScan: true,
    });

    return NextResponse.json({
      success: true,
      alertsGenerated: summary.alertsGenerated,
      competitorsScanned: summary.competitorsScanned,
      errors: summary.errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed';
    console.error('[COMPETITOR_SCAN]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
