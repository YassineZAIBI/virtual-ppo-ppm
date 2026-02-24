// Tool Registry — defines all tools the AI can propose via chat

export interface ToolParameter {
  type: string;
  description: string;
  required: boolean;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  requiresApproval: boolean;
}

export const TOOL_REGISTRY: ToolDefinition[] = [
  {
    name: 'create_jira_issue',
    description: 'Create a new issue in Jira under the connected project',
    parameters: {
      summary: { type: 'string', description: 'Issue title/summary', required: true },
      description: { type: 'string', description: 'Issue description', required: true },
      issueType: { type: 'string', description: 'Issue type name (must match project schema, e.g. Epic, Story, Task, Feature)', required: true },
      parentKey: { type: 'string', description: 'Parent issue key for hierarchy (e.g. PROJ-123). Use this to create Stories under Epics, etc.', required: false },
      labels: { type: 'array', description: 'Labels to add', required: false },
      storyPoints: { type: 'number', description: 'Story point estimate', required: false },
    },
    requiresApproval: true,
  },
  {
    name: 'update_jira_issue',
    description: 'Update an existing Jira issue',
    parameters: {
      issueKey: { type: 'string', description: 'Issue key (e.g. PROJ-123)', required: true },
      summary: { type: 'string', description: 'New summary/title', required: false },
      description: { type: 'string', description: 'New description', required: false },
    },
    requiresApproval: true,
  },
  {
    name: 'transition_jira_issue',
    description: 'Move a Jira issue to a new workflow status',
    parameters: {
      issueKey: { type: 'string', description: 'Issue key (e.g. PROJ-123)', required: true },
      targetStatus: { type: 'string', description: 'Target status name (e.g. "In Progress", "Done")', required: true },
    },
    requiresApproval: true,
  },
  {
    name: 'add_jira_comment',
    description: 'Add a comment to a Jira issue',
    parameters: {
      issueKey: { type: 'string', description: 'Issue key (e.g. PROJ-123)', required: true },
      comment: { type: 'string', description: 'Comment text to add', required: true },
    },
    requiresApproval: true,
  },
  {
    name: 'search_jira',
    description: 'Search Jira issues using JQL query. Use this to find existing issues, check for duplicates, or gather data.',
    parameters: {
      jql: { type: 'string', description: 'JQL query string (e.g. "project = PROJ AND issuetype = Epic")', required: true },
    },
    requiresApproval: false, // read-only, auto-executes
  },
  {
    name: 'create_initiative',
    description: 'Create a new initiative in the Azmyra pipeline',
    parameters: {
      title: { type: 'string', description: 'Initiative title', required: true },
      description: { type: 'string', description: 'Initiative description', required: true },
      status: { type: 'string', description: 'Pipeline stage', required: false, enum: ['idea', 'discovery', 'validation', 'definition', 'approved'] },
      businessValue: { type: 'string', description: 'Business value assessment', required: false, enum: ['high', 'medium', 'low'] },
      effort: { type: 'string', description: 'Effort estimate', required: false, enum: ['high', 'medium', 'low'] },
    },
    requiresApproval: true,
  },
  {
    name: 'update_initiative',
    description: 'Update an existing initiative in the Azmyra pipeline',
    parameters: {
      initiativeId: { type: 'string', description: 'Initiative ID', required: true },
      title: { type: 'string', description: 'New title', required: false },
      description: { type: 'string', description: 'New description', required: false },
      status: { type: 'string', description: 'New pipeline stage', required: false, enum: ['idea', 'discovery', 'validation', 'definition', 'approved'] },
      businessValue: { type: 'string', description: 'New business value', required: false, enum: ['high', 'medium', 'low'] },
      whyNeeded: { type: 'string', description: 'Why is this needed', required: false },
      expectedValue: { type: 'string', description: 'Expected business value description', required: false },
    },
    requiresApproval: true,
  },
];
