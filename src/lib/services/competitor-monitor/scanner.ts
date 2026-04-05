/**
 * Main orchestrator for competitor monitoring.
 * Called by the cron job and by manual "Scan now" triggers.
 */

import { db } from '@/lib/db';
import { scanCompetitorWebsite, getChangedPages } from './website-detector';
import { fetchCompetitorNews } from './news-fetcher';
import { synthesizeIntelligence } from './intelligence-synthesizer';
import { LLMService } from '@/lib/services/llm';

export interface ScanOptions {
  userId: string;
  competitorId?: string;
  llmConfig: Parameters<typeof LLMService.create>[0] | null;
  forceFullScan?: boolean;
}

export interface ScanSummary {
  competitorsScanned: number;
  alertsGenerated: number;
  errors: string[];
}

export async function runCompetitorScan(options: ScanOptions): Promise<ScanSummary> {
  const { userId, competitorId, llmConfig, forceFullScan } = options;
  const summary: ScanSummary = { competitorsScanned: 0, alertsGenerated: 0, errors: [] };

  const competitors = await db.competitor.findMany({
    where: {
      userId,
      ...(competitorId ? { id: competitorId } : {}),
    },
    include: {
      monitors: true,
    },
  });

  // Load company North Star for context
  const northStarNode = await db.brainNode.findFirst({
    where: { userId, type: 'vision' },
    select: { content: true },
  }).catch(() => null);

  const northStar = northStarNode?.content ?? '';

  for (const competitor of competitors) {
    try {
      const domain = extractDomain(competitor.website ?? competitor.name);
      if (!domain) {
        summary.competitorsScanned++;
        continue;
      }

      let monitor = competitor.monitors.find((m: { domain: string }) => m.domain === domain);
      if (!monitor) {
        monitor = await db.competitorMonitor.create({
          data: {
            competitorId: competitor.id,
            userId,
            domain,
            monitoredPaths: JSON.stringify(['/pricing', '/blog', '/changelog', '/careers', '/features']),
          },
        });
      }

      // Skip if scanned recently (unless forced)
      if (!forceFullScan && monitor.lastScannedAt) {
        const hoursSince = (Date.now() - monitor.lastScannedAt.getTime()) / 3600000;
        const minHours = monitor.scanFrequency === 'hourly' ? 1 :
                         monitor.scanFrequency === 'daily' ? 20 : 160;
        if (hoursSince < minHours) {
          summary.competitorsScanned++;
          continue;
        }
      }

      // Parse stored hashes — JSON stored as string
      let previousHashes: Record<string, string> = {};
      try {
        previousHashes = JSON.parse(monitor.contentHashes);
      } catch { /* empty */ }

      const monitoredPaths = (() => {
        try { return JSON.parse(monitor.monitoredPaths) as string[]; }
        catch { return ['/pricing', '/blog', '/changelog']; }
      })();

      // Scan website for changes
      const pageResults = await scanCompetitorWebsite(domain, previousHashes, monitoredPaths);
      const changedPages = getChangedPages(pageResults);

      // Fetch recent news
      const newsItems = await fetchCompetitorNews(competitor.name);

      // Update content hashes
      const newHashes: Record<string, string> = { ...previousHashes };
      for (const result of pageResults) {
        newHashes[result.path] = result.currentHash;
      }

      await db.competitorMonitor.update({
        where: { id: monitor.id },
        data: {
          contentHashes: JSON.stringify(newHashes),
          lastScannedAt: new Date(),
        },
      });

      // Skip LLM synthesis if no changes and no news, or no llmConfig
      if ((changedPages.length === 0 && newsItems.length === 0) || !llmConfig) {
        summary.competitorsScanned++;
        continue;
      }

      // LLM synthesis — find what's significant
      const synthesis = await synthesizeIntelligence({
        competitorName: competitor.name,
        northStar,
        changedPages,
        newsItems,
      }, llmConfig);

      // Save alerts to DB (dedup: same type + title in last 7 days)
      for (const alert of synthesis.alerts) {
        const existing = await db.competitorAlert.findFirst({
          where: {
            competitorId: competitor.id,
            userId,
            alertType: alert.alertType,
            title: alert.title,
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        });
        if (existing) continue;

        await db.competitorAlert.create({
          data: {
            ...alert,
            competitorId: competitor.id,
            userId,
          },
        });
        summary.alertsGenerated++;
      }

      summary.competitorsScanned++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`${competitor.name}: ${msg}`);
    }
  }

  return summary;
}

function extractDomain(websiteOrName: string): string | null {
  try {
    if (websiteOrName.includes('.')) {
      const clean = websiteOrName
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
      return clean;
    }
    return null;
  } catch {
    return null;
  }
}
