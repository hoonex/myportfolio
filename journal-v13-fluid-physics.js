/* Journal v13: naturalised deformation + gravity/shake layer for Glass Lab. */
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
  }

  function tick(glass,p,time){
    p.raf = 0;
    if (!document.contains(glass)) return;
    const dt = p.last ? clamp((time-p.last)/1000,.001,.032) : 1/60;
    p.last = time;
    const b = bounds(glass,p);

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
    const moving = p.gravity ? !(p.grounded && Math.abs(p.vx)<1 && Math.abs(p.vy)<1 && p.shakeUntil<=time)
      : Math.abs(p.x)>.08 || Math.abs(p.y)>.08 || Math.abs(p.vx)>1 || Math.abs(p.vy)>1 || p.shakeUntil>time;
    if (moving || p.pointer || p.impact>.002) p.raf=requestAnimationFrame(t=>tick(glass,p,t));
    else { p.last=0; p.x=p.y=p.vx=p.vy=0; render(glass,p); }
  }

  function start(glass,p){ if (!rm.matches && !p.raf) { p.last=0; p.raf=requestAnimationFrame(t=>tick(glass,p,t)); } }

  function tuneShape(glass, p) {
    const s=glass.__jellyState;
    if (!s || !s.active || rm.matches) return;
    const vx=s.pointerVx||0, vy=s.pointerVy||0, ax=Math.abs(vx), ay=Math.abs(vy), speed=Math.hypot(vx,vy);
    const amount=clamp((speed-60)/2500,0,1), denom=ax+ay+1, rx=ax/denom, ry=ay/denom;
    let sx=1+amount*(.13*rx-.055*ry), sy=1+amount*(.13*ry-.055*rx);
    const area=Math.sqrt((1+amount*.012)/Math.max(.75,sx*sy)); sx*=area; sy*=area;
    s.targetSx=clamp(sx,.93,1.145); s.targetSy=clamp(sy,.93,1.145);
    const rect=glass.getBoundingClientRect(), cx=(p.lastClientX-(rect.left+rect.width/2))/Math.max(1,rect.width/2), cy=(p.lastClientY-(rect.top+rect.height/2))/Math.max(1,rect.height/2);
    s.targetRot=clamp((cx*vy-cy*vx)/340,-6.5,6.5);
    s.targetLagX=clamp(-vx*.0034,-7.5,7.5); s.targetLagY=clamp(-vy*.0034,-7.5,7.5);
    if (p.prevVx && Math.sign(vx)!==Math.sign(p.prevVx) && Math.abs(vx-p.prevVx)>480) { s.vrot+=clamp((vx-p.prevVx)/1900,-.9,.9); s.vsx+=.035; s.vsy-=.022; }
    if (p.prevVy && Math.sign(vy)!==Math.sign(p.prevVy) && Math.abs(vy-p.prevVy)>480) { s.vrot-=clamp((vy-p.prevVy)/2100,-.8,.8); s.vsy+=.035; s.vsx-=.022; }
    p.prevVx=vx; p.prevVy=vy;
  }

  function reset(glass,p,disableGravity=true){
    if (p.raf) cancelAnimationFrame(p.raf); p.raf=0; p.last=0; p.x=p.y=p.vx=p.vy=0; p.impact=0; p.shakeUntil=0; p.grounded=false;
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
    const p={x:0,y:0,vx:0,vy:0,gravity:false,grounded:false,pointer:false,impact:0,shakeUntil:0,seed:0,raf:0,last:0,prevVx:0,prevVy:0,lastClientX:0,lastClientY:0,motion:false,motionReady:false};
    glass.__fluidPhysics=p;
    glass.addEventListener('pointerdown',e=>{ p.pointer=true; p.lastClientX=e.clientX; p.lastClientY=e.clientY; p.prevVx=p.prevVy=0; glass.style.transformOrigin='50% 50%'; const s=glass.__jellyState; if(s){s.targetSx=.986;s.targetSy=.986;s.targetRot=0;} },{signal:ctl.signal});
    window.addEventListener('pointermove',e=>{ if(!p.pointer)return; p.lastClientX=e.clientX;p.lastClientY=e.clientY; tuneShape(glass,p); },{passive:true,signal:ctl.signal});
    const up=()=>{p.pointer=false;p.prevVx=p.prevVy=0;if(p.gravity){p.grounded=false;start(glass,p);}};
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
    current=()=>{ctl.abort();if(p.raf)cancelAnimationFrame(p.raf);if(window.HJFluidLab===api)delete window.HJFluidLab;};
  }

  function sync(){
    if(!location.hash.startsWith('#/lab')||location.hash.startsWith('#/lab/vision')){current?.();current=null;return;}
    const glass=document.querySelector('#realLiquidGlass'); if(glass&&!glass.dataset.fluidPhysicsReady){current?.();current=null;install(glass);}
  }
  document.addEventListener('hj:rendered',()=>requestAnimationFrame(sync)); addEventListener('hashchange',()=>requestAnimationFrame(sync)); queueMicrotask(sync);
})();
