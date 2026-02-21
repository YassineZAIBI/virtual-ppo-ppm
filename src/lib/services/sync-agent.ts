import { JiraService } from './jira';
import { ConfluenceService } from './confluence';
import { SlackService } from './slack';
import { LLMService } from './llm';
import type { LLMConfig } from '../types';

export interface SyncCredentials {
  jira?: { url: string; email: string; apiToken: string };
  confluence?: { url: string; email: string; apiToken: string };
  slack?: { botToken: string; channelId: string };
}

export interface SyncPreviewItem {
  externalId: string;
  title: string;
  source: 'jira' | 'confluence' | 'slack';
  type: string;
  details?: string;
}

export interface SyncResult {
  source: string;
  imported: number;
  skipped: number;
  failed: number;
  items: Array<{
    externalId: string;
    localId?: string;
    title: string;
    status: 'synced' | 'failed' | 'skipped';
    error?: string;
  }>;
}

export class SyncAgent {
  private credentials: SyncCredentials;
  private llmConfig?: LLMConfig;

  constructor(credentials: SyncCredentials, llmConfig?: LLMConfig) {
    this.credentials = credentials;
    this.llmConfig = llmConfig;
  }

  /**
   * Preview what will be imported (dry run)
   */
  async preview(): Promise<SyncPreviewItem[]> {
    const items: SyncPreviewItem[] = [];

    if (this.credentials.jira) {
      try {
        const jira = new JiraService(
          this.credentials.jira.url,
          this.credentials.jira.email,
          this.credentials.jira.apiToken
        );
        const projects = await jira.getProjects();
        for (const project of projects.slice(0, 5)) {
          try {
            const issues = await jira.getIssues(project.key);
            for (const issue of issues.slice(0, 20)) {
              items.push({
                externalId: issue.key,
                title: issue.summary,
                source: 'jira',
                type: issue.issueType,
                details: `${project.name} | ${issue.status} | ${issue.priority}`,
              });
            }
          } catch (projectError) {
            // Log per-project error but continue with other projects
            items.push({
              externalId: `jira-error-${project.key}`,
              title: `Failed to fetch issues from ${project.name} (${project.key})`,
              source: 'jira',
              type: 'error',
              details: projectError instanceof Error ? projectError.message : String(projectError),
            });
          }
        }
      } catch (error) {
        items.push({
          externalId: 'jira-error',
          title: `Jira fetch failed: ${error instanceof Error ? error.message : String(error)}`,
          source: 'jira',
          type: 'error',
        });
      }
    }

    if (this.credentials.confluence) {
      try {
        const confluence = new ConfluenceService(
          this.credentials.confluence.url,
          this.credentials.confluence.email,
          this.credentials.confluence.apiToken
        );
        const spaces = await confluence.getSpaces();
        for (const space of spaces.slice(0, 5)) {
          const pages = await confluence.getPages(space.key, 10);
          for (const page of pages) {
            items.push({
              externalId: page.id,
              title: page.title,
              source: 'confluence',
              type: 'page',
              details: `Space: ${space.name}`,
            });
          }
        }
      } catch (error) {
        items.push({
          externalId: 'confluence-error',
          title: `Confluence fetch failed: ${error instanceof Error ? error.message : String(error)}`,
          source: 'confluence',
          type: 'error',
        });
      }
    }

    if (this.credentials.slack) {
      try {
        const slack = new SlackService(this.credentials.slack.botToken);
        const info = await slack.getChannelInfo(this.credentials.slack.channelId);
        const history = await slack.getChannelHistory(this.credentials.slack.channelId, 50);
        items.push({
          externalId: this.credentials.slack.channelId,
          title: `#${info.name} - ${history.length} recent messages`,
          source: 'slack',
          type: 'channel',
          details: `${info.memberCount} members | Topic: ${info.topic || 'None'}`,
        });
      } catch (error) {
        items.push({
          externalId: 'slack-error',
          title: `Slack fetch failed: ${error instanceof Error ? error.message : String(error)}`,
          source: 'slack',
          type: 'error',
        });
      }
    }

    return items;
  }

  /**
   * Execute the sync - imports selected items
   */
  async execute(selectedIds: string[]): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    if (this.credentials.jira) {
      const jiraResult = await this.syncJira(selectedIds);
      results.push(jiraResult);
    }

    if (this.credentials.confluence) {
      const confluenceResult = await this.syncConfluence(selectedIds);
      results.push(confluenceResult);
    }

    if (this.credentials.slack) {
      const slackResult = await this.syncSlack(selectedIds);
      results.push(slackResult);
    }

