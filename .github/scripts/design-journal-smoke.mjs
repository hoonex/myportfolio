import { chromium } from 'playwright';

const baseURL = process.env.JOURNAL_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const pageErrors = [];
const failedLocal = [];

page.on('pageerror', error => pageErrors.push(String(error)));
page.on('response', response => {
  if (response.url().startsWith(baseURL) && response.status() >= 400) {
    failedLocal.push(`${response.status()} ${response.url()}`);
  }
});

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const count = selector => page.locator(selector).count();
const waitForExactCount = (selector, expected) => page.waitForFunction(
  ({ selector, expected }) => document.querySelectorAll(selector).length === expected,
  { selector, expected }
);

try {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await waitForExactCount('.post-card--studio', 3);
  expect(await count('.studio-index-note') === 1, 'home enhancement should be installed exactly once');
  expect(await count('.reading-progress-v6') === 0, 'home must not retain article reading progress');

  await page.locator('#langSwitch [data-lang="en"]').click();
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  await waitForExactCount('.studio-index-note', 1);
  await waitForExactCount('.post-card--studio', 3);
  expect(await count('.studio-index-note') === 1, 'language rerender must settle with exactly one studio enhancement');

  await page.goto(`${baseURL}/#/post/sloar`);
  await waitForExactCount('[data-sloar-lab]', 1);
  await waitForExactCount('.article-rail-v6', 1);
  expect(await count('.reading-progress-v6') === 1, 'Sloar article should have one reading progress bar');

  await page.locator('[data-fault="stale"]').check();
  await page.locator('[data-step-mission]').click();
  await page.locator('[data-step-mission]').click();
  await page.waitForFunction(() => document.querySelector('[data-mission-status]')?.textContent?.includes('HALTED'));

  await page.goto(`${baseURL}/#/post/motion`);
  await waitForExactCount('[data-motion-lab]', 1);
  await waitForExactCount('.article-rail-v6', 1);
  const motionCard = page.locator('[data-motion-card]');
  const box = await motionCard.boundingBox();
  expect(Boolean(box), 'Motion card should be measurable');
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
  }

  await page.goto(`${baseURL}/#/lab`);
  await page.waitForSelector('#realLiquidGlass');
  await page.waitForFunction(() => document.querySelector('#realLiquidGlass')?.dataset.jellyReady === '1');
  const values = await page.evaluate(() => Object.fromEntries([
    'refraction','blurAmount','chromAberration','specular','fresnel','edgeHighlight','zRadius','cornerRadius','saturation','brightness'
  ].map(id => [id, document.querySelector(`#ref-${id}`)?.value])));
  const expected = {
    refraction:'1.6', blurAmount:'0', chromAberration:'0.18', specular:'0', fresnel:'0', edgeHighlight:'0',
    zRadius:'50', cornerRadius:'80', saturation:'0.02', brightness:'0.02'
  };
  for (const [key, value] of Object.entries(expected)) {
    expect(values[key] === value, `preferred optical default drifted: ${key}=${values[key]}`);
  }

  await page.goto(`${baseURL}/#/`);
  await waitForExactCount('.post-card--studio', 3);
  await waitForExactCount('.studio-index-note', 1);
  expect(await count('.reading-progress-v6') === 0, 'article reading progress should be cleaned up after returning home');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForExactCount('.post-card--studio', 3);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(!overflow, 'mobile viewport has horizontal overflow');

  expect(failedLocal.length === 0, `local asset requests failed: ${failedLocal.join(', ')}`);
  expect(pageErrors.length === 0, `page errors detected: ${pageErrors.join(' | ')}`);

  console.log('browser smoke ok');
} finally {
  await browser.close();
}
