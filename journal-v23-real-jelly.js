/* Journal v23: visible soft-body response with a much smaller render budget. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hypot=(x,y)=>Math.hypot(x,y);
  const BUFFER=44;
  const MAX_ANGLE=.42;
  const STORAGE='hj-real-jelly-v23-enabled';
  const ACTIVE_FRAME=1000/60;
  const PASSIVE_FRAME=1000/45;

  const shader=globalThis.__HJRealJellyState=globalThis.__HJRealJellyState||{};
  Object.assign(shader,{enabled:false,baseW:280,baseH:176,angle:0,stretchX:1,stretchY:1,stretchAngle:0,shearX:0,shearY:0,waveX:0,waveY:0,phaseX:0,phaseY:1.7,contacts:[]});

  let cleanup=null,syncRaf=0,syncAttempts=0,epoch=0,lastInvalidate=0;

  const routeActive=()=>location.hash.startsWith('#/lab')&&!location.hash.startsWith('#/lab/vision');
  const lang=()=>{const l=document.documentElement.lang||'ko';return l.startsWith('ja')?'ja':l.startsWith('en')?'en':'ko';};
  const COPY={
    ko:{title:'Real Jelly',real:'Real Jelly',full:'전체화면',hoop:'농구 골대',gravity:'젤리 중력',score:'득점',on:'SOFT BODY ON',off:'SOFT BODY OFF'},
    en:{title:'Real Jelly',real:'Real Jelly',full:'Fullscreen',hoop:'Basket hoop',gravity:'Jelly gravity',score:'Score',on:'SOFT BODY ON',off:'SOFT BODY OFF'},
    ja:{title:'Real Jelly',real:'Real Jelly',full:'全画面',hoop:'バスケットゴール',gravity:'ゼリー重力',score:'得点',on:'SOFT BODY ON',off:'SOFT BODY OFF'}
  };

  function parseConfig(glass){try{return JSON.parse(glass.dataset.config||'{}')||{};}catch{return {};}}
  function invalidate(glass,force=false){
    const now=performance.now();
    if(!force&&now-lastInvalidate<15.5)return false;
    lastInvalidate=now;
    glass.dataset.config=JSON.stringify({...parseConfig(glass),floating:false,__hjJellyEpoch:++epoch});
    return true;
  }
  function rot(x,y,a){const c=Math.cos(a),s=Math.sin(a);return{x:c*x-s*y,y:s*x+c*y};}
  function angleDelta(a,b){let d=a-b;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d;}
  function spring(value,vel,target,k,d,dt){vel+=(target-value)*k*dt;vel*=Math.exp(-d*dt);value+=vel*dt;return[value,vel];}
  function makeContact(){return{u:.5,v:.5,depth:0,target:0,radius:.34,axisX:1,axisY:1};}

  function install(glass){
    const root=glass.closest('.refraction-root');
    const shell=root?.closest('.refraction-shell');
    const controls=shell?.querySelector('.refraction-controls');
    const panel=controls?.querySelector('.fluid-physics-panel');
    const baseApi=globalThis.HJFluidLab;
    if(!root||!shell||!controls||!panel||!baseApi)return false;
    if(glass.dataset.realJellyV23Ready==='1')return true;

    try{globalThis.HJRealJellyMode?.setEnabled?.(false);}catch{}
    document.querySelectorAll('.real-jelly-panel,.real-jelly-hoop').forEach(n=>n.remove());
    glass.querySelectorAll(':scope > .glass-content').forEach(n=>n.remove());
    delete glass.dataset.realJellyV21Ready;
    glass.dataset.realJellyV23Ready='1';
    if(globalThis.__HJRealJellyBootV22)globalThis.__HJRealJellyBootV22.ready=true;

    const controller=new AbortController();
    const baseState=baseApi.state;
    const originals={
      toggleGravity:baseApi.toggleGravity?.bind(baseApi),shake:baseApi.shake?.bind(baseApi),
      reset:baseApi.reset?.bind(baseApi),toggleMotion:baseApi.toggleMotion?.bind(baseApi)
    };

    const b={
      enabled:false,gravity:false,grounded:false,motion:false,hoop:false,score:0,
      x:0,y:0,vx:0,vy:0,angle:0,omega:0,
      stretchX:1,stretchY:1,stretchVX:0,stretchVY:0,stretchAngle:0,
      impactX:1,impactY:1,shearX:0,shearY:0,shearVX:0,shearVY:0,
      waveX:0,waveY:0,phaseX:0,phaseY:1.7,
      baseLeft:0,baseTop:0,baseW:glass.offsetWidth||280,baseH:glass.offsetHeight||176,
      pointers:new Map(),pair:null,contacts:[makeContact(),makeContact(),makeContact(),makeContact()],
      raf:0,lastFrame:0,lastStep:0,prevCenterY:0,prevCenterX:0
    };

    const ui=document.createElement('section');ui.className='real-jelly-panel';panel.appendChild(ui);
    const hoop=document.createElement('div');hoop.className='real-jelly-hoop';hoop.hidden=true;
    hoop.innerHTML='<div class="real-jelly-score"><span></span><b>0</b></div><div class="real-jelly-backboard"></div><div class="real-jelly-rim"><i></i><i></i></div><div class="real-jelly-net"><i></i><i></i><i></i><i></i></div>';
    root.appendChild(hoop);

    function copyUi(){
      const c=COPY[lang()];
      ui.innerHTML=`<span class="fluid-panel-label">${c.title}</span><div class="real-jelly-actions">
        <button type="button" data-real-jelly aria-pressed="${b.enabled}"><span>◌</span>${c.real}</button>
        <button type="button" data-real-gravity aria-pressed="${b.gravity}"><span>↓</span>${c.gravity}</button>
        <button type="button" data-real-hoop aria-pressed="${b.hoop}"><span>◯</span>${c.hoop}</button>
        <button type="button" data-real-fullscreen><span>⛶</span>${c.full}</button></div><span class="real-jelly-status">${b.enabled?c.on:c.off}</span>`;
      const s=hoop.querySelector('.real-jelly-score span');if(s)s.textContent=c.score;
      ui.querySelector('[data-real-jelly]')?.addEventListener('click',()=>setEnabled(!b.enabled),{signal:controller.signal});
      ui.querySelector('[data-real-gravity]')?.addEventListener('click',()=>{b.gravity=!b.gravity;b.grounded=false;refreshUi();start();},{signal:controller.signal});
      ui.querySelector('[data-real-hoop]')?.addEventListener('click',()=>setHoop(!b.hoop),{signal:controller.signal});
      ui.querySelector('[data-real-fullscreen]')?.addEventListener('click',toggleFullscreen,{signal:controller.signal});
    }
    function refreshUi(){
      const c=COPY[lang()];
      const activeFs=document.fullscreenElement===shell||shell.classList.contains('is-jelly-pseudo-fullscreen');
      const real=ui.querySelector('[data-real-jelly]'),grav=ui.querySelector('[data-real-gravity]'),hp=ui.querySelector('[data-real-hoop]'),fs=ui.querySelector('[data-real-fullscreen]');
      real?.classList.toggle('is-active',b.enabled);real?.setAttribute('aria-pressed',String(b.enabled));
      grav?.classList.toggle('is-active',b.gravity);grav?.setAttribute('aria-pressed',String(b.gravity));
      hp?.classList.toggle('is-active',b.hoop);hp?.setAttribute('aria-pressed',String(b.hoop));
      fs?.classList.toggle('is-active',activeFs);fs?.setAttribute('aria-pressed',String(activeFs));
      const st=ui.querySelector('.real-jelly-status');if(st)st.textContent=b.enabled?c.on:c.off;
      const sb=hoop.querySelector('.real-jelly-score b');if(sb)sb.textContent=String(b.score);
    }

    function requestedSize(){
      const w=Number(document.querySelector('#ref-width')?.value),h=Number(document.querySelector('#ref-height')?.value);
      return{w:Number.isFinite(w)?w:280,h:Number.isFinite(h)?h:176};
    }
    function setRenderBox(){
      const{w,h}=requestedSize();b.baseW=w;b.baseH=h;shader.baseW=w;shader.baseH=h;
      glass.style.width=`${w+BUFFER*2}px`;glass.style.height=`${h+BUFFER*2}px`;
      glass.style.marginLeft=`-${BUFFER}px`;glass.style.marginTop=`-${BUFFER}px`;
      glass.style.setProperty('--jelly-rest-w',`${w}px`);glass.style.setProperty('--jelly-rest-h',`${h}px`);
      glass.classList.add('real-jelly-active');
    }
    function restoreBox(){
      const{w,h}=requestedSize();glass.style.width=`${w}px`;glass.style.height=`${h}px`;
      glass.style.removeProperty('margin-left');glass.style.removeProperty('margin-top');
      glass.style.removeProperty('--jelly-rest-w');glass.style.removeProperty('--jelly-rest-h');glass.classList.remove('real-jelly-active');
    }
    function measureBase(){
      const rr=root.getBoundingClientRect(),gr=glass.getBoundingClientRect();
      b.baseLeft=gr.left-rr.left-b.x;b.baseTop=gr.top-rr.top-b.y;return rr;
    }
    function effectiveStretch(){return{x:clamp(b.stretchX*b.impactX,.54,1.48),y:clamp(b.stretchY*b.impactY,.54,1.48)};}
    function stretchPoint(x,y){const s=effectiveStretch(),q=rot(x,y,-b.stretchAngle);return rot(q.x*s.x,q.y*s.y,b.stretchAngle);}
    function deformedLocal(x,y){const q=stretchPoint(x,y);return rot(q.x,q.y,b.angle);}
    function centerClient(){const rr=root.getBoundingClientRect();return{x:rr.left+b.baseLeft+BUFFER+b.baseW*.5+b.x,y:rr.top+b.baseTop+BUFFER+b.baseH*.5+b.y};}
    function extents(){
      const hx=b.baseW*.5,hy=b.baseH*.5;let ex=0,ey=0;
      for(const sx of[-1,1])for(const sy of[-1,1]){const q=deformedLocal(sx*hx,sy*hy);ex=Math.max(ex,Math.abs(q.x));ey=Math.max(ey,Math.abs(q.y));}
      return{x:ex,y:ey};
    }
    function stopBasePhysics(){
      try{if(baseState?.raf)cancelAnimationFrame(baseState.raf);Object.assign(baseState,{raf:0,lastFrame:0,pointer:false,pointerId:null,gravity:false,vx:0,vy:0,dent:0,dentTarget:0,visualGrowth:0,impact:0});}catch{}
      const p=globalThis.__HJGlassDentState;if(p){p.depth=0;p.shapeX=p.shapeY=1;}
      glass.classList.remove('is-fluid-pressed');
    }
    function syncShader(){
      const s=effectiveStretch();
      Object.assign(shader,{enabled:b.enabled,baseW:b.baseW,baseH:b.baseH,angle:b.angle,stretchX:s.x,stretchY:s.y,stretchAngle:b.stretchAngle,
        shearX:b.shearX,shearY:b.shearY,waveX:b.waveX,waveY:b.waveY,phaseX:b.phaseX,phaseY:b.phaseY,
        contacts:b.contacts.map(c=>({u:c.u,v:c.v,depth:c.depth,radius:c.radius,axisX:c.axisX,axisY:c.axisY}))});
    }
    function resetBody(keepMode=true){
      b.pointers.clear();b.pair=null;b.x=b.y=b.vx=b.vy=0;b.angle=b.omega=0;b.grounded=false;
      b.stretchX=b.stretchY=b.impactX=b.impactY=1;b.stretchVX=b.stretchVY=0;b.stretchAngle=0;
      b.shearX=b.shearY=b.shearVX=b.shearVY=0;b.waveX=b.waveY=0;b.phaseX=0;b.phaseY=1.7;
      for(const c of b.contacts)Object.assign(c,makeContact());
      glass.style.transform='translate3d(0,0,0)';if(!keepMode)b.gravity=false;measureBase();syncShader();invalidate(glass,true);refreshUi();
    }
    function setEnabled(on){
      on=!!on;if(on===b.enabled)return;
      if(on){
        const oldX=Number(baseState?.x)||0,oldY=Number(baseState?.y)||0;stopBasePhysics();
        b.enabled=true;b.x=oldX;b.y=oldY;b.grounded=false;setRenderBox();
        requestAnimationFrame(()=>{measureBase();glass.style.transform=`translate3d(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px,0)`;syncShader();invalidate(glass,true);});
        try{localStorage.setItem(STORAGE,'1');}catch{}
      }else{
        b.enabled=false;b.gravity=false;b.grounded=false;b.motion=false;b.pointers.clear();b.pair=null;
        if(b.raf)cancelAnimationFrame(b.raf);b.raf=0;b.lastFrame=b.lastStep=0;
        Object.assign(shader,{enabled:false,angle:0,stretchX:1,stretchY:1,stretchAngle:0,shearX:0,shearY:0,waveX:0,waveY:0,contacts:[]});
        restoreBox();const growth=baseApi.getPressGrowth?.();originals.reset?.();if(Number.isFinite(growth))baseApi.setPressGrowth?.(growth);
        b.x=b.y=b.vx=b.vy=0;glass.style.transform='translate3d(0,0,0)';invalidate(glass,true);try{localStorage.setItem(STORAGE,'0');}catch{}
      }
      refreshUi();
    }
    function setHoop(on){b.hoop=!!on;hoop.hidden=!b.hoop;root.classList.toggle('has-real-jelly-hoop',b.hoop);if(b.hoop)b.score=0;refreshUi();if(b.enabled)start();}
    async function toggleFullscreen(){
      const active=document.fullscreenElement===shell||shell.classList.contains('is-jelly-pseudo-fullscreen');
      if(active){if(document.fullscreenElement&&document.exitFullscreen){try{await document.exitFullscreen();}catch{}}shell.classList.remove('is-jelly-pseudo-fullscreen');document.documentElement.classList.remove('jelly-pseudo-fullscreen-open');}
      else if(shell.requestFullscreen){try{await shell.requestFullscreen({navigationUI:'hide'});}catch{shell.classList.add('is-jelly-pseudo-fullscreen');document.documentElement.classList.add('jelly-pseudo-fullscreen-open');}}
      else{shell.classList.add('is-jelly-pseudo-fullscreen');document.documentElement.classList.add('jelly-pseudo-fullscreen-open');}
      setTimeout(()=>{if(b.enabled)measureBase();refreshUi();start();},40);
    }

    function pointerUV(e){
      const gr=glass.getBoundingClientRect(),left=gr.left+BUFFER,top=gr.top+BUFFER;
      const ru=(e.clientX-left)/Math.max(1,b.baseW),rv=(e.clientY-top)/Math.max(1,b.baseH);
      return{rawU:ru,rawV:rv,u:clamp(ru,0,1),v:clamp(rv,0,1)};
    }
    function updatePair(){
      if(b.pointers.size<2){b.pair=null;return;}
      const[p0,p1]=[...b.pointers.values()].slice(0,2),dist=Math.max(24,hypot(p1.x-p0.x,p1.y-p0.y));
      const restDX=p1.localX-p0.localX,restDY=p1.localY-p0.localY;
      b.pair={startDist:dist,startStretch:b.stretchX,restAngle:Math.atan2(restDY,restDX),startPointerAngle:Math.atan2(p1.y-p0.y,p1.x-p0.x),startBodyAngle:b.angle};
    }
    function pointerDown(e){
      if(!b.enabled||b.pointers.size>=2||(e.button!==undefined&&e.button!==0))return;
      const uv=pointerUV(e);if(uv.rawU<-.05||uv.rawU>1.05||uv.rawV<-.05||uv.rawV>1.05)return;
      stopBasePhysics();b.grounded=false;const now=performance.now();
      const p={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,vx:0,vy:0,lastTime:now,u:uv.u,v:uv.v,
        localX:(uv.u-.5)*b.baseW,localY:(uv.v-.5)*b.baseH,pressure:e.pressure>0?e.pressure:.55};
      b.pointers.set(e.pointerId,p);if(b.pointers.size===2)updatePair();
      try{glass.setPointerCapture(e.pointerId);}catch{}glass.classList.add('is-real-jelly-held');start();e.preventDefault();e.stopImmediatePropagation();
    }
    function pointerMove(e){
      const p=b.pointers.get(e.pointerId);if(!b.enabled||!p)return;
      const now=performance.now(),dt=Math.max(8,now-p.lastTime)/1000,dx=e.clientX-p.x,dy=e.clientY-p.y;
      p.vx=p.vx*.52+(dx/dt)*.48;p.vy=p.vy*.52+(dy/dt)*.48;p.lastX=p.x;p.lastY=p.y;p.x=e.clientX;p.y=e.clientY;p.lastTime=now;
      if(e.pressure>0)p.pressure=e.pressure;start();e.preventDefault();e.stopImmediatePropagation();
    }
    function pointerUp(e){
      const p=b.pointers.get(e.pointerId);if(!b.enabled||!p)return;
      b.vx+=clamp(p.vx*.12,-230,230);b.vy+=clamp(p.vy*.12,-230,230);b.omega+=clamp((p.localX*p.vy-p.localY*p.vx)*.000014,-.7,.7);
      b.waveX=Math.max(b.waveX,Math.min(9,Math.abs(p.vx)*.006));b.waveY=Math.max(b.waveY,Math.min(9,Math.abs(p.vy)*.006));
      b.pointers.delete(e.pointerId);if(b.pointers.size<2)b.pair=null;if(!b.pointers.size)glass.classList.remove('is-real-jelly-held');b.grounded=false;start();e.stopImmediatePropagation();
    }

    function setPointerContact(slot,p,forceMag){
      const c=b.contacts[slot],edgeX=clamp(Math.min(p.u,1-p.u)*2,0,1),edgeY=clamp(Math.min(p.v,1-p.v)*2,0,1),speed=hypot(p.vx,p.vy);
      c.u=p.u;c.v=p.v;c.target=clamp(.84+(p.pressure||.55)*.22+forceMag/1900+speed/2600,.78,1.5);
      c.radius=.36+.11*Math.sqrt(edgeX*edgeY);c.axisX=.48+.58*edgeX;c.axisY=.48+.58*edgeY;
    }
    function setWallContact(side,depth,along=.5){
      const c=b.contacts[2];c.target=Math.max(c.target,clamp(.72+depth,0,1.5));c.radius=.39;
      if(side==='left'||side==='right'){c.u=side==='left'?0:1;c.v=clamp(along,0,1);c.axisX=.30;c.axisY=2.05;}
      else{c.u=clamp(along,0,1);c.v=side==='top'?0:1;c.axisX=2.05;c.axisY=.30;}
    }
    function setObjectContact(u,v,depth,axisX=.65,axisY=.65){const c=b.contacts[3];if(depth<=c.target)return;c.u=clamp(u,0,1);c.v=clamp(v,0,1);c.target=clamp(depth,0,1.5);c.radius=.30;c.axisX=axisX;c.axisY=axisY;}
    function exciteImpact(axis,impact,penetration){
      const amount=clamp(.08+penetration/70+impact/1800,.08,.17);
      if(axis==='x'){b.impactX=Math.min(b.impactX,1-amount);b.impactY=Math.max(b.impactY,1+amount*.72);}
      else{b.impactY=Math.min(b.impactY,1-amount);b.impactX=Math.max(b.impactX,1+amount*.72);}
    }
    function collideBounds(){
      const rr=root.getBoundingClientRect(),e=extents();let c=centerClient(),impact=0;
      if(c.x-e.x<rr.left+6){const pen=rr.left+6-(c.x-e.x),iv=Math.abs(b.vx);b.x+=pen;impact=Math.max(impact,iv);if(b.vx<0)b.vx=-b.vx*.22;b.omega+=clamp(-b.vy*.00072,-1,1);setWallContact('left',pen/12+iv/850,.5+clamp(b.vy/1500,-.35,.35));exciteImpact('x',iv,pen);}
      c=centerClient();if(c.x+e.x>rr.right-6){const pen=c.x+e.x-(rr.right-6),iv=Math.abs(b.vx);b.x-=pen;impact=Math.max(impact,iv);if(b.vx>0)b.vx=-b.vx*.22;b.omega+=clamp(b.vy*.00072,-1,1);setWallContact('right',pen/12+iv/850,.5+clamp(b.vy/1500,-.35,.35));exciteImpact('x',iv,pen);}
      c=centerClient();if(c.y-e.y<rr.top+6){const pen=rr.top+6-(c.y-e.y),iv=Math.abs(b.vy);b.y+=pen;impact=Math.max(impact,iv);if(b.vy<0)b.vy=-b.vy*.18;b.omega+=clamp(b.vx*.0007,-1,1);setWallContact('top',pen/12+iv/850,.5+clamp(b.vx/1500,-.35,.35));exciteImpact('y',iv,pen);b.grounded=false;}
      c=centerClient();if(c.y+e.y>rr.bottom-6){const pen=c.y+e.y-(rr.bottom-6),iv=Math.abs(b.vy);b.y-=pen;impact=Math.max(impact,iv);if(iv>72&&b.vy>0){b.vy=-iv*.17;b.grounded=false;}else{b.vy=0;b.grounded=true;}b.vx*=.84;b.omega+=clamp(-b.vx*.00062,-.9,.9);setWallContact('bottom',pen/10+iv/720,.5+clamp(b.vx/1400,-.4,.4));exciteImpact('y',iv,pen);}
      if(impact>90){b.waveX=Math.max(b.waveX,clamp(impact/105,1.5,11));b.waveY=Math.max(b.waveY,clamp(impact/118,1.4,10));}
    }
    function collideHoop(){
      if(!b.hoop||hoop.hidden)return;
      const center=centerClient(),e=extents(),board=hoop.querySelector('.real-jelly-backboard')?.getBoundingClientRect(),rim=hoop.querySelector('.real-jelly-rim')?.getBoundingClientRect();
      if(board&&center.x+e.x>board.left&&center.x-e.x<board.right&&center.y+e.y>board.top&&center.y-e.y<board.bottom){
        const pen=center.x+e.x-board.left;if(pen>0){b.x-=pen;const iv=Math.max(0,b.vx);if(b.vx>0)b.vx=-b.vx*.28;b.omega+=clamp(b.vy*.0008,-1,1);setObjectContact(1,.5,.82+pen/11+iv/800,.30,2.05);exciteImpact('x',iv,pen);b.waveY=Math.max(b.waveY,6);}
      }
      if(!rim)return;
      const pts=[{x:rim.left,y:rim.top+rim.height*.5},{x:rim.right,y:rim.top+rim.height*.5}],radius=Math.max(24,Math.min(e.x,e.y)*.54);
      for(const rp of pts){let c=centerClient(),dx=c.x-rp.x,dy=c.y-rp.y,dist=Math.max(.001,hypot(dx,dy)),min=radius+8;if(dist<min){const pen=min-dist,nx=dx/dist,ny=dy/dist;b.x+=nx*pen;b.y+=ny*pen;const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=1.38*vn*nx;b.vy-=1.38*vn*ny;}b.omega+=clamp((nx*b.vy-ny*b.vx)*.0013,-1.3,1.3);const local=rot(nx,ny,-b.angle);setObjectContact(.5-local.x*.5,.5-local.y*.5,.85+pen/10+Math.abs(vn)/760,.62,.62);b.waveX=Math.max(b.waveX,7);b.waveY=Math.max(b.waveY,7);b.grounded=false;}}
      const c=centerClient(),innerL=rim.left+18,innerR=rim.right-18,ry=rim.top+rim.height*.5;if(b.prevCenterY<ry&&c.y>=ry&&c.x>innerL&&c.x<innerR&&b.vy>80){b.score++;hoop.classList.remove('is-score');void hoop.offsetWidth;hoop.classList.add('is-score');refreshUi();}b.prevCenterX=c.x;b.prevCenterY=c.y;
    }
    function updateContacts(dt){for(const[i,c]of b.contacts.entries()){if(i>=2)c.target*=Math.exp(-10*dt);const rate=i<2?25:19;c.depth+=(c.target-c.depth)*(1-Math.exp(-rate*dt));if(c.depth<.001&&c.target<.001)c.depth=c.target=0;}}

    function tick(now){
      b.raf=0;if(!b.enabled||!document.contains(glass))return;
      const pointers=[...b.pointers.values()].slice(0,2),frameBudget=pointers.length?ACTIVE_FRAME:PASSIVE_FRAME;
      if(b.lastStep&&now-b.lastStep<frameBudget-1){b.raf=requestAnimationFrame(tick);return;}
      const dt=b.lastFrame?clamp((now-b.lastFrame)/1000,.001,.034):1/60;b.lastFrame=now;b.lastStep=now;
      for(const c of b.contacts)c.target=0;

      let ax=0,ay=(b.gravity&&!b.grounded)?1580:0,torque=0;
      const center=centerClient();
      for(let i=0;i<pointers.length;i++){
        const p=pointers[i],r=deformedLocal(p.localX,p.localY),anchorX=center.x+r.x,anchorY=center.y+r.y,avx=b.vx-b.omega*r.y,avy=b.vy+b.omega*r.x;
        const ex=p.x-anchorX,ey=p.y-anchorY,fx=ex*118+(p.vx-avx)*14,fy=ey*118+(p.vy-avy)*14;
        ax+=fx;ay+=fy;torque+=(r.x*fy-r.y*fx)*.000062;setPointerContact(i,p,hypot(fx,fy));
      }

      let targetSX=1,targetSY=1,targetSA=b.stretchAngle;
      if(pointers.length===2&&b.pair){
        const[p0,p1]=pointers,dist=Math.max(20,hypot(p1.x-p0.x,p1.y-p0.y)),ratio=clamp(dist/b.pair.startDist,.70,1.42);
        targetSX=clamp(b.pair.startStretch*ratio,.72,1.42);targetSY=clamp(Math.pow(targetSX,-.56),.76,1.26);targetSA=b.pair.restAngle;
        const pa=Math.atan2(p1.y-p0.y,p1.x-p0.x),targetAngle=clamp(b.pair.startBodyAngle+angleDelta(pa,b.pair.startPointerAngle),-MAX_ANGLE,MAX_ANGLE);
        torque+=(targetAngle-b.angle)*46-b.omega*5.2;
      }else if(pointers.length===1){
        const p=pointers[0],nx=(p.u-.5)*2,ny=(p.v-.5)*2,edge=clamp(hypot(nx,ny),0,1),speed=hypot(p.vx,p.vy);
        const squeeze=clamp((.055+(p.pressure||.55)*.045+speed/10500)*edge,0,.13);
        targetSX=1-squeeze;targetSY=1+squeeze*.68;targetSA=Math.atan2(ny*b.baseH,nx*b.baseW||.001);
        const targetShearX=clamp(ny*p.vx/2400,-.38,.38),targetShearY=clamp(nx*p.vy/2400,-.38,.38);
        [b.shearX,b.shearVX]=spring(b.shearX,b.shearVX,targetShearX,86,14,dt);[b.shearY,b.shearVY]=spring(b.shearY,b.shearVY,targetShearY,86,14,dt);
        if(speed>280){b.waveX=Math.max(b.waveX,clamp(Math.abs(p.vx)/230,0,9));b.waveY=Math.max(b.waveY,clamp(Math.abs(p.vy)/245,0,9));}
      }else{
        torque+=(-b.angle)*9.5-b.omega*2.1;[b.shearX,b.shearVX]=spring(b.shearX,b.shearVX,0,62,14,dt);[b.shearY,b.shearVY]=spring(b.shearY,b.shearVY,0,62,14,dt);
      }
      if(pointers.length!==1){[b.shearX,b.shearVX]=spring(b.shearX,b.shearVX,0,62,14,dt);[b.shearY,b.shearVY]=spring(b.shearY,b.shearVY,0,62,14,dt);}

      [b.stretchX,b.stretchVX]=spring(b.stretchX,b.stretchVX,targetSX,pointers.length?92:60,pointers.length?14:11,dt);
      [b.stretchY,b.stretchVY]=spring(b.stretchY,b.stretchVY,targetSY,pointers.length?92:60,pointers.length?14:11,dt);
      b.stretchAngle+=(targetSA-b.stretchAngle)*(1-Math.exp(-18*dt));
      b.impactX+=(1-b.impactX)*(1-Math.exp(-8.5*dt));b.impactY+=(1-b.impactY)*(1-Math.exp(-8.5*dt));

      b.vx+=ax*dt;b.vy+=ay*dt;b.omega+=torque*dt;
      b.vx*=Math.exp(-(pointers.length?4.3:(b.gravity?1.1:1.6))*dt);b.vy*=Math.exp(-(pointers.length?3.7:(b.gravity?.08:1.3))*dt);
      b.omega*=Math.exp(-(pointers.length?2.9:1.15)*dt);b.omega=clamp(b.omega,-3.1,3.1);b.angle=clamp(b.angle+b.omega*dt,-MAX_ANGLE,MAX_ANGLE);
      b.x+=b.vx*dt;b.y+=b.vy*dt;collideBounds();collideHoop();updateContacts(dt);
      b.phaseX+=dt*(8.8+Math.min(7,b.waveX*.24));b.phaseY+=dt*(8.0+Math.min(7,b.waveY*.24));b.waveX*=Math.exp(-4.8*dt);b.waveY*=Math.exp(-5.0*dt);

      glass.style.transform=`translate3d(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px,0)`;syncShader();invalidate(glass);
      const shapeMoving=Math.abs(b.stretchX-1)>.002||Math.abs(b.stretchY-1)>.002||Math.abs(b.impactX-1)>.002||Math.abs(b.impactY-1)>.002||Math.abs(b.shearX)>.002||Math.abs(b.shearY)>.002||Math.abs(b.angle)>.002||Math.abs(b.omega)>.01||b.waveX>.05||b.waveY>.05||b.contacts.some(c=>c.depth>.002||c.target>.002);
      const physicalMoving=pointers.length>0||(!b.grounded&&b.gravity)||Math.abs(b.vx)>2.5||Math.abs(b.vy)>2.5;
      if(shapeMoving||physicalMoving)b.raf=requestAnimationFrame(tick);else{b.lastFrame=b.lastStep=0;b.vx=b.vy=b.omega=0;syncShader();invalidate(glass,true);document.documentElement.dataset.realJellyPerf='idle';}
    }
    function start(){if(!b.enabled||reduce.matches)return;document.documentElement.dataset.realJellyPerf='active';if(!b.raf){b.lastFrame=b.lastStep=0;b.raf=requestAnimationFrame(tick);}}

    glass.addEventListener('pointerdown',pointerDown,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('pointermove',pointerMove,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('pointerup',pointerUp,{capture:true,passive:false,signal:controller.signal});window.addEventListener('pointercancel',pointerUp,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('resize',()=>{if(b.enabled){measureBase();start();}},{passive:true,signal:controller.signal});
    document.addEventListener('fullscreenchange',()=>setTimeout(()=>{if(b.enabled)measureBase();refreshUi();start();},20),{signal:controller.signal});
    for(const id of['ref-width','ref-height'])document.querySelector(`#${id}`)?.addEventListener('input',()=>{if(b.enabled)requestAnimationFrame(()=>{setRenderBox();measureBase();start();});},{signal:controller.signal});
    window.addEventListener('devicemotion',e=>{if(!b.enabled||!b.motion)return;const a=e.acceleration||e.accelerationIncludingGravity;if(!a)return;const ax=Number(a.x)||0,ay=Number(a.y)||0,mag=hypot(ax,ay);if(mag<1.3)return;b.vx+=clamp(ax*16,-100,100);b.vy+=clamp(-ay*14,-90,90);b.omega+=clamp(ax*.018,-.35,.35);b.waveX=Math.max(b.waveX,clamp(mag*.75,0,8));b.waveY=Math.max(b.waveY,clamp(mag*.62,0,7));b.grounded=false;start();},{passive:true,signal:controller.signal});

    baseApi.toggleGravity=function(){if(!b.enabled)return originals.toggleGravity?.();b.gravity=!b.gravity;b.grounded=false;start();refreshUi();return b.gravity;};
    baseApi.shake=function(){if(!b.enabled)return originals.shake?.();b.vx+=(Math.random()-.5)*300;b.vy-=110+Math.random()*120;b.omega+=(Math.random()-.5)*1.8;b.waveX=Math.max(b.waveX,8);b.waveY=Math.max(b.waveY,7);b.grounded=false;start();return true;};
    baseApi.reset=function(){if(!b.enabled)return originals.reset?.();resetBody(true);return true;};
    baseApi.toggleMotion=async function(){if(!b.enabled)return originals.toggleMotion?.();if(!('DeviceMotionEvent'in window))return false;if(b.motion){b.motion=false;return false;}if(typeof DeviceMotionEvent.requestPermission==='function'&&await DeviceMotionEvent.requestPermission()!=='granted')throw new Error('denied');b.motion=true;return true;};

    const api={state:b,get active(){return b.enabled;},toggle(){setEnabled(!b.enabled);return b.enabled;},setEnabled,toggleHoop(){setHoop(!b.hoop);return b.hoop;},toggleFullscreen,reset(){resetBody(true);}};
    globalThis.HJRealJellyMode=api;copyUi();refreshUi();
    try{localStorage.setItem(STORAGE,'0');}catch{}

    cleanup=()=>{
      controller.abort();if(b.raf)cancelAnimationFrame(b.raf);b.raf=0;b.enabled=false;
      Object.assign(shader,{enabled:false,angle:0,stretchX:1,stretchY:1,stretchAngle:0,shearX:0,shearY:0,waveX:0,waveY:0,contacts:[]});
      restoreBox();hoop.remove();ui.remove();shell.classList.remove('is-jelly-pseudo-fullscreen');document.documentElement.classList.remove('jelly-pseudo-fullscreen-open');
      baseApi.toggleGravity=originals.toggleGravity;baseApi.shake=originals.shake;baseApi.reset=originals.reset;baseApi.toggleMotion=originals.toggleMotion;
      if(globalThis.HJRealJellyMode===api)delete globalThis.HJRealJellyMode;delete glass.dataset.realJellyV23Ready;document.documentElement.dataset.realJellyPerf='off';invalidate(glass,true);
    };
    return true;
  }

  function sync(){
    if(!routeActive()){if(syncRaf)cancelAnimationFrame(syncRaf);syncRaf=0;syncAttempts=0;cleanup?.();cleanup=null;return;}
    const glass=document.querySelector('#realLiquidGlass'),panel=document.querySelector('.fluid-physics-panel');
    if(glass&&panel&&globalThis.HJFluidLab){syncAttempts=0;if(!glass.dataset.realJellyV23Ready){cleanup?.();cleanup=null;install(glass);}return;}
    if(syncAttempts++<180)syncRaf=requestAnimationFrame(sync);
  }
  const schedule=()=>{if(syncRaf)cancelAnimationFrame(syncRaf);syncRaf=requestAnimationFrame(sync);};
  document.addEventListener('hj:rendered',schedule);addEventListener('hashchange',schedule);queueMicrotask(schedule);
})();
