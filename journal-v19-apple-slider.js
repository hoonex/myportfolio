/* Journal v19: Apple-style iOS 26 Liquid Glass sliders — thin track, capsule thumb, directional stretch. */
(() => {
  const MODULE_URL='https://cdn.jsdelivr.net/npm/@ybouane/liquidglass@1.0.3/dist/index.js';
  const THUMB_CONFIG={
    floating:false,button:false,bevelMode:0,
    refraction:1.08,blurAmount:.018,chromAberration:.032,specular:.42,
    fresnel:.78,edgeHighlight:.13,zRadius:10,cornerRadius:11,
    saturation:.05,brightness:.025
  };
  const BASE_W=30,BASE_H=19,MAX_W=50;
  let instance=null,controls=null,observer=null,controller=null,modulePromise=null;
  let bootToken=0,scheduled=0;
  const states=new Map();
  const neutralContexts=globalThis.__HJLiquidGlassNeutralContexts=
    globalThis.__HJLiquidGlassNeutralContexts||new WeakSet();

  // v17 patches every LiquidGlass shader. Slider thumbs must stay independent from the
  // main jelly's dent/growth state, so neutralize those uniforms only for thumb contexts.
  const glProto=globalThis.WebGLRenderingContext?.prototype;
  if(glProto&&!glProto.__hjAppleSliderNeutralPatch){
    const previousDraw=glProto.drawArrays;
    Object.defineProperty(glProto,'__hjAppleSliderNeutralPatch',{value:true});
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
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  function percent(input){
    const min=Number(input.min||0),max=Number(input.max||100),value=Number(input.value||0);
    return max===min?0:clamp((value-min)/(max-min),0,1);
  }

  function markChanged(){try{instance?.markChanged();}catch{}}

  function applyVisual(state,width=BASE_W,shift=0){
    const shell=state.shell;
    shell.style.setProperty('--apple-thumb-w',`${clamp(width,BASE_W,MAX_W).toFixed(2)}px`);
    shell.style.setProperty('--apple-thumb-shift',`${clamp(shift,-7,7).toFixed(2)}px`);
  }

  function syncOne(input,trackVelocity=false){
    const state=states.get(input);if(!state)return;
    const p=percent(input),now=performance.now();
    state.shell.style.setProperty('--range-p',`${(p*100).toFixed(3)}%`);
    if(trackVelocity&&state.active){
      const dt=Math.max(8,now-state.lastTime)/1000;
      const travel=Math.max(1,state.shell.clientWidth-BASE_W);
      const instant=((p-state.lastP)*travel)/dt;
      state.velocity=state.velocity*.52+instant*.48;
      const stretch=Math.min(MAX_W-BASE_W,Math.abs(state.velocity)*.018);
      const width=BASE_W+4+stretch;
      const shift=Math.sign(state.velocity)*Math.min(7,(width-BASE_W)*.28);
      applyVisual(state,width,shift);
    }
    state.lastP=p;state.lastTime=now;
  }

  function cancelSettle(state){if(state.raf){cancelAnimationFrame(state.raf);state.raf=0;}state.shell.classList.remove('is-settling');}

  function settle(state){
    cancelSettle(state);
    state.shell.classList.add('is-settling');
    let width=parseFloat(getComputedStyle(state.shell).getPropertyValue('--apple-thumb-w'))||BASE_W;
    let shift=parseFloat(getComputedStyle(state.shell).getPropertyValue('--apple-thumb-shift'))||0;
    let last=performance.now();
    const frame=now=>{
      const dt=clamp((now-last)/1000,.001,.032);last=now;
      const k=1-Math.exp(-18*dt);
      width+=(BASE_W-width)*k;shift+=(0-shift)*k;
      applyVisual(state,width,shift);markChanged();
      if(Math.abs(width-BASE_W)<.08&&Math.abs(shift)<.04){
        applyVisual(state,BASE_W,0);state.velocity=0;state.raf=0;
        state.shell.classList.remove('is-settling');markChanged();return;
      }
      state.raf=requestAnimationFrame(frame);
    };
    state.raf=requestAnimationFrame(frame);
  }

  function wrap(input){
    if(states.has(input)){syncOne(input,false);return;}
    const shell=document.createElement('span');shell.className='apple-range-shell';
    const track=document.createElement('span');track.className='apple-range-track';track.setAttribute('aria-hidden','true');
    const fill=document.createElement('span');fill.className='apple-range-fill';fill.setAttribute('aria-hidden','true');
    const thumb=document.createElement('span');thumb.className='apple-range-thumb-glass';thumb.dataset.config=JSON.stringify(THUMB_CONFIG);thumb.setAttribute('aria-hidden','true');
    input.before(shell);shell.append(track,fill,thumb,input);
    const state={input,shell,thumb,active:false,lastP:percent(input),lastTime:performance.now(),velocity:0,raf:0};
    states.set(input,state);applyVisual(state);syncOne(input,false);

    const onInput=()=>{syncOne(input,true);markChanged();};
    const onDown=()=>{
      cancelSettle(state);state.active=true;state.velocity=0;state.lastP=percent(input);state.lastTime=performance.now();
      shell.classList.add('is-active');applyVisual(state,34,0);markChanged();
    };
    const onUp=()=>{
      if(!state.active)return;state.active=false;shell.classList.remove('is-active');settle(state);
    };
    input.addEventListener('input',onInput);input.addEventListener('change',onInput);
    input.addEventListener('pointerdown',onDown);input.addEventListener('pointerup',onUp);input.addEventListener('pointercancel',onUp);input.addEventListener('blur',onUp);
    state.off=()=>{
      cancelSettle(state);
      input.removeEventListener('input',onInput);input.removeEventListener('change',onInput);
      input.removeEventListener('pointerdown',onDown);input.removeEventListener('pointerup',onUp);input.removeEventListener('pointercancel',onUp);input.removeEventListener('blur',onUp);
    };
  }

  function allInputs(){return controls?[...controls.querySelectorAll('.ref-control input[type="range"], .fluid-growth-input input[type="range"]')]:[];}
  function ensureWrapped(){let changed=false;for(const input of allInputs()){if(!states.has(input))changed=true;wrap(input);}return changed;}
  async function liquidModule(){if(!modulePromise)modulePromise=import(MODULE_URL);return modulePromise;}

  function registerNeutralContexts(thumbs){
    for(const thumb of thumbs)for(const canvas of thumb.querySelectorAll('canvas')){
      try{const gl=canvas.getContext('webgl')||canvas.getContext('experimental-webgl');if(gl)neutralContexts.add(gl);}catch{}
    }
  }

  async function bootRenderer(){
    const token=++bootToken;try{instance?.destroy?.();}catch{}instance=null;
    if(!active()||!controls)return;
    if(/\b(?:Chrome|Chromium)\/150\./.test(navigator.userAgent)){controls.classList.remove('is-apple-slider-webgl');return;}
    const thumbs=[...controls.querySelectorAll('.apple-range-thumb-glass')];if(!thumbs.length)return;
    try{
      const {LiquidGlass}=await liquidModule();if(token!==bootToken||!document.contains(controls))return;
      const next=await LiquidGlass.init({root:controls,glassElements:thumbs,defaults:THUMB_CONFIG});
      if(token!==bootToken||!document.contains(controls)){try{next.destroy();}catch{}return;}
      instance=next;registerNeutralContexts(thumbs);controls.classList.add('is-apple-slider-webgl');markChanged();
    }catch(error){controls?.classList.remove('is-apple-slider-webgl');console.warn('[Apple slider] Liquid Glass thumb init failed; CSS fallback active',error);}
  }

  function scheduleRefresh(){
    if(scheduled)return;scheduled=requestAnimationFrame(()=>{
      scheduled=0;if(!active()||!controls)return;
      const changed=ensureWrapped();for(const input of allInputs())syncOne(input,false);
      if(changed)bootRenderer();else markChanged();
    });
  }

  function cleanup(){
    ++bootToken;if(scheduled)cancelAnimationFrame(scheduled);scheduled=0;observer?.disconnect();observer=null;controller?.abort();controller=null;
    try{instance?.destroy?.();}catch{}instance=null;
    if(controls){controls.classList.remove('is-apple-slider-webgl','apple-slider-root');}
    for(const [input,state] of states){state.off?.();const shell=state.shell;if(shell?.parentNode){shell.before(input);shell.remove();}}
    states.clear();controls=null;
  }

  function install(){
    if(!active()){cleanup();return;}
    const next=document.querySelector('.refraction-controls');if(!next){requestAnimationFrame(install);return;}
    if(next===controls){scheduleRefresh();return;}
    cleanup();controls=next;controls.classList.add('apple-slider-root');ensureWrapped();
    controller=new AbortController();observer=new MutationObserver(scheduleRefresh);observer.observe(controls,{childList:true,subtree:true});
    controls.addEventListener('scroll',scheduleRefresh,{passive:true,signal:controller.signal});
    window.addEventListener('resize',scheduleRefresh,{passive:true,signal:controller.signal});bootRenderer();
  }

  document.addEventListener('hj:rendered',()=>requestAnimationFrame(install));
  addEventListener('hashchange',()=>requestAnimationFrame(install));
  queueMicrotask(install);
})();
