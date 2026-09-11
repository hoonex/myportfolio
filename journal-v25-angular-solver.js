/* Journal v25 — direct, unbounded angular solver for Real Jelly. Loaded before v24 runtime. */
(() => {
  const TAU=Math.PI*2;
  const tracked=new Map();
  let pairAngle=null,spinOmega=0,spinRaf=0,lastSpinTime=0,epoch=0,lastPaint=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const deltaAngle=(a,b)=>{let d=a-b;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;};
  const wrap=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
  const glass=()=>document.querySelector('#realLiquidGlass');
  const body=()=>globalThis.HJRealJellyMode?.active?globalThis.HJRealJellyMode.state:null;
  function center(b,g){
    const root=g?.closest('.refraction-root');if(!root||!b)return null;
    const rr=root.getBoundingClientRect();
    return{x:rr.left+(Number(b.baseLeft)||0)+(Number(b.offsetX)||0)+(Number(b.baseW)||0)*.5+(Number(b.x)||0),y:rr.top+(Number(b.baseTop)||0)+(Number(b.offsetY)||0)+(Number(b.baseH)||0)*.5+(Number(b.y)||0)};
  }
  function paint(b,g,force=false){
    if(!b||!g)return;const now=performance.now();if(!force&&now-lastPaint<16)return;lastPaint=now;
    const s=globalThis.__HJRealJellyState;if(s){s.enabled=true;s.angle=wrap(b.angle||0);}
    try{const cfg=JSON.parse(g.dataset.config||'{}')||{};g.dataset.config=JSON.stringify({...cfg,floating:false,__hjAngularEpoch:++epoch});}catch{}
  }
  function stopSpin(){if(spinRaf)cancelAnimationFrame(spinRaf);spinRaf=0;lastSpinTime=0;}
  function spinStep(now){
    spinRaf=0;const b=body(),g=glass();if(!b||!g||tracked.size){lastSpinTime=0;return;}
    const dt=lastSpinTime?clamp((now-lastSpinTime)/1000,.001,.034):1/60;lastSpinTime=now;
    if(Math.abs(spinOmega)<.012){spinOmega=0;b.omega=0;paint(b,g,true);return;}
    b.angle=(Number(b.angle)||0)+spinOmega*dt;
    b.omega=0;
    const drag=b.grounded?1.55:.32;
    spinOmega*=Math.exp(-drag*dt);
    paint(b,g);
    spinRaf=requestAnimationFrame(spinStep);
  }
  function startSpin(){if(!spinRaf&&Math.abs(spinOmega)>=.012){lastSpinTime=0;spinRaf=requestAnimationFrame(spinStep);}}
  function samplePair(){const ps=[...tracked.values()];if(ps.length<2)return null;return Math.atan2(ps[1].y-ps[0].y,ps[1].x-ps[0].x);}
  function onDown(e){
    const g=glass(),b=body();if(!g||!b)return;
    const target=e.target instanceof Element?e.target.closest('#realLiquidGlass'):null;
    if(!target&&tracked.size===0)return;
    stopSpin();spinOmega=0;
    const c=center(b,g);if(!c)return;
    tracked.set(e.pointerId,{x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,lastT:performance.now(),polar:Math.atan2(e.clientY-c.y,e.clientX-c.x)});
    pairAngle=samplePair();
  }
  function onMove(e){
    const p=tracked.get(e.pointerId),b=body(),g=glass();if(!p||!b||!g)return;
    const now=performance.now(),dt=Math.max(.006,(now-p.lastT)/1000);
    p.lastX=p.x;p.lastY=p.y;p.x=e.clientX;p.y=e.clientY;p.lastT=now;
    let da=0;
    if(tracked.size>=2){
      const a=samplePair();if(a!=null&&pairAngle!=null){da=deltaAngle(a,pairAngle);pairAngle=a;}
      if(b.pair){b.pair.lastPointerAngle=a??b.pair.lastPointerAngle;b.pair.targetBodyAngle=(Number(b.angle)||0)+da;}
    }else{
      const c=center(b,g);if(!c)return;
      const polar=Math.atan2(e.clientY-c.y,e.clientX-c.x),radius=Math.hypot(e.clientX-c.x,e.clientY-c.y),baseRadius=Math.max(24,Math.hypot(Number(b.baseW)||280,Number(b.baseH)||176)*.24);
      const raw=deltaAngle(polar,p.polar);p.polar=polar;
      da=raw*clamp(radius/baseRadius,.30,1.15);
    }
    if(Math.abs(da)>0){
      b.angle=(Number(b.angle)||0)+da;
      b.omega=0;
      spinOmega=spinOmega*.56+(da/dt)*.44;
      if(b.pair){b.pair.targetBodyAngle=b.angle;}
      paint(b,g,true);
    }
  }
  function onUp(e){
    if(!tracked.has(e.pointerId))return;
    tracked.delete(e.pointerId);pairAngle=samplePair();
    const b=body();if(b){b.omega=0;if(b.pair)b.pair.targetBodyAngle=b.angle;}
    if(!tracked.size)startSpin();
  }
  /* Register on window before v24 does, so its stopImmediatePropagation cannot hide the gesture from this solver. */
  addEventListener('pointerdown',onDown,{capture:true,passive:true});
  addEventListener('pointermove',onMove,{capture:true,passive:true});
  addEventListener('pointerup',onUp,{capture:true,passive:true});
  addEventListener('pointercancel',onUp,{capture:true,passive:true});
  addEventListener('hashchange',()=>{tracked.clear();pairAngle=null;spinOmega=0;stopSpin();});
  globalThis.HJRealJellyAngularV25={get spin(){return spinOmega;},stop(){spinOmega=0;stopSpin();}};
})();