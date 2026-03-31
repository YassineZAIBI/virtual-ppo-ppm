import type { WorkflowDefinition } from '@/lib/types';

export const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  initiative_deep_dive: {
    type: 'initiative_deep_dive',
    name: 'Initiative deep dive',
    description:
      'Full analysis pipeline: Discovery researches context → Risk assesses threats → Strategy recommends approach → Communications drafts stakeholder update',
    steps: [
      {
        agent: 'discovery',
        messageType: 'finding',
        outputKey: 'discovery_findings',
        promptTemplate: `You are the Discovery agent. Analyze this initiative deeply.

Initiative context:
{initiative_context}

Company context:
{company_context}

Your task:
1. Identify the core user problem this initiative addresses
2. List assumptions that need to be validated
3. Identify the 3 most important open questions
4. Summarize relevant market context if available

Output a structured JSON with keys:
- coreProblem (string)
- assumptions (string[])
- openQuestions (string[])
- marketContext (string)
- confidenceLevel (number 0-1)`,
      },
      {
        agent: 'risk',
        messageType: 'assessment',
        outputKey: 'risk_assessment',
        promptTemplate: `You are the Risk agent. Assess risks for this initiative.

Initiative context:
{initiative_context}

Discovery findings:
{discovery_findings}

Company context:
{company_context}

Your task:
1. Identify the top 5 risks (technical, market, resource, timeline, strategic)
2. Score each risk: severity (1-5) × likelihood (1-5) = risk score
3. Suggest mitigation for each risk scored >= 12
4. Flag any showstopper risks (score >= 20)

Output a structured JSON with keys:
- risks (array of: title, category, severity, likelihood, score, mitigation)
- showstoppers (string[])
- overallRiskLevel ("low" | "medium" | "high" | "critical")
- recommendation (string)`,
      },
      {
        agent: 'strategy',
        messageType: 'recommendation',
        outputKey: 'strategy_recommendation',
        promptTemplate: `You are the Strategy agent. Provide strategic recommendations.

Initiative context:
{initiative_context}

Discovery findings:
{discovery_findings}

Risk assessment:
{risk_assessment}

Company context:
{company_context}

Your task:
1. Recommend: proceed / proceed with changes / pause / kill
2. If proceeding, suggest the right scope and phasing
3. Identify which strategic goals this initiative serves
4. Estimate the value potential (high/medium/low) across: revenue, user impact, alignment, feasibility, timing

Output a structured JSON with keys:
- verdict ("proceed" | "proceed_with_changes" | "pause" | "kill")
- rationale (string)
- suggestedScope (string)
- phasing (string[])
- valueScores (object: revenue, userImpact, alignment, feasibility, timing — each 1-5)
- nextActions (string[])`,
      },
      {
        agent: 'communications',
        messageType: 'draft',
        outputKey: 'stakeholder_update',
        promptTemplate: `You are the Communications agent. Draft a stakeholder update.

Initiative context:
{initiative_context}

Strategy recommendation:
{strategy_recommendation}

Risk assessment (summary):
{risk_assessment}

Company context:
{company_context}

Your task:
Draft a concise stakeholder update (max 200 words) that:
1. States the initiative and its strategic importance
2. Summarizes the recommendation and rationale
3. Lists the 2-3 key next actions
4. Is written in a confident, professional tone appropriate for executive stakeholders

Output a structured JSON with keys:
- subject (string — email subject line)
- body (string — the update text)
- audience ("executive" | "team" | "board")
- urgency ("routine" | "important" | "urgent")`,
      },
    ],
  },

  market_threat_response: {
    type: 'market_threat_response',
    name: 'Market threat response',
    description:
      'Competitive threat pipeline: Risk assesses the threat → Advisor recommends response options → Strategy selects the best approach',
    steps: [
      {
        agent: 'risk',
        messageType: 'assessment',
        outputKey: 'threat_assessment',
        promptTemplate: `You are the Risk agent. Assess this market threat.

Threat context:
{threat_context}

Company context:
{company_context}

Your task:
1. Assess the severity of this competitive threat (1-5)
2. Estimate the timeline pressure (immediate/months/quarters/years)
3. Identify which of our products/initiatives are most exposed
4. Assess our current defensive position

Output structured JSON with keys:
- severity (1-5)
- timelinePressure (string)
- exposedAreas (string[])
- defensivePosition ("strong" | "adequate" | "weak" | "exposed")
- urgencyToRespond (string)`,
      },
      {
        agent: 'advisor',
        messageType: 'recommendation',
        outputKey: 'response_options',
        promptTemplate: `You are the Advisor agent. Generate response options.

Threat assessment:
{threat_assessment}

Threat context:
{threat_context}

Company context:
{company_context}

Your task:
Generate 3 distinct response options (from conservative to aggressive):
- Option A: Defensive / minimal response
- Option B: Measured response / differentiate
- Option C: Aggressive response / counter-attack

For each option: name, description, required resources, timeline, risk level, potential upside.

Output structured JSON with keys:
- options (array of: name, description, resources, timeline, riskLevel, upside)
- recommendedOption ("A" | "B" | "C")
- recommendationRationale (string)`,
      },
      {
        agent: 'strategy',
        messageType: 'recommendation',
        outputKey: 'final_strategy',
        promptTemplate: `You are the Strategy agent. Select the strategic response.

Response options:
{response_options}

Threat assessment:
{threat_assessment}

Company context:
{company_context}

Your task:
1. Select the best response option given our strategic position
2. Define the first 3 concrete actions to take this week
3. Define success metrics for the response
4. Flag any dependencies or prerequisites

Output structured JSON with keys:
- selectedOption (string)
- rationale (string)
- immediateActions (string[])
- successMetrics (string[])
- dependencies (string[])`,
      },
    ],
  },
};

export function getWorkflow(type: string): WorkflowDefinition | null {
  return WORKFLOW_DEFINITIONS[type] ?? null;
}

export function getWorkflowStepCount(type: string): number {
  return WORKFLOW_DEFINITIONS[type]?.steps.length ?? 0;
}
