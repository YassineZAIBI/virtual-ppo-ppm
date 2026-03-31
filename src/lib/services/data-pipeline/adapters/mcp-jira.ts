import { DataAdapter, DataResult, FetchOptions } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';

/**
 * MCP Jira adapter — wraps the existing Jira integration.
 * Searches Jira issues via the internal /api/integrations/jira endpoint.
 */
const mcpJira: DataAdapter = {
  key: 'mcp-jira',

  metadata: {
    name: 'Jira (MCP)',
    icon: 'SquareKanban',
    category: 'mcp',
    description: 'Search your Jira issues and epics via the existing integration.',
    rateLimit: { requests: 60, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: true,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    const now = new Date();

    try {
      const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
      const res = await fetch(`${baseUrl}/api/integrations/jira`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          query,
          limit: maxResults,
          config: options?.config,
        }),
        signal: options?.signal,
      });

      if (!res.ok) {
        throw new Error(`Jira API returned ${res.status}`);
      }

      const json = await res.json();
      const issues = json.issues ?? json.results ?? [];

      return issues.slice(0, maxResults).map((issue: any) => {
        const fields = issue.fields ?? {};
        return {
          sourceKey: 'mcp-jira',
          sourceUrl: issue.self ? issue.self.replace('/rest/api/2/issue/', '/browse/') : '',
          sourceName: 'Jira',
          title: `[${issue.key}] ${fields.summary ?? '(no summary)'}`,
          content: [
            fields.description?.replace(/<[^>]*>/g, '').slice(0, 1500) || '',
            fields.status?.name ? `Status: ${fields.status.name}` : '',
            fields.priority?.name ? `Priority: ${fields.priority.name}` : '',
            fields.assignee?.displayName ? `Assignee: ${fields.assignee.displayName}` : '',
          ].filter(Boolean).join('\n'),
          contentType: 'article' as const,
          publishedAt: fields.created ? new Date(fields.created) : undefined,
          fetchedAt: now,
          metadata: {
            key: issue.key,
            issueType: fields.issuetype?.name,
            status: fields.status?.name,
            priority: fields.priority?.name,
            assignee: fields.assignee?.displayName,
            labels: fields.labels ?? [],
          },
          relevanceHint: 0.8,
        };
      });
    } catch (error) {
      console.error(`[mcp-jira] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection(config?: Record<string, any>) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/integrations/jira/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config ?? {}),
      });
      const data = await res.json();
      return { ok: data.success ?? res.ok, error: data.error };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(mcpJira);
