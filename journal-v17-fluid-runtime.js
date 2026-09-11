/* Journal v17: stable single-owner drag/gravity physics + shader-native press growth. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const PREF = Object.freeze({
    refraction:1.60, blurAmount:0, chromAberration:.180, specular:0,
    fresnel:0, edgeHighlight:0, zRadius:50, cornerRadius:80,
    saturation:.02, brightness:.02
  });
  const DEFAULT_GROWTH=.075, MAX_GROWTH=.12, STORAGE_KEY='hj-fluid-press-growth', SHADER_PAD=20;
  let cleanup=null, renderEpoch=0;

  const dentState=globalThis.__HJGlassDentState=globalThis.__HJGlassDentState||{};
  Object.assign(dentState,{u:.5,v:.5,depth:0,radius:.42,axisX:1,axisY:1,shapeX:1,shapeY:1});

  const language=()=>{const l=document.documentElement.lang||'ko';return l.startsWith('ja')?'ja':l.startsWith('en')?'en':'ko';};
  const GROWTH_COPY={
    ko:['눌림 팽창','누를 때 유리 표면이 실제로 부풀어 오르는 정도'],
    en:['Press growth','How much the glass surface physically expands while pressed'],
    ja:['押し込み膨張','押している間にガラス表面が実際に膨らむ量']
  };

  function loadGrowth(){try{const raw=localStorage.getItem(STORAGE_KEY);if(raw!==null){const n=Number(raw);if(Number.isFinite(n))return clamp(n,0,MAX_GROWTH);}}catch{}return DEFAULT_GROWTH;}
  function saveGrowth(v){try{localStorage.setItem(STORAGE_KEY,String(v));}catch{}}
  function parseConfig(glass){try{return JSON.parse(glass.dataset.config||'{}')||{};}catch{return {};}}
  function setConfig(glass,patch){const next={...parseConfig(glass),...patch,floating:false};const encoded=JSON.stringify(next);if(glass.dataset.config!==encoded)glass.dataset.config=encoded;}
  function invalidate(glass){glass.dataset.config=JSON.stringify({...parseConfig(glass),floating:false,__hjRenderEpoch:++renderEpoch});}
  function applyPreferredDefaults(glass){let changed=false;for(const [id,value] of Object.entries(PREF)){const input=document.querySelector(`#ref-${id}`);if(input&&input.value!==String(value)){input.value=String(value);changed=true;}}setConfig(glass,PREF);if(changed)document.querySelector('#ref-refraction')?.dispatchEvent(new Event('input',{bubbles:true}));setConfig(glass,PREF);}

  function setDentFromPointer(glass,body,e){
    const rect=glass.getBoundingClientRect();
    const u=clamp((e.clientX-rect.left)/Math.max(1,rect.width),0,1),v=clamp((e.clientY-rect.top)/Math.max(1,rect.height),0,1);
    const edgeX=clamp(Math.min(u,1-u)*2,0,1),edgeY=clamp(Math.min(v,1-v)*2,0,1),support=Math.sqrt(edgeX*edgeY);
    const pen=e.pointerType==='pen'&&e.pressure>0?clamp(e.pressure*1.15,.28,1.08):1;
    body.dentTarget=pen*(.76+.24*support);body.dentU=u;body.dentVPos=v;body.dentRadius=.34+.12*support;
    body.axisX=.62+.38*edgeX;body.axisY=.62+.38*edgeY;body.locationSupport=support;
  }

  function snapPx(v){const dpr=Math.max(1,Number(devicePixelRatio)||1),step=1/dpr;return Math.round(v/step)*step;}
  function measureBase(glass,body){const root=glass.closest('.refraction-root');if(!root)return null;const rr=root.getBoundingClientRect(),gr=glass.getBoundingClientRect(),w=glass.offsetWidth,h=glass.offsetHeight;const visualLeft=gr.left+(gr.width-w)/2,visualTop=gr.top+(gr.height-h)/2;const rx=Number.isFinite(body.renderX)?body.renderX:body.x,ry=Number.isFinite(body.renderY)?body.renderY:body.y;body.baseLeft=visualLeft-rr.left-rx;body.baseTop=visualTop-rr.top-ry;return root;}
  function limits(glass,body){const root=glass.closest('.refraction-root');if(!root)return null;const rr=root.getBoundingClientRect(),margin=10,minX=margin-body.baseLeft,minY=margin-body.baseTop;return{minX,maxX:Math.max(minX,rr.width-margin-glass.offsetWidth-body.baseLeft),minY,maxY:Math.max(minY,rr.height-margin-glass.offsetHeight-body.baseTop)};}
  function clampPosition(glass,body,bounce=false){const b=limits(glass,body);if(!b)return;if(body.x<b.minX){body.x=b.minX;body.vx=bounce&&body.vx<0?-body.vx*.24:Math.max(0,body.vx);}if(body.x>b.maxX){body.x=b.maxX;body.vx=bounce&&body.vx>0?-body.vx*.24:Math.min(0,body.vx);}if(body.y<b.minY){body.y=b.minY;body.vy=bounce&&body.vy<0?-body.vy*.18:Math.max(0,body.vy);}if(body.y>b.maxY){const impact=Math.max(0,body.vy);body.y=b.maxY;if(bounce&&impact>90){body.vy=-impact*.19;body.vx+=clamp((Math.random()-.5)*impact*.035,-34,34);body.impact=Math.min(1,impact/950);}else body.vy=0;body.grounded=Math.abs(body.vy)<8;}else body.grounded=false;}

  function shapeScale(glass,body){if(reduce.matches)return[1,1];const grow=clamp(body.visualGrowth,0,MAX_GROWTH),impact=clamp(body.impact,0,1);let sx=1+grow+impact*.032,sy=1+grow*.88-impact*.024;const halfW=Math.max(1,glass.offsetWidth*.5),halfH=Math.max(1,glass.offsetHeight*.5);const safeX=1+Math.max(0,(SHADER_PAD-1.5)/halfW),safeY=1+Math.max(0,(SHADER_PAD-1.5)/halfH);sx=Math.min(sx,safeX);sy=Math.min(sy,safeY);return[clamp(sx,.88,1.18),clamp(sy,.88,1.18)];}

  function render(glass,body){
    body.renderX=snapPx(body.x);body.renderY=snapPx(body.y);
    glass.style.transform=`translate3d(${body.renderX.toFixed(3)}px,${body.renderY.toFixed(3)}px,0)`;
    glass.style.removeProperty('scale');
    const [shapeX,shapeY]=shapeScale(glass,body);
    dentState.u=body.dentU;dentState.v=body.dentVPos;dentState.depth=clamp(body.dent,0,1.15);dentState.radius=body.dentRadius;
    dentState.axisX=body.axisX;dentState.axisY=body.axisY;dentState.shapeX=shapeX;dentState.shapeY=shapeY;
    invalidate(glass);
  }

  function tick(glass,body,now){
    body.raf=0;if(!document.contains(glass))return;
    const dt=body.lastFrame?clamp((now-body.lastFrame)/1000,.001,.032):1/60;body.lastFrame=now;

    // No under-damped spring while held: eliminates the slow-drag breathing/jitter.
    const dTarget=body.pointer?body.dentTarget:0,dRate=body.pointer?27:18;
    body.dent+=(dTarget-body.dent)*(1-Math.exp(-dRate*dt));if(Math.abs(dTarget-body.dent)<.0008)body.dent=dTarget;
    const support=clamp(body.locationSupport,0,1),locationWeight=.72+.28*support,gTarget=body.pointer?body.pressGrowthSetting*locationWeight:0,gRate=body.pointer?20:15;
    body.visualGrowth+=(gTarget-body.visualGrowth)*(1-Math.exp(-gRate*dt));if(Math.abs(gTarget-body.visualGrowth)<.00015)body.visualGrowth=gTarget;
    if(body.impact>.0005)body.impact*=Math.exp(-9.5*dt);else body.impact=0;

    if(!body.pointer){
      if(body.shakeUntil>now){const t=(body.shakeUntil-now)/680,env=clamp(t,0,1),phase=(1-env)*Math.PI*9;body.vx+=Math.sin(phase+body.shakeSeed)*1320*env*dt;body.vy+=Math.cos(phase*1.14+body.shakeSeed*.7)*610*env*dt;}
      if(body.gravity){body.vy+=1550*dt;body.vx*=Math.exp(-1.9*dt);body.x+=body.vx*dt;body.y+=body.vy*dt;clampPosition(glass,body,true);}
      else if(body.shakeUntil>now){body.vx+=(body.anchorX-body.x)*40*dt;body.vy+=(body.anchorY-body.y)*40*dt;body.vx*=Math.exp(-6.2*dt);body.vy*=Math.exp(-6.2*dt);body.x+=body.vx*dt;body.y+=body.vy*dt;clampPosition(glass,body,true);}
      else{body.vx*=Math.exp(-12*dt);body.vy*=Math.exp(-12*dt);if(Math.abs(body.vx)>1||Math.abs(body.vy)>1){body.x+=body.vx*dt;body.y+=body.vy*dt;clampPosition(glass,body,false);}}
    }

    render(glass,body);
    const visualMoving=Math.abs(body.dent-dTarget)>.001||Math.abs(body.visualGrowth-gTarget)>.0002;
    const physicalMoving=body.shakeUntil>now||body.impact>.001||Math.abs(body.vx)>1||Math.abs(body.vy)>1||(body.gravity&&!body.grounded);
    if(visualMoving||physicalMoving)body.raf=requestAnimationFrame(t=>tick(glass,body,t));
    else{body.lastFrame=0;if(!body.pointer){body.dent=0;body.visualGrowth=0;}if(!body.gravity)body.vx=body.vy=0;body.impact=0;render(glass,body);}
  }
  function start(glass,body){if(!reduce.matches&&!body.raf){body.lastFrame=0;body.raf=requestAnimationFrame(t=>tick(glass,body,t));}}

  function syncGrowthControl(api){
    const panel=document.querySelector('.fluid-physics-panel');if(!panel)return false;
    let control=panel.querySelector('[data-fluid-press-growth]');const [title,desc]=GROWTH_COPY[language()];
    if(!control){control=document.createElement('label');control.className='fluid-growth-control';control.dataset.fluidPressGrowth='';control.innerHTML='<span class="fluid-growth-copy"><b></b><small></small></span><span class="fluid-growth-input"><input type="range" min="0" max="12" step="0.5"><output></output></span>';const status=panel.querySelector('[data-fluid-status]');(status?.parentElement||panel).insertBefore(control,status||null);control.querySelector('input').addEventListener('input',e=>api.setPressGrowth(Number(e.currentTarget.value)/100));}
    const input=control.querySelector('input'),output=control.querySelector('output'),value=api.getPressGrowth();if(input&&document.activeElement!==input)input.value=String(Math.round(value*200)/2);if(input)input.setAttribute('aria-label',title);if(output)output.textContent=`${(value*100).toFixed(value*100%1?1:0)}%`;const b=control.querySelector('b'),small=control.querySelector('small');if(b)b.textContent=title;if(small)small.textContent=desc;return true;
  }

  function install(glass){
    if(glass.dataset.fluidV17Ready)return;glass.dataset.fluidV17Ready='1';glass.dataset.jellyReady='1';glass.dataset.fluidPhysicsReady='1';glass.dataset.fluidV14Ready='1';glass.classList.add('fluid-v17-enabled');glass.style.touchAction='none';glass.style.transformOrigin='50% 50%';glass.style.removeProperty('scale');setConfig(glass,{floating:false});queueMicrotask(()=>applyPreferredDefaults(glass));
    const controller=new AbortController();
    const body={x:0,y:0,renderX:0,renderY:0,vx:0,vy:0,baseLeft:0,baseTop:0,pointer:false,pointerId:null,lastX:0,lastY:0,lastMoveTime:0,gravity:false,grounded:false,impact:0,shakeUntil:0,shakeSeed:0,anchorX:0,anchorY:0,raf:0,lastFrame:0,dent:0,dentTarget:0,dentU:.5,dentVPos:.5,dentRadius:.42,axisX:1,axisY:1,locationSupport:1,pressGrowthSetting:loadGrowth(),visualGrowth:0,motion:false,motionInstalled:false};
    glass.__fluidPhysics=body;requestAnimationFrame(()=>measureBase(glass,body));
    let configGuard=false;const configObserver=new MutationObserver(()=>{if(configGuard)return;const cfg=parseConfig(glass);if(cfg.floating!==false){configGuard=true;setConfig(glass,{floating:false});queueMicrotask(()=>configGuard=false);}});configObserver.observe(glass,{attributes:true,attributeFilter:['data-config']});

    const down=e=>{if(e.button!==undefined&&e.button!==0)return;setConfig(glass,{floating:false});measureBase(glass,body);body.pointer=true;body.pointerId=e.pointerId;body.lastX=e.clientX;body.lastY=e.clientY;body.lastMoveTime=performance.now();body.vx=body.vy=0;body.grounded=false;body.anchorX=body.x;body.anchorY=body.y;setDentFromPointer(glass,body,e);start(glass,body);glass.classList.add('is-fluid-pressed');try{glass.setPointerCapture(e.pointerId);}catch{}e.preventDefault();};
    const move=e=>{if(!body.pointer||e.pointerId!==body.pointerId)return;const now=performance.now(),dt=Math.max(8,now-body.lastMoveTime)/1000,dx=e.clientX-body.lastX,dy=e.clientY-body.lastY;body.x+=dx;body.y+=dy;clampPosition(glass,body,false);const rvx=dx/dt,rvy=dy/dt;body.vx=body.vx*.68+rvx*.32;body.vy=body.vy*.68+rvy*.32;body.lastX=e.clientX;body.lastY=e.clientY;body.lastMoveTime=now;setDentFromPointer(glass,body,e);render(glass,body);start(glass,body);e.preventDefault();};
    const up=e=>{if(!body.pointer||(e?.pointerId!==undefined&&e.pointerId!==body.pointerId))return;body.pointer=false;body.pointerId=null;body.dentTarget=0;glass.classList.remove('is-fluid-pressed');body.vx=clamp(body.vx,-1200,1200);body.vy=clamp(body.vy,-1200,1200);if(!body.gravity){body.vx*=.14;body.vy*=.14;}start(glass,body);};
    glass.addEventListener('pointerdown',down,{signal:controller.signal});window.addEventListener('pointermove',move,{passive:false,signal:controller.signal});window.addEventListener('pointerup',up,{passive:true,signal:controller.signal});window.addEventListener('pointercancel',up,{passive:true,signal:controller.signal});window.addEventListener('resize',()=>measureBase(glass,body),{passive:true,signal:controller.signal});

    const api={state:body,getPressGrowth(){return body.pressGrowthSetting;},setPressGrowth(value){body.pressGrowthSetting=clamp(Number(value)||0,0,MAX_GROWTH);saveGrowth(body.pressGrowthSetting);syncGrowthControl(api);start(glass,body);return body.pressGrowthSetting;},toggleGravity(){measureBase(glass,body);body.gravity=!body.gravity;body.grounded=false;body.anchorX=body.x;body.anchorY=body.y;if(body.gravity)body.vy=Math.max(body.vy,35);else body.vy=0;start(glass,body);return body.gravity;},shake(){body.anchorX=body.x;body.anchorY=body.y;body.shakeUntil=performance.now()+680;body.shakeSeed=Math.random()*Math.PI*2;body.vx+=clamp((Math.random()-.5)*150,-75,75);body.vy-=45+Math.random()*35;body.grounded=false;start(glass,body);return true;},reset(){if(body.raf)cancelAnimationFrame(body.raf);body.raf=0;body.lastFrame=0;body.x=body.y=body.renderX=body.renderY=body.vx=body.vy=0;body.gravity=false;body.grounded=false;body.impact=0;body.shakeUntil=0;body.dent=body.dentTarget=0;body.dentU=body.dentVPos=.5;body.dentRadius=.42;body.axisX=body.axisY=1;body.locationSupport=1;body.visualGrowth=0;body.pressGrowthSetting=DEFAULT_GROWTH;saveGrowth(DEFAULT_GROWTH);glass.classList.remove('is-fluid-pressed');glass.style.removeProperty('scale');render(glass,body);syncGrowthControl(api);requestAnimationFrame(()=>measureBase(glass,body));},async toggleMotion(){if(!('DeviceMotionEvent'in window))return false;if(body.motion){body.motion=false;return false;}if(typeof DeviceMotionEvent.requestPermission==='function'&&await DeviceMotionEvent.requestPermission()!=='granted')throw new Error('denied');body.motion=true;if(!body.motionInstalled){body.motionInstalled=true;let last=0;const grav={x:0,y:0,z:0};window.addEventListener('devicemotion',e=>{if(!body.motion)return;const now=performance.now();if(now-last<40)return;last=now;let a=e.acceleration,ax=Number(a?.x),ay=Number(a?.y),az=Number(a?.z),q=e.accelerationIncludingGravity;if(![ax,ay,az].every(Number.isFinite)&&q){grav.x=grav.x*.9+(Number(q.x)||0)*.1;grav.y=grav.y*.9+(Number(q.y)||0)*.1;grav.z=grav.z*.9+(Number(q.z)||0)*.1;ax=(Number(q.x)||0)-grav.x;ay=(Number(q.y)||0)-grav.y;az=(Number(q.z)||0)-grav.z;}if(![ax,ay,az].every(Number.isFinite))return;const mag=Math.hypot(ax,ay,az);if(mag<1.6)return;const k=clamp((mag-1.6)/7,0,1);body.vx+=clamp(ax*15,-125,125)*k;body.vy+=clamp(-ay*11,-105,105)*k;body.grounded=false;start(glass,body);},{passive:true,signal:controller.signal});}return true;}};
    globalThis.HJFluidLab=api;
    let uiRaf=0;const syncUi=()=>{uiRaf=0;if(!document.contains(glass))return;syncGrowthControl(api);if(!document.querySelector('.fluid-physics-panel'))uiRaf=requestAnimationFrame(syncUi);};uiRaf=requestAnimationFrame(syncUi);
    cleanup=()=>{controller.abort();configObserver.disconnect();if(body.raf)cancelAnimationFrame(body.raf);if(uiRaf)cancelAnimationFrame(uiRaf);glass.style.removeProperty('scale');dentState.depth=0;dentState.shapeX=dentState.shapeY=1;if(globalThis.HJFluidLab===api)delete globalThis.HJFluidLab;};
  }

  function sync(){if(!location.hash.startsWith('#/lab')||location.hash.startsWith('#/lab/vision')){cleanup?.();cleanup=null;return;}const glass=document.querySelector('#realLiquidGlass');if(glass&&!glass.dataset.fluidV17Ready){cleanup?.();cleanup=null;install(glass);}}
  reduce.addEventListener?.('change',()=>{const g=document.querySelector('#realLiquidGlass'),b=g?.__fluidPhysics;if(g&&b){b.visualGrowth=0;start(g,b);}});
  document.addEventListener('hj:rendered',()=>requestAnimationFrame(sync));addEventListener('hashchange',()=>requestAnimationFrame(sync));queueMicrotask(sync);
})();
