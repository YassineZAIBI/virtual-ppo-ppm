import { db } from '@/lib/db';

const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

interface NotionPage {
  id: string;
  title: string;
  url: string;
  content?: string;
  lastEditedAt?: string;
  properties?: Record<string, unknown>;
}

interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  properties: Record<string, unknown>;
}

function notionHeaders(accessToken: string) {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

/**
 * Search Notion pages and databases.
 */
export async function searchNotion(
  accessToken: string,
  query: string,
  limit = 10
): Promise<NotionPage[]> {
  const res = await fetch(`${NOTION_API_BASE}/search`, {
    method: 'POST',
    headers: notionHeaders(accessToken),
    body: JSON.stringify({
      query,
      filter: { value: 'page', property: 'object' },
      page_size: limit,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Notion search failed: ${res.status}`);

  const data = await res.json();
  return (data.results ?? []).map((page: Record<string, unknown>) => ({
    id: page.id as string,
    title: extractNotionTitle(page),
    url: (page.url as string) ?? '',
    lastEditedAt: (page.last_edited_time as string) ?? '',
  }));
}

/**
 * Get full page content as plain text.
 */
export async function getNotionPageContent(
  accessToken: string,
  pageId: string
): Promise<string> {
  const res = await fetch(`${NOTION_API_BASE}/blocks/${pageId}/children`, {
    headers: notionHeaders(accessToken),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Notion page fetch failed: ${res.status}`);

  const data = await res.json();
  const blocks = data.results ?? [];

  return blocks
    .map((block: Record<string, unknown>) => extractBlockText(block))
    .filter(Boolean)
    .join('\n');
}

/**
 * Create a new Notion page.
 */
export async function createNotionPage(
  accessToken: string,
  parentPageId: string,
  title: string,
  content: string
): Promise<string> {
  const res = await fetch(`${NOTION_API_BASE}/pages`, {
    method: 'POST',
    headers: notionHeaders(accessToken),
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: {
        title: {
          title: [{ type: 'text', text: { content: title } }],
        },
      },
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content } }],
          },
        },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Notion page create failed: ${res.status}`);
  const data = await res.json();
  return data.id as string;
}

/**
 * List all databases the integration has access to.
 */
export async function listNotionDatabases(
  accessToken: string
): Promise<NotionDatabase[]> {
  const res = await fetch(`${NOTION_API_BASE}/search`, {
    method: 'POST',
    headers: notionHeaders(accessToken),
    body: JSON.stringify({
      filter: { value: 'database', property: 'object' },
      page_size: 20,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Notion database list failed: ${res.status}`);
  const data = await res.json();

  return (data.results ?? []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    title: extractNotionTitle(item),
    url: (item.url as string) ?? '',
    properties: (item.properties as Record<string, unknown>) ?? {},
  }));
}

/**
 * Ingest Notion pages into BrainNode graph for a user.
 * Searches for pages matching query and writes each as a BrainNode.
 */
export async function ingestNotionPages(
  userId: string,
  accessToken: string,
  query = '',
  limit = 10
): Promise<number> {
  const pages = await searchNotion(accessToken, query, limit);
  let ingested = 0;

  for (const page of pages) {
    try {
      const content = await getNotionPageContent(accessToken, page.id);
      if (!content.trim()) continue;

      await db.brainNode.upsert({
        where: {
          userId_type_title: {
            userId,
            type: 'decision',
            title: `[Notion] ${page.title.slice(0, 100)}`,
          },
        },
        create: {
          userId,
          type: 'decision',
          title: `[Notion] ${page.title.slice(0, 100)}`,
          content: content.slice(0, 5000),
          summary: page.title.slice(0, 120),
          source: 'notion',
          sourceUrl: page.url,
          sourceId: page.id,
          agentType: 'global',
          confidence: 0.9,
        },
        update: {
          content: content.slice(0, 5000),
          summary: page.title.slice(0, 120),
          updatedAt: new Date(),
        },
      });

      ingested++;
    } catch (err) {
      console.error(`[notion] Failed to ingest page ${page.id}:`, err);
    }
  }

  return ingested;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractNotionTitle(obj: Record<string, unknown>): string {
  try {
    const props = obj.properties as Record<string, unknown>;
    if (props?.title) {
      const titleArr = (props.title as Record<string, unknown>).title as Array<{ plain_text: string }>;
      return titleArr?.map((t) => t.plain_text).join('') ?? '';
    }
    const titleDirect = obj.title as Array<{ plain_text: string }>;
    if (Array.isArray(titleDirect)) {
      return titleDirect.map((t) => t.plain_text).join('');
    }
  } catch {
    // Fall through to default
  }
  return 'Untitled';
}

function extractBlockText(block: Record<string, unknown>): string {
  try {
    const type = block.type as string;
    const blockData = block[type] as Record<string, unknown>;
    const richText = blockData?.rich_text as Array<{ plain_text: string }>;
    if (Array.isArray(richText)) {
      return richText.map((t) => t.plain_text).join('');
    }
  } catch {
    // Fall through to empty
  }
  return '';
}