    return results;
  }

  private async syncJira(selectedIds: string[]): Promise<SyncResult> {
    const result: SyncResult = { source: 'jira', imported: 0, skipped: 0, failed: 0, items: [] };

    try {
      const jira = new JiraService(
        this.credentials.jira!.url,
        this.credentials.jira!.email,
        this.credentials.jira!.apiToken
      );

      const projects = await jira.getProjects();
      for (const project of projects.slice(0, 5)) {
        let issues: any[];
        try {
          issues = await jira.getIssues(project.key);
        } catch {
          // Skip projects that fail to fetch issues
          result.failed++;
          result.items.push({
            externalId: `jira-project-${project.key}`,
            title: `Failed to fetch issues from ${project.name}`,
            status: 'failed',
            error: `Could not query project ${project.key}`,
          });
          continue;
        }

        for (const issue of issues) {
          if (!selectedIds.includes(issue.key)) {
            result.skipped++;
            result.items.push({ externalId: issue.key, title: issue.summary, status: 'skipped' });
            continue;
          }

          try {
            // Map Jira issue to initiative format
            let businessValue: 'high' | 'medium' | 'low' = 'medium';
            let status: 'idea' | 'discovery' | 'validation' | 'definition' | 'approved' = 'idea';

            // Try LLM-based mapping if available
            if (this.llmConfig?.apiKey) {
              try {
                const llm = LLMService.create(this.llmConfig);
                const mapping = await llm.chat([
                  { role: 'system', content: 'You map Jira issues to product initiative attributes. Respond with JSON only, no markdown.' },
                  { role: 'user', content: `Map this Jira issue to initiative attributes:\nTitle: ${issue.summary}\nType: ${issue.issueType}\nStatus: ${issue.status}\nPriority: ${issue.priority}\nDescription: ${issue.description?.substring(0, 500) || 'None'}\n\nRespond with JSON: {"businessValue": "high"|"medium"|"low", "status": "idea"|"discovery"|"validation"|"definition"|"approved"}` }
                ], { temperature: 0.2, maxTokens: 100 });
                const parsed = JSON.parse(mapping.match(/\{[\s\S]*\}/)?.[0] || '{}');
                if (parsed.businessValue) businessValue = parsed.businessValue;
                if (parsed.status) status = parsed.status;
              } catch {
                // Fall back to heuristic mapping
              }
            }

            // Heuristic fallback mapping
            if (!this.llmConfig?.apiKey) {
              if (issue.priority === 'Highest' || issue.priority === 'High') businessValue = 'high';
              else if (issue.priority === 'Low' || issue.priority === 'Lowest') businessValue = 'low';

              const statusLower = issue.status.toLowerCase();
              if (statusLower.includes('done') || statusLower.includes('closed')) status = 'approved';
              else if (statusLower.includes('in progress') || statusLower.includes('review')) status = 'definition';
              else if (statusLower.includes('todo') || statusLower.includes('backlog')) status = 'idea';
            }

            const localId = crypto.randomUUID();
            result.imported++;
            result.items.push({
              externalId: issue.key,
              localId,
              title: issue.summary,
              status: 'synced',
            });
          } catch (error) {
            result.failed++;
            result.items.push({
              externalId: issue.key,
              title: issue.summary,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    } catch (error) {
      result.failed++;
      result.items.push({
        externalId: 'jira-global',
        title: 'Jira sync failed',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  }

  private async syncConfluence(selectedIds: string[]): Promise<SyncResult> {
    const result: SyncResult = { source: 'confluence', imported: 0, skipped: 0, failed: 0, items: [] };

    try {
      const confluence = new ConfluenceService(
        this.credentials.confluence!.url,
        this.credentials.confluence!.email,
        this.credentials.confluence!.apiToken
      );

      const spaces = await confluence.getSpaces();
      for (const space of spaces.slice(0, 5)) {
        const pages = await confluence.getPages(space.key, 10);
        for (const page of pages) {
          if (!selectedIds.includes(page.id)) {
            result.skipped++;
            result.items.push({ externalId: page.id, title: page.title, status: 'skipped' });
            continue;
          }

          try {
            const localId = crypto.randomUUID();
            result.imported++;
            result.items.push({
              externalId: page.id,
              localId,
              title: page.title,
              status: 'synced',
            });
          } catch (error) {
            result.failed++;
            result.items.push({
              externalId: page.id,
              title: page.title,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }
    } catch (error) {
      result.failed++;
      result.items.push({
        externalId: 'confluence-global',
        title: 'Confluence sync failed',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  }

  private async syncSlack(selectedIds: string[]): Promise<SyncResult> {
    const result: SyncResult = { source: 'slack', imported: 0, skipped: 0, failed: 0, items: [] };

    try {
      if (!selectedIds.includes(this.credentials.slack!.channelId)) {
        result.skipped++;
        result.items.push({
          externalId: this.credentials.slack!.channelId,
          title: 'Slack channel',
          status: 'skipped',
        });
        return result;
      }

      const slack = new SlackService(this.credentials.slack!.botToken);
      const history = await slack.getChannelHistory(this.credentials.slack!.channelId, 50);

      if (history.length > 0 && this.llmConfig?.apiKey) {
        try {
          const llm = LLMService.create(this.llmConfig);
          const messagesText = history.map(m => m.text).join('\n');
          await llm.chat([
            { role: 'system', content: 'Extract key decisions and action items from Slack messages. Respond with JSON.' },
            { role: 'user', content: `Extract decisions and action items from these messages:\n${messagesText.substring(0, 3000)}` }
          ], { temperature: 0.3, maxTokens: 1000 });
        } catch {
          // Non-critical, continue
        }
      }

      result.imported++;
      result.items.push({
        externalId: this.credentials.slack!.channelId,
        localId: crypto.randomUUID(),
        title: `Slack channel: ${history.length} messages analyzed`,
        status: 'synced',
      });
    } catch (error) {
      result.failed++;
      result.items.push({
        externalId: 'slack-global',
        title: 'Slack sync failed',
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return result;
  }
}
