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
const coreTitles = {
  ko: {
    glass: 'Liquid Glass는 단순한 블러가 아니다.',
    sloar: 'Sloar를 만들며 배운 것은 “기억”보다 “상태”였다.',
    motion: '좋은 모션은 애니메이션보다 입력의 연속성에 가깝다.'
  },
  en: {
    glass: 'Liquid Glass is a hierarchy problem before it is a blur effect.',
    sloar: 'Sloar is an argument for state over memory.',
    motion: 'Good motion preserves intent instead of displaying animation.'
  },
  ja: {
    glass: 'ガラスらしさは、ぼかしだけでは作れない。',
    sloar: 'Sloarを作って分かったのは、記憶より「現在の状態」が重要だということ。',
    motion: '良いモーションは、演出よりも操作の連続性を守る。'
  }
};
const japaneseHeadings = {
  sloar: [
    '会話履歴をリポジトリの代わりにしない。',
    '状態遷移は、あえて単純にする。',
    '同じ失敗をそのまま繰り返さない。',
    'Gitとホスティング側の障害を分けて考える。',
    '必要十分な権限だけを使う。',
    '確認できた事実以上のことを言わない。',
    'プロトコルにも読みやすい画面が必要だ。',
    'Sloarが決めないことを、先に決めておく。'
  ],
  motion: [
    '反応はクリック完了ではなく、触れた瞬間から始める。',
    'ドラッグ中は入力と1対1で動かす。',
    '途中でつかみ直しても、現在位置から続ける。',
    '位置だけでなく、速度も状態として扱う。',
    '放した先を予測して、自然な着地点を選ぶ。',
    '境界では止めるより、抵抗を返す。',
    'バウンスは理由がある時だけ使う。',
    '良いモーションは、会話のように割り込める。'
  ]
};
const japaneseTranslationese = [
  '背後の scene', 'chat coding', 'source of truth', 'working tree', 'working-tree',
  'Chat history', 'engineering state', 'durable state', 'durable truth', 'State machine',
  'Agent workflow', 'coding agent', 'local build', 'release velocity', 'interruptibility',
  'mobile GPU', 'frame drop'
];
const japaneseSpacingDebt = /[一-龯々ぁ-ゖァ-ヺA-Za-z0-9_)]\s+(?:は|が|を|に|へ|と|で|の|も|や|か)(?=[^A-Za-z]|$)|\s+[、。！？）」』】]/g;

