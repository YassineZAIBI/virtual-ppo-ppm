import { NextRequest, NextResponse } from 'next/server';

/**
 * Teams Bot callback endpoint.
 * Microsoft Graph sends call state notifications here (ringing, established, terminated, etc.)
 * We acknowledge them with 200 OK so the call lifecycle proceeds.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[BOT_CALLBACK] Teams notification:', JSON.stringify(body, null, 2));
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'ok' });
  }
}
