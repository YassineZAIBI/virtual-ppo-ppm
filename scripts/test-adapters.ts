import './src/lib/services/data-pipeline/adapters/index.js';
import { registry } from './src/lib/services/data-pipeline/registry.js';

const QUERY = 'AI project management tools';

async function testAdapter(key: string) {
  const adapter = registry.get(key);
  if (!adapter) {
    console.log(`[MISS] ${key} - not found in registry`);
    return;
  }
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[TEST] ${key} (${adapter.metadata.category})`);
  console.log(`  ${adapter.metadata.description}`);
  console.log(`${'='.repeat(60)}`);
  const start = Date.now();
  try {
    const results = await adapter.fetch(QUERY, { maxResults: 5 });
    const elapsed = Date.now() - start;
    console.log(`[RESULT] ${results.length} results in ${elapsed}ms`);
    for (const r of results) {
      console.log(`\n  Title: ${r.title?.slice(0, 100)}`);
      console.log(`  URL:   ${r.sourceUrl?.slice(0, 100)}`);
      console.log(`  Content: ${r.content?.slice(0, 150)}...`);
      if (r.metadata?.rating) console.log(`  Rating: ${r.metadata.rating}`);
      if (r.metadata?.upvotes) console.log(`  Upvotes: ${r.metadata.upvotes}`);
    }
  } catch (e: any) {
    const elapsed = Date.now() - start;
    console.log(`[FAIL] ${elapsed}ms - ${e.message?.slice(0, 150)}`);
  }
}

(async () => {
  const targets = ['hackernews', 'g2-reviews', 'producthunt-scrape'];
  for (const key of targets) {
    await testAdapter(key);
  }
  console.log('\n--- Done ---');
})();
