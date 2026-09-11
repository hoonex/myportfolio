/* Journal v18: shared LiquidGlass renderer for Glass Lab range rails. */
(() => {
  const MODULE_URL='https://cdn.jsdelivr.net/npm/@ybouane/liquidglass@1.0.3/dist/index.js';
  const CONFIG={
    floating:false,button:false,bevelMode:0,
    refraction:.52,blurAmount:.025,chromAberration:.018,specular:.28,
    fresnel:.52,edgeHighlight:.10,zRadius:4,cornerRadius:6,
    saturation:.04,brightness:.015
  };
  let instance=null,controls=null,observer=null,controller=null,bootToken=0,scheduled=0;
  let modulePromise=null;
  const handlers=new Map();
  const neutralContexts=globalThis.__HJLiquidGlassNeutralContexts=
    globalThis.__HJLiquidGlassNeutralContexts||new WeakSet();

  // v17 patches every LiquidGlass fragment shader globally. Slider rails use the same
  // renderer, so neutralize the main-glass dent/growth uniforms only for their contexts.
  const glProto=globalThis.WebGLRenderingContext?.prototype;
  if(glProto&&!glProto.__hjLiquidRangeNeutralPatch){
    const previousDraw=glProto.drawArrays;
    Object.defineProperty(glProto,'__hjLiquidRangeNeutralPatch',{value:true});
    glProto.drawArrays=function(...args){
      if(!neutralContexts.has(this))return previousDraw.apply(this,args);
      const state=globalThis.__HJGlassDentState;
      if(!state)return previousDraw.apply(this,args);
      const saved={u:state.u,v:state.v,depth:state.depth,radius:state.radius,axisX:state.axisX,axisY:state.axisY,shapeX:state.shapeX,shapeY:state.shapeY};
      Object.assign(state,{u:.5,v:.5,depth:0,radius:.42,axisX:1,axisY:1,shapeX:1,shapeY:1});
      try{return previousDraw.apply(this,args);}
      finally{Object.assign(state,saved);}
    };
  }

  const active=()=>location.hash.startsWith('#/lab')&&!location.hash.startsWith('#/lab/vision');

  function percent(input){
    const min=Number(input.min||0),max=Number(input.max||100),value=Number(input.value||0);
    return max===min?0:Math.max(0,Math.min(1,(value-min)/(max-min)));
  }

  function syncOne(input){
    const shell=input.closest('.liquid-range-shell');
    if(!shell)return;
    const p=percent(input);
    shell.style.setProperty('--range-p',`${(p*100).toFixed(3)}%`);
    shell.style.setProperty('--range-n',p.toFixed(5));
  }

  function wrap(input){
    if(input.closest('.liquid-range-shell')){syncOne(input);return;}
    const shell=document.createElement('span');
    shell.className='liquid-range-shell';
    const rail=document.createElement('span');
    rail.className='liquid-range-glass';
    rail.dataset.config=JSON.stringify(CONFIG);
    rail.setAttribute('aria-hidden','true');
    const progress=document.createElement('span');
    progress.className='liquid-range-progress';
    progress.setAttribute('aria-hidden','true');
    input.before(shell);
    shell.append(rail,progress,input);
    syncOne(input);

    const onInput=()=>{syncOne(input);try{instance?.markChanged();}catch{}};
    const onDown=()=>shell.classList.add('is-active');
    const onUp=()=>shell.classList.remove('is-active');
    input.addEventListener('input',onInput);
    input.addEventListener('change',onInput);
    input.addEventListener('pointerdown',onDown);
    input.addEventListener('pointerup',onUp);
    input.addEventListener('pointercancel',onUp);
    input.addEventListener('blur',onUp);
    handlers.set(input,()=>{
      input.removeEventListener('input',onInput);
      input.removeEventListener('change',onInput);
      input.removeEventListener('pointerdown',onDown);
      input.removeEventListener('pointerup',onUp);
      input.removeEventListener('pointercancel',onUp);
      input.removeEventListener('blur',onUp);
    });
  }

  function allInputs(){
    if(!controls)return[];
    return [...controls.querySelectorAll('.ref-control input[type="range"], .fluid-growth-input input[type="range"]')];
  }

  function ensureWrapped(){
    let changed=false;
    for(const input of allInputs()){
      if(!input.closest('.liquid-range-shell'))changed=true;
      wrap(input);
    }
    return changed;
  }

  async function liquidModule(){
    if(!modulePromise)modulePromise=import(MODULE_URL);
    return modulePromise;
  }

  function registerNeutralContexts(rails){
    for(const rail of rails){
      for(const canvas of rail.querySelectorAll('canvas')){
        try{
          const gl=canvas.getContext('webgl')||canvas.getContext('experimental-webgl');
          if(gl)neutralContexts.add(gl);
        }catch{}
      }
    }
  }

  async function bootRenderer(){
    const token=++bootToken;
    try{instance?.destroy?.();}catch{}
    instance=null;
    if(!active()||!controls)return;
    if(/\b(?:Chrome|Chromium)\/150\./.test(navigator.userAgent)){
      controls.classList.remove('is-liquid-range-webgl');
      return;
    }
    const rails=[...controls.querySelectorAll('.liquid-range-glass')];
    if(!rails.length)return;
    try{
      const {LiquidGlass}=await liquidModule();
      if(token!==bootToken||!document.contains(controls))return;
      const next=await LiquidGlass.init({
        root:controls,
        glassElements:rails,
        defaults:CONFIG
      });
      if(token!==bootToken||!document.contains(controls)){
        try{next.destroy();}catch{}
        return;
      }
      instance=next;
      registerNeutralContexts(rails);
      controls.classList.add('is-liquid-range-webgl');
      try{instance.markChanged();}catch{}
    }catch(error){
      controls?.classList.remove('is-liquid-range-webgl');
      console.warn('[Liquid range] WebGL rail init failed; CSS fallback active',error);
    }
  }

  function scheduleRefresh(){
    if(scheduled)return;
    scheduled=requestAnimationFrame(()=>{
      scheduled=0;
      if(!active()||!controls)return;
      const changed=ensureWrapped();
      if(changed)bootRenderer();
      else try{instance?.markChanged();}catch{}
    });
  }

  function cleanup(){
    ++bootToken;
    if(scheduled)cancelAnimationFrame(scheduled);
    scheduled=0;
    observer?.disconnect();observer=null;
    controller?.abort();controller=null;
    try{instance?.destroy?.();}catch{}
    instance=null;
    if(controls)controls.classList.remove('is-liquid-range-webgl');
    for(const [input,off] of handlers){
      off();
      const shell=input.closest('.liquid-range-shell');
      if(shell&&shell.parentNode){shell.before(input);shell.remove();}
    }
    handlers.clear();controls=null;
  }

  function install(){
    if(!active()){cleanup();return;}
    const next=document.querySelector('.refraction-controls');
    if(!next){requestAnimationFrame(install);return;}
    if(next===controls){scheduleRefresh();return;}
    cleanup();controls=next;controls.classList.add('liquid-range-root');
    ensureWrapped();
    controller=new AbortController();
    observer=new MutationObserver(scheduleRefresh);
    observer.observe(controls,{childList:true,subtree:true});
    controls.addEventListener('scroll',scheduleRefresh,{passive:true,signal:controller.signal});
    window.addEventListener('resize',scheduleRefresh,{passive:true,signal:controller.signal});
    bootRenderer();
  }

  document.addEventListener('hj:rendered',()=>requestAnimationFrame(install));
  addEventListener('hashchange',()=>requestAnimationFrame(install));
  queueMicrotask(install);
})();
