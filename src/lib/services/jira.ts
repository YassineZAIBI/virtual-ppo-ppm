// Jira REST API Service
// Provides full CRUD operations for Jira issues, projects, transitions, and search.

import type { JiraIssue, JiraProject, JiraProjectSchema } from '../types';

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
   * Verifies authentication by calling the /myself endpoint.
   * Throws if the credentials are invalid.
   */
  async verifyAuth(): Promise<{ displayName: string; email: string }> {
    const response = await fetch(`${this.baseUrl}/rest/api/3/myself`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Jira authentication failed. Please check your email and API token.');
      }
      const errorBody = await response.text();
      throw new Error(`Jira auth check failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    return { displayName: data.displayName, email: data.emailAddress };
  }

  /**
   * Fetches all projects visible to the authenticated user.
   * Uses the paginated /project/search endpoint for better reliability.
   */
  async getProjects(): Promise<JiraProject[]> {
    try {
      const response = await fetch(`${this.baseUrl}/rest/api/3/project/search?maxResults=50`, {
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
      const projects = data.values || data || [];

      return projects.map((project: any) => ({
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
   * Resolves an issue type name to its ID by fuzzy-matching against the project's available types.
   */
  private async resolveIssueType(
    projectKey: string,
    requestedType: string
  ): Promise<{ id: string; name: string }> {
    const resp = await fetch(
      `${this.baseUrl}/rest/api/3/issue/createmeta/${projectKey}/issuetypes`,
      { method: 'GET', headers: this.headers() }
    );

    if (!resp.ok) {
      // Fallback: return the name as-is and let Jira validate
      return { id: '', name: requestedType };
    }

    const data = await resp.json();
    const types: Array<{ id: string; name: string }> = (data.issueTypes || data.values || data || []).map(
      (it: any) => ({ id: String(it.id), name: it.name })
    );

    if (types.length === 0) {
      return { id: '', name: requestedType };
    }

    const lower = requestedType.toLowerCase();

    // 1. Exact match (case-insensitive)
    const exact = types.find((t) => t.name.toLowerCase() === lower);
    if (exact) return exact;

    // 2. Plural/singular match (e.g. "Feature" vs "Features", "Story" vs "Stories")
    const singular = lower.replace(/ies$/, 'y').replace(/s$/, '');
    const plural1 = lower + 's';
    const plural2 = lower.replace(/y$/, 'ies');
    const fuzzy = types.find((t) => {
      const tl = t.name.toLowerCase();
      return tl === singular || tl === plural1 || tl === plural2 ||
        tl.replace(/ies$/, 'y').replace(/s$/, '') === singular;
    });
    if (fuzzy) return fuzzy;

    // 3. Contains match (e.g. "Portfolio EPIC" matches "Epic")
    const contains = types.find((t) => t.name.toLowerCase().includes(lower) || lower.includes(t.name.toLowerCase()));
    if (contains) return contains;

    // 4. No match — throw helpful error with available types
    throw new Error(
      `Issue type "${requestedType}" not found in project ${projectKey}. Available types: ${types.map((t) => t.name).join(', ')}`
    );
  }

  /**
   * Sanitizes labels for Jira (no spaces allowed).
   */
  private sanitizeLabels(labels: string[]): string[] {
    return labels
      .map((l) => l.trim().replace(/\s+/g, '-'))
      .filter(Boolean);
  }

  /**
   * Fetches required fields for an issue type in a project via createmeta.
   * Returns a map of fieldKey → { required, allowedValues, defaultValue, name }.
   */
  private async getRequiredFields(
    projectKey: string,
    issueTypeId: string
  ): Promise<Map<string, { name: string; required: boolean; hasDefaultValue: boolean; allowedValues: any[] }>> {
    const fields = new Map<string, { name: string; required: boolean; hasDefaultValue: boolean; allowedValues: any[] }>();
    try {
      const resp = await fetch(
        `${this.baseUrl}/rest/api/3/issue/createmeta/${projectKey}/issuetypes/${issueTypeId}`,
        { method: 'GET', headers: this.headers() }
      );
      if (!resp.ok) return fields;
      const data = await resp.json();
      const values = data.fields || data.values || [];
      const fieldList = Array.isArray(values) ? values : Object.values(values);
      for (const f of fieldList) {
        if (f.required) {
          fields.set(f.fieldId || f.key, {
            name: f.name,
            required: true,
            hasDefaultValue: !!f.hasDefaultValue,
            allowedValues: f.allowedValues || [],
          });
        }
      }
    } catch {
      // Gracefully skip — we'll handle errors on create
    }
    return fields;
  }

  /**
   * Attempts to auto-fix a 400 error from Jira issue creation.
   * Returns a patched body if fixable, or null if not.
   */
  private autoFixCreateErrors(
    errorBody: string,
    body: any
  ): any | null {
    try {
      const err = JSON.parse(errorBody);
      const fieldErrors: Record<string, string> = err.errors || {};
      const msgErrors: string[] = err.errorMessages || [];
      let patched = JSON.parse(JSON.stringify(body)); // deep clone
      let fixed = false;

      // Fix label errors (spaces not allowed)
      if (fieldErrors.labels?.includes("can't contain spaces") || msgErrors.some((m) => m.includes("can't contain spaces"))) {
        if (patched.fields.labels) {
          patched.fields.labels = this.sanitizeLabels(patched.fields.labels);
          fixed = true;
        }
      }

      // Fix required field errors — remove non-essential fields that cause errors
      // or strip the problematic optional fields
      for (const [fieldKey, errorMsg] of Object.entries(fieldErrors)) {
        if (typeof errorMsg === 'string' && errorMsg.includes('is required')) {
          // For required fields we didn't provide: skip them if they're custom fields
          // (we can't guess their values, but removing the error-causing optional fields we DID set may help)
          // If it's a custom field we set (like story points), remove it
          if (fieldKey.startsWith('customfield_') && patched.fields[fieldKey] !== undefined) {
            delete patched.fields[fieldKey];
            fixed = true;
          }
          // For required custom fields we DIDN'T set, we can't auto-fix — but we can
          // try setting it to a default if it has allowed values
        }
      }

      // If a required custom field error persists and we haven't set it,
      // remove optional fields that might be causing cascade issues
      for (const [fieldKey, errorMsg] of Object.entries(fieldErrors)) {
        if (typeof errorMsg === 'string' && errorMsg.includes('is required') && !patched.fields[fieldKey]) {
          // This is a field Jira requires but we haven't included — we can't magically know the value.
          // Skip it on retry by not adding it (it's already not there).
          // But we should still mark as "fixed" to trigger the retry with cleaned labels etc.
        }
      }

      return fixed ? patched : null;
    } catch {
      return null;
    }
  }

  /**
   * Creates a new issue in the specified project.
   * Includes smart sanitization and auto-retry on 400 errors.
   */
  async createIssue(
    projectKey: string,
    data: {
      summary: string;
      description: string;
      issueType: string;
      parentKey?: string;
      labels?: string[];
      storyPoints?: number;
    }
  ): Promise<JiraIssue> {
    try {
      // Resolve issue type by fetching valid types for the project and fuzzy-matching
      const resolvedIssueType = await this.resolveIssueType(projectKey, data.issueType);

      // Pre-sanitize labels (Jira doesn't allow spaces)
      const sanitizedLabels = data.labels ? this.sanitizeLabels(data.labels) : [];

      // Fetch required fields for this issue type to pre-fill what we can
      const requiredFields = resolvedIssueType.id
        ? await this.getRequiredFields(projectKey, resolvedIssueType.id)
        : new Map();

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
                    text: data.description || 'No description provided.',
                  },
                ],
              },
            ],
          },
          issuetype: resolvedIssueType.id ? { id: resolvedIssueType.id } : { name: resolvedIssueType.name },
        },
      };

      if (data.parentKey) {
        body.fields.parent = { key: data.parentKey };
      }

      if (sanitizedLabels.length > 0) {
        body.fields.labels = sanitizedLabels;
      }

      // Story points are commonly stored in customfield_10016 (Jira Software)
      if (data.storyPoints !== undefined) {
        body.fields.customfield_10016 = data.storyPoints;
      }

      // Auto-fill required custom fields that have allowed values (pick first)
      for (const [fieldKey, meta] of requiredFields) {
        if (body.fields[fieldKey] !== undefined) continue; // already set
        // Skip standard fields that are already handled
        if (['project', 'summary', 'description', 'issuetype', 'parent', 'labels'].includes(fieldKey)) continue;
        // If the field has allowed values, pick the first one
        if (meta.allowedValues?.length > 0) {
          const first = meta.allowedValues[0];
          body.fields[fieldKey] = first.id ? { id: first.id } : first.value || first;
        }
      }

      // Attempt 1
      let response = await fetch(`${this.baseUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      });

      // On 400 error: try to auto-fix and retry once
      if (response.status === 400) {
        const errorBody = await response.text();
        console.warn(`Jira create attempt 1 failed (400): ${errorBody}`);

        const patchedBody = this.autoFixCreateErrors(errorBody, body);
        if (patchedBody) {
          console.log('Retrying with auto-fixed payload...');
          response = await fetch(`${this.baseUrl}/rest/api/3/issue`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(patchedBody),
          });
        }

        // If still failing after retry (or no patch possible), try minimal body
        if (!response.ok) {
          const retryErrorBody = patchedBody ? await response.text() : errorBody;
          console.warn(`Jira create attempt 2 failed: ${retryErrorBody}`);

          // Last resort: strip all optional fields and try bare minimum
          const minimalBody: any = {
            fields: {
              project: { key: projectKey },
              summary: data.summary,
              description: body.fields.description,
              issuetype: body.fields.issuetype,
            },
          };
          if (data.parentKey) minimalBody.fields.parent = { key: data.parentKey };
          // Re-add required custom fields
          for (const [fieldKey, meta] of requiredFields) {
            if (['project', 'summary', 'description', 'issuetype', 'parent'].includes(fieldKey)) continue;
            if (meta.allowedValues?.length > 0) {
              const first = meta.allowedValues[0];
              minimalBody.fields[fieldKey] = first.id ? { id: first.id } : first.value || first;
            }
          }

          console.log('Retrying with minimal payload...');
          response = await fetch(`${this.baseUrl}/rest/api/3/issue`, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(minimalBody),
          });
        }
      }

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
      const response = await fetch(`${this.baseUrl}/rest/api/3/search/jql`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          jql,
          maxResults: 50,
          fields: ['summary', 'description', 'status', 'assignee', 'priority', 'issuetype', 'labels', 'created', 'updated', 'customfield_10016'],
        }),
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
   * Discovers the project's issue type hierarchy via the createmeta endpoint.
   * Returns issue types with hierarchy levels so the AI knows what types exist and how they nest.
   */
  async getProjectSchema(projectKey: string): Promise<JiraProjectSchema> {
    try {
      // Fetch project info for the name
      const projResp = await fetch(
        `${this.baseUrl}/rest/api/3/project/${projectKey}`,
        { method: 'GET', headers: this.headers() }
      );
      let projectName = projectKey;
      if (projResp.ok) {
        const projData = await projResp.json();
        projectName = projData.name || projectKey;
      }

      // Fetch issue types via createmeta
      const response = await fetch(
        `${this.baseUrl}/rest/api/3/issue/createmeta/${projectKey}/issuetypes`,
        { method: 'GET', headers: this.headers() }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Jira API error fetching schema for ${projectKey}: ${response.status} ${response.statusText} - ${errorBody}`
        );
      }

      const data = await response.json();
      const issueTypes = (data.issueTypes || data.values || data || []).map((it: any) => ({
        id: String(it.id),
        name: it.name,
        subtask: it.subtask || false,
        hierarchyLevel: it.hierarchyLevel ?? (it.subtask ? -1 : 0),
      }));

      // Build hierarchy by grouping issue types by level
      const levelMap = new Map<number, string[]>();
      for (const it of issueTypes) {
        const existing = levelMap.get(it.hierarchyLevel) || [];
        existing.push(it.name);
        levelMap.set(it.hierarchyLevel, existing);
      }

      const levels = Array.from(levelMap.entries()).sort((a, b) => b[0] - a[0]);
      const hierarchy = levels.map(([level, names]) => {
        const lowerLevels = levels
          .filter(([l]) => l < level)
          .flatMap(([, n]) => n);
        return {
          level,
          typeName: names[0],
          issueTypeNames: names,
          canContain: lowerLevels,
        };
      });

      return {
        projectKey,
        projectName,
        issueTypes,
        hierarchy,
        discoveredAt: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Jira API error')) {
        throw error;
      }
      throw new Error(`Failed to fetch project schema for ${projectKey}: ${error instanceof Error ? error.message : String(error)}`);
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
