/* Journal v27 — unified Real Jelly physics/input/render state. */
(() => {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hypot=(x,y)=>Math.hypot(x,y);
  const TAU=Math.PI*2;
  const MAX_STRETCH=1.34;
  const MIN_STRETCH=.68;
  const STORAGE='hj-real-jelly-v27-enabled';
  const shader=globalThis.__HJRealJellyState=globalThis.__HJRealJellyState||{};
  Object.assign(shader,{enabled:false,baseW:280,baseH:176,angle:0,stretchX:1,stretchY:1,stretchAngle:0,shearX:0,shearY:0,waveX:0,waveY:0,phaseX:0,phaseY:0,contacts:[]});
  let cleanup=null,syncRaf=0,syncAttempts=0,epoch=0,lastInvalidate=0;

  /* The old v23 renderer clamped u_hjJellyAngle to ±0.42 rad. Override only that
     uniform boundary, before LiquidGlass creates its WebGL programs. */
  const glProto=globalThis.WebGLRenderingContext?.prototype;
  if(glProto&&!glProto.__hjJellyV27Angle){
    Object.defineProperty(glProto,'__hjJellyV27Angle',{value:true,configurable:false});
    const oldGet=glProto.getUniformLocation,old1f=glProto.uniform1f;
    const angleLocs=new WeakSet();
    glProto.getUniformLocation=function(program,name){const loc=oldGet.call(this,program,name);if(loc&&name==='u_hjJellyAngle')angleLocs.add(loc);return loc;};
    glProto.uniform1f=function(loc,value){if(loc&&angleLocs.has(loc)&&shader.enabled)value=Number.isFinite(Number(shader.angle))?Number(shader.angle):0;return old1f.call(this,loc,value);};
  }

  const routeActive=()=>location.hash.startsWith('#/lab')&&!location.hash.startsWith('#/lab/vision');
  const lang=()=>{const l=document.documentElement.lang||'ko';return l.startsWith('ja')?'ja':l.startsWith('en')?'en':'ko';};
  const COPY={
    ko:{title:'Real Jelly',real:'Real Jelly',full:'전체화면',hoop:'농구 골대',gravity:'젤리 중력',score:'득점',on:'SOFT BODY ACTIVE',off:'SOFT BODY OFF'},
    en:{title:'Real Jelly',real:'Real Jelly',full:'Fullscreen',hoop:'Basket hoop',gravity:'Jelly gravity',score:'Score',on:'SOFT BODY ACTIVE',off:'SOFT BODY OFF'},
    ja:{title:'Real Jelly',real:'Real Jelly',full:'全画面',hoop:'バスケットゴール',gravity:'ゼリー重力',score:'得点',on:'SOFT BODY ACTIVE',off:'SOFT BODY OFF'}
  };
  const parseConfig=el=>{try{return JSON.parse(el.dataset.config||'{}')||{};}catch{return{};}};
  function invalidate(glass,force=false){const now=performance.now();if(!force&&now-lastInvalidate<18)return false;lastInvalidate=now;glass.dataset.config=JSON.stringify({...parseConfig(glass),floating:false,__hjJellyEpoch:++epoch});return true;}
  const rot=(x,y,a)=>{const c=Math.cos(a),s=Math.sin(a);return{x:c*x-s*y,y:s*x+c*y};};
  const wrap=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
  function angleDelta(a,b){let d=a-b;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;}
  function spring(v,vel,target,k,d,dt){vel+=(target-v)*k*dt;vel*=Math.exp(-d*dt);v+=vel*dt;return[v,vel];}
  const contact=()=>({u:.5,v:.5,depth:0,target:0,radius:.34,axisX:1,axisY:1});

  function install(glass){
    const root=glass.closest('.refraction-root');
    const shell=root?.closest('.refraction-shell');
    const controls=shell?.querySelector('.refraction-controls');
    const panel=controls?.querySelector('.fluid-physics-panel');
    const baseApi=globalThis.HJFluidLab;
    if(!root||!shell||!controls||!panel||!baseApi)return false;
    if(glass.dataset.realJellyV27Ready==='1')return true;

    try{globalThis.HJRealJellyAngularV25?.stop?.();}catch{}
    try{globalThis.HJRealJellyMode?.setEnabled?.(false);}catch{}
    document.querySelectorAll('.real-jelly-panel,.real-jelly-hoop').forEach(n=>n.remove());
    glass.querySelectorAll(':scope > .glass-content').forEach(n=>n.remove());
    delete glass.dataset.realJellyV21Ready;delete glass.dataset.realJellyV23Ready;delete glass.dataset.realJellyV24Ready;
    glass.dataset.realJellyV27Ready='1';

    const controller=new AbortController();
    const baseState=baseApi.state;
    const originals={toggleGravity:baseApi.toggleGravity?.bind(baseApi),shake:baseApi.shake?.bind(baseApi),reset:baseApi.reset?.bind(baseApi),toggleMotion:baseApi.toggleMotion?.bind(baseApi)};
    const b={
      enabled:false,gravity:false,grounded:false,motion:false,hoop:false,score:0,
      x:0,y:0,vx:0,vy:0,angle:0,omega:0,
      stretchX:1,stretchY:1,stretchVX:0,stretchVY:0,stretchAngle:0,
      impactX:1,impactY:1,shearX:0,shearY:0,shearVX:0,shearVY:0,
      baseLeft:0,baseTop:0,baseW:280,baseH:176,renderW:0,renderH:0,offsetX:0,offsetY:0,
      pointers:new Map(),pair:null,contacts:[contact(),contact(),contact(),contact()],
      raf:0,lastTime:0,prevCenterY:0
    };

    const ui=document.createElement('section');ui.className='real-jelly-panel';panel.appendChild(ui);
    const hoop=document.createElement('div');hoop.className='real-jelly-hoop';hoop.hidden=true;
    hoop.innerHTML='<div class="real-jelly-score"><span></span><b>0</b></div><div class="real-jelly-backboard"></div><div class="real-jelly-rim"><i></i><i></i></div><div class="real-jelly-net"><i></i><i></i><i></i><i></i></div>';
    root.appendChild(hoop);

    function copyUi(){
      const c=COPY[lang()];
      ui.innerHTML=`<span class="fluid-panel-label">${c.title}</span><div class="real-jelly-actions"><button type="button" data-real-jelly><span>◌</span>${c.real}</button><button type="button" data-real-gravity><span>↓</span>${c.gravity}</button><button type="button" data-real-hoop><span>◯</span>${c.hoop}</button><button type="button" data-real-fullscreen><span>⛶</span>${c.full}</button></div><span class="real-jelly-status">${c.off}</span>`;
      hoop.querySelector('.real-jelly-score span').textContent=c.score;
      ui.querySelector('[data-real-jelly]')?.addEventListener('click',()=>setEnabled(!b.enabled),{signal:controller.signal});
      ui.querySelector('[data-real-gravity]')?.addEventListener('click',()=>{b.gravity=!b.gravity;b.grounded=false;refreshUi();start();},{signal:controller.signal});
      ui.querySelector('[data-real-hoop]')?.addEventListener('click',()=>setHoop(!b.hoop),{signal:controller.signal});
      ui.querySelector('[data-real-fullscreen]')?.addEventListener('click',toggleFullscreen,{signal:controller.signal});
    }
    function refreshUi(){
      const c=COPY[lang()],fsOn=document.fullscreenElement===shell||shell.classList.contains('is-jelly-pseudo-fullscreen');
      const real=ui.querySelector('[data-real-jelly]'),grav=ui.querySelector('[data-real-gravity]'),hp=ui.querySelector('[data-real-hoop]'),fs=ui.querySelector('[data-real-fullscreen]');
      real?.classList.toggle('is-active',b.enabled);real?.setAttribute('aria-pressed',String(b.enabled));
      grav?.classList.toggle('is-active',b.gravity);grav?.setAttribute('aria-pressed',String(b.gravity));
      hp?.classList.toggle('is-active',b.hoop);hp?.setAttribute('aria-pressed',String(b.hoop));
      fs?.classList.toggle('is-active',fsOn);fs?.setAttribute('aria-pressed',String(fsOn));
      const st=ui.querySelector('.real-jelly-status');if(st)st.textContent=b.enabled?c.on:c.off;
      const sc=hoop.querySelector('.real-jelly-score b');if(sc)sc.textContent=String(b.score);
    }
    function requestedSize(){const w=Number(document.querySelector('#ref-width')?.value),h=Number(document.querySelector('#ref-height')?.value);return{w:Number.isFinite(w)?w:280,h:Number.isFinite(h)?h:176};}
    function setRenderBox(){
      const{w,h}=requestedSize();b.baseW=w;b.baseH=h;shader.baseW=w;shader.baseH=h;
      const side=Math.ceil(Math.hypot(w*MAX_STRETCH,h*MAX_STRETCH)+24);
      b.renderW=side;b.renderH=side;b.offsetX=(side-w)/2;b.offsetY=(side-h)/2;
      glass.style.width=`${side}px`;glass.style.height=`${side}px`;glass.style.marginLeft=`-${b.offsetX}px`;glass.style.marginTop=`-${b.offsetY}px`;
      glass.style.setProperty('--jelly-rest-w',`${w}px`);glass.style.setProperty('--jelly-rest-h',`${h}px`);glass.classList.add('real-jelly-active');
    }
    function restoreBox(){const{w,h}=requestedSize();glass.style.width=`${w}px`;glass.style.height=`${h}px`;glass.style.removeProperty('margin-left');glass.style.removeProperty('margin-top');glass.style.removeProperty('--jelly-rest-w');glass.style.removeProperty('--jelly-rest-h');glass.classList.remove('real-jelly-active','is-real-jelly-held');}
    function measureBase(){const rr=root.getBoundingClientRect(),gr=glass.getBoundingClientRect();b.baseLeft=gr.left-rr.left-b.x;b.baseTop=gr.top-rr.top-b.y;return rr;}
    function centerClient(){const rr=root.getBoundingClientRect();return{x:rr.left+b.baseLeft+b.offsetX+b.baseW*.5+b.x,y:rr.top+b.baseTop+b.offsetY+b.baseH*.5+b.y};}
    function effectiveStretch(){return{x:clamp(b.stretchX*b.impactX,.55,MAX_STRETCH),y:clamp(b.stretchY*b.impactY,.55,MAX_STRETCH)};}
    function materialToBody(x,y){
      const s=effectiveStretch();let q=rot(x,y,-b.stretchAngle);q.x*=s.x;q.y*=s.y;q=rot(q.x,q.y,b.stretchAngle);
      const nx=y/Math.max(1,b.baseH*.5),ny=x/Math.max(1,b.baseW*.5);q.x+=b.shearX*nx*Math.min(34,b.baseW*.12);q.y+=b.shearY*ny*Math.min(30,b.baseH*.16);
      return rot(q.x,q.y,b.angle);
    }
    function bodyToMaterial(x,y){
      let q=rot(x,y,-b.angle);
      const nx=q.y/Math.max(1,b.baseH*.5),ny=q.x/Math.max(1,b.baseW*.5);q.x-=b.shearX*nx*Math.min(34,b.baseW*.12);q.y-=b.shearY*ny*Math.min(30,b.baseH*.16);
      q=rot(q.x,q.y,-b.stretchAngle);const s=effectiveStretch();q.x/=Math.max(.08,s.x);q.y/=Math.max(.08,s.y);return rot(q.x,q.y,b.stretchAngle);
    }
    function insideMaterial(x,y,pad=8){
      const r=Math.min(30,b.baseW*.18,b.baseH*.28),hx=b.baseW*.5-r,hy=b.baseH*.5-r,qx=Math.abs(x)-hx,qy=Math.abs(y)-hy;
      const sdf=hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r;return sdf<=pad;
    }
    const boundarySamples=()=>{const hx=b.baseW*.5,hy=b.baseH*.5;return [[-hx,-hy],[0,-hy],[hx,-hy],[hx,0],[hx,hy],[0,hy],[-hx,hy],[-hx,0]].map(([x,y])=>materialToBody(x,y));};
    function support(nx,ny){let best=null,bestDot=-Infinity;for(const q of boundarySamples()){const d=q.x*nx+q.y*ny;if(d>bestDot){bestDot=d;best=q;}}return best||{x:0,y:0};}
    function extents(){let ex=0,ey=0;for(const q of boundarySamples()){ex=Math.max(ex,Math.abs(q.x));ey=Math.max(ey,Math.abs(q.y));}return{x:ex,y:ey};}
    function inertia(){return Math.max(1800,(b.baseW*b.baseW+b.baseH*b.baseH)/12);}
    function stopBasePhysics(){try{if(baseState?.raf)cancelAnimationFrame(baseState.raf);Object.assign(baseState,{raf:0,lastFrame:0,pointer:false,pointerId:null,gravity:false,vx:0,vy:0,dent:0,dentTarget:0,visualGrowth:0,impact:0});}catch{}const p=globalThis.__HJGlassDentState;if(p){p.depth=0;p.shapeX=p.shapeY=1;}glass.classList.remove('is-fluid-pressed');}
    function syncShader(){const s=effectiveStretch();Object.assign(shader,{enabled:b.enabled,baseW:b.baseW,baseH:b.baseH,angle:wrap(b.angle),stretchX:s.x,stretchY:s.y,stretchAngle:b.stretchAngle,shearX:b.shearX,shearY:b.shearY,waveX:0,waveY:0,phaseX:0,phaseY:0,contacts:b.contacts.map(c=>({u:c.u,v:c.v,depth:c.depth,radius:c.radius,axisX:c.axisX,axisY:c.axisY}))});}
    function resetBody(keepMode=true){b.pointers.clear();b.pair=null;b.x=b.y=b.vx=b.vy=b.angle=b.omega=0;b.grounded=false;b.stretchX=b.stretchY=b.impactX=b.impactY=1;b.stretchVX=b.stretchVY=0;b.stretchAngle=0;b.shearX=b.shearY=b.shearVX=b.shearVY=0;for(const c of b.contacts)Object.assign(c,contact());glass.style.transform='translate3d(0,0,0)';if(!keepMode)b.gravity=false;measureBase();syncShader();invalidate(glass,true);refreshUi();}
    function setEnabled(on){
      on=!!on;if(on===b.enabled)return;
      if(on){const oldX=Number(baseState?.x)||0,oldY=Number(baseState?.y)||0;stopBasePhysics();b.enabled=true;b.x=oldX;b.y=oldY;b.grounded=false;setRenderBox();requestAnimationFrame(()=>{measureBase();glass.style.transform=`translate3d(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px,0)`;syncShader();invalidate(glass,true);});try{localStorage.setItem(STORAGE,'1');}catch{}}
      else{b.enabled=false;b.gravity=false;b.grounded=false;b.motion=false;b.pointers.clear();b.pair=null;if(b.raf)cancelAnimationFrame(b.raf);b.raf=0;b.lastTime=0;Object.assign(shader,{enabled:false,angle:0,stretchX:1,stretchY:1,stretchAngle:0,shearX:0,shearY:0,waveX:0,waveY:0,contacts:[]});restoreBox();const growth=baseApi.getPressGrowth?.();originals.reset?.();if(Number.isFinite(growth))baseApi.setPressGrowth?.(growth);b.x=b.y=b.vx=b.vy=b.angle=b.omega=0;glass.style.transform='translate3d(0,0,0)';invalidate(glass,true);try{localStorage.setItem(STORAGE,'0');}catch{}}
      refreshUi();
    }
    function setHoop(on){b.hoop=!!on;hoop.hidden=!b.hoop;root.classList.toggle('has-real-jelly-hoop',b.hoop);if(b.hoop)b.score=0;refreshUi();if(b.enabled)start();}
    async function toggleFullscreen(){const active=document.fullscreenElement===shell||shell.classList.contains('is-jelly-pseudo-fullscreen');if(active){if(document.fullscreenElement&&document.exitFullscreen){try{await document.exitFullscreen();}catch{}}shell.classList.remove('is-jelly-pseudo-fullscreen');document.documentElement.classList.remove('jelly-pseudo-fullscreen-open');}else if(shell.requestFullscreen){try{await shell.requestFullscreen({navigationUI:'hide'});}catch{shell.classList.add('is-jelly-pseudo-fullscreen');document.documentElement.classList.add('jelly-pseudo-fullscreen-open');}}else{shell.classList.add('is-jelly-pseudo-fullscreen');document.documentElement.classList.add('jelly-pseudo-fullscreen-open');}setTimeout(()=>{if(b.enabled){setRenderBox();measureBase();}refreshUi();start();},50);}

    function pointerMaterial(e){const c=centerClient(),q=bodyToMaterial(e.clientX-c.x,e.clientY-c.y);return{x:q.x,y:q.y,u:clamp(q.x/b.baseW+.5,0,1),v:clamp(q.y/b.baseH+.5,0,1)};}
    function refreshPair(){if(b.pointers.size<2){b.pair=null;return;}const[p0,p1]=[...b.pointers.values()].slice(0,2);b.pair={startDist:Math.max(24,hypot(p1.x-p0.x,p1.y-p0.y)),startSX:b.stretchX,startSY:b.stretchY,axis:Math.atan2(p1.localY-p0.localY,p1.localX-p0.localX)};}
    function pointerDown(e){
      if(!b.enabled||b.pointers.size>=2||(e.button!==undefined&&e.button!==0))return;const m=pointerMaterial(e);if(!insideMaterial(m.x,m.y,10))return;
      stopBasePhysics();b.grounded=false;const now=performance.now();b.pointers.set(e.pointerId,{id:e.pointerId,x:e.clientX,y:e.clientY,vx:0,vy:0,lastTime:now,localX:m.x,localY:m.y,u:m.u,v:m.v,pressure:e.pressure>0?e.pressure:.55});if(b.pointers.size===2)refreshPair();
      try{glass.setPointerCapture(e.pointerId);}catch{}glass.classList.add('is-real-jelly-held');start();e.preventDefault();e.stopImmediatePropagation();
    }
    function pointerMove(e){const p=b.pointers.get(e.pointerId);if(!b.enabled||!p)return;const now=performance.now(),dt=Math.max(.006,(now-p.lastTime)/1000),dx=e.clientX-p.x,dy=e.clientY-p.y;p.vx=p.vx*.42+(dx/dt)*.58;p.vy=p.vy*.42+(dy/dt)*.58;p.x=e.clientX;p.y=e.clientY;p.lastTime=now;if(e.pressure>0)p.pressure=e.pressure;start();e.preventDefault();e.stopImmediatePropagation();}
    function pointerUp(e){const p=b.pointers.get(e.pointerId);if(!b.enabled||!p)return;b.vx+=p.vx*.045;b.vy+=p.vy*.045;const r=materialToBody(p.localX,p.localY);b.omega+=(r.x*p.vy-r.y*p.vx)/inertia()*.055;b.pointers.delete(e.pointerId);refreshPair();if(!b.pointers.size)glass.classList.remove('is-real-jelly-held');b.grounded=false;start();e.stopImmediatePropagation();}

    function setPointerContact(slot,p,forceMag){const c=b.contacts[slot],edgeX=clamp(Math.min(p.u,1-p.u)*2,0,1),edgeY=clamp(Math.min(p.v,1-p.v)*2,0,1);c.u=p.u;c.v=p.v;c.target=clamp(.76+(p.pressure||.55)*.25+forceMag/5600,.65,1.42);c.radius=.34+.10*Math.sqrt(edgeX*edgeY);c.axisX=.50+.54*edgeX;c.axisY=.50+.54*edgeY;}
    function setCollisionContact(r,depth,axisX=.42,axisY=1.8){const m=bodyToMaterial(r.x,r.y),c=b.contacts[2];c.u=clamp(m.x/b.baseW+.5,0,1);c.v=clamp(m.y/b.baseH+.5,0,1);c.target=Math.max(c.target,clamp(depth,.25,1.45));c.radius=.36;c.axisX=axisX;c.axisY=axisY;}
    function setObjectContact(r,depth){const m=bodyToMaterial(r.x,r.y),c=b.contacts[3];c.u=clamp(m.x/b.baseW+.5,0,1);c.v=clamp(m.y/b.baseH+.5,0,1);c.target=Math.max(c.target,clamp(depth,.25,1.45));c.radius=.29;c.axisX=.64;c.axisY=.64;}
    function exciteImpact(nx,ny,impact,penetration){const amount=clamp(.055+penetration/100+impact/2600,.055,.15);if(Math.abs(nx)>Math.abs(ny)){b.impactX=Math.min(b.impactX,1-amount);b.impactY=Math.max(b.impactY,1+amount*.62);}else{b.impactY=Math.min(b.impactY,1-amount);b.impactX=Math.max(b.impactX,1+amount*.62);}}
    function collisionImpulse(nx,ny,r,restitution=.18,friction=.22){
      const I=inertia(),vcx=b.vx-b.omega*r.y,vcy=b.vy+b.omega*r.x,vn=vcx*nx+vcy*ny;if(vn>=0)return Math.abs(vn);
      const rn=r.x*ny-r.y*nx,den=1+(rn*rn)/I,j=-(1+restitution)*vn/Math.max(.2,den);b.vx+=j*nx;b.vy+=j*ny;b.omega+=(rn*j)/I;
      const tx=-ny,ty=nx,vt=(b.vx-b.omega*r.y)*tx+(b.vy+b.omega*r.x)*ty,rt=r.x*ty-r.y*tx,jt=clamp(-vt/Math.max(.2,1+(rt*rt)/I),-Math.abs(j)*friction,Math.abs(j)*friction);b.vx+=jt*tx;b.vy+=jt*ty;b.omega+=(rt*jt)/I;return Math.abs(vn);
    }
    function resolveWall(nx,ny,penetration,r,side){if(penetration<=0)return; b.x+=nx*penetration;b.y+=ny*penetration;const impact=collisionImpulse(nx,ny,r,side==='bottom'?.10:.18,side==='bottom'?.30:.22);setCollisionContact(r,.65+penetration/12+impact/900,Math.abs(nx)>.5?.30:2.0,Math.abs(nx)>.5?2.0:.30);exciteImpact(nx,ny,impact,penetration);if(side==='bottom'){if(impact<38&&Math.abs(b.vy)<34){b.vy=0;b.grounded=true;}else b.grounded=false;}else b.grounded=false;}
    function collideBounds(){
      const rr=root.getBoundingClientRect(),c=centerClient();let r=support(-1,0),wx=c.x+r.x;if(wx<rr.left+6)resolveWall(1,0,rr.left+6-wx,r,'left');
      r=support(1,0);wx=centerClient().x+r.x;if(wx>rr.right-6)resolveWall(-1,0,wx-(rr.right-6),r,'right');
      r=support(0,-1);let wy=centerClient().y+r.y;if(wy<rr.top+6)resolveWall(0,1,rr.top+6-wy,r,'top');
      r=support(0,1);wy=centerClient().y+r.y;if(wy>rr.bottom-6)resolveWall(0,-1,wy-(rr.bottom-6),r,'bottom');
    }
    function collideHoop(){
      if(!b.hoop||hoop.hidden)return;const center=centerClient(),e=extents(),board=hoop.querySelector('.real-jelly-backboard')?.getBoundingClientRect(),rim=hoop.querySelector('.real-jelly-rim')?.getBoundingClientRect();
      if(board&&center.x+e.x>board.left&&center.x-e.x<board.right&&center.y+e.y>board.top&&center.y-e.y<board.bottom){const r=support(1,0),pen=center.x+r.x-board.left;if(pen>0){b.x-=pen;const impact=collisionImpulse(-1,0,r,.22,.20);setObjectContact(r,.72+pen/11+impact/850);exciteImpact(-1,0,impact,pen);b.grounded=false;}}
      if(!rim)return;const pts=[{x:rim.left,y:rim.top+rim.height*.5},{x:rim.right,y:rim.top+rim.height*.5}];
      for(const rp of pts){const c=centerClient(),dx=c.x-rp.x,dy=c.y-rp.y,dist=Math.max(.001,hypot(dx,dy)),nx=dx/dist,ny=dy/dist,r=support(-nx,-ny),reach=-(r.x*nx+r.y*ny),min=reach+8;if(dist<min){const pen=min-dist;b.x+=nx*pen;b.y+=ny*pen;const impact=collisionImpulse(nx,ny,r,.26,.18);setObjectContact(r,.74+pen/9+impact/780);exciteImpact(nx,ny,impact,pen);b.grounded=false;}}
      const c=centerClient(),innerL=rim.left+18,innerR=rim.right-18,ry=rim.top+rim.height*.5;if(b.prevCenterY<ry&&c.y>=ry&&c.x>innerL&&c.x<innerR&&b.vy>70){b.score++;hoop.classList.remove('is-score');void hoop.offsetWidth;hoop.classList.add('is-score');refreshUi();}b.prevCenterY=c.y;
    }
    function updateContacts(dt){for(const[i,c]of b.contacts.entries()){if(i>=2)c.target*=Math.exp(-11*dt);const rate=i<2?25:19;c.depth+=(c.target-c.depth)*(1-Math.exp(-rate*dt));if(c.depth<.001&&c.target<.001)c.depth=c.target=0;}}

    function tick(now){
      b.raf=0;if(!b.enabled||!document.contains(glass))return;const dt=b.lastTime?clamp((now-b.lastTime)/1000,.001,.032):1/60;b.lastTime=now;for(const c of b.contacts)c.target=0;
      const pointers=[...b.pointers.values()].slice(0,2),I=inertia(),center=centerClient();let ax=0,ay=(b.gravity&&!b.grounded)?1580:0,torque=0;
      for(let i=0;i<pointers.length;i++){
        const p=pointers[i],r=materialToBody(p.localX,p.localY),anchorX=center.x+r.x,anchorY=center.y+r.y,avx=b.vx-b.omega*r.y,avy=b.vy+b.omega*r.x,ex=p.x-anchorX,ey=p.y-anchorY;
        let fx=ex*94+(p.vx-avx)*12,fy=ey*94+(p.vy-avy)*12,mag=hypot(fx,fy);if(mag>5600){const s=5600/mag;fx*=s;fy*=s;mag=5600;}ax+=fx;ay+=fy;torque+=r.x*fy-r.y*fx;setPointerContact(i,p,mag);
      }
      let targetSX=1,targetSY=1,targetSA=b.stretchAngle;
      if(pointers.length===2&&b.pair){const[p0,p1]=pointers,dist=Math.max(20,hypot(p1.x-p0.x,p1.y-p0.y)),ratio=clamp(dist/b.pair.startDist,.66,1.42);targetSX=clamp(b.pair.startSX*ratio,MIN_STRETCH,MAX_STRETCH);targetSY=clamp(b.pair.startSY*Math.pow(ratio,-.58),.68,1.34);targetSA=b.pair.axis;}
      else if(pointers.length===1){const p=pointers[0],nx=p.localX/Math.max(1,b.baseW*.5),ny=p.localY/Math.max(1,b.baseH*.5),edge=clamp(hypot(nx,ny),0,1),speed=hypot(p.vx,p.vy),squeeze=clamp((.035+(p.pressure||.55)*.038+speed/16000)*edge,0,.10);targetSX=1-squeeze;targetSY=1+squeeze*.60;targetSA=Math.atan2(p.localY,p.localX||.001);[b.shearX,b.shearVX]=spring(b.shearX,b.shearVX,clamp(ny*p.vx/3600,-.26,.26),72,15,dt);[b.shearY,b.shearVY]=spring(b.shearY,b.shearVY,clamp(nx*p.vy/3600,-.26,.26),72,15,dt);}
      else{[b.shearX,b.shearVX]=spring(b.shearX,b.shearVX,0,52,14,dt);[b.shearY,b.shearVY]=spring(b.shearY,b.shearVY,0,52,14,dt);}
      if(pointers.length!==1){[b.shearX,b.shearVX]=spring(b.shearX,b.shearVX,0,52,14,dt);[b.shearY,b.shearVY]=spring(b.shearY,b.shearVY,0,52,14,dt);}
      [b.stretchX,b.stretchVX]=spring(b.stretchX,b.stretchVX,targetSX,pointers.length?82:48,pointers.length?14:10,dt);[b.stretchY,b.stretchVY]=spring(b.stretchY,b.stretchVY,targetSY,pointers.length?82:48,pointers.length?14:10,dt);b.stretchAngle+=angleDelta(targetSA,b.stretchAngle)*(1-Math.exp(-14*dt));b.impactX+=(1-b.impactX)*(1-Math.exp(-8*dt));b.impactY+=(1-b.impactY)*(1-Math.exp(-8*dt));
      b.vx+=ax*dt;b.vy+=ay*dt;b.omega+=(torque/I)*dt;b.vx*=Math.exp(-(pointers.length?4.0:(b.gravity?1.0:1.45))*dt);b.vy*=Math.exp(-(pointers.length?3.5:(b.gravity?.10:1.20))*dt);b.omega*=Math.exp(-(pointers.length?1.65:(b.grounded?2.4:.36))*dt);b.angle+=b.omega*dt;
      b.x+=b.vx*dt;b.y+=b.vy*dt;collideBounds();collideHoop();updateContacts(dt);
      glass.style.transform=`translate3d(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px,0)`;syncShader();invalidate(glass);
      const shapeMoving=Math.abs(b.stretchX-1)>.002||Math.abs(b.stretchY-1)>.002||Math.abs(b.impactX-1)>.002||Math.abs(b.impactY-1)>.002||Math.abs(b.shearX)>.002||Math.abs(b.shearY)>.002||Math.abs(b.omega)>.006||b.contacts.some(c=>c.depth>.002||c.target>.002);
      const physicalMoving=pointers.length>0||(!b.grounded&&b.gravity)||Math.abs(b.vx)>2||Math.abs(b.vy)>2;
      if(shapeMoving||physicalMoving)b.raf=requestAnimationFrame(tick);else{b.lastTime=0;b.vx=b.vy=b.omega=0;syncShader();invalidate(glass,true);document.documentElement.dataset.realJellyPerf='idle';}
    }
    function start(){if(!b.enabled)return;document.documentElement.dataset.realJellyPerf='active';if(!b.raf){b.lastTime=0;b.raf=requestAnimationFrame(tick);}}

    glass.addEventListener('pointerdown',pointerDown,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('pointermove',pointerMove,{capture:true,passive:false,signal:controller.signal});window.addEventListener('pointerup',pointerUp,{capture:true,passive:false,signal:controller.signal});window.addEventListener('pointercancel',pointerUp,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('resize',()=>{if(b.enabled){setRenderBox();measureBase();start();}},{passive:true,signal:controller.signal});document.addEventListener('fullscreenchange',()=>setTimeout(()=>{if(b.enabled){setRenderBox();measureBase();}refreshUi();start();},30),{signal:controller.signal});for(const id of['ref-width','ref-height'])document.querySelector(`#${id}`)?.addEventListener('input',()=>{if(b.enabled)requestAnimationFrame(()=>{setRenderBox();measureBase();start();});},{signal:controller.signal});
    window.addEventListener('devicemotion',e=>{if(!b.enabled||!b.motion)return;const a=e.acceleration||e.accelerationIncludingGravity;if(!a)return;const mx=Number(a.x)||0,my=Number(a.y)||0;if(hypot(mx,my)<1.2)return;b.vx+=mx*12;b.vy-=my*11;b.omega+=mx*.018;b.grounded=false;start();},{passive:true,signal:controller.signal});
    baseApi.toggleGravity=function(){if(!b.enabled)return originals.toggleGravity?.();b.gravity=!b.gravity;b.grounded=false;start();refreshUi();return b.gravity;};baseApi.shake=function(){if(!b.enabled)return originals.shake?.();b.vx+=(Math.random()-.5)*260;b.vy-=100+Math.random()*110;b.omega+=(Math.random()-.5)*3.0;b.grounded=false;start();return true;};baseApi.reset=function(){if(!b.enabled)return originals.reset?.();resetBody(true);return true;};baseApi.toggleMotion=async function(){if(!b.enabled)return originals.toggleMotion?.();if(!('DeviceMotionEvent'in window))return false;if(b.motion){b.motion=false;return false;}if(typeof DeviceMotionEvent.requestPermission==='function'&&await DeviceMotionEvent.requestPermission()!=='granted')throw new Error('denied');b.motion=true;return true;};
    const api={state:b,get active(){return b.enabled;},toggle(){setEnabled(!b.enabled);return b.enabled;},setEnabled,toggleHoop(){setHoop(!b.hoop);return b.hoop;},toggleFullscreen,reset(){resetBody(true);}};globalThis.HJRealJellyMode=api;copyUi();refreshUi();try{localStorage.setItem(STORAGE,'0');}catch{}
    cleanup=()=>{controller.abort();if(b.raf)cancelAnimationFrame(b.raf);b.raf=0;b.enabled=false;Object.assign(shader,{enabled:false,angle:0,stretchX:1,stretchY:1,stretchAngle:0,shearX:0,shearY:0,waveX:0,waveY:0,contacts:[]});restoreBox();hoop.remove();ui.remove();shell.classList.remove('is-jelly-pseudo-fullscreen');document.documentElement.classList.remove('jelly-pseudo-fullscreen-open');baseApi.toggleGravity=originals.toggleGravity;baseApi.shake=originals.shake;baseApi.reset=originals.reset;baseApi.toggleMotion=originals.toggleMotion;if(globalThis.HJRealJellyMode===api)delete globalThis.HJRealJellyMode;delete glass.dataset.realJellyV27Ready;document.documentElement.dataset.realJellyPerf='off';invalidate(glass,true);};
    return true;
  }

  function sync(){if(!routeActive()){if(syncRaf)cancelAnimationFrame(syncRaf);syncRaf=0;syncAttempts=0;cleanup?.();cleanup=null;return;}const glass=document.querySelector('#realLiquidGlass'),panel=document.querySelector('.fluid-physics-panel');if(glass&&panel&&globalThis.HJFluidLab){syncAttempts=0;if(!glass.dataset.realJellyV27Ready){cleanup?.();cleanup=null;install(glass);}return;}if(syncAttempts++<240)syncRaf=requestAnimationFrame(sync);}
  const schedule=()=>{if(syncRaf)cancelAnimationFrame(syncRaf);syncRaf=requestAnimationFrame(sync);};document.addEventListener('hj:rendered',schedule);addEventListener('hashchange',schedule);queueMicrotask(schedule);
})();
