# SPRINT_5.md — Integration Depth + Modern PM Stack
#
# HOW TO USE:
# 1. Run SANITY_CHECK.md first (pre-sprint baseline — expect 0 failures)
# 2. In Claude Code, type exactly:
#    "Read SPRINT_5.md and execute every step in order.
#     Stop only for: schema diffs, destructive operations, new file creation.
#     After all steps: run npx tsc --noEmit and show the full Sprint 5 report."
# 3. Run SANITY_CHECK.md again after (post-sprint verification)

---

## Context

Sprints 0-4 delivered:
- 6 bugs fixed + security hardening
- BrainNode graph + proactive intelligence engine
- Python agents on Cloud Run + cron jobs wired
- Multi-agent collaboration workflows

The platform now thinks and acts autonomously. But it still reads
from a narrow set of sources and writes back to almost nothing.

The vision: connect to every SaaS a PM team uses and write back
decisions, tickets, and updates without the PM having to leave Azmyra.

Sprint 5 priorities (in order of PM value):
1. Notion — read pages/DBs, write updates, ingest into BrainNode graph
2. Linear — modern Jira alternative used by most scaling startups
3. GitHub — close the product-engineering gap (initiatives → repos/PRs)
4. Jira bidirectional — agents create/close tickets, not just read
5. Analytics connectors — Mixpanel, Amplitude, GA4 → feed Discovery agent

This sprint also adds a unified Integrations Hub UI so users can
connect/disconnect any tool from one place.

---

## Pre-flight: read these files first

Before touching any code, read and report on:

1. src/lib/services/jira.ts — current Jira capabilities (read vs write)
2. src/lib/services/ — list all service files (check what integrations exist)
3. src/app/api/integrations/ — list all integration routes
4. prisma/schema.prisma — find UserSettingsRecord model, list all credential fields
5. src/lib/encryption.ts — confirm encrypt/decrypt exports
6. src/lib/tools/ — list all MCP tool files (understand current tool system)
7. .mcp.json — list currently configured MCP servers

Report everything. Do not proceed until done.

---

## Step 1 — Add integration credential fields to UserSettingsRecord

STOP: Show schema diff and wait for confirmation before db push.

Read prisma/schema.prisma and find the UserSettingsRecord model.
Add these fields if they do not already exist:

```prisma
// Notion
notionAccessToken  String @default("")  // encrypted

// Linear
linearApiKey       String @default("")  // encrypted

// GitHub
githubAccessToken  String @default("")  // encrypted
githubOrgName      String @default("")

// Analytics
mixpanelProjectId  String @default("")
mixpanelSecret     String @default("")  // encrypted
amplitudeApiKey    String @default("")  // encrypted
ga4PropertyId      String @default("")
ga4CredentialsJson String @default("")  // encrypted, JSON string
```

Also add a new model for tracking connected integration status:

```prisma
model IntegrationConnection {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  integrationType String  // "notion"|"linear"|"github"|"jira"|"confluence"|"slack"|"mixpanel"|"amplitude"|"ga4"
  status         String  @default("disconnected") // "connected"|"disconnected"|"error"
  displayName    String  @default("") // e.g. "My Notion workspace"
  lastSyncAt     DateTime?
  errorMessage   String  @default("")
  metadata       String  @default("{}") // JSON string — workspace info, org name, etc.
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([userId, integrationType])
  @@index([userId])
}
```

Also add to User model:
```prisma
integrationConnections IntegrationConnection[]
```

After confirmation:
  npx prisma generate && npx prisma db push

Add to src/lib/db.ts encryption middleware — these fields must
auto-encrypt/decrypt (add alongside existing credential fields):
  notionAccessToken, linearApiKey, githubAccessToken,
  mixpanelSecret, amplitudeApiKey, ga4CredentialsJson

Add TypeScript types to src/lib/types.ts:

