/* Journal v20: direct-child LiquidGlass slider thumbs + stable iOS-style stretch. */
(() => {
  const MODULE_URL='https://cdn.jsdelivr.net/npm/@ybouane/liquidglass@1.0.3/dist/index.js';
  const THUMB_CONFIG={
    floating:false,button:false,bevelMode:0,
    refraction:1.28,blurAmount:.01,chromAberration:.042,specular:.52,
    fresnel:.92,edgeHighlight:.16,zRadius:10,cornerRadius:11,
    saturation:.06,brightness:.035
  };
  const BASE_W=30,BASE_H=19,HIT_W=34,MAX_W=50;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const activeRoute=()=>location.hash.startsWith('#/lab')&&!location.hash.startsWith('#/lab/vision');

  let instance=null,controls=null,observer=null,controller=null,modulePromise=null;
  let bootToken=0,scheduled=0;
  const states=new Map();
  const neutralContexts=globalThis.__HJLiquidGlassNeutralContexts=
    globalThis.__HJLiquidGlassNeutralContexts||new WeakSet();

  const glProto=globalThis.WebGLRenderingContext?.prototype;
  if(glProto&&!glProto.__hjAppleSliderV20NeutralPatch){
    const previousDraw=glProto.drawArrays;
    Object.defineProperty(glProto,'__hjAppleSliderV20NeutralPatch',{value:true});
    glProto.drawArrays=function(...args){
      if(!neutralContexts.has(this))return previousDraw.apply(this,args);
      const s=globalThis.__HJGlassDentState;
      if(!s)return previousDraw.apply(this,args);
      const saved={u:s.u,v:s.v,depth:s.depth,radius:s.radius,axisX:s.axisX,axisY:s.axisY,shapeX:s.shapeX,shapeY:s.shapeY};
      Object.assign(s,{u:.5,v:.5,depth:0,radius:.42,axisX:1,axisY:1,shapeX:1,shapeY:1});
      try{return previousDraw.apply(this,args);}
      finally{Object.assign(s,saved);}
    };
  }

  function percent(input){
    const min=Number(input.min||0),max=Number(input.max||100),value=Number(input.value||0);
    return max===min?0:clamp((value-min)/(max-min),0,1);
  }

  function markChanged(){try{instance?.markChanged();}catch{}}

  function localCenter(state,p=percent(state.input)){
    const w=Math.max(HIT_W,state.shell.clientWidth||0);
    return HIT_W*.5+p*Math.max(0,w-HIT_W);
  }

  function positionThumb(state){
    if(!controls||!document.contains(state.shell)||!document.contains(state.thumb))return;
    const sr=state.shell.getBoundingClientRect();
    const cr=controls.getBoundingClientRect();
    const p=percent(state.input);
    const localX=HIT_W*.5+p*Math.max(0,sr.width-HIT_W);
    const x=sr.left-cr.left+controls.scrollLeft+localX;
    const y=sr.top-cr.top+controls.scrollTop+sr.height*.5;
    state.thumb.style.left=`${x.toFixed(2)}px`;
    state.thumb.style.top=`${y.toFixed(2)}px`;
    state.shell.style.setProperty('--range-fill-x',`${localX.toFixed(2)}px`);
    state.center=localX;
  }

  function applyStretch(state,width=BASE_W,shift=0){
    state.width=clamp(width,BASE_W,MAX_W);
    state.shift=clamp(shift,-7,7);
    state.thumb.style.width=`${state.width.toFixed(2)}px`;
    state.thumb.style.transform=`translate(calc(-50% + ${state.shift.toFixed(2)}px),-50%)`;
  }

  function syncOne(input,trackVelocity=false){
    const state=states.get(input);if(!state)return;
    const now=performance.now();
    const nextCenter=localCenter(state);
    if(trackVelocity&&state.active){
      const dt=Math.max(8,now-state.lastTime)/1000;
      const instant=(nextCenter-state.lastCenter)/dt;
      state.velocity=state.velocity*.56+instant*.44;
      const speed=Math.abs(state.velocity);
      const stretch=clamp((speed-32)*.016,0,MAX_W-BASE_W-3);
      const width=BASE_W+3+stretch;
      const shift=Math.sign(state.velocity)*Math.min(6.5,stretch*.26);
      applyStretch(state,width,shift);
    }
    positionThumb(state);
    state.lastCenter=nextCenter;
    state.lastTime=now;
  }

  function cancelSettle(state){
    if(state.raf){cancelAnimationFrame(state.raf);state.raf=0;}
    state.thumb.classList.remove('is-settling');
  }

  function settle(state){
    cancelSettle(state);
    state.thumb.classList.add('is-settling');
    let width=state.width||BASE_W,shift=state.shift||0,last=performance.now();
    const frame=now=>{
      const dt=clamp((now-last)/1000,.001,.032);last=now;
      const k=1-Math.exp(-20*dt);
      width+=(BASE_W-width)*k;
      shift+=(0-shift)*k;
      applyStretch(state,width,shift);
      positionThumb(state);
      markChanged();
      if(Math.abs(width-BASE_W)<.07&&Math.abs(shift)<.035){
        applyStretch(state,BASE_W,0);
        state.velocity=0;state.raf=0;
        state.thumb.classList.remove('is-settling');
        markChanged();
        return;
      }
      state.raf=requestAnimationFrame(frame);
    };
    state.raf=requestAnimationFrame(frame);
  }

  function wrap(input){
    if(states.has(input)){syncOne(input,false);return;}

    const shell=document.createElement('span');
    shell.className='apple-range-v20-shell';
    const track=document.createElement('span');
    track.className='apple-range-v20-track';track.setAttribute('aria-hidden','true');
    const fill=document.createElement('span');
    fill.className='apple-range-v20-fill';fill.setAttribute('aria-hidden','true');
    input.before(shell);shell.append(track,fill,input);

    const thumb=document.createElement('span');
    thumb.className='apple-range-v20-thumb';
    thumb.dataset.config=JSON.stringify(THUMB_CONFIG);
    thumb.setAttribute('aria-hidden','true');
    controls.appendChild(thumb); // REQUIRED by LiquidGlass: direct child of root.

    const state={input,shell,thumb,active:false,lastCenter:0,lastTime:performance.now(),velocity:0,width:BASE_W,shift:0,raf:0,off:null};
    states.set(input,state);
    applyStretch(state,BASE_W,0);
    positionThumb(state);
    state.lastCenter=localCenter(state);

    const onInput=()=>{syncOne(input,true);markChanged();};
    const onDown=()=>{
      cancelSettle(state);
      state.active=true;state.velocity=0;
      state.lastCenter=localCenter(state);state.lastTime=performance.now();
      shell.classList.add('is-active');thumb.classList.add('is-active');
      applyStretch(state,34,0);positionThumb(state);markChanged();
    };
    const onUp=()=>{
      if(!state.active)return;
      state.active=false;shell.classList.remove('is-active');thumb.classList.remove('is-active');
      settle(state);
    };
    input.addEventListener('input',onInput);
    input.addEventListener('change',onInput);
    input.addEventListener('pointerdown',onDown);
    input.addEventListener('pointerup',onUp);
    input.addEventListener('pointercancel',onUp);
    input.addEventListener('blur',onUp);
    state.off=()=>{
      cancelSettle(state);
      input.removeEventListener('input',onInput);
      input.removeEventListener('change',onInput);
      input.removeEventListener('pointerdown',onDown);
      input.removeEventListener('pointerup',onUp);
      input.removeEventListener('pointercancel',onUp);
      input.removeEventListener('blur',onUp);
    };
  }

  function allInputs(){
    return controls?[...controls.querySelectorAll('.ref-control input[type="range"],.fluid-growth-input input[type="range"]')]:[];
  }

  function ensureWrapped(){
    let changed=false;
    for(const input of allInputs()){
      if(!states.has(input))changed=true;
      wrap(input);
    }
    return changed;
  }

  async function liquidModule(){
    if(!modulePromise)modulePromise=import(MODULE_URL);
    return modulePromise;
  }

  async function bootRenderer(){
    const token=++bootToken;
    try{instance?.destroy?.();}catch{}
    instance=null;
    if(!activeRoute()||!controls)return;
    if(/\b(?:Chrome|Chromium)\/150\./.test(navigator.userAgent)){
      controls.classList.remove('is-apple-slider-v20-webgl');
      return;
    }
    const thumbs=[...controls.querySelectorAll(':scope>.apple-range-v20-thumb')];
    if(!thumbs.length)return;
    for(const state of states.values())positionThumb(state);
    try{
      const {LiquidGlass}=await liquidModule();
      if(token!==bootToken||!document.contains(controls))return;
      const next=await LiquidGlass.init({root:controls,glassElements:thumbs,defaults:THUMB_CONFIG});
      if(token!==bootToken||!document.contains(controls)){
        try{next.destroy();}catch{}
        return;
      }
      instance=next;
      try{if(next.renderer?.gl)neutralContexts.add(next.renderer.gl);}catch{}
      controls.classList.add('is-apple-slider-v20-webgl');
      markChanged();
    }catch(error){
      controls?.classList.remove('is-apple-slider-v20-webgl');
      console.warn('[Apple slider v20] LiquidGlass thumb init failed; CSS fallback active',error);
    }
  }

  function scheduleRefresh(rebootIfNew=true){
    if(scheduled)return;
    scheduled=requestAnimationFrame(()=>{
      scheduled=0;
      if(!activeRoute()||!controls)return;
      const changed=ensureWrapped();
      for(const state of states.values())positionThumb(state);
      if(changed&&rebootIfNew)bootRenderer();
      else markChanged();
    });
  }

  function cleanup(){
    ++bootToken;
    if(scheduled)cancelAnimationFrame(scheduled);scheduled=0;
    observer?.disconnect();observer=null;
    controller?.abort();controller=null;
    try{instance?.destroy?.();}catch{}
    instance=null;
    if(controls)controls.classList.remove('is-apple-slider-v20-webgl','apple-slider-v20-root');
    for(const [input,state] of states){
      state.off?.();
      if(state.shell?.parentNode){state.shell.before(input);state.shell.remove();}
      state.thumb?.remove();
    }
    states.clear();controls=null;
  }

  function install(){
    if(!activeRoute()){cleanup();return;}
    const next=document.querySelector('.refraction-controls');
    if(!next){requestAnimationFrame(install);return;}
    if(next===controls){scheduleRefresh();return;}
    cleanup();
    controls=next;
    controls.classList.add('apple-slider-v20-root');
    ensureWrapped();
    controller=new AbortController();
    observer=new MutationObserver(()=>scheduleRefresh(true));
    observer.observe(controls,{childList:true,subtree:true});
    controls.addEventListener('scroll',()=>scheduleRefresh(false),{passive:true,signal:controller.signal});
    window.addEventListener('resize',()=>scheduleRefresh(false),{passive:true,signal:controller.signal});
    bootRenderer();
  }

  document.addEventListener('hj:rendered',()=>requestAnimationFrame(install));
  addEventListener('hashchange',()=>requestAnimationFrame(install));
  queueMicrotask(install);
})();
