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
