import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseURL = process.env.JOURNAL_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
const failedLocal = [];

page.on('pageerror', error => pageErrors.push(String(error)));
page.on('console', message => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
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
const waitForSettledRefraction = targetPage => targetPage.waitForFunction(() => {
  const state = document.querySelector('#refractionRoot')?.dataset.refractionState;
  return state && state !== 'loading';
}, null, { timeout: 15000 });

async function assertA11y(targetPage, label) {
  // Route rendering intentionally fades from opacity 0 → 1. Audit the stable UI,
  // not a transient animation frame whose composited contrast is lower by design.
  await targetPage.waitForTimeout(650);
  const result = await new AxeBuilder({ page: targetPage })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = result.violations.filter(v => ['critical', 'serious'].includes(v.impact));
  expect(blocking.length === 0, `${label} serious accessibility violations: ${blocking.map(v => `${v.id} -> ${v.nodes.map(n => n.target.join(' ')).join(', ')}`).join(' | ')}`);
}

try {
  await page.goto(`${baseURL}/`, { waitUntil: 'domcontentloaded' });
  await waitForExactCount('.post-card--studio', 3);
  expect(await page.title() === 'HJ — Design Journal', `unexpected home title: ${await page.title()}`);
  expect(await page.locator('[data-nav="home"]').getAttribute('aria-current') === 'page', 'Index nav should expose aria-current on home');
  expect(await page.locator('meta[name="theme-color"]').getAttribute('content') === '#f3f1eb', 'light theme browser chrome should use the light theme color');
  expect(await count('.studio-index-note') === 1, 'home enhancement should be installed exactly once');
  expect(await count('.reading-progress-v6') === 0, 'home must not retain article reading progress');
  await assertA11y(page, 'home');

  await page.locator('#themeToggle').click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.waitForFunction(() => document.querySelector('meta[name="theme-color"]')?.content === '#0b0c0e');
  await page.locator('#themeToggle').click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');

  await page.locator('#langSwitch [data-lang="en"]').click();
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  await waitForExactCount('.studio-index-note', 1);
  await waitForExactCount('.post-card--studio', 3);
  expect(await page.title() === 'HJ — Design Journal', 'language rerender should retain the canonical home title');
  expect(await count('.studio-index-note') === 1, 'language rerender must settle with exactly one studio enhancement');

  await page.goto(`${baseURL}/#/post/sloar`);
  await waitForExactCount('[data-sloar-lab]', 1);
  await waitForExactCount('.article-rail-v6', 1);
  expect((await page.title()).endsWith('— HJ'), `article title should be route-aware: ${await page.title()}`);
  expect(await page.locator('[data-nav="home"]').getAttribute('aria-current') === null, 'article routes must not mark Index as current');
  expect(await count('.reading-progress-v6') === 1, 'Sloar article should have one reading progress bar');
  expect(await page.locator('textarea[data-editor="css"]').getAttribute('aria-label') === 'CSS code editor', 'visible CSS editor needs an accessible name');
  await assertA11y(page, 'Sloar article');

  await page.locator('label.fault-switch:has(input[data-fault="stale"])').click();
  expect(await page.locator('[data-fault="stale"]').isChecked(), 'visible stale-remote switch should toggle its input');
  await page.locator('[data-step-mission]').click();
  await page.locator('[data-step-mission]').click();
  await page.waitForFunction(() => document.querySelector('[data-mission-status]')?.textContent?.includes('HALTED'));

  await page.goto(`${baseURL}/#/post/motion`);
  await waitForExactCount('[data-motion-lab]', 1);
  await waitForExactCount('.article-rail-v6', 1);
  const motionCard = page.locator('[data-motion-card]');
  expect(await motionCard.getAttribute('role') === 'slider', 'Motion direct-manipulation card should expose a slider role');
  await motionCard.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => document.querySelector('[data-motion-card]')?.getAttribute('aria-valuetext') === 'RIGHT');
  await page.keyboard.press('Home');
  await page.waitForFunction(() => document.querySelector('[data-motion-card]')?.getAttribute('aria-valuetext') === 'LEFT');
  await page.keyboard.press('ArrowRight');
  const box = await motionCard.boundingBox();
  expect(Boolean(box), 'Motion card should be measurable');
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
  }
  await assertA11y(page, 'Motion article');

  await page.goto(`${baseURL}/#/lab`);
  await page.waitForSelector('#realLiquidGlass');
  await page.waitForFunction(() => document.querySelector('#realLiquidGlass')?.dataset.jellyReady === '1');
  await waitForSettledRefraction(page);
  const refractionState = await page.locator('#refractionRoot').getAttribute('data-refraction-state');
  expect(refractionState === 'active', `current Chromium must prove real WebGL refraction, got state=${refractionState}`);
  expect(await page.locator('[data-nav="lab"]').getAttribute('aria-current') === 'page', 'Glass Lab nav should expose aria-current');
  expect((await page.title()).includes('Refraction Lab'), `lab title should follow rendered heading: ${await page.title()}`);
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
  await assertA11y(page, 'Glass Lab');

  const chrome150Context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36'
  });
  const chrome150 = await chrome150Context.newPage();
  try {
    await chrome150.goto(`${baseURL}/#/lab`, { waitUntil: 'domcontentloaded' });
    await chrome150.waitForSelector('#refractionRoot');
    await chrome150.waitForFunction(() => document.querySelector('#refractionRoot')?.dataset.refractionState === 'known-incompatible');
    expect(await chrome150.locator('#refractionRoot canvas').count() === 0, 'Chrome 150 guard must avoid starting an orphan WebGL renderer');
  } finally {
    await chrome150Context.close();
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
  await assertA11y(page, 'mobile home');

  expect(failedLocal.length === 0, `local asset requests failed: ${failedLocal.join(', ')}`);
  expect(pageErrors.length === 0, `page errors detected: ${pageErrors.join(' | ')}`);
  expect(consoleErrors.length === 0, `console errors detected: ${consoleErrors.join(' | ')}`);

  console.log('browser + accessibility audit ok');
} finally {
  await context.close();
  await browser.close();
}
