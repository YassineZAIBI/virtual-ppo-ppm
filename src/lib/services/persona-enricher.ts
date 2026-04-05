import { LLMService } from '@/lib/services/llm';
import type { LLMConfig, TargetGroupPersona } from '@/lib/types';
import { extractLLMJSON } from '@/lib/utils';

const PERSONA_PROMPT = `You are a senior product researcher generating a rich, actionable user persona.
Given the target group information, generate a complete persona using the Jobs-to-be-Done framework,
empathy mapping, and behavioral analysis.

Target Group:
Name: {name}
Role: {role}
Description: {description}
Company North Star: {northStar}
Industry: {industry}

Return ONLY valid JSON with this exact structure:
{
  "jtbdStatement": "When [specific situation], I want to [specific motivation], so I can [specific outcome]",
  "jtbdFunctional": ["functional job 1", "functional job 2", "functional job 3"],
  "jtbdEmotional": ["emotional job 1", "emotional job 2"],
  "jtbdSocial": ["social job 1"],
  "empathyThinks": ["silent thought 1", "silent thought 2", "silent thought 3"],
  "empathySays": ["thing they say aloud 1", "thing they say aloud 2"],
  "empathyFeels": ["frustration 1", "aspiration 1", "anxiety 1"],
  "empathyDoes": ["observable behavior 1", "behavior 2", "behavior 3"],
  "triggers": ["what causes them to start looking for a solution like this"],
  "decisionDrivers": ["what makes them choose one tool over another"],
  "currentWorkarounds": ["what they currently do to solve this problem"],
  "churnRisks": ["what would make them stop using the product"],
  "successMetrics": ["how they measure their own success"],
  "preferredChannels": ["Slack", "Email", "Dashboard"],
  "companyStage": "scale-up",
  "teamSize": "10-50 people",
  "industryContext": "B2B SaaS",
  "dayInLife": "A 2-3 sentence vivid description of their typical day and the context in which they experience the problems this product solves.",
  "typicalQuote": "A realistic quote this person would say about their work situation."
}`;

export async function enrichPersona(
  group: { name: string; role: string; description: string },
  context: { northStar: string; industry: string },
  llmConfig: LLMConfig
): Promise<Partial<TargetGroupPersona>> {
  try {
    const prompt = PERSONA_PROMPT
      .replace('{name}', group.name)
      .replace('{role}', group.role || '')
      .replace('{description}', group.description || '')
      .replace('{northStar}', context.northStar || '')
      .replace('{industry}', context.industry || '');

    const llm = LLMService.create(llmConfig);
    const response = await llm.chat([
      { role: 'system', content: 'You are a senior product researcher. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.4 });

    return extractLLMJSON<Partial<TargetGroupPersona>>(response) ?? {};
  } catch (err) {
    console.error('[persona-enricher] Failed to enrich persona:', err);
    return {};
  }
}
