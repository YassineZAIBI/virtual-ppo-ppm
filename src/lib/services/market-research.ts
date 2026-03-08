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

    // Build structured context for LLM
    let context = `## Research Topic: ${research.query}\n\n`;
    context += `**Data collected from ${research.dataPoints.length} sources:**\n\n`;

    for (const [category, points] of grouped) {
      context += `### ${category.charAt(0).toUpperCase() + category.slice(1)} Sources (${points.length})\n\n`;
      for (const dp of points) {
        context += `**[${dp.sourceName}](${dp.sourceUrl})** — ${dp.title}\n`;
        // Truncate content to avoid token limits
        const truncated = dp.rawContent.length > 1000
          ? dp.rawContent.slice(0, 1000) + '...'
          : dp.rawContent;
        context += `${truncated}\n\n`;
      }
    }

    const prompt = `You are a senior market research analyst. Synthesize the following REAL data points into a comprehensive, well-structured market research report.

CRITICAL RULES:
1. Every claim, statistic, or fact MUST cite its source using [Source Name](URL) format
2. Do NOT fabricate any data — only use information from the provided sources
3. Use ## for main sections, ### for subsections
4. Include a "Key Statistics" section with a markdown table if applicable
5. Include a "Sources" section at the end listing all referenced sources
6. Use **bold** for emphasis, bullet points for lists
7. Be analytical — don't just summarize, draw insights and identify patterns

Report Structure:
- Executive Summary
- Market Overview & Size (with real numbers from sources)
- Key Trends & Signals
- Competitive Landscape (if relevant data exists)
- Key Statistics (table format)
- Implications & Recommendations
- Sources

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
