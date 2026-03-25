import { db } from '@/lib/db';
import { fetchFromSources } from './data-pipeline/pipeline';
import type { DataResult } from './data-pipeline/types';
import { LLMService } from './llm';
import type { LLMConfig } from '@/lib/types';

// Import adapters to ensure they're registered
import './data-pipeline/adapters';

export async function gatherMarketData(
  researchId: string,
  query: string,
  adapterKeys: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<void> {
  // Update status to gathering
  await db.marketResearch.update({
    where: { id: researchId },
    data: { status: 'gathering' },
  });

  try {
    const results = await fetchFromSources(query, adapterKeys, {
      maxResults: 10,
      useCache: true,
      onProgress,
    });

    // Store each result as a DataPoint
    for (const result of results) {
      await db.dataPoint.create({
        data: {
          researchId,
          adapterKey: result.sourceKey,
          sourceUrl: result.sourceUrl,
          sourceName: result.sourceName,
          title: result.title,
          rawContent: result.content,
          contentType: result.contentType,
          publishedAt: result.publishedAt,
          fetchedAt: result.fetchedAt,
          metadata: JSON.stringify(result.metadata),
        },
      });
    }

    // Update metadata
    const uniqueSources = new Set(results.map(r => r.sourceKey));
    await db.marketResearch.update({
      where: { id: researchId },
      data: {
        status: 'completed',
        reportMetadata: JSON.stringify({
          sourceCount: uniqueSources.size,
          dataPointCount: results.length,
        }),
      },
    });
  } catch (error) {
    await db.marketResearch.update({
      where: { id: researchId },
      data: { status: 'failed' },
    });
    throw error;
  }
}

export async function synthesizeReport(
  researchId: string,
  llmConfig: LLMConfig
): Promise<string> {
  await db.marketResearch.update({
    where: { id: researchId },
    data: { status: 'synthesizing' },
  });

  try {
    const research = await db.marketResearch.findUnique({
      where: { id: researchId },
      include: { dataPoints: true },
    });

    if (!research || research.dataPoints.length === 0) {
      throw new Error('No data points found for synthesis');
    }

    // Group data points by category
    const grouped = new Map<string, typeof research.dataPoints>();
    for (const dp of research.dataPoints) {
      const key = dp.contentType;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(dp);
    }

    // Build structured context for LLM — only include data points with actual content
    const usablePoints = research.dataPoints.filter(
      dp => dp.rawContent && dp.rawContent.trim().length > 20
    );

    let context = `## Research Topic: ${research.query}\n\n`;
    context += `**${usablePoints.length} data points collected from real sources:**\n\n`;

    for (const [category, points] of grouped) {
      const usable = points.filter(dp => dp.rawContent && dp.rawContent.trim().length > 20);
      if (usable.length === 0) continue;
      context += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Sources (${usable.length})\n\n`;
      for (const dp of usable) {
        context += `**[${dp.sourceName}](${dp.sourceUrl})** — ${dp.title}\n`;
        // Truncate content to avoid token limits
        const truncated = dp.rawContent.length > 1200
          ? dp.rawContent.slice(0, 1200) + '...'
          : dp.rawContent;
        context += `${truncated}\n\n`;
      }
    }

    const prompt = `You are a senior market research analyst producing a report on: "${research.query}"

Below are REAL data points gathered from live sources. Your task is to synthesize ONLY the relevant information into a focused, high-quality report.

CRITICAL RULES:
1. **RELEVANCE FIRST**: Ignore any data point that is NOT directly related to the research topic "${research.query}". Do NOT include off-topic results.
2. Every claim, statistic, or fact MUST cite its source using [Source Name](URL) format.
3. Do NOT fabricate, invent, or hallucinate any data — only use information explicitly present in the provided sources.
4. If a source is vague or tangential, skip it rather than stretching its meaning.
5. Use ## for main sections, ### for subsections.
6. Use **bold** for emphasis, bullet points for lists, and markdown tables for statistics.
7. Be analytical — identify patterns across sources, draw actionable insights, and highlight contradictions.
8. If data is sparse for a section, say so honestly rather than padding with filler.

Report Structure:
## Executive Summary
(2-3 paragraph overview of the most important findings)

## Market Overview
(Size, growth, key players — only if data supports it)

## Key Trends & Signals
(What are the emerging patterns across sources?)

## Community & Industry Sentiment
(What are practitioners, users, and experts saying?)

## Key Statistics
(Markdown table of concrete numbers found in sources)

## Strategic Implications & Recommendations
(What should a product team do based on these findings?)

## Sources
(Numbered list of all sources actually referenced in the report)

${context}`;

    const llm = LLMService.create(llmConfig);
    const report = await llm.chat([
      { role: 'user', content: prompt },
    ], { temperature: 0.3, maxTokens: 4000 });

    // Store the report
    await db.marketResearch.update({
      where: { id: researchId },
      data: {
        synthesizedReport: report,
        status: 'completed',
      },
    });

    // Save content version
    await db.contentVersion.create({
      data: {
        userId: research.userId,
        entityType: 'market_research',
        entityId: researchId,
        content: report,
        editedBy: 'ai',
        changeDescription: 'Initial AI-generated report',
      },
    });

    return report;
  } catch (error) {
    await db.marketResearch.update({
      where: { id: researchId },
      data: { status: 'failed' },
    });
    throw error;
  }
}

export function formatDataPointForDisplay(dp: {
  sourceName: string;
  sourceUrl: string;
  title: string;
  rawContent: string;
  adapterKey: string;
  fetchedAt: Date;
  metadata: string;
}): DataResult {
  return {
    sourceKey: dp.adapterKey,
    sourceUrl: dp.sourceUrl,
    sourceName: dp.sourceName,
    title: dp.title,
    content: dp.rawContent,
    contentType: 'article',
    fetchedAt: new Date(dp.fetchedAt),
    metadata: JSON.parse(dp.metadata || '{}'),
  };
}
