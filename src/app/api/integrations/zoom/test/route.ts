import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId, clientId, clientSecret } = await request.json();

    if (!accountId || !clientId || !clientSecret) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    // Request a Server-to-Server OAuth token from Zoom
    const tokenRes = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: accountId,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      return NextResponse.json({ success: false, error: `Zoom auth failed: ${err}` });
    }

    const tokenData = await tokenRes.json();

    // Verify token works by fetching user info
    const userRes = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    return NextResponse.json({
      success: userRes.ok,
      error: userRes.ok ? undefined : 'Token valid but API call failed',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