```typescript
export type IntegrationType =
  | 'notion'
  | 'linear'
  | 'github'
  | 'jira'
  | 'confluence'
  | 'slack'
  | 'mixpanel'
  | 'amplitude'
  | 'ga4';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

export interface IntegrationConnectionData {
  id: string;
  userId: string;
  integrationType: IntegrationType;
  status: IntegrationStatus;
  displayName: string;
  lastSyncAt: Date | null;
  errorMessage: string;
  metadata: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConfig {
  type: IntegrationType;
  name: string;
  description: string;
  icon: string;
  docsUrl: string;
  fields: IntegrationField[];
}

export interface IntegrationField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
  helpText?: string;
}
```

Files to modify: prisma/schema.prisma, src/lib/db.ts, src/lib/types.ts

---

## Step 2 — Create Notion service

Create src/lib/services/notion.ts

```typescript
import { encrypt, decrypt } from '@/lib/encryption';
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

  return (data.results ?? []).map((db: Record<string, unknown>) => ({
    id: db.id as string,
    title: extractNotionTitle(db),
    url: (db.url as string) ?? '',
    properties: (db.properties as Record<string, unknown>) ?? {},
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
  } catch {}
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
  } catch {}
  return '';
}
```

Files to create: src/lib/services/notion.ts

---

## Step 3 — Create Linear service

Create src/lib/services/linear.ts

Linear uses a GraphQL API. All queries go to https://api.linear.app/graphql.

```typescript
const LINEAR_API = 'https://api.linear.app/graphql';

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  state: { name: string; type: string };
  assignee?: { name: string; email: string };
  priority: number;
  url: string;
  team: { name: string; key: string };
  createdAt: string;
  updatedAt: string;
}

interface LinearProject {
  id: string;
  name: string;
  description?: string;
  state: string;
  url: string;
}

async function linearQuery(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Linear API error: ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]?.message ?? 'Linear GraphQL error');
  return data.data as Record<string, unknown>;
}

/**
 * Get current user's teams.
 */
export async function getLinearTeams(apiKey: string) {
  const data = await linearQuery(apiKey, `
    query {
      teams {
        nodes {
          id name key description
        }
      }
    }
  `);
  return (data.teams as { nodes: unknown[] }).nodes;
}

/**
 * Search Linear issues.
 */
export async function searchLinearIssues(
  apiKey: string,
  query: string,
  limit = 20
): Promise<LinearIssue[]> {
  const data = await linearQuery(apiKey, `
    query($query: String!, $first: Int!) {
      issueSearch(query: $query, first: $first) {
        nodes {
          id identifier title description
          state { name type }
          assignee { name email }
          priority url
          team { name key }
          createdAt updatedAt
        }
      }
    }
  `, { query, first: limit });

  return ((data.issueSearch as { nodes: LinearIssue[] }).nodes) ?? [];
}

/**
 * Get issues for a team.
 */
export async function getLinearTeamIssues(
  apiKey: string,
  teamId: string,
  limit = 50
): Promise<LinearIssue[]> {
  const data = await linearQuery(apiKey, `
    query($teamId: String!, $first: Int!) {
      team(id: $teamId) {
        issues(first: $first, orderBy: updatedAt) {
          nodes {
            id identifier title description
            state { name type }
            assignee { name email }
            priority url createdAt updatedAt
            team { name key }
          }
        }
      }
    }
  `, { teamId, first: limit });

  return ((data.team as { issues: { nodes: LinearIssue[] } })?.issues?.nodes) ?? [];
}

/**
 * Create a Linear issue.
 */
export async function createLinearIssue(
  apiKey: string,
  teamId: string,
  title: string,
  description: string,
  priority = 0
): Promise<LinearIssue> {
  const data = await linearQuery(apiKey, `
    mutation($teamId: String!, $title: String!, $description: String, $priority: Int) {
      issueCreate(input: {
        teamId: $teamId
        title: $title
        description: $description
        priority: $priority
      }) {
        success
        issue {
          id identifier title url
          state { name type }
          team { name key }
          createdAt updatedAt
        }
      }
    }
  `, { teamId, title, description, priority });

  const result = data.issueCreate as { success: boolean; issue: LinearIssue };
  if (!result.success) throw new Error('Linear issue creation failed');
  return result.issue;
}

/**
 * Update Linear issue status.
 */
export async function updateLinearIssueStatus(
  apiKey: string,
  issueId: string,
  stateId: string
): Promise<void> {
  const data = await linearQuery(apiKey, `
    mutation($issueId: String!, $stateId: String!) {
      issueUpdate(id: $issueId, input: { stateId: $stateId }) {
        success
      }
    }
  `, { issueId, stateId });

  const result = data.issueUpdate as { success: boolean };
  if (!result.success) throw new Error('Linear status update failed');
}

/**
 * Get workflow states for a team (needed for status updates).
 */
export async function getLinearWorkflowStates(
  apiKey: string,
  teamId: string
) {
  const data = await linearQuery(apiKey, `
    query($teamId: String!) {
      workflowStates(filter: { team: { id: { eq: $teamId } } }) {
        nodes {
          id name type color
        }
      }
    }
  `, { teamId });
  return ((data.workflowStates as { nodes: unknown[] }).nodes) ?? [];
}
```

