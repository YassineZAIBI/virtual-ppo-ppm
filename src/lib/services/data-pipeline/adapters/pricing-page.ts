import { DataAdapter, DataResult, FetchOptions } from '../types';
import { registry } from '../registry';
import { callScraper } from './scraper-bridge';

const pricingPage: DataAdapter = {
  key: 'pricing-page',

  metadata: {
    name: 'SaaS Pricing Page',
    icon: 'DollarSign',
    category: 'search',
    description: 'Scrape a SaaS pricing page to extract tiers, features, and pricing data.',
    rateLimit: { requests: 20, windowMs: 60_000 },
    capabilities: { searchable: false, streamable: false, realtime: false },
    requiresConfig: true,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    // Determine the pricing URL: explicit config, or construct from base URL
    let pricingUrl = options?.config?.pricingUrl;

    if (!pricingUrl) {
      const baseUrl = options?.config?.baseUrl;
      if (baseUrl) {
        const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        pricingUrl = `${base}/pricing`;
      }
    }

    if (!pricingUrl) {
      console.warn('[pricing-page] No pricingUrl or baseUrl provided in options.config');
      return [];
    }

    try {
      const data = await callScraper(
        {
          url: pricingUrl,
          mode: 'dynamic',
          profile_type: 'pricing',
          max_items: 20,
        },
        options?.signal
      );

      const now = new Date();
      const hostname = new URL(pricingUrl).hostname;

      // The scraper may return structured pricing tiers or raw page content
      const tiers: any[] = data.tiers ?? data.plans ?? [];
      const rawContent = data.text ?? data.content ?? data.markdown ?? '';

      if (tiers.length > 0) {
        // Structured tier data
        return tiers.map((tier: any, i: number) => ({
          sourceKey: 'pricing-page',
          sourceUrl: pricingUrl!,
          sourceName: `Pricing: ${hostname}`,
          title: tier.name ?? tier.title ?? `Tier #${i + 1}`,
          content: [
            tier.price && `Price: ${tier.price}`,
            tier.period && `Billing: ${tier.period}`,
            tier.description,
            tier.features && `Features: ${Array.isArray(tier.features) ? tier.features.join(', ') : tier.features}`,
          ]
            .filter(Boolean)
            .join('\n')
            .slice(0, 3000),
          contentType: 'article' as const,
          fetchedAt: now,
          metadata: {
            tierName: tier.name ?? null,
            price: tier.price ?? null,
            period: tier.period ?? tier.billing_period ?? null,
            features: tier.features ?? [],
            highlighted: tier.highlighted ?? tier.recommended ?? false,
            baseUrl: pricingUrl,
            rank: i + 1,
          },
          relevanceHint: tier.price ? 0.9 : 0.5,
        }));
      }

      // Fallback: return entire page as a single result
      const items: any[] = data.results ?? data.items ?? [];

      if (items.length > 0) {
        return items.map((item: any, i: number) => ({
          sourceKey: 'pricing-page',
          sourceUrl: item.url || pricingUrl!,
          sourceName: `Pricing: ${hostname}`,
          title: item.title ?? `Pricing Section #${i + 1}`,
          content: (item.text ?? item.content ?? item.snippet ?? '').slice(0, 3000),
          contentType: 'article' as const,
          fetchedAt: now,
          metadata: {
            baseUrl: pricingUrl,
            rank: i + 1,
          },
          relevanceHint: 0.6,
        }));
      }

      // Single page content fallback
      if (rawContent) {
        return [{
          sourceKey: 'pricing-page',
          sourceUrl: pricingUrl,
          sourceName: `Pricing: ${hostname}`,
          title: data.title ?? `Pricing Page: ${hostname}`,
          content: rawContent.slice(0, 5000),
          contentType: 'article' as const,
          fetchedAt: now,
          metadata: {
            baseUrl: pricingUrl,
            fullPage: true,
          },
          relevanceHint: 0.5,
        }];
      }

      return [];
    } catch (error) {
      console.error(`[pricing-page] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection(config?: Record<string, any>) {
    const testUrl = config?.pricingUrl ?? config?.baseUrl
      ? `${(config?.baseUrl ?? '').replace(/\/$/, '')}/pricing`
      : 'https://example.com/pricing';
    try {
      const data = await callScraper({
        url: testUrl,
        mode: 'dynamic',
        profile_type: 'pricing',
        max_items: 1,
      });
      return { ok: !!data };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(pricingPage);
