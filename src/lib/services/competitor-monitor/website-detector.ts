/**
 * Monitors competitor websites for changes.
 * Uses content hashing to detect changes between scans.
 * Focuses on high-signal pages: pricing, changelog, blog, careers, features.
 */

const HIGH_SIGNAL_PATHS = [
  '/pricing',
  '/price',
  '/plans',
  '/changelog',
  '/updates',
  '/release-notes',
  '/blog',
  '/careers',
  '/jobs',
  '/features',
  '/product',
  '/enterprise',
];

const SIGNAL_WEIGHTS: Record<string, number> = {
  '/pricing': 0.95,
  '/price': 0.95,
  '/plans': 0.95,
  '/changelog': 0.85,
  '/updates': 0.85,
  '/release-notes': 0.85,
  '/careers': 0.6,
  '/jobs': 0.6,
  '/blog': 0.5,
  '/features': 0.75,
  '/product': 0.75,
  '/enterprise': 0.7,
};

function simpleHash(str: string): string {
  let hash = 0;
  const normalized = str.replace(/\s+/g, ' ').trim();
  for (let i = 0; i < Math.min(normalized.length, 50000); i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Azmyra/1.0; +https://ai.theproductowner.org)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return null;
  }
}

export interface PageScanResult {
  path: string;
  url: string;
  changed: boolean;
  isFirstScan: boolean;
  currentHash: string;
  previousHash: string | null;
  signalWeight: number;
  content: string | null;
}

export { HIGH_SIGNAL_PATHS };

export async function scanCompetitorWebsite(
  domain: string,
  previousHashes: Record<string, string>,
  pathsToMonitor: string[] = HIGH_SIGNAL_PATHS.slice(0, 6)
): Promise<PageScanResult[]> {
  const results: PageScanResult[] = [];

  // Scan pages in parallel (max 4 concurrent)
  const batches: string[][] = [];
  for (let i = 0; i < pathsToMonitor.length; i += 4) {
    batches.push(pathsToMonitor.slice(i, i + 4));
  }

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (path) => {
        const url = `https://${domain}${path}`;
        const content = await fetchPageText(url);
        if (!content || content.length < 100) return null;

        const currentHash = simpleHash(content);
        const previousHash = previousHashes[path] ?? null;
        const changed = previousHash !== null && previousHash !== currentHash;
        const isFirstScan = previousHash === null;

        return {
          path,
          url,
          changed,
          isFirstScan,
          currentHash,
          previousHash,
          signalWeight: SIGNAL_WEIGHTS[path] ?? 0.5,
          content: changed ? content.slice(0, 3000) : null,
        };
      })
    );
    for (const r of batchResults) {
      if (r) results.push(r);
    }
  }

  return results;
}

export function getChangedPages(results: PageScanResult[]): PageScanResult[] {
  return results.filter(r => r.changed && !r.isFirstScan);
}
