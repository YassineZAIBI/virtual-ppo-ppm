import { DataAdapter, DataResult, FetchOptions } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

function toSlug(query: string): string {
  return query.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

const crunchbase: DataAdapter = {
  key: 'crunchbase',

  metadata: {
    name: 'Crunchbase',
    icon: 'Building2',
    category: 'research',
    description: 'Scrape Crunchbase company profiles for funding, team, and market data.',
    rateLimit: { requests: 20, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const slug = options?.config?.slug ?? toSlug(query);
    if (!(await isScraperAvailable())) {
      console.info('[crunchbase] Scraper service not available — requires Docker scraper for anti-bot bypass');
      return [];
    }

    try {
      const data = await callScraper(
        {
          url: `https://www.crunchbase.com/organization/${slug}`,
          mode: 'stealth',
          profile_type: 'company',
          max_items: 1,
        },
        options?.signal
      );

      const now = new Date();
      const company = data.results?.[0] ?? data;

      if (!company || (!company.name && !company.title && !data.title)) {
        return [];
      }

      const name = company.name ?? company.title ?? data.title ?? query;
      const description = company.description ?? company.short_description ?? data.text ?? '';
      const fundingTotal = company.funding_total ?? company.total_funding ?? null;
      const lastRound = company.last_funding_type ?? company.last_round ?? null;
      const employees = company.num_employees ?? company.employee_count ?? null;
      const founded = company.founded_on ?? company.founded ?? null;

      const sections: string[] = [description];
      if (fundingTotal) sections.push(`Total Funding: ${fundingTotal}`);
      if (lastRound) sections.push(`Last Round: ${lastRound}`);
      if (employees) sections.push(`Employees: ${employees}`);
      if (founded) sections.push(`Founded: ${founded}`);

      return [{
        sourceKey: 'crunchbase',
        sourceUrl: `https://www.crunchbase.com/organization/${slug}`,
        sourceName: 'Crunchbase',
        title: name,
        content: sections.join('\n').slice(0, 3000),
        contentType: 'article' as const,
        fetchedAt: now,
        metadata: {
          fundingTotal,
          lastRound,
          employees,
          founded,
          headquarters: company.headquarters ?? company.location ?? null,
          categories: company.categories ?? [],
          website: company.website ?? company.homepage_url ?? null,
        },
        relevanceHint: fundingTotal ? 0.8 : 0.5,
      }];
    } catch (error) {
      console.error(`[crunchbase] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const data = await callScraper({
        url: 'https://www.crunchbase.com/organization/slack',
        mode: 'stealth',
        profile_type: 'company',
        max_items: 1,
      });
      return { ok: !!data };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(crunchbase);
