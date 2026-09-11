/* Journal v21: Real Jelly soft-body mode for Glass Lab.
   One/two-pointer force anchors, material-space rotation/stretch, wall/hoop contacts,
   gravity and fullscreen. The visible deformation is driven by LiquidGlass shader uniforms. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hypot=(x,y)=>Math.hypot(x,y);
  const BUFFER=120;
  const MAX_ANGLE=.235;
  const STORAGE='hj-real-jelly-enabled';

  const shader=globalThis.__HJRealJellyState=globalThis.__HJRealJellyState||{
    enabled:false,baseW:280,baseH:176,angle:0,stretchX:1,stretchY:1,stretchAngle:0,
    shearX:0,shearY:0,waveX:0,waveY:0,phaseX:0,phaseY:1.7,contacts:[]
  };

  let cleanup=null;

  const lang=()=>{
    const l=document.documentElement.lang||'ko';
    return l.startsWith('ja')?'ja':l.startsWith('en')?'en':'ko';
  };
  const COPY={
    ko:{title:'Real Jelly',real:'Real Jelly',full:'전체화면',hoop:'농구 골대',gravity:'젤리 중력',score:'득점',on:'REAL JELLY ON',off:'REAL JELLY OFF'},
    en:{title:'Real Jelly',real:'Real Jelly',full:'Fullscreen',hoop:'Basket hoop',gravity:'Jelly gravity',score:'Score',on:'REAL JELLY ON',off:'REAL JELLY OFF'},
    ja:{title:'Real Jelly',real:'Real Jelly',full:'全画面',hoop:'バスケットゴール',gravity:'ゼリー重力',score:'得点',on:'REAL JELLY ON',off:'REAL JELLY OFF'}
  };

  function parseConfig(glass){try{return JSON.parse(glass.dataset.config||'{}')||{};}catch{return {};}}
  let epoch=0;
  function invalidate(glass){
    const next={...parseConfig(glass),floating:false,__hjJellyEpoch:++epoch};
    glass.dataset.config=JSON.stringify(next);
  }

  function rot(x,y,a){
    const c=Math.cos(a),s=Math.sin(a);
    return {x:c*x-s*y,y:s*x+c*y};
  }
  function stretchPoint(x,y,b){
    const q=rot(x,y,-b.stretchAngle);
    return rot(q.x*b.stretchX,q.y*b.stretchY,b.stretchAngle);
  }
  function deformedLocal(x,y,b){
    const q=stretchPoint(x,y,b);
    return rot(q.x,q.y,b.angle);
  }
  function angleDelta(a,b){
    let d=a-b;
    while(d>Math.PI)d-=Math.PI*2;
    while(d<-Math.PI)d+=Math.PI*2;
    return d;
  }

  function makeContact(){
    return {u:.5,v:.5,depth:0,target:0,radius:.28,axisX:1,axisY:1};
  }

  function install(glass){
    const root=glass.closest('.refraction-root');
    const shell=root?.closest('.refraction-shell');
    const controls=shell?.querySelector('.refraction-controls');
    const panel=controls?.querySelector('.fluid-physics-panel');
    const baseApi=globalThis.HJFluidLab;
    if(!root||!shell||!controls||!panel||!baseApi)return false;
    if(glass.dataset.realJellyV21Ready)return true;
    glass.dataset.realJellyV21Ready='1';

    const controller=new AbortController();
    const baseState=baseApi.state;
    const originals={
      toggleGravity:baseApi.toggleGravity?.bind(baseApi),
      shake:baseApi.shake?.bind(baseApi),
      reset:baseApi.reset?.bind(baseApi),
      toggleMotion:baseApi.toggleMotion?.bind(baseApi)
    };

    const b={
      enabled:false,gravity:false,motion:false,hoop:false,score:0,
      x:0,y:0,vx:0,vy:0,angle:0,omega:0,
      stretchX:1,stretchY:1,stretchVX:0,stretchVY:0,stretchAngle:0,
      shearX:0,shearY:0,shearVX:0,shearVY:0,
      waveX:0,waveY:0,phaseX:0,phaseY:1.7,
      baseLeft:0,baseTop:0,baseW:glass.offsetWidth||280,baseH:glass.offsetHeight||176,
      pointers:new Map(),pair:null,contacts:[makeContact(),makeContact(),makeContact(),makeContact()],
      raf:0,lastFrame:0,prevCenterY:0,prevCenterX:0,lastImpact:0
    };

    const ui=document.createElement('section');
    ui.className='real-jelly-panel';
    panel.appendChild(ui);

    const hoop=document.createElement('div');
    hoop.className='real-jelly-hoop';
    hoop.hidden=true;
    hoop.innerHTML='<div class="real-jelly-score"><span></span><b>0</b></div><div class="real-jelly-backboard"></div><div class="real-jelly-rim"><i></i><i></i></div><div class="real-jelly-net"><i></i><i></i><i></i><i></i></div>';
    root.appendChild(hoop);

    function copyUi(){
      const c=COPY[lang()];
      ui.innerHTML=`<span class="fluid-panel-label">${c.title}</span>
        <div class="real-jelly-actions">
          <button type="button" data-real-jelly aria-pressed="${b.enabled}"><span>◌</span>${c.real}</button>
          <button type="button" data-real-gravity aria-pressed="${b.gravity}"><span>↓</span>${c.gravity}</button>
          <button type="button" data-real-hoop aria-pressed="${b.hoop}"><span>◯</span>${c.hoop}</button>
          <button type="button" data-real-fullscreen aria-pressed="${document.fullscreenElement===shell||shell.classList.contains('is-jelly-pseudo-fullscreen')}"><span>⛶</span>${c.full}</button>
        </div>
        <span class="real-jelly-status">${b.enabled?c.on:c.off}</span>`;
      const scoreLabel=hoop.querySelector('.real-jelly-score span');
      if(scoreLabel)scoreLabel.textContent=c.score;
      bindUi();
    }

    function bindUi(){
      const real=ui.querySelector('[data-real-jelly]');
      const grav=ui.querySelector('[data-real-gravity]');
      const hp=ui.querySelector('[data-real-hoop]');
      const fs=ui.querySelector('[data-real-fullscreen]');
      real?.addEventListener('click',()=>setEnabled(!b.enabled),{signal:controller.signal});
      grav?.addEventListener('click',()=>{b.gravity=!b.gravity;grav.classList.toggle('is-active',b.gravity);grav.setAttribute('aria-pressed',String(b.gravity));start();},{signal:controller.signal});
      hp?.addEventListener('click',()=>setHoop(!b.hoop),{signal:controller.signal});
      fs?.addEventListener('click',toggleFullscreen,{signal:controller.signal});
    }

    function refreshUi(){
      const c=COPY[lang()];
      const real=ui.querySelector('[data-real-jelly]');
      const grav=ui.querySelector('[data-real-gravity]');
      const hp=ui.querySelector('[data-real-hoop]');
      const fs=ui.querySelector('[data-real-fullscreen]');
      real?.classList.toggle('is-active',b.enabled); real?.setAttribute('aria-pressed',String(b.enabled));
      grav?.classList.toggle('is-active',b.gravity); grav?.setAttribute('aria-pressed',String(b.gravity));
      hp?.classList.toggle('is-active',b.hoop); hp?.setAttribute('aria-pressed',String(b.hoop));
      fs?.classList.toggle('is-active',document.fullscreenElement===shell||shell.classList.contains('is-jelly-pseudo-fullscreen'));
      fs?.setAttribute('aria-pressed',String(document.fullscreenElement===shell||shell.classList.contains('is-jelly-pseudo-fullscreen')));
      const status=ui.querySelector('.real-jelly-status'); if(status)status.textContent=b.enabled?c.on:c.off;
      const sb=hoop.querySelector('.real-jelly-score b'); if(sb)sb.textContent=String(b.score);
    }

    function currentRequestedSize(){
      const w=Number(document.querySelector('#ref-width')?.value);
      const h=Number(document.querySelector('#ref-height')?.value);
      return {w:Number.isFinite(w)?w:280,h:Number.isFinite(h)?h:176};
    }

    function setExpandedBox(){
      const {w,h}=currentRequestedSize();
      b.baseW=w;b.baseH=h;
      glass.style.setProperty('--jelly-rest-w',`${w}px`);
      glass.style.setProperty('--jelly-rest-h',`${h}px`);
      glass.style.width=`${w+BUFFER*2}px`;
      glass.style.height=`${h+BUFFER*2}px`;
      glass.style.marginLeft=`-${BUFFER}px`;
      glass.style.marginTop=`-${BUFFER}px`;
      glass.classList.add('real-jelly-active');
      shader.baseW=w;shader.baseH=h;
    }

    function restoreBox(){
      const {w,h}=currentRequestedSize();
      glass.style.width=`${w}px`;
      glass.style.height=`${h}px`;
      glass.style.removeProperty('margin-left');
      glass.style.removeProperty('margin-top');
      glass.style.removeProperty('--jelly-rest-w');
      glass.style.removeProperty('--jelly-rest-h');
      glass.classList.remove('real-jelly-active');
    }

    function measureBase(){
      const rr=root.getBoundingClientRect();
      const gr=glass.getBoundingClientRect();
      b.baseLeft=gr.left-rr.left-b.x;
      b.baseTop=gr.top-rr.top-b.y;
      return rr;
    }

    function stopBasePhysics(){
      try{
        if(baseState?.raf)cancelAnimationFrame(baseState.raf);
        baseState.raf=0;baseState.lastFrame=0;baseState.pointer=false;baseState.pointerId=null;
        baseState.gravity=false;baseState.vx=baseState.vy=0;baseState.dent=baseState.dentTarget=0;
        baseState.visualGrowth=0;baseState.impact=0;
      }catch{}
      const p=globalThis.__HJGlassDentState;
      if(p){p.depth=0;p.shapeX=1;p.shapeY=1;}
      glass.classList.remove('is-fluid-pressed');
    }

    function resetBody(keepMode=true){
      b.pointers.clear();b.pair=null;
      b.x=b.y=b.vx=b.vy=0;b.angle=b.omega=0;
      b.stretchX=b.stretchY=1;b.stretchVX=b.stretchVY=0;b.stretchAngle=0;
      b.shearX=b.shearY=b.shearVX=b.shearVY=0;b.waveX=b.waveY=0;b.phaseX=0;b.phaseY=1.7;
      for(const c of b.contacts)Object.assign(c,makeContact());
      glass.style.transform='translate3d(0px,0px,0)';
      if(!keepMode)b.gravity=false;
      measureBase();
      syncShader();
      invalidate(glass);
      refreshUi();
    }

    function setEnabled(on){
      on=!!on;
      if(on===b.enabled)return;
      if(on){
        const oldX=Number(baseState?.x)||0,oldY=Number(baseState?.y)||0;
        stopBasePhysics();
        b.enabled=true;b.x=oldX;b.y=oldY;
        setExpandedBox();
        requestAnimationFrame(()=>{
          measureBase();
          glass.style.transform=`translate3d(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px,0)`;
          syncShader();invalidate(glass);start();
        });
        try{localStorage.setItem(STORAGE,'1');}catch{}
      }else{
        b.enabled=false;b.gravity=false;b.motion=false;b.pointers.clear();b.pair=null;
        if(b.raf)cancelAnimationFrame(b.raf);b.raf=0;b.lastFrame=0;
        Object.assign(shader,{enabled:false,angle:0,stretchX:1,stretchY:1,stretchAngle:0,shearX:0,shearY:0,waveX:0,waveY:0,contacts:[]});
        restoreBox();
        const growth=baseApi.getPressGrowth?.();
        originals.reset?.();
        if(Number.isFinite(growth))baseApi.setPressGrowth?.(growth);
        b.x=b.y=b.vx=b.vy=0;b.angle=b.omega=0;b.stretchX=b.stretchY=1;
        invalidate(glass);
        try{localStorage.setItem(STORAGE,'0');}catch{}
      }
      refreshUi();
    }

    function setHoop(on){
      b.hoop=!!on;hoop.hidden=!b.hoop;
      root.classList.toggle('has-real-jelly-hoop',b.hoop);
      if(b.hoop)b.score=0;
      refreshUi();
      start();
    }

    async function toggleFullscreen(){
      const active=document.fullscreenElement===shell||shell.classList.contains('is-jelly-pseudo-fullscreen');
      if(active){
        if(document.fullscreenElement&&document.exitFullscreen){
          try{await document.exitFullscreen();}catch{}
        }
        shell.classList.remove('is-jelly-pseudo-fullscreen');
        document.documentElement.classList.remove('jelly-pseudo-fullscreen-open');
      }else if(shell.requestFullscreen){
        try{await shell.requestFullscreen({navigationUI:'hide'});}
        catch{
          shell.classList.add('is-jelly-pseudo-fullscreen');
          document.documentElement.classList.add('jelly-pseudo-fullscreen-open');
        }
      }else{
        shell.classList.add('is-jelly-pseudo-fullscreen');
        document.documentElement.classList.add('jelly-pseudo-fullscreen-open');
      }
      setTimeout(()=>{measureBase();refreshUi();start();},40);
    }

    function syncShader(){
      shader.enabled=b.enabled;
      shader.baseW=b.baseW;shader.baseH=b.baseH;
      shader.angle=b.angle;shader.stretchX=b.stretchX;shader.stretchY=b.stretchY;shader.stretchAngle=b.stretchAngle;
      shader.shearX=b.shearX;shader.shearY=b.shearY;
      shader.waveX=b.waveX;shader.waveY=b.waveY;shader.phaseX=b.phaseX;shader.phaseY=b.phaseY;
      shader.contacts=b.contacts.map(c=>({u:c.u,v:c.v,depth:c.depth,radius:c.radius,axisX:c.axisX,axisY:c.axisY}));
    }

    function updatePair(){
      if(b.pointers.size<2){b.pair=null;return;}
      const pts=[...b.pointers.values()].slice(0,2);
      const p0=pts[0],p1=pts[1];
      const dist=Math.max(24,hypot(p1.x-p0.x,p1.y-p0.y));
      const pointerAngle=Math.atan2(p1.y-p0.y,p1.x-p0.x);
      const restDX=p1.localX-p0.localX,restDY=p1.localY-p0.localY;
      const restDist=Math.max(24,hypot(restDX,restDY));
      const restAngle=Math.atan2(restDY,restDX);
      b.pair={ids:[p0.id,p1.id],startDist:dist,startStretch:b.stretchX,restDist,restAngle,startPointerAngle:pointerAngle,startBodyAngle:b.angle};
    }

    function pointerUV(e){
      const gr=glass.getBoundingClientRect();
      const left=gr.left+BUFFER,top=gr.top+BUFFER;
      return {
        u:clamp((e.clientX-left)/Math.max(1,b.baseW),0,1),
        v:clamp((e.clientY-top)/Math.max(1,b.baseH),0,1)
      };
    }

    function pointerDown(e){
      if(!b.enabled||b.pointers.size>=2)return;
      if(e.button!==undefined&&e.button!==0)return;
      stopBasePhysics();
      const uv=pointerUV(e),now=performance.now();
      const p={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,vx:0,vy:0,lastTime:now,
        u:uv.u,v:uv.v,localX:(uv.u-.5)*b.baseW,localY:(uv.v-.5)*b.baseH,pressure:e.pressure||0};
      b.pointers.set(e.pointerId,p);
      if(b.pointers.size===2)updatePair();
      try{glass.setPointerCapture(e.pointerId);}catch{}
      glass.classList.add('is-real-jelly-held');
      start();
      e.preventDefault();e.stopImmediatePropagation();
    }

    function pointerMove(e){
      const p=b.pointers.get(e.pointerId);
      if(!b.enabled||!p)return;
      const now=performance.now(),dt=Math.max(8,now-p.lastTime)/1000;
      p.vx=p.vx*.48+((e.clientX-p.x)/dt)*.52;
      p.vy=p.vy*.48+((e.clientY-p.y)/dt)*.52;
      p.lastX=p.x;p.lastY=p.y;p.x=e.clientX;p.y=e.clientY;p.lastTime=now;p.pressure=e.pressure||p.pressure;
      start();
      e.preventDefault();e.stopImmediatePropagation();
    }

    function pointerUp(e){
      if(!b.enabled||!b.pointers.has(e.pointerId))return;
      const p=b.pointers.get(e.pointerId);
      b.vx+=clamp(p.vx*.16,-260,260);b.vy+=clamp(p.vy*.16,-260,260);
      b.waveX=Math.max(b.waveX,Math.min(7,Math.abs(p.vx)*.004));
      b.waveY=Math.max(b.waveY,Math.min(7,Math.abs(p.vy)*.004));
      b.pointers.delete(e.pointerId);
      if(b.pointers.size<2)b.pair=null;
      if(!b.pointers.size)glass.classList.remove('is-real-jelly-held');
      start();
      e.stopImmediatePropagation();
    }

    function spring(value,vel,target,k,d,dt){
      vel+=(target-value)*k*dt;
      vel*=Math.exp(-d*dt);
      value+=vel*dt;
      return [value,vel];
    }

    function setPointerContact(slot,p,forceMag){
      const c=b.contacts[slot];
      const edgeX=clamp(Math.min(p.u,1-p.u)*2,0,1),edgeY=clamp(Math.min(p.v,1-p.v)*2,0,1);
      c.u=p.u;c.v=p.v;c.target=clamp(.42+forceMag/2600+hypot(p.vx,p.vy)/2600,.38,1.22);
      c.radius=.28+.12*Math.sqrt(edgeX*edgeY);
      c.axisX=.56+.44*edgeX;c.axisY=.56+.44*edgeY;
    }

    function setWallContact(side,depth,along=.5){
      const c=b.contacts[2];
      c.target=Math.max(c.target,clamp(depth,0,1.25));
      c.radius=.34;
      if(side==='left'||side==='right'){
        c.u=side==='left'?0:1;c.v=clamp(along,0,1);c.axisX=.42;c.axisY=1.85;
      }else{
        c.u=clamp(along,0,1);c.v=side==='top'?0:1;c.axisX=1.85;c.axisY=.42;
      }
    }

    function setObjectContact(u,v,depth,axisX=.72,axisY=.72){
      const c=b.contacts[3];
      if(depth<=c.target)return;
      c.u=clamp(u,0,1);c.v=clamp(v,0,1);c.target=clamp(depth,0,1.25);c.radius=.25;c.axisX=axisX;c.axisY=axisY;
    }

    function extents(){
      const hx=b.baseW*.5,hy=b.baseH*.5;
      let ex=0,ey=0;
      for(const sx of [-1,1])for(const sy of [-1,1]){
        const q=deformedLocal(sx*hx,sy*hy,b);
        ex=Math.max(ex,Math.abs(q.x));ey=Math.max(ey,Math.abs(q.y));
      }
      return {x:ex,y:ey};
    }

    function centerClient(){
      const rr=root.getBoundingClientRect();
      return {x:rr.left+b.baseLeft+BUFFER+b.baseW*.5+b.x,y:rr.top+b.baseTop+BUFFER+b.baseH*.5+b.y};
    }

    function collideBounds(){
      const rr=root.getBoundingClientRect(),e=extents();
      let c=centerClient(),impact=0;
      if(c.x-e.x<rr.left+6){
        const pen=rr.left+6-(c.x-e.x);b.x+=pen;
        impact=Math.max(impact,Math.abs(b.vx));if(b.vx<0){b.vx=-b.vx*.24;b.omega+=clamp(-b.vy*.00055,-.7,.7);}
        setWallContact('left',pen/16+impact/1100,.5+clamp(b.vy/1600,-.32,.32));
      }
      c=centerClient();
      if(c.x+e.x>rr.right-6){
        const pen=c.x+e.x-(rr.right-6);b.x-=pen;
        impact=Math.max(impact,Math.abs(b.vx));if(b.vx>0){b.vx=-b.vx*.24;b.omega+=clamp(b.vy*.00055,-.7,.7);}
        setWallContact('right',pen/16+impact/1100,.5+clamp(b.vy/1600,-.32,.32));
      }
      c=centerClient();
      if(c.y-e.y<rr.top+6){
        const pen=rr.top+6-(c.y-e.y);b.y+=pen;
        impact=Math.max(impact,Math.abs(b.vy));if(b.vy<0){b.vy=-b.vy*.20;b.omega+=clamp(b.vx*.0005,-.7,.7);}
        setWallContact('top',pen/16+impact/1100,.5+clamp(b.vx/1600,-.32,.32));
      }
      c=centerClient();
      if(c.y+e.y>rr.bottom-6){
        const pen=c.y+e.y-(rr.bottom-6);b.y-=pen;
        impact=Math.max(impact,Math.abs(b.vy));if(b.vy>0){b.vy=-b.vy*.18;b.vx*=.86;b.omega+=clamp(-b.vx*.00042,-.6,.6);}
        setWallContact('bottom',pen/14+impact/900,.5+clamp(b.vx/1500,-.35,.35));
      }
      if(impact>120){
        b.waveX=Math.max(b.waveX,clamp(impact/145,1.2,9));
        b.waveY=Math.max(b.waveY,clamp(impact/170,1.0,8));
      }
    }

    function collideHoop(){
      if(!b.hoop||hoop.hidden)return;
      const center=centerClient(),e=extents();
      const board=hoop.querySelector('.real-jelly-backboard')?.getBoundingClientRect();
      const rim=hoop.querySelector('.real-jelly-rim')?.getBoundingClientRect();
      if(board && center.x+e.x>board.left && center.x-e.x<board.right && center.y+e.y>board.top && center.y-e.y<board.bottom){
        const fromLeft=Math.abs((center.x+e.x)-board.left)<=Math.abs(board.right-(center.x-e.x));
        if(fromLeft){
          const pen=center.x+e.x-board.left;b.x-=Math.max(0,pen);
          if(b.vx>0)b.vx=-b.vx*.32;
          b.omega+=clamp(b.vy*.00065,-.8,.8);
          setObjectContact(1,.5,pen/15+Math.abs(b.vx)/950,.42,1.7);
          b.waveY=Math.max(b.waveY,4.5);
        }
      }
      if(!rim)return;
      const pts=[{x:rim.left,y:rim.top+rim.height*.5},{x:rim.right,y:rim.top+rim.height*.5}];
      const radius=Math.max(26,Math.min(e.x,e.y)*.58);
      for(const rp of pts){
        let c=centerClient(),dx=c.x-rp.x,dy=c.y-rp.y,dist=Math.max(.001,hypot(dx,dy)),min=radius+8;
        if(dist<min){
          const pen=min-dist,nx=dx/dist,ny=dy/dist;
          b.x+=nx*pen;b.y+=ny*pen;
          const vn=b.vx*nx+b.vy*ny;
          if(vn<0){b.vx-=1.42*vn*nx;b.vy-=1.42*vn*ny;}
          b.omega+=clamp((nx*b.vy-ny*b.vx)*.0011,-1.1,1.1);
          const local=rot(nx,ny,-b.angle);
          setObjectContact(.5-local.x*.5,.5-local.y*.5,pen/12+Math.abs(vn)/900,.7,.7);
          b.waveX=Math.max(b.waveX,5);b.waveY=Math.max(b.waveY,5);
        }
      }

      const c=centerClient();
      const innerL=rim.left+18,innerR=rim.right-18,ry=rim.top+rim.height*.5;
      if(b.prevCenterY<ry && c.y>=ry && c.x>innerL && c.x<innerR && b.vy>80){
        b.score++;hoop.classList.remove('is-score');void hoop.offsetWidth;hoop.classList.add('is-score');refreshUi();
      }
      b.prevCenterX=c.x;b.prevCenterY=c.y;
    }

    function updateContacts(dt){
      for(const [i,c] of b.contacts.entries()){
        if(i>=2)c.target*=Math.exp(-12*dt);
        const rate=i<2?22:17;
        c.depth+=(c.target-c.depth)*(1-Math.exp(-rate*dt));
        if(c.depth<.001&&c.target<.001)c.depth=c.target=0;
      }
    }

    function tick(now){
      b.raf=0;
      if(!b.enabled||!document.contains(glass))return;
      const dt=b.lastFrame?clamp((now-b.lastFrame)/1000,.001,.028):1/60;b.lastFrame=now;
      b.contacts[0].target=0;b.contacts[1].target=0;b.contacts[2].target=0;b.contacts[3].target=0;

      let ax=0,ay=b.gravity?1580:0,torque=0;
      const center=centerClient();
      const pointers=[...b.pointers.values()].slice(0,2);
      for(let i=0;i<pointers.length;i++){
        const p=pointers[i];
        const r=deformedLocal(p.localX,p.localY,b);
        const anchorX=center.x+r.x,anchorY=center.y+r.y;
        const avx=b.vx-b.omega*r.y,avy=b.vy+b.omega*r.x;
        const ex=p.x-anchorX,ey=p.y-anchorY;
        const fx=ex*105+(p.vx-avx)*13;
        const fy=ey*105+(p.vy-avy)*13;
        ax+=fx;ay+=fy;
        torque+=(r.x*fy-r.y*fx)*.000035;
        setPointerContact(i,p,hypot(fx,fy));
      }

      let targetSX=1,targetSY=1,targetSA=b.stretchAngle;
      if(pointers.length===2 && b.pair){
        const p0=pointers[0],p1=pointers[1];
        const dist=Math.max(20,hypot(p1.x-p0.x,p1.y-p0.y));
        const ratio=clamp(dist/b.pair.startDist,.58,1.7);
        targetSX=clamp(b.pair.startStretch*ratio,.60,1.68);
        targetSY=clamp(Math.pow(targetSX,-.38),.72,1.28);
        targetSA=b.pair.restAngle;
        const pa=Math.atan2(p1.y-p0.y,p1.x-p0.x);
        const targetAngle=clamp(b.pair.startBodyAngle+angleDelta(pa,b.pair.startPointerAngle),-MAX_ANGLE,MAX_ANGLE);
        torque+=(targetAngle-b.angle)*32-b.omega*4.5;
      }else if(!pointers.length){
        torque+=(-b.angle)*7.5-b.omega*1.8;
      }

      if(pointers.length===1){
        const p=pointers[0];
        const edgeX=(p.u-.5)*2,edgeY=(p.v-.5)*2;
        const speed=hypot(p.vx,p.vy);
        const targetShearX=clamp(edgeY*p.vx/3200,-.24,.24);
        const targetShearY=clamp(edgeX*p.vy/3200,-.24,.24);
        [b.shearX,b.shearVX]=spring(b.shearX,b.shearVX,targetShearX,72,13,dt);
        [b.shearY,b.shearVY]=spring(b.shearY,b.shearVY,targetShearY,72,13,dt);
        if(speed>420){
          b.waveX=Math.max(b.waveX,clamp(Math.abs(p.vx)/310,0,6));
          b.waveY=Math.max(b.waveY,clamp(Math.abs(p.vy)/340,0,6));
        }
      }else{
        [b.shearX,b.shearVX]=spring(b.shearX,b.shearVX,0,58,13,dt);
        [b.shearY,b.shearVY]=spring(b.shearY,b.shearVY,0,58,13,dt);
      }

      [b.stretchX,b.stretchVX]=spring(b.stretchX,b.stretchVX,targetSX,pointers.length===2?82:54,pointers.length===2?12:10,dt);
      [b.stretchY,b.stretchVY]=spring(b.stretchY,b.stretchVY,targetSY,pointers.length===2?82:54,pointers.length===2?12:10,dt);
      b.stretchAngle+=(targetSA-b.stretchAngle)*(1-Math.exp(-15*dt));

      b.vx+=ax*dt;b.vy+=ay*dt;b.omega+=torque*dt;
      const linearDamp=pointers.length?Math.exp(-4.0*dt):Math.exp(-(b.gravity?.32:1.2)*dt);
      b.vx*=linearDamp;b.vy*=pointers.length?Math.exp(-3.4*dt):Math.exp(-(b.gravity?.06:1.0)*dt);
      b.omega*=Math.exp(-(pointers.length?2.5:.85)*dt);
      b.omega=clamp(b.omega,-2.2,2.2);
      b.angle=clamp(b.angle+b.omega*dt,-MAX_ANGLE,MAX_ANGLE);
      b.x+=b.vx*dt;b.y+=b.vy*dt;

      collideBounds();
      collideHoop();
      updateContacts(dt);

      b.phaseX+=dt*(8.2+Math.min(5,b.waveX*.2));
      b.phaseY+=dt*(7.4+Math.min(5,b.waveY*.2));
      b.waveX*=Math.exp(-4.1*dt);b.waveY*=Math.exp(-4.35*dt);

      glass.style.transform=`translate3d(${b.x.toFixed(3)}px,${b.y.toFixed(3)}px,0)`;
      syncShader();invalidate(glass);

      const shapeMoving=Math.abs(b.stretchX-1)>.002||Math.abs(b.stretchY-1)>.002||Math.abs(b.shearX)>.002||Math.abs(b.shearY)>.002||Math.abs(b.angle)>.002||Math.abs(b.omega)>.01||b.waveX>.05||b.waveY>.05||b.contacts.some(c=>c.depth>.002||c.target>.002);
      const physicalMoving=b.pointers.size>0||b.gravity||Math.abs(b.vx)>2||Math.abs(b.vy)>2;
      if(shapeMoving||physicalMoving)b.raf=requestAnimationFrame(tick);
      else{b.lastFrame=0;b.vx=b.vy=b.omega=0;syncShader();invalidate(glass);}
    }

    function start(){
      if(!b.enabled||reduce.matches)return;
      if(!b.raf){b.lastFrame=0;b.raf=requestAnimationFrame(tick);}
    }

    glass.addEventListener('pointerdown',pointerDown,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('pointermove',pointerMove,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('pointerup',pointerUp,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('pointercancel',pointerUp,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('resize',()=>{if(b.enabled){measureBase();start();}},{passive:true,signal:controller.signal});
    document.addEventListener('fullscreenchange',()=>{setTimeout(()=>{if(b.enabled)measureBase();refreshUi();start();},20);},{signal:controller.signal});

    for(const id of ['ref-width','ref-height']){
      document.querySelector(`#${id}`)?.addEventListener('input',()=>{
        if(!b.enabled)return;
        requestAnimationFrame(()=>{setExpandedBox();measureBase();start();});
      },{signal:controller.signal});
    }

    window.addEventListener('devicemotion',e=>{
      if(!b.enabled||!b.motion)return;
      const a=e.acceleration||e.accelerationIncludingGravity;if(!a)return;
      const ax=Number(a.x)||0,ay=Number(a.y)||0,mag=hypot(ax,ay);
      if(mag<1.2)return;
      b.vx+=clamp(ax*18,-110,110);b.vy+=clamp(-ay*15,-100,100);
      b.waveX=Math.max(b.waveX,clamp(mag*.8,0,7));b.waveY=Math.max(b.waveY,clamp(mag*.65,0,6));start();
    },{passive:true,signal:controller.signal});

    baseApi.toggleGravity=function(){
      if(!b.enabled)return originals.toggleGravity?.();
      b.gravity=!b.gravity;start();refreshUi();return b.gravity;
    };
    baseApi.shake=function(){
      if(!b.enabled)return originals.shake?.();
      b.vx+=(Math.random()-.5)*330;b.vy-=120+Math.random()*130;b.omega+=(Math.random()-.5)*1.3;
      b.waveX=Math.max(b.waveX,7);b.waveY=Math.max(b.waveY,6);start();return true;
    };
    baseApi.reset=function(){
      if(!b.enabled)return originals.reset?.();
      resetBody(true);return true;
    };
    baseApi.toggleMotion=async function(){
      if(!b.enabled)return originals.toggleMotion?.();
      if(!('DeviceMotionEvent'in window))return false;
      if(b.motion){b.motion=false;return false;}
      if(typeof DeviceMotionEvent.requestPermission==='function'&&await DeviceMotionEvent.requestPermission()!=='granted')throw new Error('denied');
      b.motion=true;return true;
    };

    const api={
      state:b,
      get active(){return b.enabled;},
      toggle(){setEnabled(!b.enabled);return b.enabled;},
      setEnabled,
      toggleHoop(){setHoop(!b.hoop);return b.hoop;},
      toggleFullscreen,
      reset(){resetBody(true);}
    };
    globalThis.HJRealJellyMode=api;

    copyUi();refreshUi();
    try{if(localStorage.getItem(STORAGE)==='1')setTimeout(()=>setEnabled(true),0);}catch{}

    cleanup=()=>{
      controller.abort();
      if(b.raf)cancelAnimationFrame(b.raf);
      b.raf=0;b.enabled=false;
      Object.assign(shader,{enabled:false,angle:0,stretchX:1,stretchY:1,stretchAngle:0,shearX:0,shearY:0,waveX:0,waveY:0,contacts:[]});
      restoreBox();
      hoop.remove();ui.remove();
      shell.classList.remove('is-jelly-pseudo-fullscreen');
      document.documentElement.classList.remove('jelly-pseudo-fullscreen-open');
      baseApi.toggleGravity=originals.toggleGravity;
      baseApi.shake=originals.shake;
      baseApi.reset=originals.reset;
      baseApi.toggleMotion=originals.toggleMotion;
      if(globalThis.HJRealJellyMode===api)delete globalThis.HJRealJellyMode;
      delete glass.dataset.realJellyV21Ready;
      invalidate(glass);
    };
    return true;
  }

  function sync(){
    if(!location.hash.startsWith('#/lab')||location.hash.startsWith('#/lab/vision')){
      cleanup?.();cleanup=null;return;
    }
    const glass=document.querySelector('#realLiquidGlass');
    if(!glass||!globalThis.HJFluidLab){requestAnimationFrame(sync);return;}
    if(!glass.dataset.realJellyV21Ready)install(glass);
  }

  document.addEventListener('hj:rendered',()=>requestAnimationFrame(sync));
  addEventListener('hashchange',()=>requestAnimationFrame(sync));
  queueMicrotask(sync);
})();
