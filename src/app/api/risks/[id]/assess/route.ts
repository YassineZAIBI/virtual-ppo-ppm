import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { LLMService, getUserLLMConfig } from '@/lib/services/llm';
import type { LLMConfig, LLMProvider } from '@/lib/types';
import { fetchFromSources } from '@/lib/services/data-pipeline/pipeline';

// ── helpers ────────────────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}

// ── web research ───────────────────────────────────────────────────────

interface ResearchResults {
  bestPractices: string[];
  caseStudies: string[];
  solutions: string[];
}

async function researchRisk(riskTitle: string, riskDescription: string): Promise<ResearchResults> {
  const research: ResearchResults = {
    bestPractices: [],
    caseStudies: [],
    solutions: [],
  };

  const queries = [
    { label: 'bestPractices' as const, query: `"${riskTitle}" risk mitigation strategy best practices` },
    { label: 'caseStudies' as const, query: `"${riskTitle}" case study lessons learned risk management` },
    { label: 'solutions' as const, query: `${riskTitle} ${riskDescription.split(' ').slice(0, 5).join(' ')} solution framework` },
  ];

  const results = await Promise.allSettled(
    queries.map(async ({ label, query }) => {
      const items = await fetchFromSources(query, ['duckduckgo'], {
        maxResults: 5,
        rawQuery: true,
        relevanceThreshold: 0,
        useCache: true,
      });
      return { label, items };
    }),
  );

  for (const r of results) {
    if (r.status === 'fulfilled') {
      research[r.value.label] = r.value.items.map(
        (item) => `[${item.sourceName}] ${item.title}: ${truncate(item.content, 300)}`,
      );
    }
  }

  return research;
}

// ── LLM prompt ─────────────────────────────────────────────────────────

function buildAssessmentPrompt(
  risk: {
    title: string;
    description: string;
    severity: string;
    probability: string;
    impact: string;
    status: string;
    mitigationPlan: string | null;
  },
  context: {
    northStar: string | null;
    goals: string[];
    initiatives: string[];
    otherRisks: string[];
  },
  research: ResearchResults,
): string {
  let prompt = `Assess this product risk and propose actionable mitigation:

## Risk
Title: ${risk.title}
Description: ${risk.description}
Current Severity: ${risk.severity} | Probability: ${risk.probability} | Impact: ${risk.impact}
Status: ${risk.status}
Current Mitigation: ${risk.mitigationPlan || 'None'}

## Product Context
`;

  if (context.northStar) prompt += `North Star: ${context.northStar}\n`;
  if (context.goals.length > 0) prompt += `Business Goals: ${context.goals.join('; ')}\n`;
  if (context.initiatives.length > 0) prompt += `Active Initiatives: ${context.initiatives.join('; ')}\n`;
  if (context.otherRisks.length > 0) prompt += `Other Tracked Risks: ${context.otherRisks.join('; ')}\n`;

  prompt += `\n## Research Gathered\n`;
  if (research.bestPractices.length > 0) {
    prompt += `**Best Practices:**\n${research.bestPractices.join('\n')}\n\n`;
  }
  if (research.caseStudies.length > 0) {
    prompt += `**Case Studies:**\n${research.caseStudies.join('\n')}\n\n`;
  }
  if (research.solutions.length > 0) {
    prompt += `**Solutions:**\n${research.solutions.join('\n')}\n\n`;
  }

  prompt += `
Respond with ONLY valid JSON:
{
  "severityAssessment": {
    "recommended": "critical|high|medium|low",
    "justification": "Why this severity level based on the evidence..."
  },
  "riskScore": 0-100,
  "impactAnalysis": "How this risk affects the product vision and goals. Be specific.",
  "mitigationStrategy": {
    "summary": "Overall approach in 1-2 sentences",
    "immediate": ["Concrete action within 48 hours", "..."],
    "shortTerm": ["Action within 2-4 weeks", "..."],
    "longTerm": ["Strategic action for next quarter", "..."]
  },
  "cascadingRisks": ["Other risk that could be triggered", "..."],
  "recommendations": "Strategic advice for the product manager...",
  "sources": ["Key source that informed this analysis", "..."],
  "proposedActions": [
    {
      "toolName": "update_risk_severity",
      "description": "Update severity to [recommended] based on analysis",
      "toolArguments": { "riskId": "RISK_ID", "severity": "[recommended]" }
    },
    {
      "toolName": "update_risk_mitigation",
      "description": "Apply comprehensive mitigation strategy",
      "toolArguments": { "riskId": "RISK_ID", "mitigationPlan": "Summarized mitigation plan" }
    },
    {
      "toolName": "update_risk_status",
      "description": "Move risk to mitigating status",
      "toolArguments": { "riskId": "RISK_ID", "status": "mitigating" }
    }
  ]
}`;

  return prompt;
}

