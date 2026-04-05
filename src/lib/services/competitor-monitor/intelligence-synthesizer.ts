/**
 * Takes raw signals (website changes, news items) and uses LLM to:
 * 1. Determine if signals are significant (not noise)
 * 2. Extract the strategic insight
 * 3. Generate a "what this means for you" note
 */

import type { NewsItem } from './news-fetcher';
import type { PageScanResult } from './website-detector';
import { LLMService } from '@/lib/services/llm';
import { extractLLMJSON } from '@/lib/utils';

const SYNTHESIS_PROMPT = `You are a competitive intelligence analyst.
Given these signals about a competitor, identify which ones are strategically significant.
For each significant signal, generate a brief strategic note.

Competitor: {competitorName}
Your company's vision: {northStar}

Signals to analyze:
{signals}

Return JSON array. Include ONLY signals with significance > 0.5:
[
  {
    "alertType": "pricing_change | new_feature | funding | website_change | job_signal | product_launch | partnership | reputation",
    "title": "Brief title (under 80 chars)",
    "summary": "What happened (2-3 sentences)",
    "significance": 0.0-1.0,
    "strategicNote": "What this means for your product strategy (1-2 sentences)",
    "sourceUrl": "url",
    "publishedAt": "ISO date or null"
  }
]
Return empty array [] if no significant signals found.
Do NOT include routine blog posts, minor copy changes, or events older than 60 days.`;

export interface SynthesisInput {
  competitorName: string;
  northStar: string;
  changedPages: PageScanResult[];
  newsItems: NewsItem[];
}

export interface SynthesisResult {
  alerts: Array<{
    alertType: string;
    title: string;
    summary: string;
    significance: number;
    strategicNote: string;
    sourceUrls: string; // JSON string
    publishedAt: Date | null;
    evidence: string; // JSON string
    status: 'new';
    dismissed: false;
  }>;
  signalCount: number;
  processingMs: number;
}

export async function synthesizeIntelligence(
  input: SynthesisInput,
  llmConfig: Parameters<typeof LLMService.create>[0]
): Promise<SynthesisResult> {
  const start = Date.now();

  const signals: string[] = [];

  for (const page of input.changedPages) {
    signals.push(`[WEBSITE CHANGE] ${page.url} — content changed (signal weight: ${page.signalWeight})`);
    if (page.content) {
      signals.push(`  Preview: ${page.content.slice(0, 200)}`);
    }
  }

  for (const news of input.newsItems.slice(0, 10)) {
    const date = news.publishedAt
      ? news.publishedAt.toISOString().split('T')[0]
      : 'date unknown';
    signals.push(`[${news.source.toUpperCase()}] ${news.title} (${date}) — ${news.relevanceType}`);
    signals.push(`  URL: ${news.url}`);
  }

  if (signals.length === 0) {
    return { alerts: [], signalCount: 0, processingMs: Date.now() - start };
  }

  try {
    const prompt = SYNTHESIS_PROMPT
      .replace('{competitorName}', input.competitorName)
      .replace('{northStar}', input.northStar || 'not set')
      .replace('{signals}', signals.join('\n'));

    const llm = LLMService.create(llmConfig);
    const response = await llm.chat([
      { role: 'system', content: 'You are a competitive intelligence analyst. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ], { temperature: 0.3 });

    const parsed = extractLLMJSON<Array<Record<string, unknown>>>(response);

    if (!Array.isArray(parsed)) {
      return { alerts: [], signalCount: signals.length, processingMs: Date.now() - start };
    }

    const alerts = parsed
      .filter((a) =>
        a.alertType && a.title && typeof a.significance === 'number'
      )
      .map((a) => ({
        alertType: String(a.alertType),
        title: String(a.title).slice(0, 200),
        summary: String(a.summary ?? ''),
        significance: Math.min(1, Math.max(0, Number(a.significance))),
        strategicNote: String(a.strategicNote ?? ''),
        sourceUrls: JSON.stringify(a.sourceUrl ? [a.sourceUrl] : []),
        publishedAt: a.publishedAt ? new Date(String(a.publishedAt)) : null,
        evidence: JSON.stringify([]),
        status: 'new' as const,
        dismissed: false as const,
      }));

    return { alerts, signalCount: signals.length, processingMs: Date.now() - start };
  } catch (err) {
    console.error('[intelligence-synthesizer] LLM synthesis failed:', err);
    return { alerts: [], signalCount: signals.length, processingMs: Date.now() - start };
  }
}
