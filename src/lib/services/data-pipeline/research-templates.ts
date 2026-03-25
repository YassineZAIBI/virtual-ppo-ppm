/**
 * Pre-built research templates for one-click market research.
 * Each template pre-configures the query, adapters, and report focus.
 */

export interface ResearchTemplate {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  queryTemplate: string; // uses {topic} placeholder
  adapters: string[];
  reportFocus: string; // hint for the synthesis prompt
  category: 'market' | 'competitive' | 'user' | 'tech' | 'comprehensive';
}

// Adapters that work without the Python scraper service (native TS fallbacks)
const ALWAYS_AVAILABLE = [
  'duckduckgo', 'reddit', 'hackernews', 'arxiv', 'semantic-scholar',
  'openalex', 'crossref', 'pubmed', 'wikipedia', 'bls', 'fred',
  'worldbank', 'eurostat', 'google-trends',
  // Adapters with native TS fallbacks:
  'techcrunch', 'stackoverflow-scrape', 'producthunt-scrape',
  'app-store-reviews', 'google-patents', 'g2-reviews',
];

export const RESEARCH_TEMPLATES: ResearchTemplate[] = [
  {
    id: 'market-size',
    name: 'Market Size & Growth',
    description: 'Estimate market size, growth rates, and key economic indicators',
    icon: 'TrendingUp',
    queryTemplate: '{topic} market size growth revenue',
    adapters: [
      'duckduckgo', 'wikipedia', 'worldbank', 'bls', 'fred',
      'openalex', 'techcrunch', 'arxiv',
    ],
    reportFocus: 'Focus on quantitative data: market size, CAGR, revenue figures, growth projections.',
    category: 'market',
  },
  {
    id: 'competitive-landscape',
    name: 'Competitive Landscape',
    description: 'Identify competitors, compare features, analyze positioning',
    icon: 'Swords',
    queryTemplate: '{topic} competitors alternatives comparison',
    adapters: [
      'duckduckgo', 'g2-reviews', 'producthunt-scrape', 'reddit', 'hackernews',
      'app-store-reviews', 'techcrunch', 'wikipedia',
    ],
    reportFocus: 'Focus on competitor identification, feature comparison, pricing strategies, market positioning.',
    category: 'competitive',
  },
  {
    id: 'user-sentiment',
    name: 'User Sentiment & Reviews',
    description: 'Analyze user feedback, ratings, pain points, and satisfaction',
    icon: 'MessageCircleHeart',
    queryTemplate: '{topic} reviews feedback user experience',
    adapters: [
      'reddit', 'hackernews', 'g2-reviews', 'stackoverflow-scrape',
      'app-store-reviews', 'producthunt-scrape', 'duckduckgo',
    ],
    reportFocus: 'Focus on user satisfaction, common complaints, feature requests, NPS-style sentiment.',
    category: 'user',
  },
  {
    id: 'tech-trends',
    name: 'Technology Trends',
    description: 'Track emerging technologies, research papers, and innovations',
    icon: 'Cpu',
    queryTemplate: '{topic} technology trends innovation',
    adapters: [
      'arxiv', 'semantic-scholar', 'openalex', 'hackernews',
      'google-patents', 'stackoverflow-scrape', 'techcrunch',
    ],
    reportFocus: 'Focus on emerging patterns, research breakthroughs, patent activity, developer adoption.',
    category: 'tech',
  },
  {
    id: 'hiring-demand',
    name: 'Hiring & Market Demand',
    description: 'Analyze job postings, company growth, and talent demand signals',
    icon: 'Briefcase',
    queryTemplate: '{topic} jobs hiring talent demand',
    adapters: [
      'duckduckgo', 'reddit', 'hackernews', 'techcrunch',
    ],
    reportFocus: 'Focus on job posting volume, required skills, salary ranges, company growth signals.',
    category: 'market',
  },
  {
    id: 'full-intelligence',
    name: 'Full Market Intelligence',
    description: 'Comprehensive research combining all available data sources',
    icon: 'Brain',
    queryTemplate: '{topic}',
    adapters: [
      'duckduckgo', 'reddit', 'hackernews', 'arxiv', 'semantic-scholar',
      'wikipedia', 'stackoverflow-scrape', 'techcrunch',
      'producthunt-scrape', 'app-store-reviews', 'google-patents', 'g2-reviews',
    ],
    reportFocus: 'Provide a comprehensive 360-degree market analysis covering size, competition, users, and technology.',
    category: 'comprehensive',
  },
];

/**
 * Get a template by ID.
 */
export function getTemplate(id: string): ResearchTemplate | undefined {
  return RESEARCH_TEMPLATES.find(t => t.id === id);
}

/**
 * Apply a template to generate the research configuration.
 */
export function applyTemplate(
  templateId: string,
  topic: string
): { title: string; query: string; adapters: string[]; reportFocus: string } | null {
  const template = getTemplate(templateId);
  if (!template) return null;

  return {
    title: `${template.name}: ${topic}`,
    query: template.queryTemplate.replace('{topic}', topic),
    adapters: template.adapters,
    reportFocus: template.reportFocus,
  };
}
