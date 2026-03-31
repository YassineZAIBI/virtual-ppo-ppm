// Import all adapters to trigger their self-registration
import './duckduckgo';
import './hackernews';
import './reddit';
import './wikipedia';
import './arxiv';
import './semantic-scholar';
import './crossref';
import './openalex';
import './worldbank';
import './bls';
import './google-trends';
import './fred';
import './mcp-confluence';
import './mcp-jira';

// Scrapling microservice adapters (via scraper-bridge)
import './g2-reviews';
import './capterra-reviews';
import './producthunt-scrape';
import './crunchbase';
import './glassdoor';
import './techcrunch';
import './stackoverflow-scrape';
import './quora';
import './app-store-reviews';
import './play-store-reviews';
import './linkedin-jobs';
import './google-patents';
import './statista-scrape';
import './competitor-site';
import './pricing-page';

export { registry } from '@/lib/services/data-pipeline/registry';
