import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/services/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, credentials, ...data } = body;

    const emailService = new EmailService({
      host: credentials?.smtpHost || process.env.SMTP_HOST || '',
      port: credentials?.smtpPort || parseInt(process.env.SMTP_PORT || '587'),
      user: credentials?.username || process.env.SMTP_USER || '',
      password: credentials?.password || process.env.SMTP_PASSWORD || '',
      fromEmail: credentials?.fromEmail || process.env.SMTP_FROM_EMAIL || '',
    });

    switch (action) {
      case 'send':
        await emailService.sendEmail(data.to, data.subject, data.html);
        return NextResponse.json({ success: true });
      case 'meeting-followup':
        await emailService.sendMeetingFollowUp(data.to, data.meeting);
        return NextResponse.json({ success: true });
      case 'initiative-notification':
        await emailService.sendInitiativeNotification(data.to, data.initiative);
        return NextResponse.json({ success: true });
      case 'weekly-digest':
        await emailService.sendWeeklyDigest(data.to, data.data);
        return NextResponse.json({ success: true });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Email API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