async function switchLanguage(lang) {
  await page.goto(`${baseURL}/#/`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#langSwitch');
  await page.locator(`#langSwitch [data-lang="${lang}"]`).click();
  await page.waitForFunction(expected => document.documentElement.lang === expected, lang);
  await page.waitForSelector('[data-spatial-card-v8]');
  await page.waitForFunction(() => document.querySelectorAll('.post-card--studio').length === 3);
  await page.waitForFunction(({ lang, title }) => {
    return document.querySelector('[data-post="glass"] h3')?.textContent?.trim() === title && document.documentElement.lang === lang;
  }, { lang, title: coreTitles[lang].glass });
}

async function assertA11y(label) {
  await page.waitForTimeout(450);
  const result = await new AxeBuilder({ page }).exclude('.code-preview').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const blocking = result.violations.filter(v => ['critical','serious'].includes(v.impact));
  expect(blocking.length === 0, `${label} serious accessibility violations: ${blocking.map(v => v.id).join(', ')}`);
}

function spacingContext(text, match) {
  const index = match?.index ?? -1;
  if (index < 0) return match?.[0] || '';
  return text.slice(Math.max(0, index - 70), Math.min(text.length, index + match[0].length + 70)).replace(/\s+/g, ' ');
}

async function assertCanonicalArticleTitleAfterLegacyRerender(slug, title) {
  await page.waitForFunction(({ slug, title }) => {
    const groups = (document.documentElement.dataset.runtimeRoute || '').split(/\s+/);
    return groups.includes('article-polish')
      && document.documentElement.dataset.editorialAuthority === 'v12'
      && location.hash === `#/post/${slug}`
      && document.querySelector('.article > h1')?.textContent?.trim() === title;
  }, { slug, title });

  await page.evaluate(() => {
    if (typeof render !== 'function') throw new Error('legacy render() is unavailable');
    render();
    render();
  });

  const renderedTitle = (await page.locator('.article > h1').textContent() || '').trim();
  expect(renderedTitle === title, `Japanese ${slug} article title reverted after forced legacy rerender: ${renderedTitle}`);
}

try {
  for (const lang of locales) {
    await switchLanguage(lang);
    expect(await page.locator('.post-grid .post-card').count() === 4, `${lang} home should expose four journal entries`);
    expect(await page.locator('.post-card--studio').count() === 3, `${lang} v6 studio cards should remain exactly three`);
    const countText = (await page.locator('.section-head > span').textContent() || '').trim();
    expect(countText.startsWith('04'), `${lang} home count should be editorially updated to four: ${countText}`);
    for (const slug of ['glass','sloar','motion']) {
      const cardTitle = (await page.locator(`[data-post="${slug}"] h3`).textContent() || '').trim();
      expect(cardTitle === coreTitles[lang][slug], `${lang} ${slug} home title did not use the locale-native v10 edition: ${cardTitle}`);
    }

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
    if (lang === 'en') expect(!/[\u3131-\u318E\uAC00-\uD7A3\u3040-\u30FF]/.test(bodyText), 'English spatial article contains Korean/Japanese prose');
    if (lang === 'ja') expect(!/[\u3131-\u318E\uAC00-\uD7A3]/.test(bodyText), 'Japanese spatial article contains Korean prose');

    const stage = page.locator('[data-spatial-stage]');
    await stage.scrollIntoViewIfNeeded();
    await stage.focus();
    const before = (await page.locator('[data-spatial-readout]').textContent() || '').trim();
    await page.keyboard.press('ArrowRight');
    const afterKey = (await page.locator('[data-spatial-readout]').textContent() || '').trim();
    expect(before !== afterKey, `${lang} spatial blockout should respond to keyboard orbit`);
    const box = await stage.boundingBox();
    expect(Boolean(box), `${lang} spatial stage should be measurable`);
    if (box) {
      const localX = box.width * .55, localY = box.height * .5;
      await stage.hover({ position: { x: localX, y: localY } });
      await page.evaluate(() => {
        window.__spatialAuditPointerTarget = false;
        document.addEventListener('pointerdown', event => {
          window.__spatialAuditPointerTarget = Boolean(event.target instanceof Element && event.target.closest('[data-spatial-stage]'));
        }, { capture: true, once: true });
      });
      await page.mouse.down();
      expect(await page.evaluate(() => window.__spatialAuditPointerTarget === true), `${lang} spatial audit pointerdown must hit the interactive stage`);
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
  for (const slug of ['glass','sloar','motion','spatial']) {
    await page.goto(`${baseURL}/#/post/${slug}`, { waitUntil: 'domcontentloaded' });
    if (slug === 'spatial') {
      await page.waitForSelector('[data-spatial-article][data-lang="ja"]');
    } else {
      await page.waitForSelector('.article-body');
      await assertCanonicalArticleTitleAfterLegacyRerender(slug, coreTitles.ja[slug]);
      if (japaneseHeadings[slug]) {
        const renderedHeadings = await page.locator('.article-body > .essay-section > h2').allTextContents();
        japaneseHeadings[slug].forEach((expected,index) => expect(renderedHeadings[index]?.trim() === expected, `Japanese ${slug} section ${index + 1} did not use authored heading: ${renderedHeadings[index]}`));
      }
    }
    await page.waitForTimeout(100);
    const text = (await page.locator('.article-body').innerText()).trim();
    expect(text.length >= 1200, `Japanese ${slug} article unexpectedly short: ${text.length}`);
    for (const phrase of japaneseTranslationese) expect(!text.includes(phrase), `Japanese ${slug} still contains translationese/mixed prose: ${phrase}`);
    japaneseSpacingDebt.lastIndex = 0;
    const spacingMatch = japaneseSpacingDebt.exec(text);
    expect(!spacingMatch, `Japanese ${slug} still contains translation-derived spacing near: ${spacingContext(text, spacingMatch)}`);
  }

  await page.goto(`${baseURL}/#/lab`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.refraction-header > p');
  await page.waitForFunction(() => document.querySelector('.refraction-header > p')?.textContent?.includes('ぼかしと屈折を同じものとして扱いません'));
  const labJapanese = (await page.locator('.refraction-page').innerText()).trim();
  expect(labJapanese.includes('光学パラメータ'), 'Japanese Refraction Lab should use an authored controls heading');
  expect(labJapanese.includes('屈折は参照位置を変える'), 'Japanese Refraction Lab should use the authored optical explanation');
  expect(labJapanese.includes('初期値に戻す'), 'Japanese Refraction Lab reset action should be localized naturally');
  for (const phrase of ['fragment shader','sample 座標','browser 間','背景 texture','RGB channel']) expect(!labJapanese.includes(phrase), `Japanese Refraction Lab still contains translationese: ${phrase}`);
  await assertA11y('Refraction Lab ja editorial');
  await page.screenshot({ path: `${visualDir}/refraction-ja.png`, animations: 'disabled' });

  expect(pageErrors.length === 0, `page errors detected: ${pageErrors.join(' | ')}`);
  expect(consoleErrors.length === 0, `console errors detected: ${consoleErrors.join(' | ')}`);
  console.log('trilingual editorial + spatial 3D audit ok');
} finally {
  await context.close();
  await browser.close();
}
