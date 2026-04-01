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
