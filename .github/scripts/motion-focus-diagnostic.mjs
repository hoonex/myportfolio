import { chromium } from 'playwright';

const baseURL = process.env.JOURNAL_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

const snapshot = async label => {
  const state = await page.evaluate(() => {
    const card = document.querySelector('[data-motion-card]');
    const active = document.activeElement;
    return {
      activeTag: active?.tagName || null,
      activeClass: active?.className || null,
      activeDataMotion: active?.hasAttribute?.('data-motion-card') || false,
      cardConnected: Boolean(card?.isConnected),
      sameAsCard: active === card,
      cardCount: document.querySelectorAll('[data-motion-card]').length,
      selection: window.getSelection()?.toString() || '',
      activeOuter: active?.outerHTML?.slice(0, 220) || null
    };
  });
  console.log(`FOCUS_SNAPSHOT ${label} ${JSON.stringify(state)}`);
};

try {
  await page.goto(`${baseURL}/#/post/motion`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('[data-motion-card]').length === 1);
  const card = page.locator('[data-motion-card]');
  await card.focus();
  await snapshot('focused');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  await snapshot('after-keyboard');
  const box = await card.boundingBox();
  if (!box) throw new Error('motion card has no box');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await snapshot('before-down');
  await page.mouse.down();
  await snapshot('after-down');
  await page.mouse.move(x + 120, y, { steps: 5 });
  await snapshot('after-move');
  await page.mouse.up();
  await snapshot('after-up');
  await page.evaluate(() => Promise.resolve());
  await snapshot('after-microtask');
  await page.waitForTimeout(0);
  await snapshot('after-0ms');
  await page.waitForTimeout(16);
  await snapshot('after-16ms');
  await page.waitForTimeout(200);
  await snapshot('after-200ms');
} finally {
  await context.close();
  await browser.close();
}
