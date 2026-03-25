import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { testTeamsConnection } from '@/lib/services/teams-bot';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.AZURE_AD_CLIENT_ID;
    const tenantId = process.env.AZURE_AD_TENANT_ID;
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;

    if (!clientId || !tenantId || !clientSecret) {
      return NextResponse.json({ error: 'Teams credentials not configured on server. Set AZURE_AD_CLIENT_ID, AZURE_AD_TENANT_ID, AZURE_AD_CLIENT_SECRET in .env' }, { status: 400 });
    }

    const result = await testTeamsConnection({ clientId, tenantId, clientSecret });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
