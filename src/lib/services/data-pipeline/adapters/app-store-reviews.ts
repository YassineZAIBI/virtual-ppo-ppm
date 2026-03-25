import { DataAdapter, DataResult, FetchOptions, resilientFetch } from '../types';
import { registry } from '../registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

const appStoreReviews: DataAdapter = {
  key: 'app-store-reviews',

  metadata: {
    name: 'App Store Reviews',
    icon: 'Smartphone',
    category: 'review',
    description: 'Apple App Store reviews and app listings via iTunes API.',
    rateLimit: { requests: 60, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    const appId = options?.config?.appId;
    const now = new Date();

    // If an App ID is provided, use the public RSS feed directly
    if (appId) {
      try {
        const rssUrl = `https://itunes.apple.com/rss/customerreviews/id=${appId}/sortBy=mostRecent/json`;
        const res = await resilientFetch(rssUrl, {
          adapterKey: 'app-store-reviews',
          signal: options?.signal,
        });
        const json = await res.json();
        const entries: any[] = json.feed?.entry ?? [];
        const reviews = entries.filter((e: any) => e['im:rating']);

        return reviews.slice(0, maxResults).map((entry: any, i: number) => ({
          sourceKey: 'app-store-reviews',
          sourceUrl: entry.link?.attributes?.href ?? `https://apps.apple.com/app/id${appId}`,
          sourceName: 'App Store',
          title: entry.title?.label ?? `App Store Review #${i + 1}`,
          content: (entry.content?.label ?? '').slice(0, 3000),
          contentType: 'review' as const,
          publishedAt: entry.updated?.label ? new Date(entry.updated.label) : undefined,
          fetchedAt: now,
          metadata: {
            rating: parseInt(entry['im:rating']?.label ?? '0', 10),
            author: entry.author?.name?.label ?? null,
            version: entry['im:version']?.label ?? null,
            rank: i + 1,
          },
          relevanceHint: entry.content?.label ? Math.min(entry.content.label.length / 500, 1) : 0.3,
        }));
      } catch (error) {
        console.error(`[app-store-reviews] RSS fetch failed:`, error instanceof Error ? error.message : error);
      }
    }

    // Native fallback: iTunes Search API (always available, no scraper needed)
    try {
      const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=software&limit=${maxResults}`;
      const res = await resilientFetch(searchUrl, {
        adapterKey: 'app-store-reviews',
        signal: options?.signal,
        timeoutMs: 15000,
      });
      const json = await res.json();
      const results: any[] = json.results ?? [];

      return results.slice(0, maxResults).map((app: any, i: number) => ({
        sourceKey: 'app-store-reviews',
        sourceUrl: app.trackViewUrl ?? `https://apps.apple.com/app/id${app.trackId}`,
        sourceName: 'App Store',
        title: app.trackName ?? `App #${i + 1}`,
        content: [
          app.description?.slice(0, 1500) ?? '',
          app.averageUserRating ? `Average Rating: ${app.averageUserRating.toFixed(1)}/5 (${app.userRatingCount ?? 0} ratings)` : '',
          app.primaryGenreName ? `Category: ${app.primaryGenreName}` : '',
          app.price !== undefined ? `Price: ${app.price === 0 ? 'Free' : `$${app.price}`}` : '',
          app.sellerName ? `Developer: ${app.sellerName}` : '',
        ].filter(Boolean).join('\n').slice(0, 3000),
        contentType: 'review' as const,
        publishedAt: app.releaseDate ? new Date(app.releaseDate) : undefined,
        fetchedAt: now,
        metadata: {
          rating: app.averageUserRating ?? null,
          ratingCount: app.userRatingCount ?? null,
          price: app.price ?? null,
          developer: app.sellerName ?? null,
          appId: app.trackId ?? null,
          bundleId: app.bundleId ?? null,
          category: app.primaryGenreName ?? null,
          rank: i + 1,
        },
        relevanceHint: app.averageUserRating ? Math.min(app.averageUserRating / 5, 1) * 0.6 + 0.2 : 0.4,
      }));
    } catch (error) {
      console.error(`[app-store-reviews] iTunes Search API failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const res = await fetch('https://itunes.apple.com/search?term=test&entity=software&limit=1');
      return { ok: res.ok };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(appStoreReviews);
