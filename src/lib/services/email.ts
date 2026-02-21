// Email Service
// Sends transactional emails using nodemailer for meeting follow-ups,
// initiative notifications, and weekly digests.
// Uses dynamic import for nodemailer since it is a server-only module.

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
}

export class EmailService {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Dynamically imports nodemailer and creates a transporter.
   * This avoids bundling nodemailer into client-side code.
   */
  private async createTransporter() {
    try {
      const nodemailer = await import('nodemailer');
      return nodemailer.default.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.port === 465, // SSL for port 465, STARTTLS for others
        auth: {
          user: this.config.user,
          pass: this.config.password,
        },
      });
    } catch (error) {
      throw new Error(
        `Failed to create email transporter: ${error instanceof Error ? error.message : String(error)}. ` +
        'Ensure nodemailer is installed: npm install nodemailer'
      );
    }
  }

  /**
   * Sends an HTML email to a single recipient.
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      const transporter = await this.createTransporter();

      await transporter.sendMail({
        from: this.config.fromEmail,
        to,
        subject,
        html,
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Failed to create email transporter')) {
        throw error;
      }
      throw new Error(`Failed to send email to ${to}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sends a formatted meeting follow-up email to multiple recipients.
   * Includes a summary, action items table, and decisions list.
   */
  async sendMeetingFollowUp(
    to: string[],
    meeting: {
      title: string;
      summary: string;
      actionItems: Array<{ description: string; assignee: string }>;
      decisions: string[];
      date: Date;
    }
  ): Promise<void> {
    const formattedDate = meeting.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build the action items table rows
    const actionItemsRows = meeting.actionItems
      .map(
        (item, index) => `
        <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#ffffff'};">
          <td style="padding: 10px 14px; border-bottom: 1px solid #e0e0e0;">${this.escapeHtml(item.description)}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e0e0e0; font-weight: 500;">${this.escapeHtml(item.assignee)}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e0e0e0;"><span style="background-color: #fff3cd; color: #856404; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Pending</span></td>
        </tr>`
      )
      .join('');

    // Build the decisions list
    const decisionsList = meeting.decisions
      .map((decision) => `<li style="margin-bottom: 8px;">${this.escapeHtml(decision)}</li>`)
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; color: #333;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 32px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Meeting Follow-Up</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">${this.escapeHtml(meeting.title)} | ${this.escapeHtml(formattedDate)}</p>
  </div>

  <div style="padding: 24px 32px; background-color: #ffffff; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">Summary</h2>
    <p style="line-height: 1.6; color: #4a5568;">${this.escapeHtml(meeting.summary)}</p>

    ${meeting.actionItems.length > 0 ? `
    <h2 style="color: #2d3748; font-size: 18px; margin-top: 28px;">Action Items</h2>
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
      <thead>
        <tr style="background-color: #edf2f7;">
          <th style="text-align: left; padding: 10px 14px; font-size: 13px; text-transform: uppercase; color: #718096; border-bottom: 2px solid #e0e0e0;">Action Item</th>
          <th style="text-align: left; padding: 10px 14px; font-size: 13px; text-transform: uppercase; color: #718096; border-bottom: 2px solid #e0e0e0;">Assignee</th>
          <th style="text-align: left; padding: 10px 14px; font-size: 13px; text-transform: uppercase; color: #718096; border-bottom: 2px solid #e0e0e0;">Status</th>
        </tr>
      </thead>
      <tbody>${actionItemsRows}</tbody>
    </table>` : ''}

    ${meeting.decisions.length > 0 ? `
    <h2 style="color: #2d3748; font-size: 18px; margin-top: 28px;">Key Decisions</h2>
    <ol style="line-height: 1.6; color: #4a5568; padding-left: 20px;">${decisionsList}</ol>` : ''}
  </div>

  <div style="padding: 16px 32px; background-color: #f7fafc; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #a0aec0;">Generated by Virtual PPO/PPM</p>
  </div>
</body>
</html>`.trim();

    const subject = `Meeting Follow-Up: ${meeting.title} - ${formattedDate}`;

    try {
      const transporter = await this.createTransporter();

      await transporter.sendMail({
        from: this.config.fromEmail,
        to: to.join(', '),
        subject,
        html,
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Failed to create email transporter')) {
        throw error;
      }
      throw new Error(`Failed to send meeting follow-up email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sends an initiative status notification email to multiple recipients.
   */
  async sendInitiativeNotification(
    to: string[],
    initiative: {
      title: string;
      status: string;
      description: string;
    }
  ): Promise<void> {
    // Map status to a visual color
    const statusColors: Record<string, { bg: string; text: string }> = {
      idea: { bg: '#e2e8f0', text: '#4a5568' },
      discovery: { bg: '#bee3f8', text: '#2b6cb0' },
      validation: { bg: '#fefcbf', text: '#975a16' },
      definition: { bg: '#c6f6d5', text: '#276749' },
      approved: { bg: '#c6f6d5', text: '#22543d' },
    };

    const colors = statusColors[initiative.status] || { bg: '#e2e8f0', text: '#4a5568' };
    const statusLabel = initiative.status.charAt(0).toUpperCase() + initiative.status.slice(1);

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; color: #333;">
  <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 24px 32px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Initiative Update</h1>
  </div>

  <div style="padding: 24px 32px; background-color: #ffffff; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #2d3748; font-size: 20px; margin-top: 0;">${this.escapeHtml(initiative.title)}</h2>

    <div style="margin: 16px 0;">
      <span style="font-size: 13px; color: #718096; text-transform: uppercase; letter-spacing: 0.5px;">Status</span>
      <div style="margin-top: 4px;">
        <span style="background-color: ${colors.bg}; color: ${colors.text}; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: 500;">${statusLabel}</span>
      </div>
    </div>

    <h3 style="color: #2d3748; font-size: 16px; margin-top: 24px;">Description</h3>
    <p style="line-height: 1.6; color: #4a5568;">${this.escapeHtml(initiative.description)}</p>
  </div>

  <div style="padding: 16px 32px; background-color: #f7fafc; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #a0aec0;">Generated by Virtual PPO/PPM</p>
  </div>
</body>
</html>`.trim();

    const subject = `Initiative Update: ${initiative.title} - ${statusLabel}`;

    try {
      const transporter = await this.createTransporter();

      await transporter.sendMail({
        from: this.config.fromEmail,
        to: to.join(', '),
        subject,
        html,
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Failed to create email transporter')) {
        throw error;
      }
      throw new Error(`Failed to send initiative notification email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sends a weekly digest email summarizing initiatives, risks, and upcoming meetings.
   */
  async sendWeeklyDigest(
    to: string[],
    data: {
      initiatives: Array<{ title: string; status: string }>;
      risks: Array<{ title: string; severity: string }>;
      upcomingMeetings: Array<{ title: string; date: Date }>;
    }
  ): Promise<void> {
    // Build the initiatives list
    const initiativesRows = data.initiatives
      .map((init, index) => {
        const statusColors: Record<string, string> = {
          idea: '#718096',
          discovery: '#3182ce',
          validation: '#d69e2e',
          definition: '#38a169',
          approved: '#22543d',
        };
        const color = statusColors[init.status] || '#718096';
        const statusLabel = init.status.charAt(0).toUpperCase() + init.status.slice(1);

        return `
        <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#ffffff'};">
          <td style="padding: 10px 14px; border-bottom: 1px solid #e0e0e0;">${this.escapeHtml(init.title)}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e0e0e0;"><span style="color: ${color}; font-weight: 500;">${statusLabel}</span></td>
        </tr>`;
      })
      .join('');

    // Build the risks list
    const risksRows = data.risks
      .map((risk, index) => {
        const severityColors: Record<string, string> = {
          critical: '#e53e3e',
          high: '#dd6b20',
          medium: '#d69e2e',
          low: '#38a169',
        };
        const color = severityColors[risk.severity] || '#718096';

        return `
        <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#ffffff'};">
          <td style="padding: 10px 14px; border-bottom: 1px solid #e0e0e0;">${this.escapeHtml(risk.title)}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #e0e0e0;"><span style="color: ${color}; font-weight: 600; text-transform: uppercase; font-size: 12px;">${this.escapeHtml(risk.severity)}</span></td>
        </tr>`;
      })
      .join('');

    // Build the upcoming meetings list
    const meetingsList = data.upcomingMeetings
      .map((m) => {
        const meetingDate = m.date instanceof Date ? m.date : new Date(m.date);
        const formatted = meetingDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return `<li style="margin-bottom: 8px;"><strong>${this.escapeHtml(m.title)}</strong> - ${this.escapeHtml(formatted)}</li>`;
      })
      .join('');

    const weekStart = new Date();
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);

    const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; color: #333;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px 32px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Weekly Product Digest</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">${this.escapeHtml(dateRange)}</p>
  </div>

  <div style="padding: 24px 32px; background-color: #ffffff; border: 1px solid #e0e0e0; border-top: none;">
    <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">Initiatives (${data.initiatives.length})</h2>
    ${data.initiatives.length > 0 ? `
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
      <thead>
        <tr style="background-color: #edf2f7;">
          <th style="text-align: left; padding: 10px 14px; font-size: 13px; text-transform: uppercase; color: #718096; border-bottom: 2px solid #e0e0e0;">Initiative</th>
          <th style="text-align: left; padding: 10px 14px; font-size: 13px; text-transform: uppercase; color: #718096; border-bottom: 2px solid #e0e0e0;">Status</th>
        </tr>
      </thead>
      <tbody>${initiativesRows}</tbody>
    </table>` : '<p style="color: #a0aec0;">No active initiatives.</p>'}

    <h2 style="color: #2d3748; font-size: 18px; margin-top: 28px;">Active Risks (${data.risks.length})</h2>
    ${data.risks.length > 0 ? `
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
      <thead>
        <tr style="background-color: #edf2f7;">
          <th style="text-align: left; padding: 10px 14px; font-size: 13px; text-transform: uppercase; color: #718096; border-bottom: 2px solid #e0e0e0;">Risk</th>
          <th style="text-align: left; padding: 10px 14px; font-size: 13px; text-transform: uppercase; color: #718096; border-bottom: 2px solid #e0e0e0;">Severity</th>
        </tr>
      </thead>
      <tbody>${risksRows}</tbody>
    </table>` : '<p style="color: #a0aec0;">No active risks.</p>'}

    <h2 style="color: #2d3748; font-size: 18px; margin-top: 28px;">Upcoming Meetings</h2>
    ${data.upcomingMeetings.length > 0
      ? `<ul style="line-height: 1.6; color: #4a5568; padding-left: 20px;">${meetingsList}</ul>`
      : '<p style="color: #a0aec0;">No upcoming meetings scheduled.</p>'}
  </div>

  <div style="padding: 16px 32px; background-color: #f7fafc; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
    <p style="margin: 0; font-size: 12px; color: #a0aec0;">Generated by Virtual PPO/PPM</p>
  </div>
</body>
</html>`.trim();

    const subject = `Weekly Product Digest - ${dateRange}`;

    try {
      const transporter = await this.createTransporter();

      await transporter.sendMail({
        from: this.config.fromEmail,
        to: to.join(', '),
        subject,
        html,
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Failed to create email transporter')) {
        throw error;
      }
      throw new Error(`Failed to send weekly digest email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Escapes special HTML characters for safe embedding in email templates.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export default EmailService;
