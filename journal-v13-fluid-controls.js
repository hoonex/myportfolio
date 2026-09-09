/* Journal v13: optical presets + physics controls for Glass Lab. */
(() => {
  const DEFAULTS={refraction:1.60,blurAmount:0,chromAberration:.180,specular:0,fresnel:0,edgeHighlight:0,zRadius:50,cornerRadius:80,saturation:.02,brightness:.02};
  const PRESETS={
    original:['현재값','Current','現在値',DEFAULTS],
    natural:['추천 · Natural','Recommended · Natural','おすすめ · Natural',{refraction:1.32,blurAmount:.02,chromAberration:.055,specular:.18,fresnel:.34,edgeHighlight:.045,zRadius:58,cornerRadius:72,saturation:.08,brightness:.02}],
    clear:['Clear Lens','Clear Lens','Clear Lens',{refraction:1.12,blurAmount:0,chromAberration:.025,specular:.08,fresnel:.18,edgeHighlight:.025,zRadius:44,cornerRadius:68,saturation:.02,brightness:0}],
    water:['Water Drop','Water Drop','Water Drop',{refraction:1.50,blurAmount:.01,chromAberration:.070,specular:.10,fresnel:.24,edgeHighlight:.035,zRadius:74,cornerRadius:80,saturation:.12,brightness:.03}],
    soft:['Soft Glass','Soft Glass','Soft Glass',{refraction:.82,blurAmount:.09,chromAberration:.025,specular:.32,fresnel:.60,edgeHighlight:.080,zRadius:36,cornerRadius:60,saturation:.16,brightness:.03}],
    prism:['Prism Edge','Prism Edge','Prism Edge',{refraction:1.45,blurAmount:0,chromAberration:.180,specular:.12,fresnel:.25,edgeHighlight:.070,zRadius:64,cornerRadius:74,saturation:.18,brightness:.04}],
    gel:['Dense Gel','Dense Gel','Dense Gel',{refraction:1.60,blurAmount:.02,chromAberration:.100,specular:.08,fresnel:.15,edgeHighlight:.030,zRadius:88,cornerRadius:80,saturation:-.02,brightness:.01}]
  };
  const COPY={ko:['추천 프리셋','물리 반응','중력','흔들기','기기 모션','중력 OFF','중력 ON','모션 켜짐','모션 권한 필요'],en:['Recommended presets','Physics response','Gravity','Shake','Device motion','Gravity OFF','Gravity ON','Motion on','Motion permission needed'],ja:['おすすめプリセット','物理反応','重力','揺らす','端末モーション','重力 OFF','重力 ON','モーション ON','モーション権限が必要']};
  let cleanup=null;
  const lang=()=>{const l=document.documentElement.lang||'ko';return l.startsWith('ja')?'ja':l.startsWith('en')?'en':'ko';};
  const li=()=>lang()==='ko'?0:lang()==='en'?1:2;
  function setValues(v){const trigger=document.querySelector('#ref-refraction');if(!trigger)return;Object.entries(v).forEach(([id,x])=>{const el=document.querySelector(`#ref-${id}`);if(el)el.value=String(x);});trigger.dispatchEvent(new Event('input',{bubbles:true}));}
  function match(){for(const [name,p] of Object.entries(PRESETS)){if(Object.entries(p[3]).every(([id,x])=>{const el=document.querySelector(`#ref-${id}`);return !el||Math.abs(+el.value-x)<=Math.max(+el.step||.001,.001)*.51;}))return name;}return null;}
  function syncButtons(panel){const m=match();panel.querySelectorAll('[data-fluid-preset]').forEach(b=>{const on=b.dataset.fluidPreset===m;b.classList.toggle('is-active',on);b.setAttribute('aria-pressed',String(on));});}
  function replaceReset(panel){const old=document.querySelector('#refReset');if(!old||old.dataset.v13Reset)return;const b=old.cloneNode(true);b.dataset.v13Reset='1';old.replaceWith(b);b.addEventListener('click',()=>{setValues(DEFAULTS);window.HJFluidLab?.reset?.();const g=panel.querySelector('[data-fluid-gravity]');g?.classList.remove('is-active');g?.setAttribute('aria-pressed','false');panel.querySelector('[data-fluid-status]').textContent=COPY[lang()][5];syncButtons(panel);});}
  function install(){
    if(!location.hash.startsWith('#/lab')||location.hash.startsWith('#/lab/vision')){cleanup?.();cleanup=null;return;}
    const controls=document.querySelector('.refraction-controls'),head=controls?.querySelector('.ref-controls-head'),glass=document.querySelector('#realLiquidGlass');if(!controls||!head||!glass||!window.HJFluidLab)return;
    if(controls.querySelector('.fluid-physics-panel'))return;
    const c=COPY[lang()], idx=li(), panel=document.createElement('section'), ac=new AbortController();panel.className='fluid-physics-panel';
    panel.innerHTML=`<div class="fluid-panel-group"><span class="fluid-panel-label">${c[0]}</span><div class="fluid-preset-grid">${Object.entries(PRESETS).map(([n,p])=>`<button type="button" data-fluid-preset="${n}" aria-pressed="false">${p[idx]}</button>`).join('')}</div></div><div class="fluid-panel-group"><span class="fluid-panel-label">${c[1]}</span><div class="fluid-action-row"><button type="button" data-fluid-gravity aria-pressed="false"><span>↓</span>${c[2]}</button><button type="button" data-fluid-shake><span>≈</span>${c[3]}</button><button type="button" data-fluid-motion aria-pressed="false"><span>◉</span>${c[4]}</button></div><span class="fluid-physics-status" data-fluid-status>${c[5]}</span></div>`;
    head.insertAdjacentElement('afterend',panel);
    panel.querySelectorAll('[data-fluid-preset]').forEach(b=>b.addEventListener('click',()=>{setValues(PRESETS[b.dataset.fluidPreset][3]);syncButtons(panel);},{signal:ac.signal}));
    controls.querySelectorAll('input[type="range"]').forEach(x=>x.addEventListener('input',()=>syncButtons(panel),{signal:ac.signal}));
    const g=panel.querySelector('[data-fluid-gravity]'),status=panel.querySelector('[data-fluid-status]');
    g.addEventListener('click',()=>{const on=window.HJFluidLab.toggleGravity();g.classList.toggle('is-active',on);g.setAttribute('aria-pressed',String(on));status.textContent=on?c[6]:c[5];},{signal:ac.signal});
    panel.querySelector('[data-fluid-shake]').addEventListener('click',()=>window.HJFluidLab.shake(),{signal:ac.signal});
    const motion=panel.querySelector('[data-fluid-motion]');if(!('DeviceMotionEvent'in window))motion.hidden=true;else motion.addEventListener('click',async()=>{try{const on=await window.HJFluidLab.toggleMotion();motion.classList.toggle('is-active',on);motion.setAttribute('aria-pressed',String(on));status.textContent=on?c[7]:(window.HJFluidLab.state.gravity?c[6]:c[5]);}catch{status.textContent=c[8];}},{signal:ac.signal});
    replaceReset(panel);setValues(DEFAULTS);syncButtons(panel);
    cleanup=()=>{ac.abort();panel.remove();};
  }
  const schedule=()=>requestAnimationFrame(()=>requestAnimationFrame(install));document.addEventListener('hj:rendered',schedule);addEventListener('hashchange',schedule);queueMicrotask(schedule);
})();