Files to create: src/lib/services/linear.ts

---

## Step 4 — Create GitHub service

Create src/lib/services/github.ts

GitHub REST API v3. Used to link initiatives to repos, PRs, and releases.

```typescript
const GITHUB_API = 'https://api.github.com';

interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description?: string;
  url: string;
  defaultBranch: string;
  language?: string;
  updatedAt: string;
}

interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  url: string;
  labels: string[];
  assignees: string[];
  createdAt: string;
  updatedAt: string;
}

interface GitHubPR {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  url: string;
  headBranch: string;
  baseBranch: string;
  author: string;
  createdAt: string;
  mergedAt?: string;
}

async function githubFetch(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${path}`);
  return res.json();
}

/**
 * Get repos for the authenticated user or org.
 */
export async function getGitHubRepos(
  token: string,
  orgName?: string,
  limit = 30
): Promise<GitHubRepo[]> {
  const path = orgName
    ? `/orgs/${encodeURIComponent(orgName)}/repos?per_page=${limit}&sort=updated`
    : `/user/repos?per_page=${limit}&sort=updated`;

  const repos = await githubFetch(token, path) as Array<Record<string, unknown>>;
  return repos.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    fullName: r.full_name as string,
    description: r.description as string | undefined,
    url: r.html_url as string,
    defaultBranch: r.default_branch as string,
    language: r.language as string | undefined,
    updatedAt: r.updated_at as string,
  }));
}

/**
 * Search issues in a repo.
 */
export async function searchGitHubIssues(
  token: string,
  repoFullName: string,
  query = '',
  limit = 20
): Promise<GitHubIssue[]> {
  const q = query
    ? `repo:${repoFullName} ${query} is:issue`
    : `repo:${repoFullName} is:issue`;
  const data = await githubFetch(token, `/search/issues?q=${encodeURIComponent(q)}&per_page=${limit}`) as { items: Array<Record<string, unknown>> };

  return (data.items ?? []).map((issue) => ({
    id: issue.id as number,
    number: issue.number as number,
    title: issue.title as string,
    body: issue.body as string | undefined,
    state: issue.state as 'open' | 'closed',
    url: issue.html_url as string,
    labels: ((issue.labels as Array<{ name: string }>) ?? []).map((l) => l.name),
    assignees: ((issue.assignees as Array<{ login: string }>) ?? []).map((a) => a.login),
    createdAt: issue.created_at as string,
    updatedAt: issue.updated_at as string,
  }));
}

/**
 * Create a GitHub issue.
 */
