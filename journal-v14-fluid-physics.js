/* Journal v14: single-owner drag/gravity/shake physics + shader press state for Glass Lab. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const PREF = Object.freeze({
    refraction:1.60, blurAmount:0, chromAberration:.180, specular:0,
    fresnel:0, edgeHighlight:0, zRadius:50, cornerRadius:80,
    saturation:.02, brightness:.02
  });
  let cleanup = null;

  const dentState = globalThis.__HJGlassDentState = globalThis.__HJGlassDentState || {
    u:.5,v:.5,depth:0,radius:.42,axisX:1,axisY:1
  };

  function parseConfig(glass) {
    try { return JSON.parse(glass.dataset.config || '{}') || {}; }
    catch { return {}; }
  }

  function setConfig(glass, patch) {
    const next = { ...parseConfig(glass), ...patch, floating:false };
    const encoded = JSON.stringify(next);
    if (glass.dataset.config !== encoded) glass.dataset.config = encoded;
  }

  function applyPreferredDefaults(glass) {
    let changed = false;
    for (const [id,value] of Object.entries(PREF)) {
      const input = document.querySelector(`#ref-${id}`);
      if (input && input.value !== String(value)) { input.value = String(value); changed = true; }
    }
    setConfig(glass, PREF);
    if (changed) document.querySelector('#ref-refraction')?.dispatchEvent(new Event('input',{bubbles:true}));
    setConfig(glass, PREF);
  }

  function setDentFromPointer(glass, body, e) {
    const rect = glass.getBoundingClientRect();
    const u = clamp((e.clientX-rect.left)/Math.max(1,rect.width),0,1);
    const v = clamp((e.clientY-rect.top)/Math.max(1,rect.height),0,1);
    const edgeX = clamp(Math.min(u,1-u)*2,0,1);
    const edgeY = clamp(Math.min(v,1-v)*2,0,1);
    const support = Math.sqrt(edgeX*edgeY);
    const pen = e.pointerType === 'pen' && e.pressure > 0 ? clamp(e.pressure*1.15,.28,1.08) : 1;
    body.dentTarget = pen * (.76 + .24*support);
    body.dentU = u; body.dentVPos = v;
    body.dentRadius = .34 + .12*support;
    body.axisX = .62 + .38*edgeX;
    body.axisY = .62 + .38*edgeY;
  }

  function measureBase(glass, body) {
    const root = glass.closest('.refraction-root');
    if (!root) return null;
    const rr = root.getBoundingClientRect();
    const gr = glass.getBoundingClientRect();
    const w = glass.offsetWidth, h = glass.offsetHeight;
    const visualLeft = gr.left + (gr.width-w)/2;
    const visualTop = gr.top + (gr.height-h)/2;
    body.baseLeft = visualLeft - rr.left - body.x;
    body.baseTop = visualTop - rr.top - body.y;
    return root;
  }

  function limits(glass, body) {
    const root = glass.closest('.refraction-root');
    if (!root) return null;
    const rr = root.getBoundingClientRect();
    const margin = 10;
    const minX=margin-body.baseLeft, minY=margin-body.baseTop;
    return {
      minX, maxX:Math.max(minX,rr.width-margin-glass.offsetWidth-body.baseLeft),
      minY, maxY:Math.max(minY,rr.height-margin-glass.offsetHeight-body.baseTop)
    };
  }

  function clampPosition(glass,body,bounce=false) {
    const b=limits(glass,body); if(!b) return;
    if(body.x<b.minX){body.x=b.minX;if(bounce&&body.vx<0)body.vx=-body.vx*.26;else body.vx=Math.max(0,body.vx);}
    if(body.x>b.maxX){body.x=b.maxX;if(bounce&&body.vx>0)body.vx=-body.vx*.26;else body.vx=Math.min(0,body.vx);}
    if(body.y<b.minY){body.y=b.minY;if(bounce&&body.vy<0)body.vy=-body.vy*.20;else body.vy=Math.max(0,body.vy);}
    if(body.y>b.maxY){
      const impact=Math.max(0,body.vy); body.y=b.maxY;
      if(bounce&&impact>85){body.vy=-impact*.22;body.vx+=clamp((Math.random()-.5)*impact*.045,-42,42);body.impact=Math.min(1,impact/900);}
      else body.vy=0;
      body.grounded=Math.abs(body.vy)<8;
    } else body.grounded=false;
  }

  function render(glass,body) {
    glass.style.transform=`translate3d(${body.x.toFixed(2)}px,${body.y.toFixed(2)}px,0)`;
    const impact=clamp(body.impact,0,1);
    glass.style.setProperty('scale',`${(1+impact*.045).toFixed(4)} ${(1-impact*.032).toFixed(4)}`);
    dentState.u=body.dentU; dentState.v=body.dentVPos;
    dentState.depth=clamp(body.dent,0,1.15); dentState.radius=body.dentRadius;
    dentState.axisX=body.axisX; dentState.axisY=body.axisY;
  }

  function tick(glass,body,now) {
    body.raf=0;
    if(!document.contains(glass)) return;
    const dt=body.lastFrame?clamp((now-body.lastFrame)/1000,.001,.032):1/60;
    body.lastFrame=now;

    body.dentVel+=(body.dentTarget-body.dent)*205*dt;
    body.dentVel*=Math.exp(-18*dt);
    body.dent+=body.dentVel*dt;
    body.dent=clamp(body.dent,-.04,1.15);

    if(body.impact>.0005) body.impact*=Math.exp(-8.5*dt); else body.impact=0;

    if(!body.pointer){
      if(body.shakeUntil>now){
        const t=(body.shakeUntil-now)/720, env=clamp(t,0,1); const phase=(1-env)*Math.PI*10;
        body.vx+=Math.sin(phase+body.shakeSeed)*1550*env*dt;
        body.vy+=Math.cos(phase*1.17+body.shakeSeed*.7)*720*env*dt;
      }
      if(body.gravity){
        body.vy+=1550*dt;
        body.vx*=Math.exp(-1.8*dt);
        body.x+=body.vx*dt; body.y+=body.vy*dt;
        clampPosition(glass,body,true);
      } else {
        if(body.shakeUntil>now){
          body.vx+=(body.anchorX-body.x)*42*dt;
          body.vy+=(body.anchorY-body.y)*42*dt;
          body.vx*=Math.exp(-5.8*dt); body.vy*=Math.exp(-5.8*dt);
          body.x+=body.vx*dt; body.y+=body.vy*dt;
          clampPosition(glass,body,true);
        } else {
          body.vx*=Math.exp(-11*dt); body.vy*=Math.exp(-11*dt);
          if(Math.abs(body.vx)>1||Math.abs(body.vy)>1){body.x+=body.vx*dt;body.y+=body.vy*dt;clampPosition(glass,body,false);}
        }
      }
    }

    render(glass,body);
    const dentMoving=Math.abs(body.dent-body.dentTarget)>.002||Math.abs(body.dentVel)>.01;
    const bodyMoving=body.pointer||body.shakeUntil>now||body.impact>.001||Math.abs(body.vx)>1||Math.abs(body.vy)>1||(body.gravity&&!body.grounded);
    if(bodyMoving||dentMoving){
      glass.setAttribute('data-dynamic','');
      body.raf=requestAnimationFrame(t=>tick(glass,body,t));
    }else{
      body.lastFrame=0; body.vx=body.vy=0; body.dent=body.dentTarget=body.dentVel=0; body.impact=0;
      render(glass,body); glass.removeAttribute('data-dynamic');
    }
  }

  function start(glass,body){if(!reduce.matches&&!body.raf){body.lastFrame=0;glass.setAttribute('data-dynamic','');body.raf=requestAnimationFrame(t=>tick(glass,body,t));}}

  function install(glass){
    if(glass.dataset.fluidV14Ready) return;
    glass.dataset.fluidV14Ready='1';
    // Kill switches for v4/v13 if an old route script is still resident in the tab.
    glass.dataset.jellyReady='1';
    glass.dataset.fluidPhysicsReady='1';
    glass.classList.add('fluid-v14-enabled');
    glass.style.touchAction='none'; glass.style.transformOrigin='50% 50%';
    setConfig(glass,{floating:false});
    queueMicrotask(()=>applyPreferredDefaults(glass));

    const controller=new AbortController();
    const body={x:0,y:0,vx:0,vy:0,baseLeft:0,baseTop:0,pointer:false,pointerId:null,lastX:0,lastY:0,lastMoveTime:0,
      gravity:false,grounded:false,impact:0,shakeUntil:0,shakeSeed:0,anchorX:0,anchorY:0,raf:0,lastFrame:0,
      dent:0,dentVel:0,dentTarget:0,dentU:.5,dentVPos:.5,dentRadius:.42,axisX:1,axisY:1,motion:false,motionInstalled:false};
    glass.__fluidPhysics=body;
    requestAnimationFrame(()=>measureBase(glass,body));

    let configGuard=false;
    const configObserver=new MutationObserver(()=>{
      if(configGuard) return;
      const cfg=parseConfig(glass);
      if(cfg.floating!==false){configGuard=true;setConfig(glass,{floating:false});queueMicrotask(()=>configGuard=false);}
    });
    configObserver.observe(glass,{attributes:true,attributeFilter:['data-config']});

    const down=e=>{
      if(e.button!==undefined&&e.button!==0)return;
      // Ensure LiquidGlass' own floating handler sees false when this event bubbles.
      setConfig(glass,{floating:false});
      measureBase(glass,body);
      body.pointer=true;body.pointerId=e.pointerId;body.lastX=e.clientX;body.lastY=e.clientY;body.lastMoveTime=performance.now();
      body.vx=body.vy=0;body.grounded=false;body.anchorX=body.x;body.anchorY=body.y;
      setDentFromPointer(glass,body,e);start(glass,body);
      glass.classList.add('is-fluid-pressed');
      try{glass.setPointerCapture(e.pointerId);}catch{}
      e.preventDefault();
    };
    const move=e=>{
      if(!body.pointer||e.pointerId!==body.pointerId)return;
      const now=performance.now(),dt=Math.max(8,now-body.lastMoveTime)/1000;
      const dx=e.clientX-body.lastX,dy=e.clientY-body.lastY;
      body.x+=dx;body.y+=dy;clampPosition(glass,body,false);
      const rvx=dx/dt,rvy=dy/dt;body.vx=body.vx*.58+rvx*.42;body.vy=body.vy*.58+rvy*.42;
      body.lastX=e.clientX;body.lastY=e.clientY;body.lastMoveTime=now;
      setDentFromPointer(glass,body,e);start(glass,body);
    };
    const up=e=>{
      if(!body.pointer||(e?.pointerId!==undefined&&e.pointerId!==body.pointerId))return;
      body.pointer=false;body.pointerId=null;body.dentTarget=0;glass.classList.remove('is-fluid-pressed');
      body.vx=clamp(body.vx,-1400,1400);body.vy=clamp(body.vy,-1400,1400);
      if(!body.gravity){body.vx*=.22;body.vy*=.22;}
      start(glass,body);
    };
    glass.addEventListener('pointerdown',down,{signal:controller.signal});
    window.addEventListener('pointermove',move,{passive:false,signal:controller.signal});
    window.addEventListener('pointerup',up,{passive:true,signal:controller.signal});
    window.addEventListener('pointercancel',up,{passive:true,signal:controller.signal});
    window.addEventListener('resize',()=>measureBase(glass,body),{passive:true,signal:controller.signal});

    const api={
      state:body,
      toggleGravity(){
        measureBase(glass,body);body.gravity=!body.gravity;body.grounded=false;
        body.anchorX=body.x;body.anchorY=body.y;
        if(body.gravity)body.vy=Math.max(body.vy,35);else body.vy=0;
        start(glass,body);return body.gravity;
      },
      shake(){
        body.anchorX=body.x;body.anchorY=body.y;body.shakeUntil=performance.now()+720;body.shakeSeed=Math.random()*Math.PI*2;
        body.vx+=clamp((Math.random()-.5)*180,-90,90);body.vy-=55+Math.random()*45;body.grounded=false;start(glass,body);return true;
      },
      reset(){
        if(body.raf)cancelAnimationFrame(body.raf);body.raf=0;body.lastFrame=0;
        body.x=body.y=body.vx=body.vy=0;body.gravity=false;body.grounded=false;body.impact=0;body.shakeUntil=0;
        body.dent=body.dentVel=body.dentTarget=0;body.dentU=body.dentVPos=.5;body.dentRadius=.42;body.axisX=body.axisY=1;
        glass.removeAttribute('data-dynamic');glass.classList.remove('is-fluid-pressed');render(glass,body);requestAnimationFrame(()=>measureBase(glass,body));
      },
      async toggleMotion(){
        if(!('DeviceMotionEvent'in window))return false;
        if(body.motion){body.motion=false;return false;}
        if(typeof DeviceMotionEvent.requestPermission==='function'&&await DeviceMotionEvent.requestPermission()!=='granted')throw new Error('denied');
        body.motion=true;
        if(!body.motionInstalled){
          body.motionInstalled=true;let last=0;const grav={x:0,y:0,z:0};
          window.addEventListener('devicemotion',e=>{
            if(!body.motion)return;const now=performance.now();if(now-last<40)return;last=now;
            let a=e.acceleration,ax=Number(a?.x),ay=Number(a?.y),az=Number(a?.z),q=e.accelerationIncludingGravity;
            if(![ax,ay,az].every(Number.isFinite)&&q){grav.x=grav.x*.9+(Number(q.x)||0)*.1;grav.y=grav.y*.9+(Number(q.y)||0)*.1;grav.z=grav.z*.9+(Number(q.z)||0)*.1;ax=(Number(q.x)||0)-grav.x;ay=(Number(q.y)||0)-grav.y;az=(Number(q.z)||0)-grav.z;}
            if(![ax,ay,az].every(Number.isFinite))return;const mag=Math.hypot(ax,ay,az);if(mag<1.4)return;
            const k=clamp((mag-1.4)/7,0,1);body.vx+=clamp(ax*17,-145,145)*k;body.vy+=clamp(-ay*13,-120,120)*k;body.grounded=false;start(glass,body);
          },{passive:true,signal:controller.signal});
        }
        return true;
      }
    };
    globalThis.HJFluidLab=api;
    cleanup=()=>{controller.abort();configObserver.disconnect();if(body.raf)cancelAnimationFrame(body.raf);glass.removeAttribute('data-dynamic');if(globalThis.HJFluidLab===api)delete globalThis.HJFluidLab;};
  }

  function sync(){
    if(!location.hash.startsWith('#/lab')||location.hash.startsWith('#/lab/vision')){cleanup?.();cleanup=null;return;}
    const glass=document.querySelector('#realLiquidGlass');if(glass&&!glass.dataset.fluidV14Ready){cleanup?.();cleanup=null;install(glass);}
  }
  document.addEventListener('hj:rendered',()=>requestAnimationFrame(sync));
  addEventListener('hashchange',()=>requestAnimationFrame(sync));
  queueMicrotask(sync);
})();
