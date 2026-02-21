/**
 * MCP (Model Context Protocol) Client for AI Assistant
 *
 * This module provides tool definitions that the AI assistant can use
 * to interact with external services (Jira, Slack, Confluence) dynamically.
 *
 * The MCP layer sits between the LLM and the REST API services,
 * allowing the AI to decide which tools to call based on user intent.
 */

import { MCPToolCall, MCPToolResult } from '../types';

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
  }>;
}

// Available tools that the AI assistant can use
export const mcpTools: MCPTool[] = [
  {
    name: 'jira_search_issues',
    description: 'Search for Jira issues using JQL query',
    parameters: {
      jql: { type: 'string', description: 'JQL query string', required: true },
    },
  },
  {
    name: 'jira_create_issue',
    description: 'Create a new Jira issue (story, task, bug)',
    parameters: {
      summary: { type: 'string', description: 'Issue title/summary', required: true },
      description: { type: 'string', description: 'Issue description' },
      issueType: { type: 'string', description: 'Issue type', enum: ['Story', 'Task', 'Bug', 'Epic'] },
      labels: { type: 'string', description: 'Comma-separated labels' },
    },
  },
  {
    name: 'jira_get_issue',
    description: 'Get details of a specific Jira issue by key',
    parameters: {
      issueKey: { type: 'string', description: 'Jira issue key (e.g. PROJ-123)', required: true },
    },
  },
  {
    name: 'jira_add_comment',
    description: 'Add a comment to a Jira issue',
    parameters: {
      issueKey: { type: 'string', description: 'Jira issue key', required: true },
      body: { type: 'string', description: 'Comment text', required: true },
    },
  },
  {
    name: 'slack_post_message',
    description: 'Send a message to a Slack channel',
    parameters: {
      text: { type: 'string', description: 'Message text', required: true },
      channel: { type: 'string', description: 'Channel ID (optional, uses default)' },
    },
  },
  {
    name: 'slack_send_meeting_summary',
    description: 'Post a formatted meeting summary to Slack',
    parameters: {
      title: { type: 'string', description: 'Meeting title', required: true },
      summary: { type: 'string', description: 'Meeting summary', required: true },
      actionItems: { type: 'string', description: 'JSON array of action items' },
      decisions: { type: 'string', description: 'JSON array of decisions' },
    },
  },
  {
    name: 'confluence_search',
    description: 'Search Confluence pages by query',
    parameters: {
      query: { type: 'string', description: 'Search query', required: true },
    },
  },
  {
    name: 'confluence_create_page',
    description: 'Create a new Confluence page',
    parameters: {
      title: { type: 'string', description: 'Page title', required: true },
      body: { type: 'string', description: 'Page content (HTML)', required: true },
      spaceKey: { type: 'string', description: 'Space key (optional, uses default)' },
    },
  },
  {
    name: 'email_send',
    description: 'Send an email notification',
    parameters: {
      to: { type: 'string', description: 'Recipient email address(es), comma-separated', required: true },
      subject: { type: 'string', description: 'Email subject', required: true },
      body: { type: 'string', description: 'Email body (HTML)', required: true },
    },
  },
];

/**
 * Execute an MCP tool call by routing to the appropriate API endpoint
 */
export async function executeMCPTool(
  toolCall: MCPToolCall,
  baseUrl: string = ''
): Promise<MCPToolResult> {
  try {
    const { name, arguments: args } = toolCall;

    let endpoint = '';
    let method = 'POST';
    let body: any = {};

    switch (name) {
      // Jira tools
      case 'jira_search_issues':
        endpoint = `/api/integrations/jira?action=issues&jql=${encodeURIComponent(args.jql)}`;
        method = 'GET';
        break;
      case 'jira_create_issue':
        endpoint = '/api/integrations/jira';
        body = {
          action: 'create',
          summary: args.summary,
          description: args.description || '',
          issueType: args.issueType || 'Story',
          labels: args.labels ? args.labels.split(',').map((l: string) => l.trim()) : [],
        };
        break;
      case 'jira_get_issue':
        endpoint = `/api/integrations/jira?action=issue&issueKey=${encodeURIComponent(args.issueKey)}`;
        method = 'GET';
        break;
      case 'jira_add_comment':
        endpoint = '/api/integrations/jira';
        body = { action: 'comment', issueKey: args.issueKey, body: args.body };
        break;

      // Slack tools
      case 'slack_post_message':
        endpoint = '/api/integrations/slack';
        body = { action: 'message', text: args.text, channel: args.channel };
        break;
      case 'slack_send_meeting_summary':
        endpoint = '/api/integrations/slack';
        body = {
          action: 'meeting-summary',
          meeting: {
            title: args.title,
            summary: args.summary,
            actionItems: args.actionItems ? JSON.parse(args.actionItems) : [],
            decisions: args.decisions ? JSON.parse(args.decisions) : [],
          },
        };
        break;

      // Confluence tools
      case 'confluence_search':
        endpoint = `/api/integrations/confluence?action=search&q=${encodeURIComponent(args.query)}`;
        method = 'GET';
        break;
      case 'confluence_create_page':
        endpoint = '/api/integrations/confluence';
        body = {
          action: 'create-page',
          title: args.title,
          body: args.body,
          spaceKey: args.spaceKey,
        };
        break;

      // Email tools
      case 'email_send':
        endpoint = '/api/integrations/email';
        body = {
          action: 'send',
          to: args.to,
          subject: args.subject,
          html: args.body,
        };
        break;

      default:
        return { content: `Unknown tool: ${name}`, isError: true };
    }

    const url = `${baseUrl}${endpoint}`;
    const fetchOptions: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const data = await response.json();

    if (!response.ok) {
      return {
        content: `Error: ${data.error || 'Request failed'}`,
        isError: true,
        metadata: { statusCode: response.status },
      };
    }

    return {
      content: JSON.stringify(data, null, 2),
      isError: false,
      metadata: { tool: name },
    };
  } catch (error: any) {
    return {
      content: `Tool execution failed: ${error.message}`,
      isError: true,
    };
  }
}

/**
 * Generate the system prompt addition that describes available tools to the LLM
 */
export function getMCPToolsPrompt(): string {
  const toolDescriptions = mcpTools.map(tool => {
    const params = Object.entries(tool.parameters)
      .map(([key, val]) => `  - ${key} (${val.type}${val.required ? ', required' : ''}): ${val.description}`)
      .join('\n');
    return `**${tool.name}**: ${tool.description}\nParameters:\n${params}`;
  }).join('\n\n');

  return `
You have access to the following tools to interact with external services. When a user's request requires interacting with Jira, Slack, Confluence, or sending emails, you should indicate which tool to use in your response.

To use a tool, include a JSON block in your response with this format:
\`\`\`tool
{"name": "tool_name", "arguments": {"param1": "value1"}}
\`\`\`

Available tools:
${toolDescriptions}

Only use tools when the user's request specifically requires external action. For general questions, respond normally without tools.`;
}

/**
 * Parse tool calls from an LLM response
 */
export function parseToolCalls(response: string): MCPToolCall[] {
  const toolCalls: MCPToolCall[] = [];
  const toolRegex = /```tool\s*\n?([\s\S]*?)```/g;
  let match;

  while ((match = toolRegex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.name && parsed.arguments) {
        toolCalls.push(parsed);
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return toolCalls;
}
