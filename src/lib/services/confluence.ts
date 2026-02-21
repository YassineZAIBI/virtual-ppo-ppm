// Confluence REST API Service
// Provides CRUD operations for spaces, pages, and content search.
// Uses Confluence REST API v2 with fallback to v1 where needed.

import type { ConfluencePage } from '../types';

export class ConfluenceService {
  private baseUrl: string;
  private email: string;
  private apiToken: string;

  constructor(baseUrl: string, email: string, apiToken: string) {
    // Normalize the base URL by stripping trailing slashes
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.email = email;
    this.apiToken = apiToken;
  }

  /**
   * Returns authorization and content-type headers for the Confluence REST API.
   * Uses HTTP Basic authentication with email:apiToken encoded as Base64.
   */
  private headers(): Record<string, string> {
    const credentials = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');
    return {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Fetches all spaces visible to the authenticated user.
   */
  async getSpaces(): Promise<Array<{ key: string; name: string }>> {
    try {
      // Try v2 API first
      const response = await fetch(`${this.baseUrl}/wiki/api/v2/spaces`, {
        method: 'GET',
        headers: this.headers(),
      });

      if (response.ok) {
        const data = await response.json();
        return (data.results || []).map((space: any) => ({
          key: space.key,
          name: space.name,
        }));
      }

      // Fallback to v1 API
      const fallbackResponse = await fetch(`${this.baseUrl}/wiki/rest/api/space`, {
        method: 'GET',
        headers: this.headers(),
      });

      if (!fallbackResponse.ok) {
        const errorBody = await fallbackResponse.text();
        throw new Error(
          `Confluence API error fetching spaces: ${fallbackResponse.status} ${fallbackResponse.statusText} - ${errorBody}`
        );
      }

      const fallbackData = await fallbackResponse.json();
      return (fallbackData.results || []).map((space: any) => ({
        key: space.key,
        name: space.name,
      }));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Confluence API error')) {
        throw error;
      }
      throw new Error(`Failed to fetch Confluence spaces: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetches pages within a given space.
   * Returns up to `limit` pages (default 25).
   */
  async getPages(spaceKey: string, limit: number = 25): Promise<ConfluencePage[]> {
    try {
      // Try v2 API first
      const params = new URLSearchParams({
        'space-id': '', // v2 uses space ID; we'll fall back to v1
        limit: String(limit),
      });

      // v1 API is more reliable for space-key-based queries
      const response = await fetch(
        `${this.baseUrl}/wiki/rest/api/content?spaceKey=${encodeURIComponent(spaceKey)}&limit=${limit}&expand=version,body.storage`,
        {
          method: 'GET',
          headers: this.headers(),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Confluence API error fetching pages for space ${spaceKey}: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      return (data.results || []).map((page: any) => this.mapPage(page, spaceKey));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Confluence API error')) {
        throw error;
      }
      throw new Error(`Failed to fetch Confluence pages for space ${spaceKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetches a single page by its ID with full body content.
   */
  async getPage(pageId: string): Promise<ConfluencePage> {
    try {
      // Try v2 API first
      const response = await fetch(
        `${this.baseUrl}/wiki/api/v2/pages/${pageId}?body-format=storage`,
        {
          method: 'GET',
          headers: this.headers(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          id: data.id,
          title: data.title || '',
          spaceKey: data.spaceId || '',
          body: data.body?.storage?.value || '',
          version: data.version?.number || 1,
          url: data._links?.webui
            ? `${this.baseUrl}/wiki${data._links.webui}`
            : `${this.baseUrl}/wiki/pages/${data.id}`,
        };
      }

      // Fallback to v1 API
      const fallbackResponse = await fetch(
        `${this.baseUrl}/wiki/rest/api/content/${pageId}?expand=version,body.storage,space`,
        {
          method: 'GET',
          headers: this.headers(),
        }
      );

      if (!fallbackResponse.ok) {
        const errorBody = await fallbackResponse.text();
        throw new Error(
          `Confluence API error fetching page ${pageId}: ${fallbackResponse.status} ${fallbackResponse.statusText} - ${errorBody}`
        );
      }

      const fallbackData = await fallbackResponse.json();
      return this.mapPage(fallbackData, fallbackData.space?.key || '');
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Confluence API error')) {
        throw error;
      }
      throw new Error(`Failed to fetch Confluence page ${pageId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates a new page in the specified space.
   * Body should be in Confluence storage format (XHTML).
   * Optionally creates the page as a child of parentId.
   */
  async createPage(
    spaceKey: string,
    title: string,
    body: string,
    parentId?: string
  ): Promise<ConfluencePage> {
    try {
      // Use v1 API for page creation (more reliable with space keys)
      const requestBody: any = {
        type: 'page',
        title,
        space: { key: spaceKey },
        body: {
          storage: {
            value: body,
            representation: 'storage',
          },
        },
      };

      if (parentId) {
        requestBody.ancestors = [{ id: parentId }];
      }

      const response = await fetch(`${this.baseUrl}/wiki/rest/api/content`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Confluence API error creating page in space ${spaceKey}: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      return this.mapPage(data, spaceKey);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Confluence API error')) {
        throw error;
      }
      throw new Error(`Failed to create Confluence page in space ${spaceKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates an existing page. Requires the current version number
   * (the new version will be version + 1).
   * Body should be in Confluence storage format (XHTML).
   */
  async updatePage(
    pageId: string,
    title: string,
    body: string,
    version: number
  ): Promise<ConfluencePage> {
    try {
      const requestBody = {
        type: 'page',
        title,
        body: {
          storage: {
            value: body,
            representation: 'storage',
          },
        },
        version: {
          number: version + 1,
        },
      };

      const response = await fetch(`${this.baseUrl}/wiki/rest/api/content/${pageId}`, {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Confluence API error updating page ${pageId}: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      return this.mapPage(data, data.space?.key || '');
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Confluence API error')) {
        throw error;
      }
      throw new Error(`Failed to update Confluence page ${pageId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Searches Confluence content using CQL (Confluence Query Language).
   * Optionally scoped to a specific space.
   */
  async searchContent(query: string, spaceKey?: string): Promise<ConfluencePage[]> {
    try {
      let cql = `text ~ "${query.replace(/"/g, '\\"')}"`;
      if (spaceKey) {
        cql += ` AND space = "${spaceKey}"`;
      }

      const params = new URLSearchParams({
        cql,
        limit: '25',
        expand: 'version,body.storage,space',
      });

      const response = await fetch(
        `${this.baseUrl}/wiki/rest/api/content/search?${params.toString()}`,
        {
          method: 'GET',
          headers: this.headers(),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Confluence API error searching content with query "${query}": ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      return (data.results || []).map((page: any) =>
        this.mapPage(page, page.space?.key || spaceKey || '')
      );
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Confluence API error')) {
        throw error;
      }
      throw new Error(`Failed to search Confluence content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates a formatted meeting notes page in Confluence storage format (XHTML).
   * Includes sections for summary, action items, decisions, and date metadata.
   */
  async createMeetingNotesPage(
    spaceKey: string,
    meeting: {
      title: string;
      summary: string;
      actionItems: Array<{ description: string; assignee: string }>;
      decisions: string[];
      date: Date;
    }
  ): Promise<ConfluencePage> {
    const formattedDate = meeting.date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build the action items table rows
    const actionItemsRows = meeting.actionItems
      .map(
        (item) =>
          `<tr><td><p>${this.escapeHtml(item.description)}</p></td><td><p>${this.escapeHtml(item.assignee)}</p></td><td><p>Pending</p></td></tr>`
      )
      .join('');

    // Build the decisions list
    const decisionsList = meeting.decisions
      .map((decision) => `<li><p>${this.escapeHtml(decision)}</p></li>`)
      .join('');

    // Confluence storage format (XHTML) body
    const body = `
<ac:structured-macro ac:name="info" ac:schema-version="1">
  <ac:rich-text-body>
    <p><strong>Meeting Date:</strong> ${this.escapeHtml(formattedDate)}</p>
  </ac:rich-text-body>
</ac:structured-macro>

<h2>Summary</h2>
<p>${this.escapeHtml(meeting.summary)}</p>

<h2>Action Items</h2>
${
  meeting.actionItems.length > 0
    ? `<table>
  <thead>
    <tr>
      <th><p>Action Item</p></th>
      <th><p>Assignee</p></th>
      <th><p>Status</p></th>
    </tr>
  </thead>
  <tbody>
    ${actionItemsRows}
  </tbody>
</table>`
    : '<p><em>No action items recorded.</em></p>'
}

<h2>Key Decisions</h2>
${
  meeting.decisions.length > 0
    ? `<ol>${decisionsList}</ol>`
    : '<p><em>No decisions recorded.</em></p>'
}

<hr />
<p><em>Generated by Azmyra on ${new Date().toLocaleDateString()}</em></p>
`.trim();

    const pageTitle = `Meeting Notes: ${meeting.title} - ${formattedDate}`;

    return this.createPage(spaceKey, pageTitle, body);
  }

  /**
   * Maps a raw Confluence API response to our ConfluencePage type.
   */
  private mapPage(page: any, spaceKey: string): ConfluencePage {
    return {
      id: page.id || '',
      title: page.title || '',
      spaceKey: page.space?.key || spaceKey,
      body: page.body?.storage?.value || '',
      version: page.version?.number || 1,
      url: page._links?.webui
        ? `${this.baseUrl}/wiki${page._links.webui}`
        : `${this.baseUrl}/wiki/pages/viewpage.action?pageId=${page.id}`,
    };
  }

  /**
   * Escapes special HTML characters for safe embedding in Confluence storage format.
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

export default ConfluenceService;
