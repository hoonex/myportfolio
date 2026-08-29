import { chromium } from 'playwright';

const baseURL = process.env.JOURNAL_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const lazy = [
  'journal-v3-refraction.js',
  'journal-v4-jelly.js',
  'journal-v5-experiments.js',
  'journal-v8-spatial.js',
  'journal-v9-locale-editorial.js'
];

async function assets(page) {
  return page.evaluate(() => performance.getEntriesByType('resource').map(entry => {
    try { return new URL(entry.name).pathname.split('/').pop(); }
    catch { return entry.name; }
  }));
}

async function visit(hash, selector, required = [], forbidden = []) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseURL}/${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(selector, { timeout: 12000 });
  await page.waitForTimeout(350);
  const loaded = await assets(page);
  required.forEach(name => expect(loaded.includes(name), `${hash || 'home'} did not load ${name}: ${loaded.join(', ')}`));
  forbidden.forEach(name => expect(!loaded.includes(name), `${hash || 'home'} unexpectedly loaded ${name}: ${loaded.join(', ')}`));
  expect(errors.length === 0, `${hash || 'home'} page errors: ${errors.join(' | ')}`);
  await page.close();
}

await visit('', '[data-spatial-card-v8]', [
  'journal-spatial-index.js',
  'journal-v10-editorial-naturalize.js',
  'journal-v6-studio.js',
  'journal-route-loader.js'
], lazy);

await visit('#/post/sloar', '[data-sloar-lab]', ['journal-v5-experiments.js'], [
  'journal-v3-refraction.js', 'journal-v4-jelly.js', 'journal-v8-spatial.js', 'journal-v9-locale-editorial.js'
]);

await visit('#/post/spatial', '[data-spatial-article]', ['journal-v8-spatial.js'], [
  'journal-v3-refraction.js', 'journal-v4-jelly.js', 'journal-v5-experiments.js', 'journal-v9-locale-editorial.js'
]);

await visit('#/post/glass', '.refraction-correction', [
  'journal-v3-refraction.js', 'journal-v4-jelly.js', 'journal-v9-locale-editorial.js'
], ['journal-v5-experiments.js', 'journal-v8-spatial.js']);

await browser.close();
console.log('route-aware runtime loading audit ok');