export async function createGitHubIssue(
  token: string,
  repoFullName: string,
  title: string,
  body: string,
  labels: string[] = []
): Promise<GitHubIssue> {
  const [owner, repo] = repoFullName.split('/');
  const issue = await githubFetch(token, `/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels }),
  }) as Record<string, unknown>;

  return {
    id: issue.id as number,
    number: issue.number as number,
    title: issue.title as string,
    body: issue.body as string | undefined,
    state: issue.state as 'open' | 'closed',
    url: issue.html_url as string,
    labels: ((issue.labels as Array<{ name: string }>) ?? []).map((l) => l.name),
    assignees: [],
    createdAt: issue.created_at as string,
    updatedAt: issue.updated_at as string,
  };
}

/**
 * Get open PRs for a repo.
 */
export async function getGitHubPRs(
  token: string,
  repoFullName: string,
  limit = 20
): Promise<GitHubPR[]> {
  const [owner, repo] = repoFullName.split('/');
  const prs = await githubFetch(token, `/repos/${owner}/${repo}/pulls?state=open&per_page=${limit}`) as Array<Record<string, unknown>>;

  return prs.map((pr) => ({
    id: pr.id as number,
    number: pr.number as number,
    title: pr.title as string,
    body: pr.body as string | undefined,
    state: pr.state as 'open' | 'closed',
    url: pr.html_url as string,
    headBranch: (pr.head as Record<string, unknown>).ref as string,
    baseBranch: (pr.base as Record<string, unknown>).ref as string,
    author: ((pr.user as Record<string, unknown>)?.login as string) ?? '',
    createdAt: pr.created_at as string,
    mergedAt: pr.merged_at as string | undefined,
  }));
}

/**
 * Get recent releases for a repo.
 */
export async function getGitHubReleases(
  token: string,
  repoFullName: string,
  limit = 10
) {
  const [owner, repo] = repoFullName.split('/');
  const releases = await githubFetch(token, `/repos/${owner}/${repo}/releases?per_page=${limit}`) as Array<Record<string, unknown>>;

  return releases.map((r) => ({
    id: r.id as number,
    name: (r.name ?? r.tag_name) as string,
    tagName: r.tag_name as string,
    body: r.body as string | undefined,
    url: r.html_url as string,
    draft: r.draft as boolean,
    prerelease: r.prerelease as boolean,
    publishedAt: r.published_at as string,
  }));
}
```

Files to create: src/lib/services/github.ts

---

## Step 5 — Upgrade Jira service to bidirectional

Read src/lib/services/jira.ts in full first.
Then add write capabilities if they do not already exist.

```typescript
// Add these exports to src/lib/services/jira.ts

/**
 * Create a new Jira issue.
 * Used by agents in Full autonomy mode.
 */
export async function createJiraIssue(
  config: JiraConfig,
  projectKey: string,
  summary: string,
  description: string,
  issueType = 'Task'
): Promise<{ id: string; key: string; url: string }> {
  const res = await jiraFetch(config, '/rest/api/3/issue', {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: description }],
            },
          ],
        },
        issuetype: { name: issueType },
      },
    }),
  });

  if (!res.ok) throw new Error(`Jira create issue failed: ${res.status}`);
  const data = await res.json();
  return {
    id: data.id,
    key: data.key,
    url: `${config.host}/browse/${data.key}`,
  };
}

/**
 * Transition a Jira issue to a new status.
 * Call getJiraTransitions first to get valid transition IDs.
 */
export async function transitionJiraIssue(
  config: JiraConfig,
  issueKey: string,
  transitionName: string
): Promise<void> {
  // Get available transitions
  const transRes = await jiraFetch(config, `/rest/api/3/issue/${issueKey}/transitions`);
  if (!transRes.ok) throw new Error(`Jira get transitions failed: ${transRes.status}`);
  const transData = await transRes.json();

  const transition = (transData.transitions as Array<{ id: string; name: string }>)
    .find((t) => t.name.toLowerCase() === transitionName.toLowerCase());

  if (!transition) {
    throw new Error(`Transition "${transitionName}" not found. Available: ${transData.transitions.map((t: { name: string }) => t.name).join(', ')}`);
  }

  const res = await jiraFetch(config, `/rest/api/3/issue/${issueKey}/transitions`, {
    method: 'POST',
    body: JSON.stringify({ transition: { id: transition.id } }),
  });

  if (!res.ok) throw new Error(`Jira transition failed: ${res.status}`);
}

/**
 * Add a comment to a Jira issue.
 */
export async function addJiraComment(
  config: JiraConfig,
  issueKey: string,
  comment: string
): Promise<void> {
  const res = await jiraFetch(config, `/rest/api/3/issue/${issueKey}/comment`, {
    method: 'POST',
    body: JSON.stringify({
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: comment }],
          },
        ],
      },
    }),
  });

  if (!res.ok) throw new Error(`Jira add comment failed: ${res.status}`);
}

/**
 * Close a Jira issue (transition to Done/Closed).
 */
export async function closeJiraIssue(
  config: JiraConfig,
  issueKey: string
): Promise<void> {
  // Try common "done" transition names
  const doneNames = ['Done', 'Closed', 'Resolved', 'Complete'];
  for (const name of doneNames) {
    try {
      await transitionJiraIssue(config, issueKey, name);
      return;
    } catch {
      // Try next name
    }
  }
  throw new Error(`Could not close ${issueKey} — no Done/Closed transition found`);
}
```

Note: If jiraFetch and JiraConfig are not already defined in jira.ts,
read the file and understand the existing pattern before adding.
Match the existing authentication and error handling style exactly.

Files to modify: src/lib/services/jira.ts

---

## Step 6 — Create integration API routes

### 6a — Create src/app/api/integrations/connect/route.ts

This route saves integration credentials and upserts IntegrationConnection.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  integrationType: z.enum([
    'notion', 'linear', 'github', 'jira', 'confluence', 'slack', 'mixpanel', 'amplitude', 'ga4'
  ]),
  credentials: z.record(z.string()),   // field key → value pairs
  displayName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { integrationType, credentials, displayName } = parsed.data;

  // Map credential fields to UserSettingsRecord columns
  // Encryption is handled by Prisma middleware automatically
  const updateData: Record<string, string> = {};
  for (const [key, value] of Object.entries(credentials)) {
    updateData[key] = value;
  }

  try {
    // Update UserSettingsRecord with credentials
    await db.userSettingsRecord.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...updateData },
      update: updateData,
    });

    // Upsert IntegrationConnection status
    await db.integrationConnection.upsert({
      where: {
        userId_integrationType: {
          userId: session.user.id,
          integrationType,
        },
      },
      create: {
        userId: session.user.id,
        integrationType,
        status: 'connected',
        displayName: displayName ?? integrationType,
        lastSyncAt: new Date(),
      },
      update: {
        status: 'connected',
        displayName: displayName ?? integrationType,
        lastSyncAt: new Date(),
        errorMessage: '',
      },
    });

    return NextResponse.json({ success: true, integrationType });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save credentials' }, { status: 500 });
  }
}
```

### 6b — Create src/app/api/integrations/status/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connections = await db.integrationConnection.findMany({
    where: { userId: session.user.id },
    orderBy: { integrationType: 'asc' },
  });

  return NextResponse.json({ connections });
}
```

