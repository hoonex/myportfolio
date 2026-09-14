/* Portfolio v15 — home content owner. */
(()=>{
  const COPY={
    ko:{
      eyebrow:'Design + engineering / 2026',
      note:'작동하는 프로토타입, 저장소, 실패한 가정까지 함께 남깁니다. 결과물만 잘라 보여주기보다 어떻게 만들었는지까지 공개합니다.',
      principle:'스크린샷에서만 그럴듯하면 아직 끝난 게 아니다. 입력, 실패 상태, 성능, 배포까지 같은 설계를 유지해야 한다.',
      footer:'Interactive systems · tools · experiments, 2026',
      heading:'Selected builds',count:'04 active / live',
      intro:'글보다 먼저, 지금 실제로 만들고 있는 것들. 장식용 케이스 스터디가 아니라 직접 실행하거나 현재 구현 내용을 확인할 수 있는 작업만 올립니다.',
      items:[
        {kicker:'Native simulation / active',title:'AeroForge',desc:'Bevy + egui 기반 3D 공력 워크벤치. 빠른 D3Q19 preview와 SU2 Accurate 경로를 분리하고, 메시와 수치 결과의 검증 범위를 명시적으로 기록합니다.',meta:'Rust · Bevy · egui · SU2',href:'#/project/aeroforge'},
        {kicker:'Browser vision / live',title:'Vision Lab',desc:'MediaPipe 손·얼굴 추적과 양손 핀치로 Orbit, Threads, Resonance, Piano, Sculpt를 직접 조작하는 브라우저 인터랙티브 아트.',meta:'MediaPipe · Canvas · dual-hand',href:'#/lab/vision'},
        {kicker:'Agent tooling / active',title:'Sloar Chat Coder',desc:'채팅 코딩에서 저장소·CI·배포 상태가 바뀌어도 근거를 잃지 않도록 만든 repository continuity protocol.',meta:'Agent Skill · GitHub · CI',href:'#/project/sloar'},
        {kicker:'Material interaction / live',title:'Glass / Jelly Lab',desc:'CSS blur 데모에서 멈추지 않고 WebGL 굴절, 직접 조작, jelly deformation과 물리 반응을 반복해서 검증하는 인터페이스 랩.',meta:'WebGL · shader · direct manipulation',href:'#/lab'}
      ]
    },
    en:{
      eyebrow:'Design + engineering / 2026',
      note:'Working prototypes, repositories, and failed assumptions stay visible. The process is part of the portfolio, not something hidden behind the final screenshot.',
      principle:'If it only looks right in a screenshot, it is not finished. Input, failure states, performance, and deployment still have to tell the same story.',
      footer:'Interactive systems · tools · experiments, 2026',
      heading:'Selected builds',count:'04 active / live',
      intro:'The things I am actually building now. No decorative case studies: each item is runnable here or documented with its current implementation.',
      items:[
        {kicker:'Native simulation / active',title:'AeroForge',desc:'A native Bevy + egui aerodynamics workbench with a fast D3Q19 preview path and a separate SU2 Accurate workflow with explicit evidence boundaries.',meta:'Rust · Bevy · egui · SU2',href:'#/project/aeroforge'},
        {kicker:'Browser vision / live',title:'Vision Lab',desc:'A browser interaction study using MediaPipe face and hand tracking, simultaneous two-hand pinch, and Orbit, Threads, Resonance, Piano, and Sculpt modes.',meta:'MediaPipe · Canvas · dual-hand',href:'#/lab/vision'},
        {kicker:'Agent tooling / active',title:'Sloar Chat Coder',desc:'A repository-continuity protocol for chat coding that keeps repository, CI, deployment, and evidence state explicit as the environment changes.',meta:'Agent Skill · GitHub · CI',href:'#/project/sloar'},
        {kicker:'Material interaction / live',title:'Glass / Jelly Lab',desc:'Material experiments that move past CSS blur into WebGL refraction, direct manipulation, jelly deformation, and physical response.',meta:'WebGL · shader · direct manipulation',href:'#/lab'}
      ]
    },
    ja:{
      eyebrow:'Design + engineering / 2026',
      note:'動くプロトタイプ、リポジトリ、失敗した仮説まで残します。完成画面だけではなく、どう作ったかもポートフォリオの一部として公開します。',
      principle:'スクリーンショットだけで成立するなら、まだ完成ではない。入力、失敗状態、性能、デプロイまで同じ設計思想でつながる必要がある。',
      footer:'Interactive systems · tools · experiments, 2026',
      heading:'Selected builds',count:'04 active / live',
      intro:'今、実際に作っているもの。飾りのケーススタディではなく、ここで動かすか現在の実装内容を確認できる作業だけを並べています。',
      items:[
        {kicker:'Native simulation / active',title:'AeroForge',desc:'Bevy + egui のネイティブ3D空力ワークベンチ。高速なD3Q19 previewとSU2 Accurate経路を分離し、メッシュと数値結果の証拠範囲を明示します。',meta:'Rust · Bevy · egui · SU2',href:'#/project/aeroforge'},
        {kicker:'Browser vision / live',title:'Vision Lab',desc:'MediaPipeの顔・手トラッキングと両手同時pinchで、Orbit / Threads / Resonance / Piano / Sculptを直接操作するブラウザ実験。',meta:'MediaPipe · Canvas · dual-hand',href:'#/lab/vision'},
        {kicker:'Agent tooling / active',title:'Sloar Chat Coder',desc:'チャットコーディング中にrepository、CI、deploymentの状態が変わっても根拠を失わないためのrepository continuity protocol。',meta:'Agent Skill · GitHub · CI',href:'#/project/sloar'},
        {kicker:'Material interaction / live',title:'Glass / Jelly Lab',desc:'CSS blurだけで終わらず、WebGL屈折、direct manipulation、jelly deformationと物理反応を検証するインターフェースラボ。',meta:'WebGL · shader · direct manipulation',href:'#/lab'}
      ]
    }
  };

  const language=()=>{const value=document.documentElement.lang||'ko';return value.startsWith('ja')?'ja':value.startsWith('en')?'en':'ko'};
  const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
  const copy=()=>COPY[language()]||COPY.en;

  function buildMarkup(c){
    return `<section class="selected-builds" data-portfolio-v15 aria-labelledby="builds-title"><div class="section-head section-head--builds"><h2 id="builds-title">${c.heading}</h2><span>${c.count}</span></div><p class="builds-intro">${c.intro}</p><div class="build-list">${c.items.map((item,index)=>{const external=/^https?:/i.test(item.href);return `<a class="build-row" href="${item.href}" ${external?'target="_blank" rel="noreferrer"':''}><span class="build-index">${String(index+1).padStart(2,'0')}</span><span class="build-main"><span class="build-kicker">${item.kicker}</span><strong>${item.title}</strong><span class="build-description">${item.desc}</span></span><span class="build-meta">${item.meta}</span><span class="build-arrow" aria-hidden="true">↗</span></a>`;}).join('')}</div></section>`;
  }

  function syncChrome(c){
    const brand=document.querySelector('.brand-status');
    if(brand)brand.textContent='Design + engineering';
    const footer=document.querySelector('.site-footer .muted');
    if(footer)footer.textContent=c.footer;
  }

  function enhance(){
    const c=copy();
    syncChrome(c);
    if(route()!=='/')return;
    const home=document.querySelector('.home-page');
    const hero=home?.querySelector('.hero');
    if(!home||!hero)return;

    const eyebrow=home.querySelector('.eyebrow');
    if(eyebrow)eyebrow.textContent=c.eyebrow;
    const note=home.querySelector('.hero-note');
    if(note)note.textContent=c.note;
    const principle=home.querySelector('.manifesto-copy');
    if(principle)principle.textContent=c.principle;

    let section=home.querySelector('[data-portfolio-v15]');
    if(!section){
      hero.insertAdjacentHTML('afterend',buildMarkup(c));
    }else{
      const holder=document.createElement('div');
      holder.innerHTML=buildMarkup(c);
      section.replaceWith(holder.firstElementChild);
    }
  }

  let raf=0;
  function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>requestAnimationFrame(enhance))}
  addEventListener('hashchange',schedule);
  document.addEventListener('hj:rendered',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  queueMicrotask(schedule);
})();
