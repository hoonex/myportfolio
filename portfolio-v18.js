/* Portfolio v18 — one renderer for current-work lists and repository-backed case studies. */
(()=>{
'use strict';
const content=globalThis.HJPortfolioV18Content;
const app=document.querySelector('#app');
if(!content||!app)return;
const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let snapshotPromise=null,lastRoute='';

function loadSnapshots(){
  if(!snapshotPromise){
    const hour=Math.floor(Date.now()/3600000);
    snapshotPromise=fetch(`./portfolio-snapshots.json?v=${hour}`,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error(`snapshot ${r.status}`))).catch(error=>{console.warn('[portfolio snapshot]',error);return {projects:{}}});
  }
  return snapshotPromise;
}
function dateLabel(value){
  const d=new Date(value);if(Number.isNaN(d.getTime()))return 'snapshot unavailable';
  return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replace(/\s/g,'');
}
function snapshotFor(project,snapshots){return project.snapshotKey?snapshots?.projects?.[project.snapshotKey]||null:null}
function snapshotLabel(project,snapshots){const s=snapshotFor(project,snapshots);return s?`${dateLabel(s.date)} · ${s.shortSha} · ${s.ref}`:''}
function snapshotTop(project,snapshots){const s=snapshotFor(project,snapshots);return s?`${s.shortSha} / ${s.ref}`:'LIVE / LOCAL'}
function external(href){return /^https?:/i.test(href)}

function syncChrome(){
  const brand=document.querySelector('.brand-status');if(brand)brand.textContent=content.chrome.brand;
  const footer=document.querySelector('.site-footer .muted');if(footer)footer.textContent=content.chrome.footer;
}
function row(key,index,snapshots){
  const p=content.projects[key],snap=snapshotLabel(p,snapshots),ext=external(p.href);
  return `<a class="build-row" href="${esc(p.href)}" ${ext?'target="_blank" rel="noreferrer"':''}><span class="build-index">${String(index+1).padStart(2,'0')}</span><span class="build-main"><span class="build-kicker">${esc(p.kicker)}</span><strong>${esc(p.title)}</strong><span class="build-description">${esc(p.desc)}</span>${snap?`<span class="build-snapshot-v18">${esc(snap)}</span>`:''}</span><span class="build-meta">${esc(p.meta)}</span><span class="build-arrow" aria-hidden="true">↗</span></a>`;
}
function listSection({heading,count,intro,keys,secondary=false},snapshots){
  return `<section class="selected-builds current-work-v18${secondary?' current-work-v18--secondary':''}" data-current-work-v18 aria-label="${esc(heading)}"><div class="section-head section-head--builds"><h2>${esc(heading)}</h2><span>${esc(count)}</span></div><p class="builds-intro">${esc(intro)}</p><div class="build-list">${keys.map((key,i)=>row(key,i,snapshots)).join('')}</div>${secondary?'':'<p class="portfolio-sync-note-v18">Repository snapshots: tracked refs → portfolio-snapshots.json · human-written descriptions stay manual.</p>'}</section>`;
}
function enhanceHome(snapshots){
  const home=app.querySelector('.home-page'),hero=home?.querySelector('.hero');if(!home||!hero)return;
  document.title='HJ — Systems + Software';
  const eyebrow=home.querySelector('.eyebrow');if(eyebrow)eyebrow.textContent=content.home.eyebrow;
  const title=home.querySelector('.hero h1');if(title)title.innerHTML=content.home.title;
  const intro=home.querySelector('.hero-intro');if(intro)intro.textContent=content.home.intro;
  const note=home.querySelector('.hero-note');if(note)note.textContent=content.home.note;
  const principle=home.querySelector('.manifesto-copy');if(principle)principle.textContent=content.home.principle;
  home.querySelectorAll('[data-current-work-v18]').forEach(node=>node.remove());
  const primary=listSection({heading:content.home.primaryHeading,count:content.home.primaryCount,intro:content.home.primaryIntro,keys:content.primary},snapshots);
  const secondary=listSection({heading:content.home.secondaryHeading,count:content.home.secondaryCount,intro:content.home.secondaryIntro,keys:content.secondary,secondary:true},snapshots);
  hero.insertAdjacentHTML('afterend',primary+secondary);
}
function factRows(items){return items.map(([title,body],i)=>`<article class="project-fact-v16"><span>${String(i+1).padStart(2,'0')}</span><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`).join('')}
function decisionRows(items){return items.map(([title,body])=>`<div class="project-decision-v16"><strong>${esc(title)}</strong><p>${esc(body)}</p></div>`).join('')}
function linkRows(items){return items.map(([title,href])=>`<a href="${esc(href)}" target="_blank" rel="noreferrer"><span>${esc(title)}</span><b>↗</b></a>`).join('')}
function systemVisual(project,snapshots){
  const s=snapshotFor(project,snapshots),facts=(project.facts||[]).slice(0,4);
  return `<div class="project-system-v16 project-system-v18" aria-label="${esc(project.title)} current architecture snapshot"><div class="system-top-v16"><span>${esc(project.title.toUpperCase())} / CURRENT</span><b>${esc(snapshotTop(project,snapshots))}</b></div><div class="project-map-v18">${facts.map(([title],i)=>`<div><span>${String(i+1).padStart(2,'0')}</span><strong>${esc(title)}</strong></div>`).join('')}</div><div class="system-foot-v16"><span>${s?esc(s.repository):'live surface'}</span><i></i><span>${s?esc(dateLabel(s.date)):'interactive runtime'}</span><i></i><span>evidence-scoped</span></div></div>`;
}
function projectTemplate(project,snapshots,key){
  const common=content.common,snapshot=snapshotLabel(project,snapshots)||'Live surface';
  return `<div class="page project-page-v16 project-page-v18 project-page-v18--${esc(key)}" data-project-page-v18="${esc(key)}"><article class="project-shell-v16"><a class="project-back-v16" href="#/">${esc(common.back)}</a><header class="project-hero-v16"><div class="project-kicker-v16">${esc(project.kicker)}</div><h1>${esc(project.title)}</h1><p class="project-deck-v16">${esc(project.deck)}</p><div class="project-snapshot-v16"><span><b>${esc(common.snapshot)}</b>${esc(snapshot)}</span><span>${esc(project.meta)}</span></div></header>${systemVisual(project,snapshots)}<p class="project-intro-v16">${esc(project.intro)}</p><aside class="project-scope-v16">${esc(common.scope)}</aside><section class="project-section-v16"><div class="project-section-head-v16"><span>01</span><h2>${esc(common.built)}</h2></div><div class="project-facts-v16">${factRows(project.facts||[])}</div></section><section class="project-section-v16"><div class="project-section-head-v16"><span>02</span><h2>${esc(common.decisions)}</h2></div><div class="project-decisions-v16">${decisionRows(project.decisions||[])}</div></section><section class="project-section-v16"><div class="project-section-head-v16"><span>03</span><h2>${esc(common.boundary)}</h2></div><ul class="project-boundaries-v16">${(project.boundaries||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section class="project-section-v16 project-links-section-v16"><div class="project-section-head-v16"><span>04</span><h2>${esc(common.source)}</h2></div><div class="project-links-v16">${linkRows(project.links||[])}</div></section></article></div>`;
}
function mountProject(key,snapshots){
  const project=content.projects[key];if(!project?.deck)return false;
  const current=app.querySelector('[data-project-page-v18]');if(current?.dataset.projectPageV18===key)return true;
  document.querySelectorAll('[data-nav]').forEach(n=>{n.classList.remove('active');n.removeAttribute('aria-current')});
  document.title=`${project.title} — HJ`;
  app.innerHTML=projectTemplate(project,snapshots,key);
  if(lastRoute!==route())window.scrollTo({top:0,behavior:'auto'});lastRoute=route();
  app.focus({preventScroll:true});return true;
}
async function enhance(){
  syncChrome();const snapshots=await loadSnapshots(),r=route();
  if(r==='/'){enhanceHome(snapshots);return}
  if(r.startsWith('/project/'))mountProject(r.split('/')[2]||'',snapshots);
}
let raf=0;
function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>requestAnimationFrame(enhance))}
addEventListener('hashchange',schedule);
document.addEventListener('hj:rendered',schedule);
queueMicrotask(schedule);
})();
