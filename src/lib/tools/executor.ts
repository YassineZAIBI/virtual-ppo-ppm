// Tool Executor — executes approved tool calls against JiraService or returns store mutations

import { JiraService } from '@/lib/services/jira';

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  storeAction?: {
    type: 'addInitiative' | 'updateInitiative' | 'moveInitiative' | 'updateRisk' | 'addRisk';
    payload: any;
  };
}

export async function executeToolCall(
  toolName: string,
  args: Record<string, any>,
  jiraCreds: { url: string; email: string; apiToken: string; projectKey: string }
): Promise<ToolExecutionResult> {
  try {
    switch (toolName) {
      case 'create_jira_issue': {
        const jira = new JiraService(jiraCreds.url, jiraCreds.email, jiraCreds.apiToken);
        const issue = await jira.createIssue(jiraCreds.projectKey, {
          summary: args.summary,
          description: args.description || '',
          issueType: args.issueType || 'Story',
          parentKey: args.parentKey,
          labels: args.labels || [],
          storyPoints: args.storyPoints,
        });
        return {
          success: true,
          result: { key: issue.key, summary: issue.summary, issueType: issue.issueType, status: issue.status },
        };
      }

      case 'update_jira_issue': {
        const jira = new JiraService(jiraCreds.url, jiraCreds.email, jiraCreds.apiToken);
        const updates: any = {};
        if (args.summary) updates.summary = args.summary;
        if (args.description) updates.description = args.description;
        await jira.updateIssue(args.issueKey, updates);
        return { success: true, result: { issueKey: args.issueKey, updated: Object.keys(updates) } };
      }

      case 'transition_jira_issue': {
        const jira = new JiraService(jiraCreds.url, jiraCreds.email, jiraCreds.apiToken);
        const transitions = await jira.getTransitions(args.issueKey);
        const match = transitions.find(
          (t) => t.name.toLowerCase() === args.targetStatus.toLowerCase()
        );
        if (!match) {
          return {
            success: false,
            error: `No transition to "${args.targetStatus}" for ${args.issueKey}. Available: ${transitions.map((t) => t.name).join(', ')}`,
          };
        }
        await jira.transitionIssue(args.issueKey, match.id);
        return { success: true, result: { issueKey: args.issueKey, newStatus: args.targetStatus } };
      }

      case 'add_jira_comment': {
        const jira = new JiraService(jiraCreds.url, jiraCreds.email, jiraCreds.apiToken);
        await jira.addComment(args.issueKey, args.comment);
        return { success: true, result: { issueKey: args.issueKey, commented: true } };
      }

      case 'search_jira': {
        const jira = new JiraService(jiraCreds.url, jiraCreds.email, jiraCreds.apiToken);
        const issues = await jira.searchIssues(args.jql);
        return { success: true, result: issues };
      }

      case 'create_initiative': {
        const initiative = {
          id: crypto.randomUUID(),
          title: args.title,
          description: args.description || '',
          status: args.status || 'idea',
          businessValue: args.businessValue || 'medium',
          effort: args.effort || 'medium',
          stakeholders: args.stakeholders || [],
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: args.tags || [],
          risks: [],
          dependencies: [],
        };
        return {
          success: true,
          result: initiative,
          storeAction: { type: 'addInitiative', payload: initiative },
        };
      }

      case 'update_initiative': {
        const updates: any = {};
        if (args.title) updates.title = args.title;
        if (args.description) updates.description = args.description;
        if (args.status) updates.status = args.status;
        if (args.businessValue) updates.businessValue = args.businessValue;
        if (args.whyNeeded) updates.whyNeeded = args.whyNeeded;
        if (args.expectedValue) updates.expectedValue = args.expectedValue;
        updates.updatedAt = new Date();
        return {
          success: true,
          result: { id: args.initiativeId, updates },
          storeAction: { type: 'updateInitiative', payload: { id: args.initiativeId, updates } },
        };
      }

      // ── Risk agent tools ──────────────────────────────────────────────

      case 'update_risk_severity': {
        try {
          const { db } = await import('../db');
          await db.risk.update({ where: { id: args.riskId }, data: { severity: args.severity } });
        } catch { /* DB optional — store mutation handles UI */ }
        return {
          success: true,
          result: { riskId: args.riskId, severity: args.severity },
          storeAction: { type: 'updateRisk', payload: { id: args.riskId, updates: { severity: args.severity } } },
        };
      }

      case 'update_risk_mitigation': {
        try {
          const { db } = await import('../db');
          await db.risk.update({ where: { id: args.riskId }, data: { mitigationPlan: args.mitigationPlan } });
        } catch { /* DB optional */ }
        return {
          success: true,
          result: { riskId: args.riskId, mitigationPlan: args.mitigationPlan },
          storeAction: { type: 'updateRisk', payload: { id: args.riskId, updates: { mitigationPlan: args.mitigationPlan } } },
        };
      }

      case 'update_risk_status': {
        try {
          const { db } = await import('../db');
          await db.risk.update({ where: { id: args.riskId }, data: { status: args.status } });
        } catch { /* DB optional */ }
        return {
          success: true,
          result: { riskId: args.riskId, status: args.status },
          storeAction: { type: 'updateRisk', payload: { id: args.riskId, updates: { status: args.status } } },
        };
      }

      case 'create_risk': {
        const newRisk = {
          id: crypto.randomUUID(),
          title: args.title,
          description: args.description || '',
          severity: args.severity || 'medium',
          probability: args.probability || 'medium',
          impact: args.impact || 'medium',
          status: 'identified',
          relatedItems: [],
          mitigationPlan: args.mitigationPlan || null,
          createdAt: new Date(),
        };
        return {
          success: true,
          result: newRisk,
          storeAction: { type: 'addRisk', payload: newRisk },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}
