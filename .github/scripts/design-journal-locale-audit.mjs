import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseURL = process.env.JOURNAL_BASE_URL || 'http://127.0.0.1:4173';
const visualDir = process.env.JOURNAL_VISUAL_DIR || '.artifacts/design-journal';
await mkdir(visualDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', error => pageErrors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });

const expect = (condition, message) => { if (!condition) throw new Error(message); };
const locales = ['ko', 'en', 'ja'];
const editorialHeadings = {
  ko: '좌표계를 먼저 고정한다.',
  en: 'Lock the world before you decorate it.',
  ja: '装飾より先に、ワールドの基準を決める。'
};
const spatialTitles = {
  ko: '3D는 멋진 모델보다 일관된 세계가 먼저다.',
  en: 'A coherent world matters more than a beautiful mesh.',
  ja: '美しいメッシュより、矛盾しない世界を先につくる。'
};
const japaneseTranslationese = [
  '背後の scene',
  'chat coding',
  'source of truth',
  'working tree',
  'working-tree',
  'release velocity',
  'interruptibility',
  'mobile GPU',
  'frame drop'
];

async function switchLanguage(lang) {
  await page.goto(`${baseURL}/#/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#langSwitch');
  await page.locator(`#langSwitch [data-lang="${lang}"]`).click();
  await page.waitForFunction(expected => document.documentElement.lang === expected, lang);
  await page.waitForSelector('[data-spatial-card-v8]');
}

async function assertA11y(label) {
  await page.waitForTimeout(450);
  const result = await new AxeBuilder({ page })
    .exclude('.code-preview')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = result.violations.filter(v => ['critical', 'serious'].includes(v.impact));
  expect(blocking.length === 0, `${label} serious accessibility violations: ${blocking.map(v => v.id).join(', ')}`);
}

try {
  for (const lang of locales) {
    await switchLanguage(lang);
    expect(await page.locator('.post-grid .post-card').count() === 4, `${lang} home should expose four journal entries`);
    expect(await page.locator('.post-card--studio').count() === 3, `${lang} v6 studio cards should remain exactly three`);
    const countText = (await page.locator('.section-head > span').textContent() || '').trim();
    expect(countText.startsWith('04'), `${lang} home count should be editorially updated to four: ${countText}`);

    await page.goto(`${baseURL}/#/post/spatial`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(`[data-spatial-article][data-lang="${lang}"]`);
    await page.waitForSelector('[data-spatial-lab]');
    await page.waitForSelector('.article-rail-v6');

    const title = (await page.locator('.article > h1').textContent() || '').trim();
    expect(title === spatialTitles[lang], `${lang} spatial title drifted: ${title}`);
    const sections = page.locator('.article-body > .essay-section');
    expect(await sections.count() === 8, `${lang} spatial article should have exactly eight authored sections`);
    const firstHeading = (await sections.first().locator('h2').textContent() || '').trim();
    expect(firstHeading === editorialHeadings[lang], `${lang} first heading lost its authored edition: ${firstHeading}`);
    const bodyText = (await page.locator('.article-body').innerText()).trim();
    expect(bodyText.length >= 1800, `${lang} spatial article is too short for long-form editorial content: ${bodyText.length}`);
    if (lang === 'en') {
      expect(!/[\u3131-\u318E\uAC00-\uD7A3\u3040-\u30FF]/.test(bodyText), 'English spatial article contains Korean/Japanese prose');
    }
    if (lang === 'ja') {
      expect(!/[\u3131-\u318E\uAC00-\uD7A3]/.test(bodyText), 'Japanese spatial article contains Korean prose');
    }

    const stage = page.locator('[data-spatial-stage]');
    await stage.focus();
    const before = (await page.locator('[data-spatial-readout]').textContent() || '').trim();
    await page.keyboard.press('ArrowRight');
    const afterKey = (await page.locator('[data-spatial-readout]').textContent() || '').trim();
    expect(before !== afterKey, `${lang} spatial blockout should respond to keyboard orbit`);
    const box = await stage.boundingBox();
    expect(Boolean(box), `${lang} spatial stage should be measurable`);
    if (box) {
      await page.mouse.move(box.x + box.width * .55, box.y + box.height * .5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .68, box.y + box.height * .42, { steps: 5 });
      await page.mouse.up();
    }
    const afterDrag = (await page.locator('[data-spatial-readout]').textContent() || '').trim();
    expect(afterDrag !== afterKey, `${lang} spatial blockout should respond to pointer orbit`);
    expect(await stage.evaluate(node => document.activeElement === node), `${lang} spatial drag should preserve keyboard focus`);
    expect((await page.evaluate(() => window.getSelection()?.toString() || '')) === '', `${lang} spatial drag should not select prose`);

    await assertA11y(`spatial ${lang}`);
    await page.screenshot({ path: `${visualDir}/spatial-${lang}.png`, animations: 'disabled' });
  }

  await switchLanguage('ja');
  for (const slug of ['glass', 'sloar', 'motion', 'spatial']) {
    await page.goto(`${baseURL}/#/post/${slug}`, { waitUntil: 'domcontentloaded' });
    if (slug === 'spatial') await page.waitForSelector('[data-spatial-article][data-lang="ja"]');
    else await page.waitForSelector('.article-body');
    await page.waitForTimeout(100);
    const text = (await page.locator('.article-body').innerText()).trim();
    expect(text.length >= 1200, `Japanese ${slug} article unexpectedly short: ${text.length}`);
    for (const phrase of japaneseTranslationese) {
      expect(!text.includes(phrase), `Japanese ${slug} still contains translationese/mixed prose: ${phrase}`);
    }
  }

  await page.goto(`${baseURL}/#/lab`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.lab-copy .small');
  const labJapanese = (await page.locator('.lab-copy .small').textContent() || '').trim();
  expect(labJapanese.includes('背後のシーン'), `Japanese lab copy should use natural localized wording: ${labJapanese}`);
  expect(!labJapanese.includes(' scene '), `Japanese lab copy still contains raw English prose: ${labJapanese}`);

  expect(pageErrors.length === 0, `page errors detected: ${pageErrors.join(' | ')}`);
  expect(consoleErrors.length === 0, `console errors detected: ${consoleErrors.join(' | ')}`);
  console.log('trilingual editorial + spatial 3D audit ok');
} finally {
  await context.close();
  await browser.close();
}
