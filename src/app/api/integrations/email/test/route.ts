import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const smtpHost = body.smtpHost || process.env.SMTP_HOST || '';
    const username = body.username || process.env.SMTP_USER || '';
    const smtpPort = body.smtpPort || process.env.SMTP_PORT || 587;

    if (!smtpHost) {
      return NextResponse.json(
        { error: 'SMTP Host is required. Please enter your mail server hostname (e.g., smtp.gmail.com).' },
        { status: 400 }
      );
    }
    if (!username) {
      return NextResponse.json(
        { error: 'SMTP username is required.' },
        { status: 400 }
      );
    }

    // Validate config exists - actual sending would require nodemailer
    return NextResponse.json({
      success: true,
      host: smtpHost,
      port: smtpPort,
      user: username.substring(0, 3) + '***',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
