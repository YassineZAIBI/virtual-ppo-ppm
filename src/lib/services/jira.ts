// Jira REST API Service
// Provides full CRUD operations for Jira issues, projects, transitions, and search.

import type { JiraIssue, JiraProject } from '../types';

export class JiraService {
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
   * Returns the authorization and content-type headers for Jira REST API v3.
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
   * Fetches all projects visible to the authenticated user.
   */
  async getProjects(): Promise<JiraProject[]> {
    try {
      const response = await fetch(`${this.baseUrl}/rest/api/3/project`, {
        method: 'GET',
        headers: this.headers(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Jira API error fetching projects: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();

      return data.map((project: any) => ({
        key: project.key,
        name: project.name,
        id: project.id,
      }));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Jira API error')) {
        throw error;
      }
      throw new Error(`Failed to fetch Jira projects: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetches issues for a given project, optionally filtered by a JQL query.
   * If no JQL is provided, returns all issues in the project ordered by creation date descending.
   */
  async getIssues(projectKey: string, jql?: string): Promise<JiraIssue[]> {
    const query = jql || `project = "${projectKey}" ORDER BY created DESC`;
    return this.searchIssues(query);
  }

  /**
   * Fetches a single issue by its key (e.g. "PROJ-123").
   */
  async getIssue(issueKey: string): Promise<JiraIssue> {
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}?fields=summary,description,status,assignee,priority,issuetype,labels,created,updated,customfield_10016`,
        {
          method: 'GET',
          headers: this.headers(),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Jira API error fetching issue ${issueKey}: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      return this.mapIssue(data);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Jira API error')) {
        throw error;
      }
      throw new Error(`Failed to fetch Jira issue ${issueKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Creates a new issue in the specified project.
   */
  async createIssue(
    projectKey: string,
    data: {
      summary: string;
      description: string;
      issueType: string;
      labels?: string[];
      storyPoints?: number;
    }
  ): Promise<JiraIssue> {
    try {
      // Build the request body using Atlassian Document Format (ADF) for description
      const body: any = {
        fields: {
          project: { key: projectKey },
          summary: data.summary,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: data.description,
                  },
                ],
              },
            ],
          },
          issuetype: { name: data.issueType },
        },
      };

      if (data.labels && data.labels.length > 0) {
        body.fields.labels = data.labels;
      }

      // Story points are commonly stored in customfield_10016 (Jira Software)
      if (data.storyPoints !== undefined) {
        body.fields.customfield_10016 = data.storyPoints;
      }

      const response = await fetch(`${this.baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Jira API error creating issue in ${projectKey}: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const result = await response.json();

      // Fetch the full issue to return a complete JiraIssue object
      return this.getIssue(result.key);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Jira API error')) {
        throw error;
      }
      throw new Error(`Failed to create Jira issue in ${projectKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Updates fields on an existing issue.
   * Supports updating summary, description, and status.
   * Note: status changes should use transitionIssue() for proper workflow compliance.
   */
  async updateIssue(
    issueKey: string,
    data: Partial<{ summary: string; description: string; status: string }>
  ): Promise<void> {
    try {
      const fields: any = {};

      if (data.summary !== undefined) {
        fields.summary = data.summary;
      }

      if (data.description !== undefined) {
        fields.description = {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: data.description,
                },
              ],
            },
          ],
        };
      }

      // If status is specified, attempt a transition instead of a field update
      if (data.status !== undefined) {
        const transitions = await this.getTransitions(issueKey);
        const matchingTransition = transitions.find(
          (t) => t.name.toLowerCase() === data.status!.toLowerCase()
        );
        if (matchingTransition) {
          await this.transitionIssue(issueKey, matchingTransition.id);
        } else {
          throw new Error(
            `No transition found for status "${data.status}" on issue ${issueKey}. ` +
            `Available transitions: ${transitions.map((t) => t.name).join(', ')}`
          );
        }
      }

      // Only send the PUT request if there are field updates beyond status
      if (Object.keys(fields).length > 0) {
        const response = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}`, {
          method: 'PUT',
          headers: this.headers(),
          body: JSON.stringify({ fields }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `Jira API error updating issue ${issueKey}: ${response.status} ${response.statusText} - ${errorBody}`
          );
        }
      }
    } catch (error) {
      if (error instanceof Error && (error.message.startsWith('Jira API error') || error.message.startsWith('No transition'))) {
        throw error;
      }
      throw new Error(`Failed to update Jira issue ${issueKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transitions an issue to a new status using the Jira workflow transition API.
   */
  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          transition: { id: transitionId },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Jira API error transitioning issue ${issueKey} with transition ${transitionId}: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Jira API error')) {
        throw error;
      }
      throw new Error(`Failed to transition Jira issue ${issueKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Retrieves available workflow transitions for the specified issue.
   */
  async getTransitions(issueKey: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`, {
        method: 'GET',
        headers: this.headers(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Jira API error fetching transitions for ${issueKey}: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();

      return data.transitions.map((t: any) => ({
        id: t.id,
        name: t.name,
      }));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Jira API error')) {
        throw error;
      }
      throw new Error(`Failed to fetch transitions for Jira issue ${issueKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Adds a comment to an existing issue using ADF format.
   */
  async addComment(issueKey: string, body: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}/comment`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: body,
                  },
                ],
              },
            ],
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Jira API error adding comment to ${issueKey}: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Jira API error')) {
        throw error;
      }
      throw new Error(`Failed to add comment to Jira issue ${issueKey}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Searches for issues using JQL (Jira Query Language).
   * Returns up to 50 results per call.
   */
  async searchIssues(jql: string): Promise<JiraIssue[]> {
    try {
      const params = new URLSearchParams({
        jql,
        maxResults: '50',
        fields: 'summary,description,status,assignee,priority,issuetype,labels,created,updated,customfield_10016',
      });

      const response = await fetch(`${this.baseUrl}/rest/api/3/search?${params.toString()}`, {
        method: 'GET',
        headers: this.headers(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Jira API error searching issues with JQL "${jql}": ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();

      return data.issues.map((issue: any) => this.mapIssue(issue));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Jira API error')) {
        throw error;
      }
      throw new Error(`Failed to search Jira issues: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Maps a raw Jira API issue response to our JiraIssue type.
   * Handles nested fields and extracts plain text from ADF description.
   */
  private mapIssue(issue: any): JiraIssue {
    const fields = issue.fields || {};

    // Extract plain text from ADF description
    let description = '';
    if (fields.description) {
      if (typeof fields.description === 'string') {
        description = fields.description;
      } else if (fields.description.content) {
        description = this.extractTextFromADF(fields.description);
      }
    }

    return {
      key: issue.key,
      summary: fields.summary || '',
      description,
      status: fields.status?.name || 'Unknown',
      assignee: fields.assignee?.displayName || null,
      priority: fields.priority?.name || 'None',
      issueType: fields.issuetype?.name || 'Unknown',
      labels: fields.labels || [],
      created: fields.created || '',
      updated: fields.updated || '',
      storyPoints: fields.customfield_10016 ?? undefined,
    };
  }

  /**
   * Recursively extracts plain text from an Atlassian Document Format (ADF) node.
   */
  private extractTextFromADF(node: any): string {
    if (!node) return '';

    if (node.type === 'text') {
      return node.text || '';
    }

    if (Array.isArray(node.content)) {
      return node.content.map((child: any) => this.extractTextFromADF(child)).join('');
    }

    return '';
  }
}

export default JiraService;
