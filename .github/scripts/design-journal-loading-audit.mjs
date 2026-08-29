import { chromium } from 'playwright';

const baseURL = process.env.JOURNAL_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const lazy = [
  'journal-v2.js',
  'journal-v10-editorial-naturalize.js',
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

async function assertAssets(page, label, required = [], forbidden = []) {
  const loaded = await assets(page);
  required.forEach(name => expect(loaded.includes(name), `${label} did not load ${name}: ${loaded.join(', ')}`));
  forbidden.forEach(name => expect(!loaded.includes(name), `${label} unexpectedly loaded ${name}: ${loaded.join(', ')}`));
  return loaded;
}

async function visit(hash, selector, required = [], forbidden = [], inspect = null) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${baseURL}/${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(selector, { timeout: 12000 });
  await page.waitForTimeout(350);
  await assertAssets(page, hash || 'home', required, forbidden);
  if (inspect) await inspect(page);
  expect(errors.length === 0, `${hash || 'home'} page errors: ${errors.join(' | ')}`);
  await page.close();
}

await visit('', '[data-spatial-card-v8]', [
  'journal-editorial-core.js',
  'journal-spatial-index.js',
  'journal-v6-studio.js',
  'journal-route-loader.js'
], lazy, async page => {
  await page.waitForSelector('#langSwitch[data-owner="editorial-core"]');
  await page.locator('#langSwitch [data-lang="ja"]').click();
  await page.waitForFunction(() => document.documentElement.lang === 'ja');
  await page.waitForFunction(() => document.querySelector('.post-card--glass .studio-preview-label span')?.textContent?.trim() === 'WebGL屈折 · ドラッグ変形');
  expect((await page.locator('.post-card--sloar .studio-preview-label span').textContent() || '').trim() === '状態復元 · 障害注入', 'Japanese home Sloar preview should be authored Japanese');
  expect((await page.locator('.post-card--motion .studio-preview-label span').textContent() || '').trim() === 'スプリング · 速度の引き継ぎ', 'Japanese home Motion preview should be authored Japanese');
  await assertAssets(page, 'home after Japanese switch', [], ['journal-v2.js', 'journal-v10-editorial-naturalize.js']);
});

await visit('#/post/sloar', '[data-sloar-lab]', [
  'journal-v2.js', 'journal-v10-editorial-naturalize.js', 'journal-v5-experiments.js'
], [
  'journal-v3-refraction.js', 'journal-v4-jelly.js', 'journal-v8-spatial.js', 'journal-v9-locale-editorial.js'
], async page => {
  await page.waitForSelector('#langSwitch:not([data-owner="editorial-core"])');
  await page.locator('#langSwitch [data-lang="ja"]').click();
  await page.waitForFunction(() => document.documentElement.lang === 'ja');
  await page.waitForFunction(() => document.querySelector('.article-rail-head span')?.textContent?.trim() === 'この記事の構成');
  expect((await page.locator('.reading-progress-v6 span').textContent() || '').trim() === '読書中', 'Japanese Sloar reading progress should be localized');
});

await visit('#/post/spatial', '[data-spatial-article]', [
  'journal-v10-editorial-naturalize.js', 'journal-v8-spatial.js'
], [
  'journal-v2.js', 'journal-v3-refraction.js', 'journal-v4-jelly.js', 'journal-v5-experiments.js', 'journal-v9-locale-editorial.js'
], async page => {
  await page.waitForSelector('#langSwitch[data-owner="editorial-core"]');
  await page.locator('#langSwitch [data-lang="ja"]').click();
  await page.waitForSelector('[data-spatial-article][data-lang="ja"]');
  await page.waitForFunction(() => document.querySelector('.article-rail-head span')?.textContent?.trim() === 'この記事の構成');
});

await visit('#/post/glass', '.refraction-correction', [
  'journal-v2.js', 'journal-v10-editorial-naturalize.js',
  'journal-v3-refraction.js', 'journal-v4-jelly.js', 'journal-v9-locale-editorial.js'
], ['journal-v5-experiments.js', 'journal-v8-spatial.js']);

await visit('#/lab', '.refraction-page', [
  'journal-v2.js', 'journal-v3-refraction.js', 'journal-v4-jelly.js', 'journal-v9-locale-editorial.js'
], ['journal-v10-editorial-naturalize.js', 'journal-v5-experiments.js', 'journal-v8-spatial.js']);

await browser.close();
console.log('composable route runtime loading + locale chrome audit ok');