### 6c — Create src/app/api/integrations/disconnect/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  integrationType: z.enum([
    'notion', 'linear', 'github', 'jira', 'confluence', 'slack', 'mixpanel', 'amplitude', 'ga4'
  ]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid integration type' }, { status: 400 });
  }

  // Map integration type to credential fields to clear
  const CREDENTIAL_FIELDS: Record<string, string[]> = {
    notion: ['notionAccessToken'],
    linear: ['linearApiKey'],
    github: ['githubAccessToken', 'githubOrgName'],
    jira: ['jiraHost', 'jiraEmail', 'jiraApiToken'],
    confluence: ['confluenceHost', 'confluenceEmail', 'confluenceApiToken'],
    slack: ['slackBotToken'],
    mixpanel: ['mixpanelProjectId', 'mixpanelSecret'],
    amplitude: ['amplitudeApiKey'],
    ga4: ['ga4PropertyId', 'ga4CredentialsJson'],
  };

  const fieldsToBlank = CREDENTIAL_FIELDS[parsed.data.integrationType] ?? [];
  const updateData: Record<string, string> = {};
  for (const field of fieldsToBlank) {
    updateData[field] = '';
  }

  await db.userSettingsRecord.update({
    where: { userId: session.user.id },
    data: updateData,
  }).catch(() => {});

  await db.integrationConnection.upsert({
    where: {
      userId_integrationType: {
        userId: session.user.id,
        integrationType: parsed.data.integrationType,
      },
    },
    create: {
      userId: session.user.id,
      integrationType: parsed.data.integrationType,
      status: 'disconnected',
    },
    update: {
      status: 'disconnected',
      lastSyncAt: null,
    },
  });

  return NextResponse.json({ success: true });
}
```

### 6d — Create src/app/api/integrations/notion/ingest/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { ingestNotionPages } from '@/lib/services/notion';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const query = body.query ?? '';

  const settings = await db.userSettingsRecord.findUnique({
    where: { userId: session.user.id },
    select: { notionAccessToken: true },
  });

  if (!settings?.notionAccessToken) {
    return NextResponse.json({ error: 'Notion not connected' }, { status: 400 });
  }

  const token = decrypt(settings.notionAccessToken);
  const ingested = await ingestNotionPages(session.user.id, token, query);

  // Update lastSyncAt
  await db.integrationConnection.update({
    where: {
      userId_integrationType: {
        userId: session.user.id,
        integrationType: 'notion',
      },
    },
    data: { lastSyncAt: new Date() },
  }).catch(() => {});

  return NextResponse.json({ success: true, ingested });
}
```

