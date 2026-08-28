/* Journal v5: interactive labs for Sloar continuity and motion dynamics articles. */
(() => {
  const I18N = {
    ko: {
      live:'INTERACTIVE / LIVE MODEL', simulation:'브라우저 안에서 동작하는 교육용 시뮬레이션',
      sloarTitle:'Continuity Control Room',
      sloarIntro:'채팅 코딩의 문제를 “기억”이 아니라 저장소 상태와 증거의 문제로 바꿔보세요. 아래에서 HEAD, tree, working tree, remote 상태를 바꾸고 Sloar lifecycle을 직접 실행할 수 있습니다.',
      identity:'Repository identity', head:'HEAD commit', tree:'HEAD tree', working:'Working tree', clean:'clean', dirty:'dirty', remote:'Remote HEAD',
      scenario:'Failure injection', network:'Git transport down', stale:'Remote moved', ci:'CI red',
      run:'Run mission', step:'Step', reset:'Reset', evidence:'Evidence stream', idle:'mission not started',
      halted:'HALTED', verified:'REMOTE VERIFIED', executing:'EXECUTING',
      motionTitle:'Motion Dynamics Lab',
      motionIntro:'카드를 직접 잡아 던져보세요. release velocity가 projected destination을 만들고, 가장 가까운 snap point를 고른 뒤 mass–spring–damper가 위치를 수렴시킵니다. 경계를 넘으면 rubber-band가 손의 이동량을 비선형적으로 줄입니다.',
      stiffness:'Stiffness', damping:'Damping', mass:'Mass', projection:'Projection', rubber:'Rubber band', velocity:'Velocity', projected:'Projected', target:'Target',
      resetMotion:'Reset motion', hint:'카드를 좌우로 던지거나 ←/→, Home/End 키를 사용하세요', dynamics:'Live dynamics',
      noteSloar:'이 데모는 Sloar가 “대화를 잘 기억하는 도구”가 아니라, 저장소의 실제 identity와 검증 evidence를 따라가는 continuity protocol이라는 점을 시각화합니다.',
      noteMotion:'숫자를 바꾼 뒤 같은 속도로 던져보면 차이가 명확합니다. stiffness는 복원력, damping은 에너지 소실, mass는 관성, projection은 release velocity가 목적지 선택에 미치는 정도를 바꿉니다.'
    },
    en: {
      live:'INTERACTIVE / LIVE MODEL', simulation:'Educational simulation running entirely in your browser',
      sloarTitle:'Continuity Control Room',
      sloarIntro:'Turn chat coding from a memory problem into a repository-state and evidence problem. Change HEAD, tree, working tree, and remote state below, then execute the Sloar lifecycle yourself.',
      identity:'Repository identity', head:'HEAD commit', tree:'HEAD tree', working:'Working tree', clean:'clean', dirty:'dirty', remote:'Remote HEAD',
      scenario:'Failure injection', network:'Git transport down', stale:'Remote moved', ci:'CI red',
      run:'Run mission', step:'Step', reset:'Reset', evidence:'Evidence stream', idle:'mission not started',
      halted:'HALTED', verified:'REMOTE VERIFIED', executing:'EXECUTING',
      motionTitle:'Motion Dynamics Lab',
      motionIntro:'Grab the card and throw it. Release velocity produces a projected destination, the nearest snap point becomes the target, and a mass–spring–damper system converges on it. Crossing the boundary applies nonlinear rubber-banding.',
      stiffness:'Stiffness', damping:'Damping', mass:'Mass', projection:'Projection', rubber:'Rubber band', velocity:'Velocity', projected:'Projected', target:'Target',
      resetMotion:'Reset motion', hint:'Throw the card or use ←/→ and Home/End', dynamics:'Live dynamics',
      noteSloar:'This model makes the central idea visible: Sloar is not a tool that “remembers the chat better.” It is a continuity protocol that follows repository identity and verification evidence.',
      noteMotion:'Change one value and repeat the same throw. Stiffness controls restoring force, damping removes energy, mass changes inertia, and projection changes how strongly release velocity influences target selection.'
    },
    ja: {
      live:'INTERACTIVE / LIVE MODEL', simulation:'ブラウザ内で動作する教育用シミュレーション',
      sloarTitle:'Continuity Control Room',
      sloarIntro:'チャットコーディングを「記憶」の問題ではなく、repository state と evidence の問題として扱います。HEAD、tree、working tree、remote を変更し、Sloar lifecycle を直接実行できます。',
      identity:'Repository identity', head:'HEAD commit', tree:'HEAD tree', working:'Working tree', clean:'clean', dirty:'dirty', remote:'Remote HEAD',
      scenario:'Failure injection', network:'Git transport down', stale:'Remote moved', ci:'CI red',
      run:'Run mission', step:'Step', reset:'Reset', evidence:'Evidence stream', idle:'mission not started',
      halted:'HALTED', verified:'REMOTE VERIFIED', executing:'EXECUTING',
      motionTitle:'Motion Dynamics Lab',
      motionIntro:'カードを掴んで投げてください。release velocity から projected destination を作り、最も近い snap pointを target に選び、mass–spring–damper がそこへ収束します。境界の外では nonlinear rubber-band が働きます。',
      stiffness:'Stiffness', damping:'Damping', mass:'Mass', projection:'Projection', rubber:'Rubber band', velocity:'Velocity', projected:'Projected', target:'Target',
      resetMotion:'Reset motion', hint:'カードを投げるか ←/→、Home/End キーを使ってください', dynamics:'Live dynamics',
      noteSloar:'このモデルは、Sloar が「会話をよく覚えるツール」ではなく、repository identity と verification evidence を追跡する continuity protocol であることを可視化します。',
      noteMotion:'値を一つ変えて同じように投げると差が分かります。stiffness は復元力、damping はエネルギー損失、mass は慣性、projection は release velocity が target 選択へ与える強さを変えます。'
    }
  };

  const lang = () => {
    const value = document.documentElement.lang || 'ko';
    return value.startsWith('ja') ? 'ja' : value.startsWith('en') ? 'en' : 'ko';
  };
  const t = () => I18N[lang()];

  const lifecycle = ['RECOVER','IDENTIFY','MATERIALIZE','BRANCH','IMPLEMENT','VERIFY','PUBLISH','REMOTE_VERIFY'];
  let missionTimer = null;
  let motionRAF = 0;
  let motionCleanup = null;

  function stopMission(){ if(missionTimer){ clearInterval(missionTimer); missionTimer=null; } }
  function stopMotion(){ cancelAnimationFrame(motionRAF); motionRAF=0; if(motionCleanup){ motionCleanup(); motionCleanup=null; } }

  function short(value){ return String(value || '').trim().slice(0,8) || '--------'; }
  function stamp(){ return new Date().toLocaleTimeString(lang()==='ko'?'ko-KR':lang()==='ja'?'ja-JP':'en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); }

  function sloarLab(){
    const c=t();
    return `<section class="article-live-lab sloar-control-room" data-sloar-lab>
      <div class="live-lab-heading">
        <div><span class="live-lab-badge">${c.live}</span><h2>${c.sloarTitle}</h2></div>
        <p>${c.sloarIntro}</p>
      </div>
      <div class="sloar-stage">
        <div class="sloar-pipeline" data-sloar-pipeline>
          ${lifecycle.map((name,i)=>`<div class="pipeline-node" data-stage="${i}"><span>${String(i+1).padStart(2,'0')}</span><strong>${name}</strong><i></i></div>`).join('')}
        </div>
        <div class="sloar-console-grid">
          <section class="sloar-panel identity-panel">
            <div class="panel-title"><span>${c.identity}</span><b data-mission-status>${c.idle}</b></div>
            <label><span>${c.head}</span><input data-sloar-head value="4d73a9c1" maxlength="12" spellcheck="false"></label>
            <label><span>${c.tree}</span><input data-sloar-tree value="f91b208e" maxlength="12" spellcheck="false"></label>
            <label><span>${c.remote}</span><input data-sloar-remote value="4d73a9c1" maxlength="12" spellcheck="false"></label>
            <button class="working-tree-toggle" type="button" data-working-tree data-dirty="false"><span>${c.working}</span><b>${c.clean}</b></button>
            <div class="identity-fingerprint"><span>identity</span><code data-identity-code>4d73a9c1 / f91b208e / clean</code></div>
          </section>
          <section class="sloar-panel failure-panel">
            <div class="panel-title"><span>${c.scenario}</span><b>inject</b></div>
            <label class="fault-switch"><span>${c.network}</span><input type="checkbox" data-fault="network"><i></i></label>
            <label class="fault-switch"><span>${c.stale}</span><input type="checkbox" data-fault="stale"><i></i></label>
            <label class="fault-switch"><span>${c.ci}</span><input type="checkbox" data-fault="ci"><i></i></label>
            <div class="mission-actions"><button type="button" data-run-mission>${c.run}</button><button type="button" data-step-mission>${c.step}</button><button type="button" data-reset-mission>${c.reset}</button></div>
          </section>
          <section class="sloar-panel evidence-panel">
            <div class="panel-title"><span>${c.evidence}</span><b>append only</b></div>
            <div class="evidence-stream" data-evidence><p><time>--:--:--</time><span>${c.idle}</span></p></div>
          </section>
        </div>
      </div>
      <p class="live-lab-note">${c.noteSloar}</p>
    </section>`;
  }

  function motionLab(){
    const c=t();
    const slider=(id,label,min,max,step,value)=>`<label class="motion-control"><span>${label}</span><input type="range" data-motion-control="${id}" min="${min}" max="${max}" step="${step}" value="${value}"><output data-motion-output="${id}">${value}</output></label>`;
    return `<section class="article-live-lab motion-dynamics-lab" data-motion-lab>
      <div class="live-lab-heading">
        <div><span class="live-lab-badge">${c.live}</span><h2>${c.motionTitle}</h2></div>
        <p>${c.motionIntro}</p>
      </div>
      <div class="motion-workbench">
        <div class="motion-stage" data-motion-stage>
          <div class="motion-track"><i data-anchor="0"></i><i data-anchor="1"></i><i data-anchor="2"></i></div>
          <div class="motion-card" data-motion-card tabindex="0" role="slider" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="2" aria-valuenow="1" aria-valuetext="CENTER" aria-label="${c.hint}"><span>DIRECT MANIPULATION</span><strong>THROW ME</strong><small>${c.hint}</small></div>
          <div class="motion-projection" data-motion-projection-line></div>
          <div class="motion-target-marker" data-motion-target-marker><span>${c.target}</span></div>
        </div>
        <aside class="motion-sidebar">
          <div class="motion-controls">
            ${slider('stiffness',c.stiffness,80,520,10,280)}
            ${slider('damping',c.damping,6,48,1,24)}
            ${slider('mass',c.mass,.4,2.4,.1,1)}
            ${slider('projection',c.projection,.05,.55,.01,.24)}
            ${slider('rubber',c.rubber,.2,.9,.01,.55)}
          </div>
          <div class="motion-readouts">
            <div><span>${c.velocity}</span><b data-readout="velocity">0 px/s</b></div>
            <div><span>${c.projected}</span><b data-readout="projected">0 px</b></div>
            <div><span>${c.target}</span><b data-readout="target">CENTER</b></div>
          </div>
          <button class="motion-reset" type="button" data-motion-reset>${c.resetMotion}</button>
        </aside>
      </div>
      <div class="motion-graph-wrap"><div><span>${c.dynamics}</span><b>position / target</b></div><canvas data-motion-graph width="900" height="150"></canvas></div>
      <p class="live-lab-note">${c.noteMotion}</p>
    </section>`;
  }

  function enhanceArticle(){
    const path=location.hash;
    const body=document.querySelector('.article-body');
    if(!body) return;
    if(path.startsWith('#/post/sloar') && !document.querySelector('[data-sloar-lab]')){
      body.insertAdjacentHTML('afterbegin', sloarLab());
      initSloar();
      document.querySelector('.article-page')?.classList.add('article-page--sloar');
    }
    if(path.startsWith('#/post/motion') && !document.querySelector('[data-motion-lab]')){
      body.insertAdjacentHTML('afterbegin', motionLab());
      initMotion();
      document.querySelector('.article-page')?.classList.add('article-page--motion');
    }
  }

  function initSloar(){
    stopMission();
    const root=document.querySelector('[data-sloar-lab]'); if(!root) return;
    const nodes=[...root.querySelectorAll('[data-stage]')];
    const evidence=root.querySelector('[data-evidence]');
    const status=root.querySelector('[data-mission-status]');
    const head=root.querySelector('[data-sloar-head]');
    const tree=root.querySelector('[data-sloar-tree]');
    const remote=root.querySelector('[data-sloar-remote]');
    const working=root.querySelector('[data-working-tree]');
    const identity=root.querySelector('[data-identity-code]');
    let stage=-1;
    let halted=false;

    const add=(message,type='info')=>{
      const p=document.createElement('p'); p.dataset.type=type; p.innerHTML=`<time>${stamp()}</time><span></span>`; p.querySelector('span').textContent=message;
      evidence.append(p); evidence.scrollTop=evidence.scrollHeight;
    };
    const updateIdentity=()=>{
      const dirty=working.dataset.dirty==='true';
      working.querySelector('b').textContent=dirty?t().dirty:t().clean;
      working.classList.toggle('is-dirty',dirty);
      identity.textContent=`${short(head.value)} / ${short(tree.value)} / ${dirty?'dirty':'clean'}`;
    };
    const reset=()=>{
      stopMission(); stage=-1; halted=false; nodes.forEach(n=>n.classList.remove('is-active','is-done','is-blocked'));
      evidence.innerHTML=`<p><time>--:--:--</time><span>${t().idle}</span></p>`; status.textContent=t().idle; status.dataset.state='idle';
    };
    const fault=id=>root.querySelector(`[data-fault="${id}"]`)?.checked;
    const execute=()=>{
      if(halted || stage>=lifecycle.length-1) return false;
      if(stage>=0) nodes[stage].classList.remove('is-active');
      stage+=1; const name=lifecycle[stage], node=nodes[stage]; node.classList.add('is-active'); status.textContent=`${t().executing} · ${name}`; status.dataset.state='running';
      let failure='';
      if(name==='RECOVER' && fault('network')) failure='transport unavailable; use connected repository transport or stop';
      if(name==='IDENTIFY' && fault('stale')){ remote.value='9e2f17a4'; updateIdentity(); failure='remote HEAD moved; re-identify before publication'; }
      if(name==='VERIFY' && fault('ci')) failure='verification failed; publication is not evidence-backed';
      if(failure){ halted=true; node.classList.add('is-blocked'); status.textContent=`${t().halted} · ${name}`; status.dataset.state='halted'; add(`${name}: ${failure}`,'error'); stopMission(); return false; }
      node.classList.add('is-done'); add(`${name}: ${name==='IDENTIFY'?`base=${short(head.value)} tree=${short(tree.value)}`:'evidence captured'}`,'ok');
      if(name==='REMOTE_VERIFY') { status.textContent=t().verified; status.dataset.state='verified'; add(`remote=${short(remote.value)} · publication verified`,'ok'); stopMission(); }
      return true;
    };

    working.addEventListener('click',()=>{working.dataset.dirty=working.dataset.dirty==='true'?'false':'true';updateIdentity();});
    [head,tree,remote].forEach(input=>input.addEventListener('input',updateIdentity));
    root.querySelector('[data-reset-mission]').addEventListener('click',reset);
    root.querySelector('[data-step-mission]').addEventListener('click',()=>execute());
    root.querySelector('[data-run-mission]').addEventListener('click',()=>{ reset(); missionTimer=setInterval(()=>{ if(!execute()) stopMission(); },520); });
    updateIdentity();
  }

  function initMotion(){
    stopMotion();
    const root=document.querySelector('[data-motion-lab]'); if(!root) return;
    const stage=root.querySelector('[data-motion-stage]'), card=root.querySelector('[data-motion-card]'), graph=root.querySelector('[data-motion-graph]');
    const ctx=graph.getContext('2d'); const targetMarker=root.querySelector('[data-motion-target-marker]'); const projectionLine=root.querySelector('[data-motion-projection-line]');
    const controls=Object.fromEntries([...root.querySelectorAll('[data-motion-control]')].map(el=>[el.dataset.motionControl,el]));
    const readout=id=>root.querySelector(`[data-readout="${id}"]`);
    let x=0,v=0,target=0,dragging=false,lastX=0,lastT=0,pointerStart=0,dragStart=0,samples=[];
    const clearSelection=()=>window.getSelection()?.removeAllRanges();

    const bounds=()=>{ const sr=stage.getBoundingClientRect(), half=card.offsetWidth/2; return {min:half+24,max:sr.width-half-24,center:sr.width/2,width:sr.width}; };
    const anchors=()=>{ const b=bounds(); return [b.min,b.center,b.max]; };
    const cfg=()=>Object.fromEntries(Object.entries(controls).map(([k,el])=>[k,Number(el.value)]));
    const rubber=(value,min,max,c)=>{
      if(value>=min&&value<=max) return value;
      const edge=value<min?min:max, over=value-edge, dimension=Math.max(1,max-min);
      return edge+(over*dimension*c)/(dimension+c*Math.abs(over));
    };
    const anchorIndex=(value,a=anchors())=>a.reduce((best,point,index)=>Math.abs(point-value)<Math.abs(a[best]-value)?index:best,0);
    const nearest=(value)=>{ const a=anchors(); return a[anchorIndex(value,a)]; };
    const anchorName=value=>['LEFT','CENTER','RIGHT'][anchorIndex(value)];
    const setCard=()=>{
      const b=bounds(); card.style.left=`${x}px`; const speed=Math.min(1,Math.abs(v)/1800); card.style.setProperty('scale',`${1+speed*.035} ${1-speed*.022}`); card.style.setProperty('rotate',`${Math.max(-5,Math.min(5,v/400))}deg`);
      const a=anchors(), targetIndex=anchorIndex(target,a), targetName=['LEFT','CENTER','RIGHT'][targetIndex];
      targetMarker.style.left=`${target}px`; targetMarker.querySelector('span').textContent=`${t().target} · ${targetName}`;
      card.setAttribute('aria-valuenow',String(targetIndex)); card.setAttribute('aria-valuetext',targetName);
      readout('velocity').textContent=`${Math.round(v)} px/s`; readout('target').textContent=targetName;
      const projected=x+v*cfg().projection; readout('projected').textContent=`${Math.round(projected-b.center)} px`;
      projectionLine.style.left=`${Math.min(x,projected)}px`; projectionLine.style.width=`${Math.abs(projected-x)}px`;
    };
    const draw=()=>{
      const dpr=Math.min(2,window.devicePixelRatio||1), cssW=graph.clientWidth, cssH=graph.clientHeight; if(graph.width!==Math.round(cssW*dpr)){graph.width=Math.round(cssW*dpr);graph.height=Math.round(cssH*dpr);} ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,cssW,cssH);
      ctx.globalAlpha=.16; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--text')||'#111'; ctx.lineWidth=1; for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(0,(cssH/4)*i);ctx.lineTo(cssW,(cssH/4)*i);ctx.stroke();}
      if(samples.length<2)return; const b=bounds(), span=Math.max(1,b.max-b.min); ctx.globalAlpha=.9; ctx.lineWidth=2; ctx.beginPath(); samples.forEach((s,i)=>{const px=i/(samples.length-1)*cssW, py=cssH-((s.x-b.min)/span)*cssH; i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.stroke();
      ctx.globalAlpha=.35;ctx.setLineDash([5,5]); const ty=cssH-((target-b.min)/span)*cssH;ctx.beginPath();ctx.moveTo(0,ty);ctx.lineTo(cssW,ty);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
    };
    const animate=()=>{
      if(!dragging){ const c=cfg(),dt=1/60, a=(-c.stiffness*(x-target)-c.damping*v)/c.mass; v+=a*dt; x+=v*dt; if(Math.abs(x-target)<.08&&Math.abs(v)<.3){x=target;v=0;} }
      samples.push({x}); if(samples.length>120)samples.shift(); setCard(); draw(); motionRAF=requestAnimationFrame(animate);
    };
    const reset=()=>{ const a=anchors(); x=a[1];target=a[1];v=0;samples=[];setCard();draw(); };
    const onDown=e=>{ if(e.button!==undefined&&e.button!==0)return; if(e.cancelable)e.preventDefault(); clearSelection(); card.focus({preventScroll:true}); dragging=true;card.setPointerCapture?.(e.pointerId);pointerStart=e.clientX;dragStart=x;lastX=e.clientX;lastT=performance.now();card.classList.add('is-held'); };
    const onMove=e=>{ if(!dragging)return; if(e.cancelable)e.preventDefault(); clearSelection(); const now=performance.now(),dt=Math.max(8,now-lastT)/1000,raw=dragStart+(e.clientX-pointerStart),b=bounds();x=rubber(raw,b.min,b.max,cfg().rubber);const instant=(e.clientX-lastX)/dt;v=v*.35+instant*.65;lastX=e.clientX;lastT=now; };
    const onUp=()=>{ if(!dragging)return; clearSelection();dragging=false;card.classList.remove('is-held'); card.focus({preventScroll:true}); const projected=x+v*cfg().projection;target=nearest(projected); };
    const onSelectStart=e=>{ if(dragging)e.preventDefault(); };
    const onKeyDown=e=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
      e.preventDefault();
      const a=anchors(); let index=anchorIndex(target,a);
      if(e.key==='Home')index=0; else if(e.key==='End')index=2; else index=Math.max(0,Math.min(2,index+(e.key==='ArrowRight'?1:-1)));
      target=a[index]; v=0; setCard();
    };
    card.addEventListener('pointerdown',onDown);card.addEventListener('keydown',onKeyDown);root.addEventListener('selectstart',onSelectStart);window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',onUp);window.addEventListener('pointercancel',onUp);
    Object.entries(controls).forEach(([id,input])=>input.addEventListener('input',()=>{root.querySelector(`[data-motion-output="${id}"]`).textContent=input.value;}));
    root.querySelector('[data-motion-reset]').addEventListener('click',reset);
    const onResize=()=>reset();window.addEventListener('resize',onResize);
    motionCleanup=()=>{card.removeEventListener('keydown',onKeyDown);root.removeEventListener('selectstart',onSelectStart);window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onUp);window.removeEventListener('pointercancel',onUp);window.removeEventListener('resize',onResize);};
    reset(); animate();
  }

  const previousInitComments=initComments;
  initComments=function(){ previousInitComments(); stopMotion(); stopMission(); enhanceArticle(); };
  queueMicrotask(enhanceArticle);
})();