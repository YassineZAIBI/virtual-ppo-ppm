import { NextRequest, NextResponse } from 'next/server';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8100';

export async function POST(request: NextRequest) {
  let body: any;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { message, history, settings, storeData, agentId, pendingActionId, pendingActionDecision } = body;

  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  // Try Python agent service first
  try {
    const agentResponse = await fetch(`${AGENT_SERVICE_URL}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: (history || []).slice(-10).map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        settings: settings || {},
        store_data: storeData || null,
        agent_id: agentId || null,
        pending_action_id: pendingActionId || null,
        pending_action_decision: pendingActionDecision || null,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (agentResponse.ok) {
      const data = await agentResponse.json();

      // Check if ALL tool executions failed — if so, the agent's integrations
      // are broken and our data-enriched fallback will give better results
      const tools = data.tools_executed || [];
      const allToolsFailed = tools.length > 0 && tools.every((t: any) => t.status === 'failed');
      if (!allToolsFailed) {
        return NextResponse.json(data);
      }
      console.log('Agent tools all failed, falling through to data-enriched fallback');
    }

    // Agent service returned an error — fall through to fallback
    const errorData = await agentResponse.json().catch(() => ({}));
    console.error('Agent service error:', agentResponse.status, errorData);
  } catch (err: any) {
    console.error('Agent service unreachable:', err.message);
  }

  // Fallback: direct LLM call when Python agent service is unavailable
  try {
    return await fallbackDirectLLM(message, history, settings, storeData);
  } catch (error: any) {
    console.error('Fallback LLM error:', error);
    return NextResponse.json(
      { error: `LLM request failed: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * Fallback: direct LLM call when Python agent service is unavailable.
 * Injects store data + live Jira context so the LLM can answer data questions.
 */
async function fallbackDirectLLM(
  message: string,
  history: any[],
  settings: any,
  storeData: any
): Promise<NextResponse> {
  const { LLMService } = await import('@/lib/services/llm');
  const llmConfig = {
    provider: settings?.llm?.provider || 'openai',
    apiKey: settings?.llm?.apiKey || '',
    apiEndpoint: settings?.llm?.apiEndpoint,
    model: settings?.llm?.model || undefined,
  };

  const llm = LLMService.create(llmConfig as any);

  // Build data context from synced store data
  let dataContext = '';
  if (storeData) {
    const sections: string[] = [];

    if (storeData.initiatives?.length) {
      const items = storeData.initiatives.map((i: any) =>
        `- ${i.jiraKey ? `[${i.jiraKey}] ` : ''}${i.title} | Type: ${i.jiraIssueType || 'N/A'} | Status: ${i.status} | Value: ${i.businessValue} | Effort: ${i.effort}${i.stakeholders?.length ? ` | Owner: ${i.stakeholders[0]}` : ''}`
      );
      sections.push(`## Initiatives/Features (${storeData.initiatives.length} total)\n${items.join('\n')}`);
    }

    if (storeData.risks?.length) {
      const items = storeData.risks.map((r: any) =>
        `- ${r.title} | Severity: ${r.severity} | Status: ${r.status} | Probability: ${r.probability}`
      );
      sections.push(`## Risks (${storeData.risks.length} total)\n${items.join('\n')}`);
    }

    if (storeData.roadmapItems?.length) {
      const items = storeData.roadmapItems.map((r: any) =>
        `- ${r.jiraKey ? `[${r.jiraKey}] ` : ''}${r.title} | Type: ${r.type} | Status: ${r.status} | Progress: ${r.progress}%${r.owner ? ` | Owner: ${r.owner}` : ''}`
      );
      sections.push(`## Roadmap (${storeData.roadmapItems.length} items)\n${items.join('\n')}`);
    }

    if (storeData.meetings?.length) {
      const items = storeData.meetings.map((m: any) =>
        `- ${m.title} | Date: ${m.date ? new Date(m.date).toLocaleDateString() : 'N/A'} | Status: ${m.status}${m.decisions?.length ? ` | Decisions: ${m.decisions.join('; ')}` : ''}`
      );
      sections.push(`## Meetings (${storeData.meetings.length} total)\n${items.join('\n')}`);
    }

    if (sections.length) {
      dataContext = `\n\n--- CURRENT PRODUCT DATA (from Azmyra workspace) ---\n${sections.join('\n\n')}`;
    }
  }

  // Live Jira query: if message mentions Jira and credentials exist, fetch live data
  let liveJiraContext = '';
  const lowerMsg = message.toLowerCase();
  const jiraCreds = settings?.integrations?.jira;
  const mentionsJira = lowerMsg.includes('jira') || lowerMsg.includes('epic') || lowerMsg.includes('sprint') || lowerMsg.includes('backlog');

  if (mentionsJira && jiraCreds?.url && jiraCreds?.email && jiraCreds?.apiToken) {
    try {
      const { JiraService } = await import('@/lib/services/jira');
      const jira = new JiraService(jiraCreds.url, jiraCreds.email, jiraCreds.apiToken);

      // Determine what to query
      let jql = '';
      if (jiraCreds.projectKey) {
        if (lowerMsg.includes('epic')) {
          jql = `project = "${jiraCreds.projectKey}" AND issuetype in ("Epic", "Portfolio EPIC") ORDER BY updated DESC`;
        } else if (lowerMsg.includes('feature')) {
          jql = `project = "${jiraCreds.projectKey}" AND issuetype in ("Features", "Feature") ORDER BY updated DESC`;
        } else if (lowerMsg.includes('bug')) {
          jql = `project = "${jiraCreds.projectKey}" AND issuetype = "Bug" ORDER BY updated DESC`;
        } else if (lowerMsg.includes('story') || lowerMsg.includes('stories')) {
          jql = `project = "${jiraCreds.projectKey}" AND issuetype = "Story" ORDER BY updated DESC`;
        } else if (lowerMsg.includes('sprint')) {
          jql = `project = "${jiraCreds.projectKey}" AND sprint in openSprints() ORDER BY rank ASC`;
        } else {
          jql = `project = "${jiraCreds.projectKey}" AND issuetype in ("Initiative", "Epic", "Portfolio EPIC", "Features", "Feature") ORDER BY updated DESC`;
        }
      }

      if (jql) {
        const issues = await jira.getIssues(jiraCreds.projectKey, jql);
        if (issues.length > 0) {
          const issueLines = issues.slice(0, 50).map((iss: any) =>
            `- [${iss.key}] ${iss.summary} | Type: ${iss.issueType} | Status: ${iss.status}${iss.assignee ? ` | Assignee: ${iss.assignee}` : ''}${iss.priority ? ` | Priority: ${iss.priority}` : ''}`
          );
          liveJiraContext = `\n\n--- LIVE JIRA DATA (fetched now from ${jiraCreds.projectKey}) ---\n${issues.length} issues found:\n${issueLines.join('\n')}`;
          if (issues.length > 50) {
            liveJiraContext += `\n... and ${issues.length - 50} more`;
          }
        }
      }

      // Also fetch projects list if they ask about projects
      if (lowerMsg.includes('project')) {
        const projects = await jira.getProjects();
        if (projects.length > 0) {
          const projLines = projects.slice(0, 30).map((p: any) => `- ${p.key}: ${p.name}`);
          liveJiraContext += `\n\n## Jira Projects (${projects.length} total)\n${projLines.join('\n')}`;
        }
      }
    } catch (err: any) {
      liveJiraContext = `\n\n[Note: Live Jira query failed: ${err.message}]`;
    }
  }

  // Integration status
  let integrationStatus = '';
  if (settings?.integrations) {
    const connected: string[] = [];
    if (jiraCreds?.url && jiraCreds?.apiToken) connected.push(`Jira (${jiraCreds.projectKey || 'no project selected'})`);
    if (settings.integrations.confluence?.url && settings.integrations.confluence?.apiToken) connected.push('Confluence');
    if (settings.integrations.slack?.botToken) connected.push('Slack');
    if (connected.length) {
      integrationStatus = `\nConnected integrations: ${connected.join(', ')}`;
    }
  }

  const messages: Array<{ role: string; content: string }> = [
    {
      role: 'system',
      content: `You are Azmyra, an intelligent AI-powered product management assistant. You have full access to the user's product data, synced Jira issues, and connected integrations. Use this data to give specific, data-driven answers.

When the user asks about their initiatives, features, epics, roadmap, risks, or meetings — answer using the ACTUAL DATA provided below. Do NOT say you lack access. The data is right here.
${integrationStatus}
${dataContext}
${liveJiraContext}

STRICT MARKDOWN FORMATTING RULES (follow these exactly):
- Use ## for main section headers, ### for subsections
- Tables MUST use GitHub-Flavored Markdown: header row, then separator row (| --- | --- |), then data rows. NO blank lines between table rows.
- Bold text: use **double asterisks** only (NOT triple ***)
- Do NOT use LaTeX notation ($...$) — write formulas in plain text
- Leave a blank line between sections for readability
- Use bullet lists (- item) for unordered items, numbered lists (1. item) only for sequential steps`
    }
  ];

  if (history && Array.isArray(history)) {
    for (const msg of history.slice(-10)) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }
  messages.push({ role: 'user', content: message });

  const toolsExecuted: any[] = [];
  if (liveJiraContext && !liveJiraContext.includes('failed')) {
    toolsExecuted.push({ toolName: 'jira_search', status: 'executed' });
  }

  const response = await llm.chat(messages, { temperature: 0.7, maxTokens: 4000 });

  return NextResponse.json({
    response,
    agent_id: 'strategy',
    agent_name: liveJiraContext ? 'Strategy + Jira' : 'Strategy',
    tools_executed: toolsExecuted,
    pending_actions: [],
    rag_context: [],
    sources: [],
  });
}
