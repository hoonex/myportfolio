import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const baseURL = process.env.JOURNAL_BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true });
const expect = (condition, message) => { if (!condition) throw new Error(message); };
const lazy = ['journal-v2.js','journal-v10-editorial-naturalize.js','journal-v3-refraction.js','journal-v4-jelly.js','journal-v5-experiments.js','journal-v8-spatial.js','journal-v9-locale-editorial.js','journal-v11-vision.js','journal-v11-vision.css'];
async function resourceUrls(page) { return page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name)); }
async function assets(page) { return (await resourceUrls(page)).map(name => { try { return new URL(name).pathname.split('/').pop(); } catch { return name; } }); }
async function assertAssets(page,label,required=[],forbidden=[]) { const loaded=await assets(page); required.forEach(name=>expect(loaded.includes(name),`${label} did not load ${name}: ${loaded.join(', ')}`)); forbidden.forEach(name=>expect(!loaded.includes(name),`${label} unexpectedly loaded ${name}: ${loaded.join(', ')}`)); return loaded; }
async function assertA11y(page,label) { await page.waitForTimeout(650); const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze(); const serious=results.violations.filter(v=>['serious','critical'].includes(v.impact)); expect(serious.length===0,`${label} accessibility violations: ${serious.map(v=>`${v.id}:${v.nodes.map(n=>n.target.join(' ')).join(',')}`).join(' | ')}`); }
async function visit(hash,selector,required=[],forbidden=[],inspect=null) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(`${baseURL}/${hash}`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector(selector,{timeout:12000});
    await page.waitForTimeout(350);
    await assertAssets(page,hash||'home',required,forbidden);
    if(inspect) await inspect(page);
    expect(errors.length===0,`${hash||'home'} page errors: ${errors.join(' | ')}`);
  } finally {
    await context.close();
  }
}

await visit('', '[data-spatial-card-v8]', ['journal-editorial-core.js','journal-spatial-index.js','journal-v6-studio.js','journal-route-loader.js'], lazy, async page=>{
  await page.waitForSelector('#langSwitch[data-owner="editorial-core"]'); await page.locator('#langSwitch [data-lang="ja"]').click(); await page.waitForFunction(()=>document.documentElement.lang==='ja'); await page.waitForFunction(()=>document.querySelector('.post-card--glass .studio-preview-label span')?.textContent?.trim()==='WebGL屈折 · ドラッグ変形'); expect((await page.locator('.post-card--sloar .studio-preview-label span').textContent()||'').trim()==='状態復元 · 障害注入','Japanese home Sloar preview should be authored Japanese'); expect((await page.locator('.post-card--motion .studio-preview-label span').textContent()||'').trim()==='スプリング · 速度の引き継ぎ','Japanese home Motion preview should be authored Japanese'); await assertAssets(page,'home after Japanese switch',[],['journal-v2.js','journal-v10-editorial-naturalize.js','journal-v11-vision.js','journal-v11-vision.css']);
});
await visit('#/post/sloar','[data-sloar-lab]',['journal-v2.js','journal-v10-editorial-naturalize.js','journal-v5-experiments.js'],['journal-v3-refraction.js','journal-v4-jelly.js','journal-v8-spatial.js','journal-v9-locale-editorial.js','journal-v11-vision.js'],async page=>{await page.waitForSelector('#langSwitch:not([data-owner="editorial-core"])');await page.locator('#langSwitch [data-lang="ja"]').click();await page.waitForFunction(()=>document.documentElement.lang==='ja');await page.waitForFunction(()=>document.querySelector('.article-rail-head span')?.textContent?.trim()==='この記事の構成');expect((await page.locator('.reading-progress-v6 span').textContent()||'').trim()==='読書中','Japanese Sloar reading progress should be localized');});
await visit('#/post/spatial','[data-spatial-article]',['journal-v10-editorial-naturalize.js','journal-v8-spatial.js'],['journal-v2.js','journal-v3-refraction.js','journal-v4-jelly.js','journal-v5-experiments.js','journal-v9-locale-editorial.js','journal-v11-vision.js'],async page=>{await page.waitForSelector('#langSwitch[data-owner="editorial-core"]');await page.locator('#langSwitch [data-lang="ja"]').click();await page.waitForSelector('[data-spatial-article][data-lang="ja"]');await page.waitForFunction(()=>document.querySelector('.article-rail-head span')?.textContent?.trim()==='この記事の構成');});
await visit('#/post/glass','.refraction-correction',['journal-v2.js','journal-v10-editorial-naturalize.js','journal-v3-refraction.js','journal-v4-jelly.js','journal-v9-locale-editorial.js'],['journal-v5-experiments.js','journal-v8-spatial.js','journal-v11-vision.js']);
await visit('#/lab','.refraction-page',['journal-v2.js','journal-v3-refraction.js','journal-v4-jelly.js','journal-v9-locale-editorial.js'],['journal-v10-editorial-naturalize.js','journal-v5-experiments.js','journal-v8-spatial.js','journal-v11-vision.js']);
await visit('#/lab/vision','[data-vision-lab]',['journal-v11-vision.js','journal-v11-vision.css'],['journal-v2.js','journal-v10-editorial-naturalize.js','journal-v3-refraction.js','journal-v4-jelly.js','journal-v5-experiments.js','journal-v8-spatial.js','journal-v9-locale-editorial.js'],async page=>{
  await page.waitForFunction(()=>document.title.startsWith('Vision Lab.'));
  expect(await page.locator('[data-nav="vision"]').getAttribute('aria-current')==='page','Vision nav must own aria-current on Vision Lab');
  expect(await page.locator('[data-nav="lab"]').getAttribute('aria-current')===null,'Glass Lab must not own aria-current on Vision Lab');
  expect(await page.locator('[data-start]').isVisible(),'Vision Lab must expose an explicit Start camera action');
  const before=await resourceUrls(page); const remote=before.filter(url=>/tasks-vision|mediapipe-models|opencv\.js/i.test(url)); expect(remote.length===0,`Vision Lab downloaded camera runtimes before consent: ${remote.join(', ')}`);
  const diagnostic=await page.evaluate(()=>window.HJVisionLab?.injectDiagnosticFrame?.()); expect(diagnostic===true,'Vision diagnostic geometry hook failed');
  await page.waitForFunction(()=>document.querySelector('[data-vm="points"] strong')?.textContent==='499');
  expect((await page.locator('[data-vm="backend"] strong').textContent()||'').trim()==='DIAGNOSTIC','Vision synthetic evidence must be visibly labeled DIAGNOSTIC');
  const state=await page.evaluate(()=>window.HJVisionLab?.state?.());
  expect(state?.hands===true&&state?.face===true&&state?.view===false,`Vision camera-first default state drift: ${JSON.stringify(state)}`);
  expect(await page.locator('.vision-3d-card-v11').getAttribute('hidden')!==null,'Vision diagnostic 3D must remain hidden by default');
  expect(await page.locator('.vision-camera-card-v11').isVisible(),'Vision camera / face-mesh surface must remain the primary visible surface');
  await assertA11y(page,'Vision diagnostic');
  await mkdir('.artifacts/design-journal',{recursive:true});
  await page.screenshot({path:'.artifacts/design-journal/vision-diagnostic.png',fullPage:true});
});
await browser.close();
console.log('composable route runtime loading + locale + Vision Lab audit ok');
