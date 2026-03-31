import { DataAdapter, DataResult, FetchOptions } from '@/lib/services/data-pipeline/types';
import { registry } from '@/lib/services/data-pipeline/registry';
import { callScraper, isScraperAvailable } from './scraper-bridge';

const linkedinJobs: DataAdapter = {
  key: 'linkedin-jobs',

  metadata: {
    name: 'LinkedIn Jobs',
    icon: 'Briefcase',
    category: 'social',
    description: 'Scrape LinkedIn job postings as a market demand signal for skills and roles.',
    rateLimit: { requests: 15, windowMs: 60_000 },
    capabilities: { searchable: true, streamable: false, realtime: false },
    requiresConfig: false,
  },

  async fetch(query: string, options?: FetchOptions): Promise<DataResult[]> {
    const maxResults = options?.maxResults ?? 10;
    if (!(await isScraperAvailable())) {
      console.info('[linkedin-jobs] Scraper service not available — requires Docker scraper for anti-bot bypass');
      return [];
    }

    try {
      const data = await callScraper(
        {
          url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}`,
          mode: 'stealth',
          profile_type: 'jobs',
          max_items: maxResults,
        },
        options?.signal
      );

      const items: any[] = data.results ?? data.items ?? [];
      const now = new Date();

      // If the scraper returned a total job count, include it as a market signal
      const totalJobs = data.total_count ?? data.totalResults ?? items.length;

      return items.slice(0, maxResults).map((item: any, i: number) => ({
        sourceKey: 'linkedin-jobs',
        sourceUrl: item.url || item.link || `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}`,
        sourceName: 'LinkedIn Jobs',
        title: item.title ?? item.job_title ?? `LinkedIn Job #${i + 1}`,
        content: [
          item.company && `Company: ${item.company}`,
          item.location && `Location: ${item.location}`,
          item.description ?? item.snippet ?? item.text ?? '',
        ]
          .filter(Boolean)
          .join('\n')
          .slice(0, 3000),
        contentType: 'post' as const,
        publishedAt: item.date ? new Date(item.date) : undefined,
        fetchedAt: now,
        metadata: {
          company: item.company ?? null,
          location: item.location ?? null,
          salary: item.salary ?? item.compensation ?? null,
          jobType: item.job_type ?? item.employment_type ?? null,
          experienceLevel: item.experience_level ?? item.seniority ?? null,
          totalJobsFound: totalJobs,
          rank: i + 1,
        },
        relevanceHint: 0.6,
      }));
    } catch (error) {
      console.error(`[linkedin-jobs] Fetch failed:`, error instanceof Error ? error.message : error);
      return [];
    }
  },

  async testConnection() {
    try {
      const data = await callScraper({
        url: 'https://www.linkedin.com/jobs/search/?keywords=product+manager',
        mode: 'stealth',
        profile_type: 'jobs',
        max_items: 1,
      });
      return { ok: !!data };
    } catch (err: any) {
      return { ok: false, error: err.message ?? 'Connection failed' };
    }
  },
};

registry.register(linkedinJobs);