Files to create:
- src/app/api/integrations/connect/route.ts
- src/app/api/integrations/status/route.ts
- src/app/api/integrations/disconnect/route.ts
- src/app/api/integrations/notion/ingest/route.ts

---

## Step 7 — Create the Integrations Hub view

Create src/components/views/IntegrationsHubView.tsx

This is the single page where users connect/disconnect all integrations.
Each integration is a card with status badge, credential form, and
connect/disconnect actions.

```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { IntegrationConnectionData, IntegrationConfig } from '@/lib/types';

const INTEGRATION_CONFIGS: IntegrationConfig[] = [
  {
    type: 'notion',
    name: 'Notion',
    description: 'Import pages and databases into your company brain',
    icon: 'N',
    docsUrl: 'https://www.notion.so/my-integrations',
    fields: [
      {
        key: 'notionAccessToken',
        label: 'Internal integration token',
        placeholder: 'secret_...',
        type: 'password',
        required: true,
        helpText: 'Create an internal integration at notion.so/my-integrations',
      },
    ],
  },
  {
    type: 'linear',
    name: 'Linear',
    description: 'Sync issues, create tickets, track cycles',
    icon: 'L',
    docsUrl: 'https://linear.app/settings/api',
    fields: [
      {
        key: 'linearApiKey',
        label: 'Personal API key',
        placeholder: 'lin_api_...',
        type: 'password',
        required: true,
        helpText: 'Generate at linear.app/settings/api',
      },
    ],
  },
  {
    type: 'github',
    name: 'GitHub',
    description: 'Link initiatives to repos, PRs, and releases',
    icon: 'G',
    docsUrl: 'https://github.com/settings/tokens',
    fields: [
      {
        key: 'githubAccessToken',
        label: 'Personal access token',
        placeholder: 'ghp_...',
        type: 'password',
        required: true,
        helpText: 'Create a PAT with repo scope at github.com/settings/tokens',
      },
      {
        key: 'githubOrgName',
        label: 'Organization name (optional)',
        placeholder: 'my-org',
        type: 'text',
        required: false,
        helpText: 'Leave blank to use personal repos',
      },
    ],
  },
  {
    type: 'jira',
    name: 'Jira',
    description: 'Read and write issues, transitions, comments',
    icon: 'J',
    docsUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    fields: [
      {
        key: 'jiraHost',
        label: 'Jira host URL',
        placeholder: 'https://yourcompany.atlassian.net',
        type: 'url',
        required: true,
      },
      {
        key: 'jiraEmail',
        label: 'Email',
        placeholder: 'you@company.com',
        type: 'text',
        required: true,
      },
      {
        key: 'jiraApiToken',
        label: 'API token',
        placeholder: 'ATATT3xF...',
        type: 'password',
        required: true,
        helpText: 'Create at id.atlassian.com/manage-profile/security/api-tokens',
      },
    ],
  },
  {
    type: 'mixpanel',
    name: 'Mixpanel',
    description: 'Import user behavior signals into Discovery agent',
    icon: 'M',
    docsUrl: 'https://mixpanel.com/settings/project',
    fields: [
      {
        key: 'mixpanelProjectId',
        label: 'Project ID',
        placeholder: '123456',
        type: 'text',
        required: true,
      },
      {
        key: 'mixpanelSecret',
        label: 'Project secret',
        placeholder: '...',
        type: 'password',
        required: true,
      },
    ],
  },
  {
    type: 'amplitude',
    name: 'Amplitude',
    description: 'Import event data to understand user needs',
    icon: 'A',
    docsUrl: 'https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api/',
    fields: [
      {
        key: 'amplitudeApiKey',
        label: 'API key',
        placeholder: '...',
        type: 'password',
        required: true,
      },
    ],
  },
];

export function IntegrationsHubView() {
  const [connections, setConnections] = useState<IntegrationConnectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      const res = await fetch('/api/integrations/status');
      if (!res.ok) return;
      const data = await res.json();
      setConnections(data.connections ?? []);
    } finally {
      setLoading(false);
    }
  }

  function getConnection(type: string): IntegrationConnectionData | undefined {
    return connections.find((c) => c.integrationType === type);
  }

  async function handleConnect(config: IntegrationConfig) {
    // Validate required fields
    for (const field of config.fields.filter((f) => f.required)) {
      if (!formValues[field.key]?.trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationType: config.type,
          credentials: formValues,
          displayName: config.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error ?? 'Failed to connect');
        return;
      }

      toast.success(`${config.name} connected successfully`);
      setActiveForm(null);
      setFormValues({});
      await fetchConnections();
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect(type: string, name: string) {
    if (!confirm(`Disconnect ${name}? Your credentials will be removed.`)) return;

    const res = await fetch('/api/integrations/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ integrationType: type }),
    });

    if (res.ok) {
      toast.success(`${name} disconnected`);
      await fetchConnections();
    } else {
      toast.error('Failed to disconnect');
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your tools to enrich the company brain and enable agent actions
        </p>
      </div>

      <div className="grid gap-4">
        {INTEGRATION_CONFIGS.map((config) => {
          const connection = getConnection(config.type);
          const isConnected = connection?.status === 'connected';
          const isExpanded = activeForm === config.type;

          return (
            <Card key={config.type} className={cn(isConnected && 'border-green-200')}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-sm font-bold">
                      {config.icon}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{config.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {config.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <Badge className="bg-green-100 text-green-800 text-xs">Connected</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => handleDisconnect(config.type, config.name)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => {
                          setActiveForm(isExpanded ? null : config.type);
                          setFormValues({});
                        }}
                      >
                        {isExpanded ? 'Cancel' : 'Connect'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && !isConnected && (
                <CardContent>
                  <div className="space-y-3">
                    {config.fields.map((field) => (
                      <div key={field.key}>
                        <Label className="text-xs">{field.label}</Label>
                        <Input
                          type={field.type === 'password' ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          value={formValues[field.key] ?? ''}
                          onChange={(e) =>
                            setFormValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="mt-1 h-8 text-sm"
                        />
                        {field.helpText && (
                          <p className="text-xs text-muted-foreground mt-1">{field.helpText}</p>
                        )}
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2">
                      <a
                        href={config.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Get credentials →
                      </a>
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleConnect(config)}
                        disabled={saving}
                      >
                        {saving ? 'Connecting...' : `Connect ${config.name}`}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}

              {isConnected && connection?.lastSyncAt && (
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground">
                    Last synced: {new Date(connection.lastSyncAt).toLocaleDateString()}
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

Files to create: src/components/views/IntegrationsHubView.tsx

---

## Step 8 — Add Integrations Hub page and sidebar nav

### 8a — Create page

Create src/app/integrations/page.tsx:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { IntegrationsHubView } from '@/components/views/IntegrationsHubView';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

export default async function IntegrationsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/signin');
  return (
    <ErrorBoundary>
      <IntegrationsHubView />
    </ErrorBoundary>
  );
}
```