// ── route handler ──────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.user.id;
    const { id: riskId } = await params;

    // Get LLM config
    let body: Record<string, any> = {};
    try {
      body = await req.json();
    } catch {
      // empty body is fine
    }

    let config: LLMConfig;
    const llmDirect = body.llmConfig;
    if (llmDirect?.provider && llmDirect?.apiKey) {
      config = {
        provider: llmDirect.provider as LLMProvider,
        apiKey: llmDirect.apiKey,
        apiEndpoint: llmDirect.apiEndpoint || undefined,
        model: llmDirect.model || undefined,
      };
    } else {
      try {
        config = await getUserLLMConfig(userId);
      } catch {
        return NextResponse.json(
          { error: 'LLM not configured. Please set up your LLM provider in Settings.' },
          { status: 400 },
        );
      }
    }

    // Fetch the risk
    const risk = await db.risk.findFirst({ where: { id: riskId, userId } });
    if (!risk) {
      return NextResponse.json({ error: 'Risk not found' }, { status: 404 });
    }

    // Fetch product context
    const [northStar, businessGoals, initiatives, otherRisks] = await Promise.all([
      db.northStar.findUnique({ where: { userId } }),
      db.businessGoal.findMany({ where: { userId }, select: { title: true } }),
      db.initiative.findMany({ where: { userId }, select: { title: true, status: true }, take: 20 }),
      db.risk.findMany({ where: { userId, id: { not: riskId } }, select: { title: true, severity: true } }),
    ]);

    const context = {
      northStar: northStar?.statement ?? null,
      goals: businessGoals.map((g) => g.title),
      initiatives: initiatives.map((i) => `${i.title} (${i.status})`),
      otherRisks: otherRisks.map((r) => `${r.title} [${r.severity}]`),
    };

    // Phase A: Research
    const research = await researchRisk(risk.title, risk.description);

    // Phase B: LLM Analysis
    const prompt = buildAssessmentPrompt(
      {
        title: risk.title,
        description: risk.description,
        severity: risk.severity,
        probability: risk.probability,
        impact: risk.impact,
        status: risk.status,
        mitigationPlan: risk.mitigationPlan,
      },
      context,
      research,
    );

    const llm = LLMService.create(config);
    const response = await llm.chat(
      [
        {
          role: 'system',
          content:
            'You are an autonomous risk assessment agent for a product management team. Analyze risks deeply using the research data provided. Propose concrete mitigation strategies and actionable steps. Always respond with valid JSON only, no markdown fences.',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.2, maxTokens: 3000 },
    );

    // Parse response
    let assessment: any;
    try {
      const cleaned = response.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      assessment = JSON.parse(cleaned);
    } catch {
      console.error('[RISK_ASSESS] Could not parse LLM response:', response.slice(0, 500));
      return NextResponse.json(
        { error: 'Could not parse AI response. Please try again.' },
        { status: 502 },
      );
    }

    // Replace RISK_ID placeholders in proposed actions
    if (Array.isArray(assessment.proposedActions)) {
      for (const action of assessment.proposedActions) {
        if (action.toolArguments) {
          for (const key of Object.keys(action.toolArguments)) {
            if (action.toolArguments[key] === 'RISK_ID') {
              action.toolArguments[key] = riskId;
            }
          }
          // Always ensure riskId is set
          if (!action.toolArguments.riskId) {
            action.toolArguments.riskId = riskId;
          }
        }
      }
    }

    // Build mitigation summary from strategy
    let mitigationSummary = '';
    if (assessment.mitigationStrategy) {
      const s = assessment.mitigationStrategy;
      const parts: string[] = [];
      if (s.summary) parts.push(s.summary);
      if (s.immediate?.length) parts.push(`Immediate: ${s.immediate.join('; ')}`);
      if (s.shortTerm?.length) parts.push(`Short-term: ${s.shortTerm.join('; ')}`);
      if (s.longTerm?.length) parts.push(`Long-term: ${s.longTerm.join('; ')}`);
      mitigationSummary = parts.join('\n');
    }

    // Phase C: Persist
    const now = new Date();
    await db.risk.update({
      where: { id: riskId },
      data: {
        aiAssessment: JSON.stringify(assessment),
        aiSeverity: assessment.severityAssessment?.recommended || null,
        aiMitigation: mitigationSummary || null,
        assessedAt: now,
      },
    });

    // Generate action IDs
    const actions = (assessment.proposedActions ?? []).map((a: any, i: number) => ({
      id: `risk-action-${riskId}-${i}-${Date.now()}`,
      toolName: a.toolName,
      description: a.description,
      toolArguments: a.toolArguments ?? {},
    }));

    return NextResponse.json({
      assessment,
      actions,
      riskId,
      researchSources: {
        bestPractices: research.bestPractices.length,
        caseStudies: research.caseStudies.length,
        solutions: research.solutions.length,
      },
    });
  } catch (error) {
    console.error('[RISK_ASSESS_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
