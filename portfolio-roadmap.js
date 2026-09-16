/* Portfolio roadmap — planned work stays separate from implemented/current work. */
(()=>{
'use strict';
const app=document.querySelector('#app');
if(!app)return;
const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let roadmapPromise=null,lastRoute='';

function loadRoadmap(){
  if(!roadmapPromise){
    const hour=Math.floor(Date.now()/3600000);
    roadmapPromise=fetch(`./portfolio-roadmap.json?v=${hour}`,{cache:'no-store'})
      .then(r=>r.ok?r.json():Promise.reject(new Error(`roadmap ${r.status}`)))
      .catch(error=>{console.warn('[portfolio roadmap]',error);return {projects:{}}});
  }
  return roadmapPromise;
}
function row(project,index){
  return `<a class="build-row" href="${esc(project.href)}"><span class="build-index">${String(index+1).padStart(2,'0')}</span><span class="build-main"><span class="build-kicker">${esc(project.kicker)}</span><strong>${esc(project.title)}</strong><span class="build-description">${esc(project.desc)}</span><span class="build-snapshot-v18">PLANNED / NOT BUILT</span></span><span class="build-meta">${esc(project.meta)}</span><span class="build-arrow" aria-hidden="true">↗</span></a>`;
}
function mountHome(roadmap){
  const home=app.querySelector('.home-page'),hero=home?.querySelector('.hero');
  if(!home||!hero)return;
  home.querySelectorAll('[data-roadmap-v19]').forEach(node=>node.remove());
  const projects=Object.values(roadmap.projects||{}).filter(project=>project.status==='planned');
  if(!projects.length)return;
  const section=`<section class="selected-builds current-work-v18 current-work-v18--secondary roadmap-v19" data-roadmap-v19 aria-label="Next build"><div class="section-head section-head--builds"><h2>Next build</h2><span>${String(projects.length).padStart(2,'0')} planned</span></div><p class="builds-intro">아직 구현 전인 다음 제작 목표입니다. 실제 playable prototype과 검증 근거가 생기면 Current work로 승격합니다.</p><div class="build-list">${projects.map(row).join('')}</div></section>`;
  const currentSections=home.querySelectorAll('[data-current-work-v18]');
  const anchor=currentSections[currentSections.length-1]||hero;
  anchor.insertAdjacentHTML('afterend',section);
}
function factRows(items){return items.map(([title,body],i)=>`<article class="project-fact-v16"><span>${String(i+1).padStart(2,'0')}</span><h3>${esc(title)}</h3><p>${esc(body)}</p></article>`).join('')}
function decisionRows(items){return items.map(([title,body])=>`<div class="project-decision-v16"><strong>${esc(title)}</strong><p>${esc(body)}</p></div>`).join('')}
function systemVisual(project){
  const goals=(project.goals||[]).slice(0,4);
  return `<div class="project-system-v16 project-system-v18 project-roadmap-system-v19" aria-label="${esc(project.title)} concept plan"><div class="system-top-v16"><span>${esc(project.title.toUpperCase())} / PLAN</span><b>PLANNED / NOT BUILT</b></div><div class="project-map-v18">${goals.map(([title],i)=>`<div><span>${String(i+1).padStart(2,'0')}</span><strong>${esc(title)}</strong></div>`).join('')}</div><div class="system-foot-v16"><span>concept only</span><i></i><span>implementation not started</span><i></i><span>target-scoped</span></div></div>`;
}
function projectTemplate(project,key){
  return `<div class="page project-page-v16 project-page-v18 project-roadmap-v19" data-roadmap-project-v19="${esc(key)}"><article class="project-shell-v16"><a class="project-back-v16" href="#/">← Current work</a><header class="project-hero-v16"><div class="project-kicker-v16">${esc(project.kicker)}</div><h1>${esc(project.title)}</h1><p class="project-deck-v16">${esc(project.deck)}</p><div class="project-snapshot-v16"><span><b>Concept status</b>Planned / no playable build yet</span><span>${esc(project.meta)}</span></div></header>${systemVisual(project)}<p class="project-intro-v16">${esc(project.intro)}</p><aside class="project-scope-v16">이 페이지는 구현 완료 보고가 아니라 제작 전 설계 메모입니다. 실제 코드·playable build·기기 검증이 생기기 전에는 목표를 결과처럼 표현하지 않습니다.</aside><section class="project-section-v16"><div class="project-section-head-v16"><span>01</span><h2>설계 목표</h2></div><div class="project-facts-v16">${factRows(project.goals||[])}</div></section><section class="project-section-v16"><div class="project-section-head-v16"><span>02</span><h2>초기 설계 원칙</h2></div><div class="project-decisions-v16">${decisionRows(project.decisions||[])}</div></section><section class="project-section-v16"><div class="project-section-head-v16"><span>03</span><h2>현재 범위와 한계</h2></div><ul class="project-boundaries-v16">${(project.boundaries||[]).map(item=>`<li>${esc(item)}</li>`).join('')}</ul></section></article></div>`;
}
function mountProject(project,key){
  const current=app.querySelector('[data-roadmap-project-v19]');
  if(current?.dataset.roadmapProjectV19===key)return;
  document.querySelectorAll('[data-nav]').forEach(node=>{node.classList.remove('active');node.removeAttribute('aria-current')});
  document.title=`${project.title} — HJ`;
  app.innerHTML=projectTemplate(project,key);
  if(lastRoute!==route())window.scrollTo({top:0,behavior:'auto'});
  lastRoute=route();
  app.focus({preventScroll:true});
}
async function render(){
  const roadmap=await loadRoadmap(),r=route();
  if(r==='/'){mountHome(roadmap);return}
  if(!r.startsWith('/project/'))return;
  const key=r.split('/')[2]||'',project=roadmap.projects?.[key];
  if(project?.status==='planned')mountProject(project,key);
}
let raf=0;
function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(render)))}
addEventListener('hashchange',schedule);
document.addEventListener('hj:rendered',schedule);
queueMicrotask(schedule);
})();
