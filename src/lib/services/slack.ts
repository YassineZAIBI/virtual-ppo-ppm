// Slack Web API Service
// Provides messaging, channel info, file uploads, and rich Block Kit message formatting.

import type { SlackMessage } from '../types';

const SLACK_API_BASE = 'https://slack.com/api';

export class SlackService {
  private botToken: string;

  constructor(botToken: string) {
    if (!botToken) {
      throw new Error('Slack bot token is required');
    }
    this.botToken = botToken;
  }

  /**
   * Returns authorization headers for the Slack Web API.
   * Uses Bearer token authentication.
   */
  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.botToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    };
  }

  /**
   * Posts a message to a Slack channel.
   * Optionally includes Block Kit blocks for rich formatting.
   */
  async postMessage(
    channel: string,
    text: string,
    blocks?: any[]
  ): Promise<{ ok: boolean; ts: string }> {
    try {
      const body: any = {
        channel,
        text, // Fallback text for notifications and accessibility
      };

      if (blocks && blocks.length > 0) {
        body.blocks = blocks;
      }

      const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error posting message: ${data.error || 'Unknown error'}`);
      }

      return { ok: data.ok, ts: data.ts };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Slack API error')) {
        throw error;
      }
      throw new Error(`Failed to post Slack message to ${channel}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Posts a threaded reply to an existing message.
   */
  async postThreadReply(
    channel: string,
    threadTs: string,
    text: string
  ): Promise<{ ok: boolean; ts: string }> {
    try {
      const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          channel,
          text,
          thread_ts: threadTs,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error posting thread reply: ${data.error || 'Unknown error'}`);
      }

      return { ok: data.ok, ts: data.ts };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Slack API error')) {
        throw error;
      }
      throw new Error(`Failed to post Slack thread reply in ${channel}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves recent message history for a channel.
   * Returns messages mapped to our SlackMessage type.
   */
  async getChannelHistory(channel: string, limit: number = 20): Promise<SlackMessage[]> {
    try {
      const params = new URLSearchParams({
        channel,
        limit: String(limit),
      });

      const response = await fetch(`${SLACK_API_BASE}/conversations.history?${params.toString()}`, {
        method: 'GET',
        headers: this.headers(),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error fetching channel history: ${data.error || 'Unknown error'}`);
      }

      return (data.messages || []).map((msg: any) => ({
        channel,
        text: msg.text || '',
        blocks: msg.blocks,
        threadTs: msg.thread_ts,
      }));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Slack API error')) {
        throw error;
      }
      throw new Error(`Failed to fetch Slack channel history for ${channel}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves information about a Slack channel including name, topic, and member count.
   */
  async getChannelInfo(
    channel: string
  ): Promise<{ name: string; topic: string; memberCount: number }> {
    try {
      const params = new URLSearchParams({ channel });

      const response = await fetch(`${SLACK_API_BASE}/conversations.info?${params.toString()}`, {
        method: 'GET',
        headers: this.headers(),
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error fetching channel info: ${data.error || 'Unknown error'}`);
      }

      return {
        name: data.channel?.name || '',
        topic: data.channel?.topic?.value || '',
        memberCount: data.channel?.num_members || 0,
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Slack API error')) {
        throw error;
      }
      throw new Error(`Failed to fetch Slack channel info for ${channel}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Uploads a file (as text content) to a Slack channel.
   * Uses the files.upload API endpoint.
   */
  async uploadFile(
    channel: string,
    content: string,
    filename: string,
    title?: string
  ): Promise<void> {
    try {
      // Use multipart form data for file upload
      const formData = new FormData();
      formData.append('channels', channel);
      formData.append('content', content);
      formData.append('filename', filename);
      if (title) {
        formData.append('title', title);
      }

      const response = await fetch(`${SLACK_API_BASE}/files.upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.botToken}`,
          // Do not set Content-Type; let the browser/runtime set it with boundary for multipart
        },
        body: formData,
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error uploading file: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Slack API error')) {
        throw error;
      }
      throw new Error(`Failed to upload file to Slack channel ${channel}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Sends a formatted meeting summary to a Slack channel using Block Kit.
   * Includes sections for summary, action items, and decisions.
   */
  async sendMeetingSummary(
    channel: string,
    meeting: {
      title: string;
      summary: string;
      actionItems: Array<{ description: string; assignee: string }>;
      decisions: string[];
    }
  ): Promise<void> {
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Meeting Summary: ${meeting.title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary*\n${meeting.summary}`,
        },
      },
      { type: 'divider' },
    ];

    // Action Items section
    if (meeting.actionItems.length > 0) {
      const actionItemsText = meeting.actionItems
        .map((item, index) => `${index + 1}. *${item.description}* - Assigned to: _${item.assignee}_`)
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Action Items*\n${actionItemsText}`,
        },
      });
      blocks.push({ type: 'divider' });
    }

    // Decisions section
    if (meeting.decisions.length > 0) {
      const decisionsText = meeting.decisions
        .map((decision, index) => `${index + 1}. ${decision}`)
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Decisions*\n${decisionsText}`,
        },
      });
    }

    // Add a footer context block
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Generated by Virtual PPO/PPM | ${new Date().toLocaleDateString()}`,
        },
      ],
    });

    const fallbackText = `Meeting Summary: ${meeting.title} - ${meeting.actionItems.length} action items, ${meeting.decisions.length} decisions`;

    await this.postMessage(channel, fallbackText, blocks);
  }

  /**
   * Sends a formatted initiative status update to a Slack channel using Block Kit.
   */
  async sendInitiativeUpdate(
    channel: string,
    initiative: {
      title: string;
      status: string;
      description: string;
    }
  ): Promise<void> {
    // Map status to a visual indicator
    const statusIndicator: Record<string, string> = {
      idea: ':bulb:',
      discovery: ':mag:',
      validation: ':test_tube:',
      definition: ':memo:',
      approved: ':white_check_mark:',
    };

    const indicator = statusIndicator[initiative.status] || ':blue_book:';

    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `Initiative Update: ${initiative.title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Status:*\n${indicator} ${initiative.status.charAt(0).toUpperCase() + initiative.status.slice(1)}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description*\n${initiative.description}`,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Updated by Virtual PPO/PPM | ${new Date().toLocaleDateString()}`,
          },
        ],
      },
    ];

    const fallbackText = `Initiative Update: ${initiative.title} - Status: ${initiative.status}`;

    await this.postMessage(channel, fallbackText, blocks);
  }
}

export default SlackService;
