// Prompt Builder — generates the tool+schema section for the LLM system prompt

import type { ToolDefinition } from './registry';
import type { JiraProjectSchema } from '../types';

export function buildToolSystemPrompt(
  schema: JiraProjectSchema | null,
  tools: ToolDefinition[],
  jiraConnected: boolean
): string {
  // Filter tools based on what's available
  const availableTools = tools.filter((t) => {
    if (t.name.startsWith('create_jira') || t.name.startsWith('update_jira') || t.name.startsWith('transition_jira') || t.name.startsWith('add_jira') || t.name === 'search_jira') {
      return jiraConnected;
    }
    return true;
  });

  if (availableTools.length === 0) return '';

  let prompt = `

--- AVAILABLE TOOLS ---
You can propose actions by including JSON tool call blocks in your response.
Format each tool call as a fenced code block with the language marker "tool_call":

\`\`\`tool_call
{
  "tool": "tool_name_here",
  "args": { "param1": "value1", "param2": "value2" },
  "reason": "Brief explanation of why this action is needed"
}
\`\`\`

IMPORTANT RULES for tool calls:
- You may include MULTIPLE tool_call blocks in a single response
- Include your normal conversational response OUTSIDE the tool_call blocks
- Write-operation tools require user approval before execution — the user will see an approve/reject card
- Read-only tools (like search_jira) execute automatically and results are appended
- Only propose tool calls that are clearly needed based on the user's request or the conversation context
- Do NOT propose tool calls for simple informational questions that can be answered from the data already provided
- When creating Jira issues, ALWAYS specify the correct issueType from the project schema

Available tools:
`;

  for (const tool of availableTools) {
    const params = Object.entries(tool.parameters)
      .map(([name, p]) => `    - ${name} (${p.type}${p.required ? ', required' : ', optional'}): ${p.description}${p.enum ? ` [${p.enum.join(' | ')}]` : ''}`)
      .join('\n');
    prompt += `\n**${tool.name}**: ${tool.description}${tool.requiresApproval ? ' [requires approval]' : ' [auto-executes]'}
  Parameters:
${params}
`;
  }

  if (schema) {
    prompt += `
--- JIRA PROJECT SCHEMA (${schema.projectKey}: ${schema.projectName}) ---
Available issue types and hierarchy (higher level = parent):
`;
    for (const level of schema.hierarchy) {
      const indent = '  '.repeat(Math.max(0, 3 - level.level));
      prompt += `${indent}Level ${level.level}: ${level.issueTypeNames.join(', ')}`;
      if (level.canContain.length > 0) {
        prompt += ` → can contain: ${level.canContain.join(', ')}`;
      }
      prompt += '\n';
    }
    prompt += `
When creating Jira issues:
- Use an issueType that exists in this schema (exact name match required)
- To create child issues, set parentKey to the parent issue key
- Example: To create a Story under Epic MDATA-123, use issueType="Story" and parentKey="MDATA-123"
`;
  }

  return prompt;
}