### 8b — Add to sidebar navigation

Read the sidebar component (likely src/components/layout/Sidebar.tsx
or src/components/layout/AppSidebar.tsx).

Find where navigation items are defined.
Add Integrations Hub after existing nav items:

```typescript
// Add to nav items array:
{
  label: 'Integrations',
  href: '/integrations',
  icon: Puzzle, // from lucide-react
}
```

Show the sidebar component before modifying.

Files to create: src/app/integrations/page.tsx
Files to modify: sidebar component

---

## Step 9 — Wire Notion ingestion into onboarding (Step 5)

Read the onboarding wizard component and find Step 5
(integrations step — should already have Jira, Confluence, Slack).

Add Notion ingestion call after successful Notion connection:

```typescript
// After user connects Notion in onboarding:
// Fire-and-forget: ingest top Notion pages into brain
fetch('/api/integrations/notion/ingest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: '' }), // empty query = all recent pages
}).catch(console.error);
```

This runs in the background — does not block onboarding completion.
Show the relevant section of the onboarding wizard before modifying.

Files to modify: onboarding wizard component

---

## Step 10 — Update .mcp.json with new integrations

Read .mcp.json and add missing MCP server configurations:

```json
{
  "mcpServers": {
    "notion": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-notion"],
      "env": {
        "NOTION_API_KEY": "${NOTION_API_KEY}"
      }
    },
    "linear": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-linear"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}"
      }
    }
  }
}
```

