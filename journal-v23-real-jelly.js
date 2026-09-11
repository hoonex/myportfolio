/* Journal v23: visible low-cost Real Jelly.
   Keeps the original LiquidGlass box size, drives only the shader SDF/height field,
   and stops rendering when the body settles. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hypot=(x,y)=>Math.hypot(x,y);
  const STORAGE='hj-real-jelly-enabled';
  const MAX_ANGLE=.13;
  const MAX_STRETCH=1.13;
  const MIN_STRETCH=.76;
  const FRAME_MS=()=>coarse.matches?33:22;

  const shader=globalThis.__HJRealJellyState=globalThis.__HJRealJellyState||{};
  Object.assign(shader,{enabled:false,baseW:280,baseH:176,angle:0,stretchX:1,stretchY:1,stretchAngle:0,shearX:0,shearY:0,waveX:0,waveY:0,phaseX:0,phaseY:0,contacts:[]});

  let cleanup=null, epoch=0;
  const lang=()=>{const l=document.documentElement.lang||'ko';return l.startsWith('ja')?'ja':l.startsWith('en')?'en':'ko';};
  const COPY={
    ko:{title:'Real Jelly · Soft body',real:'Real Jelly',full:'전체화면',hoop:'농구 골대',gravity:'젤리 중력',score:'득점',on:'SOFT BODY ON',off:'SOFT BODY OFF'},
    en:{title:'Real Jelly · Soft body',real:'Real Jelly',full:'Fullscreen',hoop:'Basket hoop',gravity:'Jelly gravity',score:'Score',on:'SOFT BODY ON',off:'SOFT BODY OFF'},
    ja:{title:'Real Jelly · Soft body',real:'Real Jelly',full:'全画面',hoop:'バスケットゴール',gravity:'ゼリー重力',score:'得点',on:'SOFT BODY ON',off:'SOFT BODY OFF'}
  };

  function parseConfig(glass){try{return JSON.parse(glass.dataset.config||'{}')||{};}catch{return {};}}
  function invalidate(glass){glass.dataset.config=JSON.stringify({...parseConfig(glass),floating:false,__hjJellyEpoch:++epoch});}
  function rot(x,y,a){const c=Math.cos(a),s=Math.sin(a);return{x:c*x-s*y,y:s*x+c*y};}
  function angleDelta(a,b){let d=a-b;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return d;}
  function spring(v,vel,target,k,d,dt){vel+=(target-v)*k*dt;vel*=Math.exp(-d*dt);v+=vel*dt;return[v,vel];}
  function makeContact(){return{u:.5,v:.5,depth:0,target:0,radius:.34,axisX:1,axisY:1};}

  function install(glass){
    const root=glass.closest('.refraction-root');
    const shell=root?.closest('.refraction-shell');
    const controls=shell?.querySelector('.refraction-controls');
    const panel=controls?.querySelector('.fluid-physics-panel');
    const baseApi=globalThis.HJFluidLab;
    if(!root||!shell||!controls||!panel||!baseApi)return false;
    if(glass.dataset.realJellyV23Ready)return true;
    glass.dataset.realJellyV23Ready='1';
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
      enabled:false,gravity:false,grounded:false,motion:false,hoop:false,score:0,
      x:0,y:0,vx:0,vy:0,angle:0,omega:0,
      stretchX:1,stretchY:1,stretchVX:0,stretchVY:0,stretchAngle:0,
      shearX:0,shearY:0,shearVX:0,shearVY:0,
      impactX:1,impactY:1,
      baseLeft:0,baseTop:0,baseW:glass.offsetWidth||280,baseH:glass.offsetHeight||176,
      pointers:new Map(),pair:null,contacts:[makeContact(),makeContact(),makeContact(),makeContact()],
      raf:0,lastFrame:0,lastRender:0,prevCenterY:0
    };

    const ui=document.createElement('section');ui.className='real-jelly-panel';panel.appendChild(ui);
    const hoop=document.createElement('div');
    hoop.className='real-jelly-hoop';hoop.hidden=true;
    hoop.innerHTML='<div class="real-jelly-score"><span></span><b>0</b></div><div class="real-jelly-backboard"></div><div class="real-jelly-rim"><i></i><i></i></div><div class="real-jelly-net"><i></i><i></i><i></i><i></i></div>';
    root.appendChild(hoop);

    function stopBase(){
      try{
        if(baseState?.raf)cancelAnimationFrame(baseState.raf);
        baseState.raf=0;baseState.lastFrame=0;baseState.pointer=false;baseState.pointerId=null;
        baseState.gravity=false;baseState.vx=baseState.vy=0;baseState.dent=baseState.dentTarget=0;baseState.visualGrowth=0;baseState.impact=0;
      }catch{}
      const d=globalThis.__HJGlassDentState;if(d){d.depth=0;d.shapeX=d.shapeY=1;}
      glass.classList.remove('is-fluid-pressed');
    }

    function copyUi(){
      const c=COPY[lang()];
      ui.innerHTML=`<span class="fluid-panel-label">${c.title}</span><div class="real-jelly-actions">
        <button type="button" data-real-jelly aria-pressed="${b.enabled}"><span>◌</span>${c.real}</button>
        <button type="button" data-real-gravity aria-pressed="${b.gravity}"><span>↓</span>${c.gravity}</button>
        <button type="button" data-real-hoop aria-pressed="${b.hoop}"><span>◯</span>${c.hoop}</button>
        <button type="button" data-real-fullscreen><span>⛶</span>${c.full}</button></div><span class="real-jelly-status">${b.enabled?c.on:c.off}</span>`;
      const label=hoop.querySelector('.real-jelly-score span');if(label)label.textContent=c.score;
      ui.querySelector('[data-real-jelly]')?.addEventListener('click',()=>setEnabled(!b.enabled),{signal:controller.signal});
      ui.querySelector('[data-real-gravity]')?.addEventListener('click',()=>{b.gravity=!b.gravity;b.grounded=false;refreshUi();start();},{signal:controller.signal});
      ui.querySelector('[data-real-hoop]')?.addEventListener('click',()=>setHoop(!b.hoop),{signal:controller.signal});
      ui.querySelector('[data-real-fullscreen]')?.addEventListener('click',toggleFullscreen,{signal:controller.signal});
    }
    function refreshUi(){
      const c=COPY[lang()];
      const real=ui.querySelector('[data-real-jelly]'),grav=ui.querySelector('[data-real-gravity]'),hp=ui.querySelector('[data-real-hoop]'),fs=ui.querySelector('[data-real-fullscreen]');
      for(const [el,on] of [[real,b.enabled],[grav,b.gravity],[hp,b.hoop]])if(el){el.classList.toggle('is-active',on);el.setAttribute('aria-pressed',String(on));}
      const full=document.fullscreenElement===shell||shell.classList.contains('is-jelly-pseudo-fullscreen');
      fs?.classList.toggle('is-active',full);fs?.setAttribute('aria-pressed',String(full));
      const status=ui.querySelector('.real-jelly-status');if(status)status.textContent=b.enabled?c.on:c.off;
      const score=hoop.querySelector('.real-jelly-score b');if(score)score.textContent=String(b.score);
    }

    function measure(){
      const rr=root.getBoundingClientRect(),gr=glass.getBoundingClientRect();
      b.baseW=glass.offsetWidth||280;b.baseH=glass.offsetHeight||176;
      b.baseLeft=gr.left-rr.left-b.x;b.baseTop=gr.top-rr.top-b.y;
      shader.baseW=b.baseW;shader.baseH=b.baseH;
      return rr;
    }
    function centerClient(){const rr=root.getBoundingClientRect();return{x:rr.left+b.baseLeft+b.baseW*.5+b.x,y:rr.top+b.baseTop+b.baseH*.5+b.y};}
    function deformedLocal(x,y){let q=rot(x,y,-b.stretchAngle);q.x*=b.stretchX;q.y*=b.stretchY;q=rot(q.x,q.y,b.stretchAngle);return rot(q.x,q.y,b.angle);}
    function extents(){const hx=b.baseW*.5,hy=b.baseH*.5;let ex=0,ey=0;for(const sx of[-1,1])for(const sy of[-1,1]){const q=deformedLocal(sx*hx,sy*hy);ex=Math.max(ex,Math.abs(q.x));ey=Math.max(ey,Math.abs(q.y));}return{x:ex,y:ey};}

    function syncShader(){
      Object.assign(shader,{enabled:b.enabled,baseW:b.baseW,baseH:b.baseH,angle:b.angle,stretchX:b.stretchX,stretchY:b.stretchY,stretchAngle:b.stretchAngle,shearX:b.shearX,shearY:b.shearY,waveX:0,waveY:0,phaseX:0,phaseY:0,contacts:b.contacts.map(c=>({u:c.u,v:c.v,depth:c.depth,radius:c.radius,axisX:c.axisX,axisY:c.axisY}))});
    }
    function render(now=performance.now(),force=false){
      glass.style.transform=`translate3d(${b.x.toFixed(2)}px,${b.y.toFixed(2)}px,0)`;
      syncShader();
      if(force||now-b.lastRender>=FRAME_MS()){b.lastRender=now;invalidate(glass);}
    }

    function resetBody(){
      b.pointers.clear();b.pair=null;b.x=b.y=b.vx=b.vy=0;b.angle=b.omega=0;b.grounded=false;
      b.stretchX=b.stretchY=b.impactX=b.impactY=1;b.stretchVX=b.stretchVY=0;b.stretchAngle=0;
      b.shearX=b.shearY=b.shearVX=b.shearVY=0;for(const c of b.contacts)Object.assign(c,makeContact());
      measure();render(performance.now(),true);refreshUi();
    }

    function setEnabled(on){
      on=!!on;if(on===b.enabled)return;
      if(on){
        stopBase();b.enabled=true;b.x=Number(baseState?.x)||0;b.y=Number(baseState?.y)||0;b.vx=b.vy=0;b.grounded=false;
        glass.classList.add('real-jelly-active');measure();render(performance.now(),true);start();
        try{localStorage.setItem(STORAGE,'1');}catch{}
      }else{
        b.enabled=false;b.gravity=false;b.grounded=false;b.pointers.clear();b.pair=null;if(b.raf)cancelAnimationFrame(b.raf);b.raf=0;
        Object.assign(shader,{enabled:false,angle:0,stretchX:1,stretchY:1,stretchAngle:0,shearX:0,shearY:0,waveX:0,waveY:0,contacts:[]});
        glass.classList.remove('real-jelly-active','is-real-jelly-held');
        const growth=baseApi.getPressGrowth?.();originals.reset?.();if(Number.isFinite(growth))baseApi.setPressGrowth?.(growth);
        invalidate(glass);try{localStorage.setItem(STORAGE,'0');}catch{}
      }
      refreshUi();
    }

    function setHoop(on){b.hoop=!!on;hoop.hidden=!b.hoop;if(b.hoop)b.score=0;refreshUi();start();}
    async function toggleFullscreen(){
      const active=document.fullscreenElement===shell||shell.classList.contains('is-jelly-pseudo-fullscreen');
      if(active){if(document.fullscreenElement&&document.exitFullscreen){try{await document.exitFullscreen();}catch{}}shell.classList.remove('is-jelly-pseudo-fullscreen');document.documentElement.classList.remove('jelly-pseudo-fullscreen-open');}
      else if(shell.requestFullscreen){try{await shell.requestFullscreen({navigationUI:'hide'});}catch{shell.classList.add('is-jelly-pseudo-fullscreen');document.documentElement.classList.add('jelly-pseudo-fullscreen-open');}}
      else{shell.classList.add('is-jelly-pseudo-fullscreen');document.documentElement.classList.add('jelly-pseudo-fullscreen-open');}
      setTimeout(()=>{measure();refreshUi();render(performance.now(),true);start();},40);
    }

    function pointerLocal(e){
      const c=centerClient(),q=rot(e.clientX-c.x,e.clientY-c.y,-b.angle);let z=rot(q.x,q.y,-b.stretchAngle);z.x/=Math.max(.01,b.stretchX);z.y/=Math.max(.01,b.stretchY);z=rot(z.x,z.y,b.stretchAngle);
      return{x:clamp(z.x,-b.baseW*.5,b.baseW*.5),y:clamp(z.y,-b.baseH*.5,b.baseH*.5),u:clamp(z.x/b.baseW+.5,0,1),v:clamp(z.y/b.baseH+.5,0,1)};
    }
    function makePair(){
      if(b.pointers.size<2){b.pair=null;return;}
      const [p0,p1]=[...b.pointers.values()].slice(0,2),dx=p1.x-p0.x,dy=p1.y-p0.y;
      b.pair={startDist:Math.max(30,hypot(dx,dy)),startAngle:Math.atan2(dy,dx),startBodyAngle:b.angle};
    }
    function down(e){
      if(!b.enabled||b.pointers.size>=2||(e.button!==undefined&&e.button!==0))return;
      stopBase();const m=pointerLocal(e),now=performance.now();
      b.pointers.set(e.pointerId,{id:e.pointerId,x:e.clientX,y:e.clientY,vx:0,vy:0,lastTime:now,localX:m.x,localY:m.y,u:m.u,v:m.v,pressure:e.pressure||.5});
      if(b.pointers.size===2)makePair();b.grounded=false;glass.classList.add('is-real-jelly-held');try{glass.setPointerCapture(e.pointerId);}catch{}start();render(now,true);e.preventDefault();e.stopImmediatePropagation();
    }
    function move(e){
      const p=b.pointers.get(e.pointerId);if(!b.enabled||!p)return;const now=performance.now(),dt=Math.max(.008,(now-p.lastTime)/1000),dx=e.clientX-p.x,dy=e.clientY-p.y;
      p.vx=p.vx*.45+dx/dt*.55;p.vy=p.vy*.45+dy/dt*.55;p.x=e.clientX;p.y=e.clientY;p.lastTime=now;p.pressure=e.pressure||p.pressure;start();e.preventDefault();e.stopImmediatePropagation();
    }
    function up(e){
      const p=b.pointers.get(e.pointerId);if(!b.enabled||!p)return;b.vx+=clamp(p.vx*.10,-180,180);b.vy+=clamp(p.vy*.10,-180,180);b.pointers.delete(e.pointerId);if(b.pointers.size<2)b.pair=null;if(!b.pointers.size)glass.classList.remove('is-real-jelly-held');b.grounded=false;start();render(performance.now(),true);e.stopImmediatePropagation();
    }

    function pointerContact(slot,p,force,inward){
      const c=b.contacts[slot],edgeX=clamp(Math.min(p.u,1-p.u)*2,0,1),edgeY=clamp(Math.min(p.v,1-p.v)*2,0,1);
      c.u=p.u;c.v=p.v;c.target=clamp(.62+force/1800+Math.max(0,inward)*.75,.58,1.25);c.radius=.38+.10*Math.sqrt(edgeX*edgeY);c.axisX=.46+.54*edgeX;c.axisY=.46+.54*edgeY;
    }
    function wallContact(side,depth,along=.5){
      const c=b.contacts[2];c.target=Math.max(c.target,clamp(.55+depth,0,1.25));c.radius=.42;
      if(side==='left'||side==='right'){c.u=side==='left'?0:1;c.v=clamp(along,0,1);c.axisX=.34;c.axisY=2.1;}
      else{c.u=clamp(along,0,1);c.v=side==='top'?0:1;c.axisX=2.1;c.axisY=.34;}
    }
    function objectContact(u,v,depth){const c=b.contacts[3];if(depth<=c.target)return;c.u=clamp(u,0,1);c.v=clamp(v,0,1);c.target=clamp(.6+depth,0,1.25);c.radius=.3;c.axisX=c.axisY=.58;}

    function collideBounds(){
      const rr=root.getBoundingClientRect(),e=extents();let c=centerClient();
      if(c.x-e.x<rr.left+6){const pen=rr.left+6-(c.x-e.x);b.x+=pen;if(b.vx<0)b.vx=-b.vx*.18;wallContact('left',pen/18+Math.abs(b.vx)/1200,.5);b.impactX=Math.min(b.impactX,.78);b.impactY=Math.max(b.impactY,1.10);}
      c=centerClient();if(c.x+e.x>rr.right-6){const pen=c.x+e.x-(rr.right-6);b.x-=pen;if(b.vx>0)b.vx=-b.vx*.18;wallContact('right',pen/18+Math.abs(b.vx)/1200,.5);b.impactX=Math.min(b.impactX,.78);b.impactY=Math.max(b.impactY,1.10);}
      c=centerClient();if(c.y-e.y<rr.top+6){const pen=rr.top+6-(c.y-e.y);b.y+=pen;if(b.vy<0)b.vy=-b.vy*.16;wallContact('top',pen/16+Math.abs(b.vy)/1100,.5);b.impactY=Math.min(b.impactY,.76);b.impactX=Math.max(b.impactX,1.11);}
      c=centerClient();if(c.y+e.y>rr.bottom-6){const pen=c.y+e.y-(rr.bottom-6);b.y-=pen;if(b.vy>68){b.vy=-b.vy*.14;b.grounded=false;}else{b.vy=0;b.grounded=true;}b.vx*=.82;wallContact('bottom',pen/14+Math.abs(b.vy)/900,.5+clamp(b.vx/1500,-.3,.3));b.impactY=Math.min(b.impactY,.72);b.impactX=Math.max(b.impactX,1.12);}
      else if(b.gravity)b.grounded=false;
    }

    function collideHoop(){
      if(!b.hoop||hoop.hidden)return;const c=centerClient(),e=extents(),board=hoop.querySelector('.real-jelly-backboard')?.getBoundingClientRect(),rim=hoop.querySelector('.real-jelly-rim')?.getBoundingClientRect();
      if(board&&c.x+e.x>board.left&&c.x-e.x<board.right&&c.y+e.y>board.top&&c.y-e.y<board.bottom){const pen=Math.max(0,c.x+e.x-board.left);b.x-=pen;if(b.vx>0)b.vx=-b.vx*.25;objectContact(1,.5,pen/16+Math.abs(b.vx)/900);b.impactX=Math.min(b.impactX,.76);b.impactY=Math.max(b.impactY,1.1);}
      if(!rim)return;const pts=[{x:rim.left,y:rim.top+rim.height*.5},{x:rim.right,y:rim.top+rim.height*.5}],radius=Math.max(24,Math.min(e.x,e.y)*.55);
      for(const rp of pts){const cc=centerClient(),dx=cc.x-rp.x,dy=cc.y-rp.y,dist=Math.max(.001,hypot(dx,dy)),min=radius+8;if(dist<min){const pen=min-dist,nx=dx/dist,ny=dy/dist;b.x+=nx*pen;b.y+=ny*pen;const vn=b.vx*nx+b.vy*ny;if(vn<0){b.vx-=1.25*vn*nx;b.vy-=1.25*vn*ny;}objectContact(.5-nx*.5,.5-ny*.5,pen/12+Math.abs(vn)/900);b.impactX=Math.min(b.impactX,.84);b.impactY=Math.max(b.impactY,1.07);}}
      const cc=centerClient(),ry=rim.top+rim.height*.5;if(b.prevCenterY<ry&&cc.y>=ry&&cc.x>rim.left+18&&cc.x<rim.right-18&&b.vy>70){b.score++;hoop.classList.remove('is-score');void hoop.offsetWidth;hoop.classList.add('is-score');refreshUi();}b.prevCenterY=cc.y;
    }

    function updateContacts(dt){for(const [i,c] of b.contacts.entries()){if(i>=2)c.target*=Math.exp(-15*dt);const rate=i<2?28:22;c.depth+=(c.target-c.depth)*(1-Math.exp(-rate*dt));if(c.depth<.001&&c.target<.001)c.depth=c.target=0;}}

    function tick(now){
      b.raf=0;if(!b.enabled||!document.contains(glass))return;const dt=b.lastFrame?clamp((now-b.lastFrame)/1000,.001,.03):1/60;b.lastFrame=now;
      for(const c of b.contacts)c.target=0;
      let ax=0,ay=b.gravity&&!b.grounded?1580:0,torque=0,targetSX=1,targetSY=1,targetSA=b.stretchAngle;
      const center=centerClient(),pts=[...b.pointers.values()].slice(0,2);

      for(let i=0;i<pts.length;i++){
        const p=pts[i],r=deformedLocal(p.localX,p.localY),anchorX=center.x+r.x,anchorY=center.y+r.y,avx=b.vx-b.omega*r.y,avy=b.vy+b.omega*r.x,ex=p.x-anchorX,ey=p.y-anchorY;
        const fx=ex*58+(p.vx-avx)*9,fy=ey*58+(p.vy-avy)*9;ax+=fx;ay+=fy;torque+=(r.x*fy-r.y*fx)*.00007;
        const rl=Math.max(20,hypot(p.localX,p.localY)),rx=p.localX/rl,ry=p.localY/rl,inward=-(ex*rx+ey*ry)/Math.max(60,Math.min(b.baseW,b.baseH));
        pointerContact(i,p,hypot(fx,fy),inward);
      }

      if(pts.length===2&&b.pair){
        const p0=pts[0],p1=pts[1],dx=p1.x-p0.x,dy=p1.y-p0.y,dist=Math.max(24,hypot(dx,dy)),ratio=clamp(dist/b.pair.startDist,MIN_STRETCH,MAX_STRETCH),pa=Math.atan2(dy,dx);
        targetSX=ratio;targetSY=clamp(Math.pow(ratio,-.7),.86,MAX_STRETCH);targetSA=pa-b.angle;
        const targetAngle=clamp(b.pair.startBodyAngle+angleDelta(pa,b.pair.startAngle),-MAX_ANGLE,MAX_ANGLE);torque+=(targetAngle-b.angle)*48-b.omega*5.5;
      }else if(pts.length===1){
        const p=pts[0],r=deformedLocal(p.localX,p.localY),anchorX=center.x+r.x,anchorY=center.y+r.y,ex=p.x-anchorX,ey=p.y-anchorY,rl=Math.max(20,hypot(p.localX,p.localY)),rx=p.localX/rl,ry=p.localY/rl;
        const radial=(ex*rx+ey*ry)/Math.max(70,Math.min(b.baseW,b.baseH)*.65),ext=clamp(radial,-.24,.13);
        targetSX=clamp(1+ext,MIN_STRETCH,MAX_STRETCH);targetSY=clamp(1-ext*.68,.86,MAX_STRETCH);targetSA=Math.atan2(p.localY,p.localX);
        const perp=(-ex*ry+ey*rx)/Math.max(80,Math.min(b.baseW,b.baseH));
        [b.shearX,b.shearVX]=spring(b.shearX,b.shearVX,clamp(perp*.36,-.18,.18),90,16,dt);
        [b.shearY,b.shearVY]=spring(b.shearY,b.shearVY,clamp(-perp*.24,-.13,.13),90,16,dt);
      }else{
        torque+=(-b.angle)*14-b.omega*2.8;[b.shearX,b.shearVX]=spring(b.shearX,b.shearVX,0,75,16,dt);[b.shearY,b.shearVY]=spring(b.shearY,b.shearVY,0,75,16,dt);
      }

      targetSX=clamp(targetSX*b.impactX,MIN_STRETCH,MAX_STRETCH);targetSY=clamp(targetSY*b.impactY,.74,MAX_STRETCH);
      b.impactX+=(1-b.impactX)*(1-Math.exp(-13*dt));b.impactY+=(1-b.impactY)*(1-Math.exp(-13*dt));
      [b.stretchX,b.stretchVX]=spring(b.stretchX,b.stretchVX,targetSX,pts.length?120:82,pts.length?15:11,dt);
      [b.stretchY,b.stretchVY]=spring(b.stretchY,b.stretchVY,targetSY,pts.length?120:82,pts.length?15:11,dt);
      b.stretchAngle+=angleDelta(targetSA,b.stretchAngle)*(1-Math.exp(-18*dt));

      b.vx+=ax*dt;b.vy+=ay*dt;b.omega+=torque*dt;
      b.vx*=Math.exp(-(pts.length?5.2:(b.gravity?1.1:4.2))*dt);b.vy*=Math.exp(-(pts.length?5.0:(b.gravity?.12:4.2))*dt);b.omega*=Math.exp(-(pts.length?3.8:2.6)*dt);
      b.omega=clamp(b.omega,-1.7,1.7);b.angle=clamp(b.angle+b.omega*dt,-MAX_ANGLE,MAX_ANGLE);b.x+=b.vx*dt;b.y+=b.vy*dt;
      collideBounds();collideHoop();updateContacts(dt);render(now,false);

      const shapeMoving=Math.abs(b.stretchX-1)>.002||Math.abs(b.stretchY-1)>.002||Math.abs(b.shearX)>.002||Math.abs(b.shearY)>.002||Math.abs(b.angle)>.002||Math.abs(b.omega)>.01||b.contacts.some(c=>c.depth>.002||c.target>.002);
      const physicalMoving=pts.length>0||(!b.grounded&&b.gravity)||Math.abs(b.vx)>2||Math.abs(b.vy)>2;
      if(shapeMoving||physicalMoving)b.raf=requestAnimationFrame(tick);
      else{b.lastFrame=0;b.vx=b.vy=b.omega=0;b.stretchX=b.stretchY=1;b.shearX=b.shearY=0;b.angle=0;render(performance.now(),true);}
    }
    function start(){if(!b.enabled||reduce.matches||b.raf)return;b.lastFrame=0;b.raf=requestAnimationFrame(tick);}

    glass.addEventListener('pointerdown',down,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('pointermove',move,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('pointerup',up,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('pointercancel',up,{capture:true,passive:false,signal:controller.signal});
    window.addEventListener('resize',()=>{measure();render(performance.now(),true);},{passive:true,signal:controller.signal});
    document.addEventListener('fullscreenchange',()=>{setTimeout(()=>{measure();refreshUi();render(performance.now(),true);},30);},{signal:controller.signal});

    window.addEventListener('devicemotion',e=>{if(!b.enabled||!b.motion)return;const a=e.acceleration||e.accelerationIncludingGravity;if(!a)return;const ax=Number(a.x)||0,ay=Number(a.y)||0,mag=hypot(ax,ay);if(mag<1.4)return;b.vx+=clamp(ax*13,-80,80);b.vy+=clamp(-ay*11,-70,70);b.grounded=false;start();},{passive:true,signal:controller.signal});

    baseApi.toggleGravity=function(){if(!b.enabled)return originals.toggleGravity?.();b.gravity=!b.gravity;b.grounded=false;refreshUi();start();return b.gravity;};
    baseApi.shake=function(){if(!b.enabled)return originals.shake?.();b.vx+=(Math.random()-.5)*260;b.vy-=100+Math.random()*100;b.omega+=(Math.random()-.5)*1.0;b.grounded=false;start();return true;};
    baseApi.reset=function(){if(!b.enabled)return originals.reset?.();resetBody();return true;};
    baseApi.toggleMotion=async function(){if(!b.enabled)return originals.toggleMotion?.();if(!('DeviceMotionEvent'in window))return false;if(b.motion){b.motion=false;return false;}if(typeof DeviceMotionEvent.requestPermission==='function'&&await DeviceMotionEvent.requestPermission()!=='granted')throw new Error('denied');b.motion=true;return true;};

    const api={state:b,get active(){return b.enabled;},toggle(){setEnabled(!b.enabled);return b.enabled;},setEnabled,toggleHoop(){setHoop(!b.hoop);return b.hoop;},toggleFullscreen,reset:resetBody};
    globalThis.HJRealJellyMode=api;
    copyUi();refreshUi();
    try{if(localStorage.getItem(STORAGE)==='1')setTimeout(()=>setEnabled(true),0);}catch{}

    cleanup=()=>{
      controller.abort();if(b.raf)cancelAnimationFrame(b.raf);b.raf=0;b.enabled=false;
      Object.assign(shader,{enabled:false,angle:0,stretchX:1,stretchY:1,stretchAngle:0,shearX:0,shearY:0,waveX:0,waveY:0,contacts:[]});
      glass.classList.remove('real-jelly-active','is-real-jelly-held');hoop.remove();ui.remove();shell.classList.remove('is-jelly-pseudo-fullscreen');document.documentElement.classList.remove('jelly-pseudo-fullscreen-open');
      baseApi.toggleGravity=originals.toggleGravity;baseApi.shake=originals.shake;baseApi.reset=originals.reset;baseApi.toggleMotion=originals.toggleMotion;
      if(globalThis.HJRealJellyMode===api)delete globalThis.HJRealJellyMode;delete glass.dataset.realJellyV23Ready;delete glass.dataset.realJellyV21Ready;invalidate(glass);
    };
    return true;
  }

  function sync(){
    if(!location.hash.startsWith('#/lab')||location.hash.startsWith('#/lab/vision')){cleanup?.();cleanup=null;return;}
    const glass=document.querySelector('#realLiquidGlass');if(!glass||!globalThis.HJFluidLab||!document.querySelector('.fluid-physics-panel')){requestAnimationFrame(sync);return;}
    if(!glass.dataset.realJellyV23Ready)install(glass);
  }
  document.addEventListener('hj:rendered',()=>requestAnimationFrame(sync));addEventListener('hashchange',()=>requestAnimationFrame(sync));queueMicrotask(sync);
})();