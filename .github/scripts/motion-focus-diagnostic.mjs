import { chromium } from 'playwright';

const baseURL = process.env.JOURNAL_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

page.on('pageerror', error => console.log(`PAGE_ERROR ${String(error)}`));

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
  const loadState = await page.evaluate(() => ({
    scriptSrcs: [...document.scripts].map(script => script.src).filter(Boolean),
    v7Resource: performance.getEntriesByType('resource').map(entry => entry.name).filter(name => name.includes('journal-v7-input-continuity.js')),
    readyState: document.readyState
  }));
  console.log(`LOAD_STATE ${JSON.stringify(loadState)}`);
  await page.evaluate(() => {
    window.__motionTrace = [];
    const push = (phase, event) => window.__motionTrace.push({
      phase,
      type: event.type,
      target: event.target instanceof Element ? `${event.target.tagName}.${event.target.className || ''}` : String(event.target),
      buttons: event.buttons,
      button: event.button,
      cancelable: event.cancelable,
      defaultPrevented: event.defaultPrevented,
      active: document.activeElement instanceof Element ? `${document.activeElement.tagName}.${document.activeElement.className || ''}` : null
    });
    for (const type of ['pointerdown','mousedown','pointermove','pointerup','mouseup','click']) {
      document.addEventListener(type, event => push('capture', event), true);
      document.addEventListener(type, event => push('bubble', event), false);
    }
  });
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
  await page.evaluate(() => document.querySelector('[data-motion-card]')?.focus({ preventScroll: true }));
  await snapshot('manual-refocus-after-down');
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
  console.log(`EVENT_TRACE ${JSON.stringify(await page.evaluate(() => window.__motionTrace))}`);
} finally {
  await context.close();
  await browser.close();
}
