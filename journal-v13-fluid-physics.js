/* Journal v13: naturalised deformation + gravity/shake + local jelly dent for Glass Lab. */
(() => {
  const rm = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  let current = null;

  function bounds(glass, p) {
    const root = glass.closest('.refraction-root');
    if (!root) return null;
    const rr = root.getBoundingClientRect(), gr = glass.getBoundingClientRect(), pad = 10;
    const left = gr.left - p.x, right = gr.right - p.x, top = gr.top - p.y, bottom = gr.bottom - p.y;
    return { minX: rr.left + pad - left, maxX: rr.right - pad - right,
      minY: rr.top + pad - top, maxY: rr.bottom - pad - bottom };
  }

  function render(glass,p){
    glass.style.setProperty('translate', `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`);
    glass.style.setProperty('--press-x', `${p.pressX.toFixed(2)}%`);
    glass.style.setProperty('--press-y', `${p.pressY.toFixed(2)}%`);
    glass.style.setProperty('--press-nx', p.pressNx.toFixed(4));
    glass.style.setProperty('--press-ny', p.pressNy.toFixed(4));
    const depth=clamp(p.dent,0,1);
    glass.style.setProperty('--press-depth', depth.toFixed(4));
    glass.style.setProperty('--press-scale', (.80+depth*.20).toFixed(4));
    glass.style.setProperty('--press-light-x', `${(-p.pressNx*7).toFixed(2)}px`);
    glass.style.setProperty('--press-light-y', `${(-p.pressNy*7).toFixed(2)}px`);
    glass.style.setProperty('--press-dark-x', `${(p.pressNx*6).toFixed(2)}px`);
    glass.style.setProperty('--press-dark-y', `${(p.pressNy*6).toFixed(2)}px`);
    glass.style.setProperty('--press-drop-x', `${(-p.pressNx*2).toFixed(2)}px`);
    glass.style.setProperty('--press-drop-y', `${(-p.pressNy*2).toFixed(2)}px`);
    glass.style.setProperty('--press-focus-x', `${(50+p.pressNx*10).toFixed(2)}%`);
    glass.style.setProperty('--press-focus-y', `${(50+p.pressNy*10).toFixed(2)}%`);
    glass.style.setProperty('--press-sx', p.pressSx.toFixed(4));
    glass.style.setProperty('--press-sy', p.pressSy.toFixed(4));
    glass.style.setProperty('--press-size', `${p.pressSize.toFixed(2)}px`);
  }

  function updatePressPoint(glass,p,e){
    const rect = glass.getBoundingClientRect();
    const u = clamp((e.clientX - rect.left) / Math.max(1,rect.width), 0, 1);
    const v = clamp((e.clientY - rect.top) / Math.max(1,rect.height), 0, 1);
    const nx = u * 2 - 1, ny = v * 2 - 1;
    const edgeX = clamp(Math.min(u,1-u) * 2, 0, 1);
    const edgeY = clamp(Math.min(v,1-v) * 2, 0, 1);
    const support = Math.sqrt(edgeX * edgeY);
    const inwardX = (0.5-u) * (1-edgeX) * 13;
    const inwardY = (0.5-v) * (1-edgeY) * 13;
    p.pressTargetX = clamp(u*100 + inwardX, 2, 98);
    p.pressTargetY = clamp(v*100 + inwardY, 2, 98);
    p.pressTargetNx = nx;
    p.pressTargetNy = ny;
    p.pressTargetSx = .66 + edgeX * .34;
    p.pressTargetSy = .66 + edgeY * .34;
    const minDim = Math.max(70, Math.min(rect.width,rect.height));
    p.pressTargetSize = clamp(minDim * (.48 + support*.22), 72, 132);
    const pressure = e.pointerType === 'pen' && e.pressure > 0 ? clamp(e.pressure*1.18,.35,1) : 1;
    p.dentTarget = pressure * (.72 + support*.28);
    p.lastClientX=e.clientX; p.lastClientY=e.clientY;
  }

  function tick(glass,p,time){
    p.raf = 0;
    if (!document.contains(glass)) return;
    const dt = p.last ? clamp((time-p.last)/1000,.001,.032) : 1/60;
    p.last = time;
    const b = bounds(glass,p);

    const pressEase = 1 - Math.exp(-24*dt);
    p.pressX += (p.pressTargetX-p.pressX)*pressEase;
    p.pressY += (p.pressTargetY-p.pressY)*pressEase;
    p.pressNx += (p.pressTargetNx-p.pressNx)*pressEase;
    p.pressNy += (p.pressTargetNy-p.pressNy)*pressEase;
    p.pressSx += (p.pressTargetSx-p.pressSx)*pressEase;
    p.pressSy += (p.pressTargetSy-p.pressSy)*pressEase;
    p.pressSize += (p.pressTargetSize-p.pressSize)*pressEase;
    p.dentV += (p.dentTarget-p.dent)*185*dt;
    p.dentV *= Math.exp(-17.5*dt);
    p.dent += p.dentV*dt;
    p.dent = clamp(p.dent,-.08,1.08);

    if (p.shakeUntil > time) {
      const left = clamp((p.shakeUntil-time)/650,0,1), env = left*left;
      const phase = (650-(p.shakeUntil-time))/1000;
      p.vx += Math.sin(phase*48+p.seed)*2300*env*dt;
      p.vy += Math.sin(phase*61+p.seed*.7)*1200*env*dt;
    }

    if (p.gravity && !p.pointer) {
      p.vy += 1480*dt;
      p.vx *= Math.exp(-2.5*dt);
      p.x += p.vx*dt; p.y += p.vy*dt;
      if (b) {
        if (p.x < b.minX || p.x > b.maxX) { p.x=clamp(p.x,b.minX,b.maxX); p.vx*=-.25; }
        if (p.y > b.maxY) {
          const impact=Math.max(0,p.vy); p.y=b.maxY;
          if (impact>70) { p.vy=-impact*.23; p.vx += (Math.random()-.5)*Math.min(80,impact*.06); p.impact=Math.min(1,impact/850); }
          else p.vy=0;
          p.grounded=Math.abs(p.vy)<10;
        } else p.grounded=false;
        if (p.y < b.minY) { p.y=b.minY; p.vy=Math.abs(p.vy)*.15; }
      }
    } else if (!p.pointer) {
      p.vx += (-p.x*75)*dt; p.vy += (-p.y*75)*dt;
      p.vx *= Math.exp(-12*dt); p.vy *= Math.exp(-12*dt);
      p.x += p.vx*dt; p.y += p.vy*dt;
    }

    if (p.impact > .001) {
      p.impact *= Math.exp(-8*dt);
      const s=glass.__jellyState;
      if (s && !s.active) {
        s.sx = clamp(1 + p.impact*.06, .9, 1.16);
        s.sy = clamp(1 - p.impact*.045, .9, 1.16);
      }
    }

    if (b) { p.x=clamp(p.x,b.minX-3,b.maxX+3); p.y=clamp(p.y,b.minY-3,b.maxY+3); }
    render(glass,p);
    const dentMoving = Math.abs(p.dent-p.dentTarget)>.002 || Math.abs(p.dentV)>.012;
    const moving = p.gravity ? !(p.grounded && Math.abs(p.vx)<1 && Math.abs(p.vy)<1 && p.shakeUntil<=time)
      : Math.abs(p.x)>.08 || Math.abs(p.y)>.08 || Math.abs(p.vx)>1 || Math.abs(p.vy)>1 || p.shakeUntil>time;
    if (moving || p.pointer || p.impact>.002 || dentMoving) p.raf=requestAnimationFrame(t=>tick(glass,p,t));
    else { p.last=0; p.x=p.y=p.vx=p.vy=0; p.dent=0; p.dentV=0; render(glass,p); }
  }

  function start(glass,p){ if (!rm.matches && !p.raf) { p.last=0; p.raf=requestAnimationFrame(t=>tick(glass,p,t)); } }

  function tuneShape(glass, p) {
    const s=glass.__jellyState;
    if (!s || !s.active || rm.matches) return;
    const vx=s.pointerVx||0, vy=s.pointerVy||0, ax=Math.abs(vx), ay=Math.abs(vy), speed=Math.hypot(vx,vy);
    const amount=clamp((speed-60)/2500,0,1), denom=ax+ay+1, rx=ax/denom, ry=ay/denom;
    let sx=1+amount*(.13*rx-.055*ry), sy=1+amount*(.13*ry-.055*rx);
    const area=Math.sqrt((1+amount*.012)/Math.max(.75,sx*sy)); sx*=area; sy*=area;
    const edgeLeverage = .35 + .65*Math.max(Math.abs(p.pressNx),Math.abs(p.pressNy));
    s.targetSx=clamp(sx - .006*(1-Math.abs(p.pressNx)),.93,1.145);
    s.targetSy=clamp(sy - .006*(1-Math.abs(p.pressNy)),.93,1.145);
    s.targetRot=clamp((p.pressNx*vy-p.pressNy*vx)/340 + (p.pressNx-p.pressNy)*.55*edgeLeverage,-6.5,6.5);
    s.targetLagX=clamp(-vx*.0034 - p.pressNx*1.8,-7.5,7.5);
    s.targetLagY=clamp(-vy*.0034 - p.pressNy*1.8,-7.5,7.5);
    if (p.prevVx && Math.sign(vx)!==Math.sign(p.prevVx) && Math.abs(vx-p.prevVx)>480) { s.vrot+=clamp((vx-p.prevVx)/1900,-.9,.9); s.vsx+=.035; s.vsy-=.022; }
    if (p.prevVy && Math.sign(vy)!==Math.sign(p.prevVy) && Math.abs(vy-p.prevVy)>480) { s.vrot-=clamp((vy-p.prevVy)/2100,-.8,.8); s.vsy+=.035; s.vsx-=.022; }
    p.prevVx=vx; p.prevVy=vy;
  }

  function reset(glass,p,disableGravity=true){
    if (p.raf) cancelAnimationFrame(p.raf); p.raf=0; p.last=0; p.x=p.y=p.vx=p.vy=0; p.impact=0; p.shakeUntil=0; p.grounded=false;
    p.dent=p.dentV=p.dentTarget=0; p.pressX=p.pressTargetX=50; p.pressY=p.pressTargetY=50; p.pressNx=p.pressTargetNx=0; p.pressNy=p.pressTargetNy=0;
    p.pressSx=p.pressTargetSx=1; p.pressSy=p.pressTargetSy=1; p.pressSize=p.pressTargetSize=108;
    if (disableGravity) p.gravity=false;
    render(glass,p);
    const s=glass.__jellyState;
    if (s) {
      s.active=false; s.pointerId=null; s.sx=s.sy=s.targetSx=s.targetSy=1; s.rot=s.targetRot=s.lagX=s.lagY=s.targetLagX=s.targetLagY=0;
      s.vsx=s.vsy=s.vrot=s.vlagX=s.vlagY=0;
      if (s.raf) cancelAnimationFrame(s.raf); s.raf=0; s.lastFrame=0;
      glass.style.setProperty('scale','1 1'); glass.style.setProperty('rotate','0deg');
      glass.style.setProperty('--jelly-lag-x','0px'); glass.style.setProperty('--jelly-lag-y','0px');
    }
  }

  function install(glass){
    if (glass.dataset.fluidPhysicsReady) return;
    glass.dataset.fluidPhysicsReady='1'; glass.classList.add('fluid-physics-enabled'); glass.style.transformOrigin='50% 50%';
    const ctl=new AbortController();
    const p={x:0,y:0,vx:0,vy:0,gravity:false,grounded:false,pointer:false,impact:0,shakeUntil:0,seed:0,raf:0,last:0,prevVx:0,prevVy:0,lastClientX:0,lastClientY:0,motion:false,motionReady:false,
      dent:0,dentV:0,dentTarget:0,pressX:50,pressY:50,pressTargetX:50,pressTargetY:50,pressNx:0,pressNy:0,pressTargetNx:0,pressTargetNy:0,pressSx:1,pressSy:1,pressTargetSx:1,pressTargetSy:1,pressSize:108,pressTargetSize:108};
    glass.__fluidPhysics=p;

    const pressLayer=document.createElement('span');
    pressLayer.className='fluid-press-layer'; pressLayer.setAttribute('aria-hidden','true');
    const dent=document.createElement('span'); dent.className='fluid-press-dent'; pressLayer.append(dent); glass.append(pressLayer);

    glass.addEventListener('pointerdown',e=>{
      p.pointer=true; p.prevVx=p.prevVy=0; updatePressPoint(glass,p,e); glass.style.transformOrigin='50% 50%';
      const s=glass.__jellyState;
      if(s){
        const edge=Math.max(Math.abs(p.pressTargetNx),Math.abs(p.pressTargetNy));
        s.targetSx=.992 + edge*.004; s.targetSy=.992 + edge*.004;
        s.targetRot=clamp((p.pressTargetNx-p.pressTargetNy)*.9,-1.4,1.4);
        s.targetLagX=-p.pressTargetNx*1.6; s.targetLagY=-p.pressTargetNy*1.6;
      }
      glass.classList.add('is-fluid-dented'); start(glass,p);
    },{signal:ctl.signal});
    window.addEventListener('pointermove',e=>{ if(!p.pointer)return; updatePressPoint(glass,p,e); tuneShape(glass,p); start(glass,p); },{passive:true,signal:ctl.signal});
    const up=()=>{p.pointer=false;p.prevVx=p.prevVy=0;p.dentTarget=0;glass.classList.remove('is-fluid-dented');start(glass,p);if(p.gravity){p.grounded=false;start(glass,p);}};
    window.addEventListener('pointerup',up,{passive:true,signal:ctl.signal}); window.addEventListener('pointercancel',up,{passive:true,signal:ctl.signal});

    const api={
      toggleGravity(){p.gravity=!p.gravity;p.grounded=false;if(p.gravity)p.vy+=35;start(glass,p);return p.gravity;},
      shake(){p.shakeUntil=performance.now()+650;p.seed=Math.random()*Math.PI*2;p.vx+=(Math.random()-.5)*150;p.vy-=80+Math.random()*50;start(glass,p);return true;},
      reset(){reset(glass,p,true);},
      state:p,
      async toggleMotion(){
        if(!('DeviceMotionEvent' in window))return false;
        if(p.motion){p.motion=false;return false;}
        if(typeof DeviceMotionEvent.requestPermission==='function' && await DeviceMotionEvent.requestPermission()!=='granted')throw new Error('denied');
        p.motion=true;
        if(!p.motionReady){
          p.motionReady=true;const g={x:0,y:0,z:0};let last=0;
          window.addEventListener('devicemotion',e=>{if(!p.motion)return;const now=performance.now();if(now-last<45)return;last=now;let a=e.acceleration, ax=Number(a?.x),ay=Number(a?.y),az=Number(a?.z);const q=e.accelerationIncludingGravity;if(![ax,ay,az].every(Number.isFinite)&&q){g.x=g.x*.88+(Number(q.x)||0)*.12;g.y=g.y*.88+(Number(q.y)||0)*.12;g.z=g.z*.88+(Number(q.z)||0)*.12;ax=(Number(q.x)||0)-g.x;ay=(Number(q.y)||0)-g.y;az=(Number(q.z)||0)-g.z;}if(![ax,ay,az].every(Number.isFinite))return;const mag=Math.hypot(ax,ay,az);if(mag<1.6)return;const k=clamp((mag-1.6)/8,0,1);p.vx+=clamp(ax*15,-130,130)*k;p.vy+=clamp(-ay*11,-110,110)*k;p.shakeUntil=Math.max(p.shakeUntil,now+260);start(glass,p);},{passive:true,signal:ctl.signal});
        }
        return true;
      }
    };
    window.HJFluidLab=api;
    current=()=>{ctl.abort();if(p.raf)cancelAnimationFrame(p.raf);pressLayer.remove();if(window.HJFluidLab===api)delete window.HJFluidLab;};
  }

  function sync(){
    if(!location.hash.startsWith('#/lab')||location.hash.startsWith('#/lab/vision')){current?.();current=null;return;}
    const glass=document.querySelector('#realLiquidGlass'); if(glass&&!glass.dataset.fluidPhysicsReady){current?.();current=null;install(glass);}
  }
  document.addEventListener('hj:rendered',()=>requestAnimationFrame(sync)); addEventListener('hashchange',()=>requestAnimationFrame(sync)); queueMicrotask(sync);
})();
