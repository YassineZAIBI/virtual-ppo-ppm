import { DataAdapter, DataResult, FetchOptions } from '../types';
import { registry } from '../registry';

/**
 * MCP Confluence adapter — wraps the existing Confluence integration.
 * Searches Confluence content via the internal /api/integrations/confluence endpoint.
 */
const mcpConfluence: DataAdapter = {
  key: 'mcp-confluence',

  metadata: {
    name: 'Confluence (MCP)',
    icon: 'BookOpen',
    category: 'mcp',
    description: 'Search your Confluence knowledge base via the existing integration.',
    rateLimit: { requests: 60, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: true,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    const now = new Date();

    try {
      // Use the internal Confluence integration API
      const baseUrl = typeof window !== 'undefined' ? '' : (process.env.NEXTAUTH_URL || 'http://localhost:3000');
      const res = await fetch(`${baseUrl}/api/integrations/confluence`, {
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
        throw new Error(`Confluence API returned ${res.status}`);
      }

      const json = await res.json();
      const results = json.results ?? [];

      return results.slice(0, maxResults).map((r: any) => ({
        sourceKey: 'mcp-confluence',
        sourceUrl: r.url || r._links?.webui || '',
        sourceName: 'Confluence',
        title: r.title ?? '(untitled)',
        content: (r.body?.storage?.value ?? r.excerpt ?? r.title ?? '').replace(/<[^>]*>/g, '').slice(0, 2000),
        contentType: 'article' as const,
        publishedAt: r.history?.createdDate ? new Date(r.history.createdDate) : undefined,
        fetchedAt: now,
        metadata: {
          spaceKey: r.space?.key,
          spaceName: r.space?.name,
          type: r.type,
          status: r.status,
        },
        relevanceHint: 0.8,
      }));
    } catch (error) {
      console.error(`[mcp-confluence] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection(config?: Record<string, any>) {
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/integrations/confluence/test`, {
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

registry.register(mcpConfluence);
