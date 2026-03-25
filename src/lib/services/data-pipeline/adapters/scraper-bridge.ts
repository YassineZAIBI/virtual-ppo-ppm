// Shared bridge to the Python Scrapling microservice
const SCRAPER_URL = process.env.SCRAPER_SERVICE_URL || 'http://localhost:8200';

let _scraperAvailable: boolean | null = null;
let _scraperCheckedAt = 0;
const HEALTH_CHECK_INTERVAL = 60_000; // re-check every 60s

/**
 * Check if the Python scraper service is reachable.
 * Result is cached for 60 seconds to avoid repeated health checks.
 */
export async function isScraperAvailable(): Promise<boolean> {
  const now = Date.now();
  if (_scraperAvailable !== null && now - _scraperCheckedAt < HEALTH_CHECK_INTERVAL) {
    return _scraperAvailable;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${SCRAPER_URL}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    _scraperAvailable = res.ok;
  } catch {
    _scraperAvailable = false;
  }
  _scraperCheckedAt = now;
  return _scraperAvailable;
}

export async function callScraper(
  body: Record<string, any>,
  signal?: AbortSignal
): Promise<any> {
  const res = await fetch(`${SCRAPER_URL}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Scraper ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function callCrawler(
  body: Record<string, any>,
  signal?: AbortSignal
): Promise<any> {
  const res = await fetch(`${SCRAPER_URL}/crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Crawler ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export { SCRAPER_URL };