Add these alongside the existing entries.
Do not remove any existing entries.

Files to modify: .mcp.json

---

## Step 11 — Update CLAUDE.md with Sprint 5 services

Add to the Scale Context table in CLAUDE.md:

```
| New integration services | 3 | notion.ts, linear.ts, github.ts |
| Integration API routes | 4 | connect, disconnect, status, notion/ingest |
```

Add to Known Fragile Areas:
```
| GitHub OAuth vs PAT | GitHub service uses PAT (Personal Access Token) — not OAuth. Users must create PAT manually at github.com/settings/tokens with repo scope |
| Notion internal integration | Notion requires sharing each page/database with the integration manually — auto-discovery only works for explicitly shared pages |
| Linear GraphQL | Linear API is GraphQL only — no REST fallback. All queries in linear.ts use the graphql function |
| Analytics read-only | Mixpanel and Amplitude adapters are read-only — no write operations supported or planned |
```

Files to modify: CLAUDE.md

---

## Step 12 — TypeScript check and full report

Run: npx tsc --noEmit

Then provide the full Sprint 5 report:

```
SPRINT 5 REPORT

SCHEMA CHANGES:
- UserSettingsRecord: added fields [list new fields]
- IntegrationConnection model added

FILES CREATED:
- src/lib/services/notion.ts
- src/lib/services/linear.ts
- src/lib/services/github.ts
- src/app/api/integrations/connect/route.ts
- src/app/api/integrations/status/route.ts
- src/app/api/integrations/disconnect/route.ts
- src/app/api/integrations/notion/ingest/route.ts
- src/components/views/IntegrationsHubView.tsx
- src/app/integrations/page.tsx

FILES MODIFIED:
- prisma/schema.prisma
- src/lib/db.ts — encryption middleware updated
- src/lib/types.ts — IntegrationType, IntegrationStatus, IntegrationConnectionData, IntegrationConfig added
- src/lib/services/jira.ts — createJiraIssue, transitionJiraIssue, addJiraComment, closeJiraIssue added
- sidebar component — Integrations nav item added
- onboarding wizard — Notion fire-and-forget ingest added
- .mcp.json — notion and linear MCP servers added
- CLAUDE.md — Scale Context and Known Fragile Areas updated

TYPESCRIPT: [0 new errors / list any]

INTEGRATIONS CONNECTED:
Run the manual test: connect each integration in the UI at /integrations
and confirm status badge turns green.

MANUAL VERIFICATION STEPS:
1. Navigate to /integrations — hub renders with 6 integration cards
2. Connect Notion with a valid token — status badge turns green
3. Trigger ingest: POST /api/integrations/notion/ingest
   Confirm BrainNode records created with source "notion"
4. Connect Linear — test getLinearTeams() call
5. Jira bidirectional: create a test issue via the API,
   confirm it appears in Jira with correct project/type
6. Sidebar shows "Integrations" nav item

DEPLOY: /deploy after this sprint
```
