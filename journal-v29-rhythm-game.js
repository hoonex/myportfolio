/* Pulse Grid v29 — playable 4-lane rhythm game using an audio-clock timing core. */
(()=>{
'use strict';
if(globalThis.HJRhythmGameV29?.installed){
  globalThis.HJRhythmGameV29.sync?.();
  return;
}
const ROUTE='/lab/rhythm';
const KEY_TO_LANE=Object.freeze({KeyD:0,KeyF:1,KeyJ:2,KeyK:3});
const LANE_KEYS=Object.freeze(['D','F','J','K']);
const LANE_COLORS=Object.freeze(['#7ca0ff','#63d7c2','#ffad6b','#d996ff']);
const TRAVEL_SECONDS=1.85;
const NOTE_SPEED_MIN=.7,NOTE_SPEED_MAX=2,NOTE_SPEED_STEP=.1,NOTE_SPEED_DEFAULT=1;
const SCORE_VALUE=Object.freeze({perfect:1000,great:760,good:420,miss:0});
const Chart=globalThis.HJRhythmChartV29;
const Audio=globalThis.HJRhythmAudioV29;
if(!Chart||!Audio){console.error('[Pulse Grid] dependencies missing');return;}
const chart=Chart.generateChart();
const audio=Audio.createEngine();
let current=null;

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
const fmtScore=value=>Math.max(0,Math.round(value)).toLocaleString('en-US');
const fmtOffset=value=>`${value>0?'+':''}${Math.round(value)} ms`;
const fmtSpeed=value=>`${Number(value).toFixed(1)}×`;
const loadNoteSpeed=()=>{try{return clamp(Number(localStorage.getItem('pulse-grid-note-speed'))||NOTE_SPEED_DEFAULT,NOTE_SPEED_MIN,NOTE_SPEED_MAX)}catch{return NOTE_SPEED_DEFAULT}};
const saveNoteSpeed=value=>{try{localStorage.setItem('pulse-grid-note-speed',String(value))}catch{}};

function template(){
  return `<div class="page rhythm-page-v29" data-rhythm-v29 tabindex="-1">
    <section class="rhythm-shell-v29">
      <header class="rhythm-hero-v29">
        <div>
          <a class="rhythm-back-v29" href="#/">← Current work</a>
          <div class="rhythm-kicker-v29">RHYTHM SYSTEM / PLAYABLE MVP</div>
          <h1>Pulse Grid</h1>
          <p>화면 FPS가 아니라 Web Audio song clock으로 판정하는 4-lane 리듬게임 프로토타입.</p>
        </div>
        <div class="rhythm-track-meta-v29" aria-label="Track information">
          <span><b>${chart.bpm}</b>BPM</span><span><b>${chart.notes.length}</b>NOTES</span><span><b>${Math.ceil(chart.duration)}</b>SEC</span>
        </div>
      </header>
      <div class="rhythm-layout-v29">
        <section class="rhythm-stage-card-v29" aria-label="Pulse Grid game">
          <div class="rhythm-stage-v29">
            <canvas class="rhythm-canvas-v29" aria-label="4 lane rhythm game playfield"></canvas>
            <div class="rhythm-center-v29" aria-live="polite"><strong data-rhythm-judge>READY</strong><span data-rhythm-delta>Press Start</span></div>
            <div class="rhythm-progress-v29" aria-hidden="true"><i data-rhythm-progress></i></div>
          </div>
          <div class="rhythm-pads-v29" aria-label="Touch lanes">
            ${LANE_KEYS.map((key,lane)=>`<button type="button" class="rhythm-pad-v29" data-lane="${lane}" style="--lane:${LANE_COLORS[lane]}" aria-label="Lane ${lane+1}, ${key}"><span>${key}</span><small>${lane+1}</small></button>`).join('')}
          </div>
        </section>
        <aside class="rhythm-panel-v29">
          <div class="rhythm-stats-v29">
            <div><span>SCORE</span><strong data-rhythm-score>0</strong></div>
            <div><span>COMBO</span><strong data-rhythm-combo>0</strong></div>
            <div><span>ACCURACY</span><strong data-rhythm-accuracy>100.0%</strong></div>
          </div>
          <div class="rhythm-breakdown-v29">
            <span><i>P</i><b data-count-perfect>0</b>Perfect</span>
            <span><i>G</i><b data-count-great>0</b>Great</span>
            <span><i>O</i><b data-count-good>0</b>Good</span>
            <span><i>M</i><b data-count-miss>0</b>Miss</span>
          </div>
          <div class="rhythm-controls-v29">
            <button type="button" class="rhythm-start-v29" data-rhythm-start>Start run</button>
            <label class="rhythm-offset-v29">
              <span><b>Note speed</b><output data-rhythm-speed-value>1.0×</output></span>
              <input data-rhythm-speed type="range" min="${NOTE_SPEED_MIN}" max="${NOTE_SPEED_MAX}" step="${NOTE_SPEED_STEP}" value="${NOTE_SPEED_DEFAULT}" />
              <small>노트가 내려오는 시각 속도만 바뀝니다. 음악과 판정 타이밍은 그대로입니다.</small>
            </label>
            <label class="rhythm-offset-v29">
              <span><b>Timing offset</b><output data-rhythm-offset-value>0 ms</output></span>
              <input data-rhythm-offset type="range" min="-150" max="150" step="5" value="0" />
              <small>+ 값은 노트와 판정 타이밍을 더 늦춥니다. 플레이 중에는 고정됩니다.</small>
            </label>
          </div>
          <div class="rhythm-how-v29">
            <div><span>KEYS</span><b>D F J K</b></div>
            <div><span>TOUCH</span><b>4 bottom pads</b></div>
            <div><span>CLOCK</span><b>AudioContext.currentTime</b></div>
            <p>곡은 외부 음원 없이 Web Audio로 실시간 합성됩니다. 첫 1마디는 count-in입니다.</p>
          </div>
          <div class="rhythm-result-v29" data-rhythm-result hidden>
            <span>RUN COMPLETE</span><strong data-result-grade>—</strong><p data-result-copy></p>
          </div>
        </aside>
      </div>
    </section>
  </div>`;
}

function createState(root){
  const canvas=root.querySelector('.rhythm-canvas-v29');
  const ctx=canvas.getContext('2d',{alpha:false});
  const state={
    root,canvas,ctx,phase:'idle',notes:[],score:0,combo:0,maxCombo:0,
    counts:{perfect:0,great:0,good:0,miss:0},offsetMs:0,noteSpeed:loadNoteSpeed(),raf:0,resizeObserver:null,
    laneFlash:[0,0,0,0],judgeTimer:0,lastFrame:performance.now(),destroyed:false,
    elements:{
      score:root.querySelector('[data-rhythm-score]'),combo:root.querySelector('[data-rhythm-combo]'),accuracy:root.querySelector('[data-rhythm-accuracy]'),
      judge:root.querySelector('[data-rhythm-judge]'),delta:root.querySelector('[data-rhythm-delta]'),progress:root.querySelector('[data-rhythm-progress]'),
      start:root.querySelector('[data-rhythm-start]'),speed:root.querySelector('[data-rhythm-speed]'),speedValue:root.querySelector('[data-rhythm-speed-value]'),offset:root.querySelector('[data-rhythm-offset]'),offsetValue:root.querySelector('[data-rhythm-offset-value]'),
      result:root.querySelector('[data-rhythm-result]'),grade:root.querySelector('[data-result-grade]'),resultCopy:root.querySelector('[data-result-copy]'),
      countPerfect:root.querySelector('[data-count-perfect]'),countGreat:root.querySelector('[data-count-great]'),countGood:root.querySelector('[data-count-good]'),countMiss:root.querySelector('[data-count-miss]')
    }
  };
  state.elements.speed.value=String(state.noteSpeed);
  state.elements.speedValue.textContent=fmtSpeed(state.noteSpeed);
  state.elements.speed.addEventListener('input',()=>{
    state.noteSpeed=clamp(Number(state.elements.speed.value)||NOTE_SPEED_DEFAULT,NOTE_SPEED_MIN,NOTE_SPEED_MAX);
    state.elements.speedValue.textContent=fmtSpeed(state.noteSpeed);
    saveNoteSpeed(state.noteSpeed);
    draw(state,state.phase==='playing'?audio.songTime():0);
  });
  state.elements.offset.addEventListener('input',()=>{
    if(state.phase==='playing') return;
    state.offsetMs=Number(state.elements.offset.value)||0;
    state.elements.offsetValue.textContent=fmtOffset(state.offsetMs);
    draw(state,0);
  });
  state.elements.start.addEventListener('click',()=>startRun(state));
  root.querySelectorAll('[data-lane]').forEach(button=>{
    button.addEventListener('pointerdown',event=>{
      event.preventDefault();
      if(state.phase!=='playing') return;
      judgeLane(state,Number(button.dataset.lane));
      pulsePad(button);
    });
  });
  const resize=()=>resizeCanvas(state);
  if('ResizeObserver'in globalThis){state.resizeObserver=new ResizeObserver(resize);state.resizeObserver.observe(canvas);}
  else addEventListener('resize',resize);
  state.fallbackResize=resize;
  resizeCanvas(state);
  updateHud(state);
  draw(state,0);
  return state;
}

function resetRun(state){
  state.notes=chart.notes.map(note=>({...note,status:'pending',delta:null}));
  state.score=0;state.combo=0;state.maxCombo=0;
  state.counts={perfect:0,great:0,good:0,miss:0};
  state.laneFlash.fill(0);state.judgeTimer=0;
  state.elements.result.hidden=true;
  state.elements.judge.textContent='READY';state.elements.delta.textContent='Count-in: 4 beats';
  state.elements.progress.style.transform='scaleX(0)';
  updateHud(state);
}
async function startRun(state){
  if(state.destroyed)return;
  if(state.phase==='starting')return;
  state.phase='starting';
  state.elements.start.disabled=true;
  state.elements.start.textContent='Starting…';
  state.elements.offset.disabled=true;
  state.offsetMs=Number(state.elements.offset.value)||0;
  resetRun(state);
  try{
    await audio.start({bpm:chart.bpm,totalBeats:chart.totalBeats});
  }catch(error){
    console.error('[Pulse Grid audio]',error);
    state.phase='idle';
    state.elements.start.disabled=false;
    state.elements.start.textContent='Start run';
    state.elements.offset.disabled=false;
    state.elements.judge.textContent='AUDIO ERROR';
    state.elements.delta.textContent='Web Audio를 시작할 수 없습니다.';
    return;
  }
  if(state.destroyed||current!==state||route()!==ROUTE){audio.stop();return;}
  state.phase='playing';
  state.elements.start.disabled=false;
  state.elements.start.textContent='Restart run';
  state.lastFrame=performance.now();
  state.root.focus({preventScroll:true});
  cancelAnimationFrame(state.raf);
  state.raf=requestAnimationFrame(()=>frame(state));
}
function finishRun(state){
  if(state.phase!=='playing')return;
  state.phase='finished';
  cancelAnimationFrame(state.raf);
  audio.stop();
  state.elements.offset.disabled=false;
  state.elements.start.textContent='Play again';
  state.elements.judge.textContent='COMPLETE';
  state.elements.delta.textContent=`Max combo ${state.maxCombo}`;
  const acc=Chart.accuracy(state.counts);
  const grade=acc>=98?'S':acc>=94?'A':acc>=88?'B':acc>=78?'C':'D';
  state.elements.grade.textContent=grade;
  state.elements.resultCopy.textContent=`${acc.toFixed(1)}% · ${fmtScore(state.score)} pts · ${state.counts.miss} miss`;
  state.elements.result.hidden=false;
  draw(state,chart.duration);
}

function judgeLane(state,lane){
  if(state.phase!=='playing')return;
  const now=audio.songTime();
  const offset=state.offsetMs/1000;
  let candidate=null,best=Infinity;
  for(const note of state.notes){
    if(note.status!=='pending'||note.lane!==lane)continue;
    const delta=now-(note.time+offset),abs=Math.abs(delta);
    if(abs<best){candidate=note;best=abs;}
    if(note.time+offset>now+Chart.WINDOWS.miss)break;
  }
  state.laneFlash[lane]=1;
  if(!candidate||best>Chart.WINDOWS.miss){showJudge(state,'EMPTY','No note in window','empty');return;}
  const delta=now-(candidate.time+offset);
  const quality=Chart.classify(delta);
  candidate.status=quality;candidate.delta=delta;
  state.counts[quality]++;
  if(quality==='miss') state.combo=0;
  else{
    state.combo++;
    state.maxCombo=Math.max(state.maxCombo,state.combo);
    const comboBoost=1+Math.min(state.combo,100)*.0035;
    state.score+=SCORE_VALUE[quality]*comboBoost;
  }
  const ms=Math.round(delta*1000),side=ms<0?'EARLY':ms>0?'LATE':'ON TIME';
  showJudge(state,quality.toUpperCase(),`${side} · ${ms>0?'+':''}${ms} ms`,quality);
  updateHud(state);
}
function sweepMisses(state,now){
  const offset=state.offsetMs/1000;
  let changed=false;
  for(const note of state.notes){
    if(note.status!=='pending')continue;
    if(now<=note.time+offset+Chart.WINDOWS.miss)break;
    note.status='miss';note.delta=Chart.WINDOWS.miss;
    state.counts.miss++;state.combo=0;changed=true;
  }
  if(changed){showJudge(state,'MISS','Too late','miss');updateHud(state);}
}
function showJudge(state,label,detail,quality){
  state.elements.judge.textContent=label;
  state.elements.delta.textContent=detail;
  state.elements.judge.dataset.quality=quality;
  state.judgeTimer=performance.now()+520;
}
function updateHud(state){
  state.elements.score.textContent=fmtScore(state.score);
  state.elements.combo.textContent=String(state.combo);
  state.elements.accuracy.textContent=`${Chart.accuracy(state.counts).toFixed(1)}%`;
  state.elements.countPerfect.textContent=state.counts.perfect;
  state.elements.countGreat.textContent=state.counts.great;
  state.elements.countGood.textContent=state.counts.good;
  state.elements.countMiss.textContent=state.counts.miss;
}
function pulsePad(button){
  button.classList.remove('is-hit');
  void button.offsetWidth;
  button.classList.add('is-hit');
  setTimeout(()=>button.classList.remove('is-hit'),90);
}
function frame(state){
  if(state.destroyed||current!==state||route()!==ROUTE)return;
  if(state.phase!=='playing')return;
  const now=audio.songTime();
  const stamp=performance.now(),dt=Math.min(.05,(stamp-state.lastFrame)/1000);state.lastFrame=stamp;
  for(let i=0;i<state.laneFlash.length;i++) state.laneFlash[i]=Math.max(0,state.laneFlash[i]-dt*5.5);
  sweepMisses(state,now);
  if(state.judgeTimer&&stamp>state.judgeTimer){state.judgeTimer=0;state.elements.judge.textContent=state.combo?`${state.combo} COMBO`:'—';state.elements.delta.textContent='';state.elements.judge.dataset.quality='';}
  state.elements.progress.style.transform=`scaleX(${clamp(now/chart.duration,0,1)})`;
  draw(state,now);
  if(now>chart.duration+.25){
    for(const note of state.notes){if(note.status==='pending'){note.status='miss';state.counts.miss++;}}
    updateHud(state);finishRun(state);return;
  }
  state.raf=requestAnimationFrame(()=>frame(state));
}

function resizeCanvas(state){
  const rect=state.canvas.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const dpr=Math.min(2,Math.max(1,devicePixelRatio||1));
  const width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
  if(state.canvas.width!==width||state.canvas.height!==height){state.canvas.width=width;state.canvas.height=height;}
  state.ctx.setTransform(dpr,0,0,dpr,0,0);
  state.cssWidth=rect.width;state.cssHeight=rect.height;state.dpr=dpr;
  const time=state.phase==='playing'?audio.songTime():0;
  draw(state,time);
}
function roundedRect(ctx,x,y,w,h,r){
  const radius=Math.min(r,w/2,h/2);
  ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
}
function draw(state,now){
  const ctx=state.ctx,w=state.cssWidth||state.canvas.clientWidth,h=state.cssHeight||state.canvas.clientHeight;
  if(!w||!h)return;
  const dark=document.documentElement.dataset.theme==='dark';
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle=dark?'#0d0f13':'#e9e8e3';ctx.fillRect(0,0,w,h);
  const laneW=w/4,hitY=h-56,spawnY=18,offset=state.offsetMs/1000,travel=TRAVEL_SECONDS/state.noteSpeed;
  for(let lane=0;lane<4;lane++){
    const x=lane*laneW;
    ctx.fillStyle=state.laneFlash[lane]>0?(dark?`rgba(255,255,255,${.025+state.laneFlash[lane]*.07})`:`rgba(20,20,20,${.018+state.laneFlash[lane]*.05})`):(lane%2?(dark?'#101217':'#f0efea'):(dark?'#0d0f13':'#e9e8e3'));
    ctx.fillRect(x,0,laneW,h);
    if(lane){ctx.fillStyle=dark?'rgba(255,255,255,.08)':'rgba(18,19,21,.10)';ctx.fillRect(x-.5,0,1,h);}
  }
  const beat=chart.beatSeconds;
  const firstBeat=Math.floor((now-travel)/beat)-1;
  const lastBeat=Math.ceil((now+travel*.25)/beat)+2;
  for(let b=firstBeat;b<=lastBeat;b++){
    if(b<0)continue;
    const target=b*beat+offset;
    const t=(target-now)/travel;
    const y=hitY-t*(hitY-spawnY);
    if(y<0||y>hitY+8)continue;
    ctx.fillStyle=b%4===0?(dark?'rgba(255,255,255,.15)':'rgba(18,19,21,.16)'):(dark?'rgba(255,255,255,.055)':'rgba(18,19,21,.055)');
    ctx.fillRect(0,Math.round(y),w,b%4===0?1.5:1);
  }
  for(const note of state.notes.length?state.notes:chart.notes){
    if(note.status&&note.status!=='pending')continue;
    const target=note.time+offset;
    const until=target-now;
    if(until>travel+.12||until<-Chart.WINDOWS.miss-.08)continue;
    const t=until/travel;
    const y=hitY-t*(hitY-spawnY);
    const x=note.lane*laneW+laneW*.16,nw=laneW*.68,nh=clamp(laneW*.17,14,24);
    const color=LANE_COLORS[note.lane];
    ctx.save();ctx.shadowColor=color;ctx.shadowBlur=dark?12:5;ctx.fillStyle=color;roundedRect(ctx,x,y-nh/2,nw,nh,Math.min(10,nh/2));ctx.fill();ctx.restore();
    ctx.fillStyle=dark?'rgba(255,255,255,.72)':'rgba(255,255,255,.82)';roundedRect(ctx,x+4,y-nh/2+3,nw-8,Math.max(2,nh*.2),4);ctx.fill();
  }
  ctx.fillStyle=dark?'rgba(255,255,255,.82)':'rgba(18,19,21,.78)';ctx.fillRect(0,hitY,w,2);
  ctx.font='600 12px ui-sans-serif, system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  for(let lane=0;lane<4;lane++){
    const cx=lane*laneW+laneW/2;
    ctx.fillStyle=dark?'rgba(245,244,240,.58)':'rgba(18,19,21,.52)';ctx.fillText(LANE_KEYS[lane],cx,hitY+28);
  }
  if(state.phase==='idle'||state.phase==='finished'){
    ctx.fillStyle=dark?'rgba(11,12,14,.34)':'rgba(242,241,237,.36)';ctx.fillRect(0,0,w,h);
  }
}

function mount(){
  if(route()!==ROUTE)return;
  const app=document.querySelector('#app');if(!app)return;
  if(current&&!current.destroyed&&current.root.isConnected)return;
  teardown();
  document.title='Pulse Grid — HJ';
  document.querySelectorAll('[data-nav]').forEach(node=>{node.classList.remove('active');node.removeAttribute('aria-current')});
  app.innerHTML=template();
  const root=app.querySelector('[data-rhythm-v29]');
  current=createState(root);
  requestAnimationFrame(()=>root.focus({preventScroll:true}));
}
function teardown(){
  if(!current)return;
  current.destroyed=true;
  cancelAnimationFrame(current.raf);
  current.resizeObserver?.disconnect();
  if(!current.resizeObserver) removeEventListener('resize',current.fallbackResize);
  audio.stop();
  current=null;
}
function sync(){if(route()===ROUTE)mount();else teardown();}
function onKeydown(event){
  if(route()!==ROUTE||!current||current.phase!=='playing'||event.repeat)return;
  const target=event.target;
  if(target&&/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))return;
  const lane=KEY_TO_LANE[event.code];
  if(lane===undefined)return;
  event.preventDefault();
  judgeLane(current,lane);
  const pad=current.root.querySelector(`[data-lane="${lane}"]`);if(pad)pulsePad(pad);
}
addEventListener('hashchange',sync);
addEventListener('keydown',onKeydown,{passive:false});
globalThis.HJRhythmGameV29=Object.freeze({installed:true,build:'RHYTHM29-GAME-SPEED-20260916',sync,get phase(){return current?.phase||'off'}});
queueMicrotask(sync);
})();
