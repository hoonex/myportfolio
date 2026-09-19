/* Pulse Grid v30 — configurable 4-lane rhythm game studio. */
(()=>{
'use strict';
if(globalThis.HJRhythmGameV30?.installed){globalThis.HJRhythmGameV30.sync?.();return;}
const ROUTE='/lab/rhythm';
const KEY_TO_LANE=Object.freeze({KeyD:0,KeyF:1,KeyJ:2,KeyK:3});
const LANE_KEYS=Object.freeze(['D','F','J','K']);
const LANE_COLORS=Object.freeze(['#78a0ff','#5edbc1','#ffad68','#d895ff']);
const BASE_TRAVEL=1.85;
const SCORE_VALUE=Object.freeze({perfect:1000,great:760,good:420,miss:0});
const Chart=globalThis.HJRhythmChartV30;
const Audio=globalThis.HJRhythmAudioV30;
if(!Chart||!Audio){console.error('[Pulse Grid v30] dependencies missing');return;}
const audio=Audio.createEngine();
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
const fmtScore=v=>Math.max(0,Math.round(v)).toLocaleString('en-US');
const fmtOffset=v=>`${v>0?'+':''}${Math.round(v)} ms`;
const fmtSpeed=v=>`${Number(v).toFixed(1)}×`;
const SETTINGS_KEY='pulse-grid-v30-settings';

const DEFAULTS=Object.freeze({bpm:132,speed:1.3,density:1,judgement:'standard',fx:'high',offset:0,volume:.72,energy:1});
const PRESETS=Object.freeze({
  easy:Object.freeze({label:'Easy',sub:'Readable + forgiving',bpm:108,speed:1,density:.65,judgement:'relaxed',fx:'medium',offset:0,volume:.72,energy:.82}),
  standard:Object.freeze({label:'Standard',sub:'Original balance',bpm:132,speed:1.3,density:1,judgement:'standard',fx:'high',offset:0,volume:.72,energy:1}),
  rush:Object.freeze({label:'Rush',sub:'Fast + dense',bpm:176,speed:1.9,density:1.3,judgement:'standard',fx:'high',offset:0,volume:.76,energy:1.24}),
  precision:Object.freeze({label:'Precision',sub:'Tight windows',bpm:148,speed:2.1,density:.9,judgement:'tight',fx:'high',offset:0,volume:.68,energy:1.04})
});
let current=null;

function sanitize(input={}){
  return {
    bpm:clamp(Math.round(Number(input.bpm)||DEFAULTS.bpm),90,200),
    speed:clamp(Math.round((Number(input.speed)||DEFAULTS.speed)*10)/10,.8,2.6),
    density:clamp(Math.round((Number(input.density)||DEFAULTS.density)*20)/20,.6,1.5),
    judgement:['relaxed','standard','tight'].includes(input.judgement)?input.judgement:DEFAULTS.judgement,
    fx:['low','medium','high'].includes(input.fx)?input.fx:DEFAULTS.fx,
    offset:clamp(Math.round(Number(input.offset)||0),-180,180),
    volume:clamp(Number.isFinite(Number(input.volume))?Number(input.volume):DEFAULTS.volume,0,1),
    energy:clamp(Number(input.energy)||DEFAULTS.energy,.65,1.35)
  };
}
function loadSettings(){try{return sanitize({...DEFAULTS,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')});}catch{return sanitize(DEFAULTS);}}
function saveSettings(settings){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}}
function presetFor(settings){
  for(const [key,p] of Object.entries(PRESETS)){
    const same=['bpm','speed','density','judgement','fx','offset','volume','energy'].every(k=>{
      if(typeof p[k]==='string')return settings[k]===p[k];
      return Math.abs(Number(settings[k])-Number(p[k]))<.0001;
    });
    if(same)return key;
  }
  return 'custom';
}
function windowsLabel(mode){return mode==='relaxed'?'Relaxed':mode==='tight'?'Tight':'Standard';}
function densityLabel(v){return v<.8?'Light':v<1.12?'Standard':v<1.35?'Dense':'Extreme';}

function template(settings,chart){
  return `<div class="page rhythm-page-v30" data-rhythm-v30 tabindex="-1">
    <section class="rhythm-shell-v30">
      <header class="rhythm-hero-v30">
        <div class="rhythm-hero-copy-v30">
          <a class="rhythm-back-v30" href="#/">← Current work</a>
          <div class="rhythm-kicker-v30">RHYTHM LAB / LIVE CONFIG</div>
          <h1>Pulse Grid</h1>
          <p>한 개의 audio clock을 기준으로 차트·음악·판정을 동기화하고, 플레이 스타일을 실시간으로 튜닝하는 4-lane rhythm lab.</p>
          <a class="rhythm-tiles-link-v30" href="#/lab/tiles">▶ 4-LANE TILES <span>클래식 · 콤보 모드 플레이 ↗</span></a>
        </div>
        <div class="rhythm-live-meta-v30" aria-label="Current configuration">
          <div><span>BPM</span><b data-meta-bpm>${chart.bpm}</b></div>
          <div><span>NOTES</span><b data-meta-notes>${chart.notes.length}</b></div>
          <div><span>SPEED</span><b data-meta-speed>${fmtSpeed(settings.speed)}</b></div>
          <div><span>WINDOW</span><b data-meta-window>${windowsLabel(settings.judgement)}</b></div>
        </div>
      </header>

      <section class="rhythm-presets-v30" aria-label="Gameplay presets">
        <div class="rhythm-section-label-v30"><span>PRESETS</span><small data-preset-status>${presetFor(settings)==='custom'?'CUSTOM':'SELECT ONE'}</small></div>
        <div class="rhythm-preset-grid-v30">
          ${Object.entries(PRESETS).map(([key,p])=>`<button type="button" data-preset="${key}" class="rhythm-preset-v30"><span>${p.label}</span><small>${p.bpm} BPM · ${p.sub}</small></button>`).join('')}
        </div>
      </section>

      <div class="rhythm-layout-v30">
        <section class="rhythm-stage-card-v30" aria-label="Pulse Grid game">
          <div class="rhythm-stage-v30">
            <canvas class="rhythm-canvas-v30" aria-label="4 lane rhythm game playfield"></canvas>
            <div class="rhythm-stage-top-v30" aria-hidden="true"><span data-stage-preset>CUSTOM</span><span data-stage-config>${chart.bpm} BPM · ${chart.notes.length} NOTES</span></div>
            <div class="rhythm-center-v30" aria-live="polite"><strong data-rhythm-judge>READY</strong><span data-rhythm-delta>Configure, then start</span></div>
            <div class="rhythm-progress-v30" aria-hidden="true"><i data-rhythm-progress></i></div>
          </div>
          <div class="rhythm-pads-v30" aria-label="Touch lanes">
            ${LANE_KEYS.map((key,lane)=>`<button type="button" class="rhythm-pad-v30" data-lane="${lane}" style="--lane:${LANE_COLORS[lane]}" aria-label="Lane ${lane+1}, ${key}"><span>${key}</span><small>${lane+1}</small></button>`).join('')}
          </div>
        </section>

        <aside class="rhythm-panel-v30">
          <div class="rhythm-stats-v30">
            <div class="rhythm-score-v30"><span>SCORE</span><strong data-rhythm-score>0</strong></div>
            <div><span>COMBO</span><strong data-rhythm-combo>0</strong></div>
            <div><span>ACCURACY</span><strong data-rhythm-accuracy>100.0%</strong></div>
          </div>
          <div class="rhythm-breakdown-v30">
            <span><i>P</i><b data-count-perfect>0</b>Perfect</span><span><i>G</i><b data-count-great>0</b>Great</span>
            <span><i>O</i><b data-count-good>0</b>Good</span><span><i>M</i><b data-count-miss>0</b>Miss</span>
          </div>
          <button type="button" class="rhythm-start-v30" data-rhythm-start><span>Start run</span><small>D / F / J / K or touch</small></button>

          <div class="rhythm-settings-v30">
            <div class="rhythm-section-label-v30"><span>RUN SETUP</span><small>LOCKED WHILE PLAYING</small></div>
            <label class="rhythm-setting-v30">
              <span><b>BPM</b><output data-value-bpm>${settings.bpm}</output></span>
              <input data-setting="bpm" type="range" min="90" max="200" step="1" value="${settings.bpm}" />
            </label>
            <label class="rhythm-setting-v30">
              <span><b>Note speed</b><output data-value-speed>${fmtSpeed(settings.speed)}</output></span>
              <input data-setting="speed" type="range" min="0.8" max="2.6" step="0.1" value="${settings.speed}" />
              <small>플레이 중에도 변경할 수 있습니다. 판정 시점은 바뀌지 않습니다.</small>
            </label>
            <label class="rhythm-setting-v30">
              <span><b>Density</b><output data-value-density>${densityLabel(settings.density)} · ${settings.density.toFixed(2)}</output></span>
              <input data-setting="density" type="range" min="0.6" max="1.5" step="0.05" value="${settings.density}" />
            </label>
            <div class="rhythm-setting-v30">
              <span><b>Judgement</b><output data-value-judgement>${windowsLabel(settings.judgement)}</output></span>
              <div class="rhythm-segmented-v30" data-segment="judgement">
                <button type="button" data-value="relaxed">Relaxed</button><button type="button" data-value="standard">Standard</button><button type="button" data-value="tight">Tight</button>
              </div>
            </div>
            <label class="rhythm-setting-v30">
              <span><b>Timing offset</b><output data-value-offset>${fmtOffset(settings.offset)}</output></span>
              <input data-setting="offset" type="range" min="-180" max="180" step="5" value="${settings.offset}" />
            </label>
          </div>

          <div class="rhythm-settings-v30 rhythm-settings-secondary-v30">
            <div class="rhythm-section-label-v30"><span>FEEL / MIX</span><small>LIVE</small></div>
            <div class="rhythm-setting-v30">
              <span><b>Visual FX</b><output data-value-fx>${settings.fx.toUpperCase()}</output></span>
              <div class="rhythm-segmented-v30" data-segment="fx">
                <button type="button" data-value="low">Low</button><button type="button" data-value="medium">Med</button><button type="button" data-value="high">High</button>
              </div>
            </div>
            <label class="rhythm-setting-v30">
              <span><b>Music energy</b><output data-value-energy>${settings.energy.toFixed(2)}×</output></span>
              <input data-setting="energy" type="range" min="0.65" max="1.35" step="0.05" value="${settings.energy}" />
            </label>
            <label class="rhythm-setting-v30">
              <span><b>Volume</b><output data-value-volume>${Math.round(settings.volume*100)}%</output></span>
              <input data-setting="volume" type="range" min="0" max="1" step="0.05" value="${settings.volume}" />
            </label>
          </div>

          <div class="rhythm-result-v30" data-rhythm-result hidden>
            <div><span>RUN COMPLETE</span><strong data-result-grade>—</strong></div>
            <p data-result-copy></p>
          </div>
        </aside>
      </div>
    </section>
  </div>`;
}

function createState(root,settings){
  const canvas=root.querySelector('.rhythm-canvas-v30'),ctx=canvas.getContext('2d',{alpha:false});
  const state={
    root,canvas,ctx,settings:sanitize(settings),chart:null,phase:'idle',notes:[],score:0,combo:0,maxCombo:0,
    counts:{perfect:0,great:0,good:0,miss:0},raf:0,resizeObserver:null,laneFlash:[0,0,0,0],judgeTimer:0,lastFrame:performance.now(),destroyed:false,
    particles:[],hitBursts:[],runSettings:null,
    elements:{
      score:root.querySelector('[data-rhythm-score]'),combo:root.querySelector('[data-rhythm-combo]'),accuracy:root.querySelector('[data-rhythm-accuracy]'),judge:root.querySelector('[data-rhythm-judge]'),delta:root.querySelector('[data-rhythm-delta]'),progress:root.querySelector('[data-rhythm-progress]'),start:root.querySelector('[data-rhythm-start]'),
      result:root.querySelector('[data-rhythm-result]'),grade:root.querySelector('[data-result-grade]'),resultCopy:root.querySelector('[data-result-copy]'),
      countPerfect:root.querySelector('[data-count-perfect]'),countGreat:root.querySelector('[data-count-great]'),countGood:root.querySelector('[data-count-good]'),countMiss:root.querySelector('[data-count-miss]'),
      metaBpm:root.querySelector('[data-meta-bpm]'),metaNotes:root.querySelector('[data-meta-notes]'),metaSpeed:root.querySelector('[data-meta-speed]'),metaWindow:root.querySelector('[data-meta-window]'),presetStatus:root.querySelector('[data-preset-status]'),stagePreset:root.querySelector('[data-stage-preset]'),stageConfig:root.querySelector('[data-stage-config]')
    }
  };
  rebuildChart(state);wireSettings(state);wireInputs(state);resizeCanvas(state);updateHud(state);draw(state,previewTime(state));
  return state;
}
function rebuildChart(state){
  state.chart=Chart.generateChart({bpm:state.settings.bpm,density:state.settings.density});
  updateConfigUI(state);
}
function updateConfigUI(state){
  const e=state.elements,c=state.chart,s=state.settings,preset=presetFor(s);
  e.metaBpm.textContent=c.bpm;e.metaNotes.textContent=c.notes.length;e.metaSpeed.textContent=fmtSpeed(s.speed);e.metaWindow.textContent=windowsLabel(s.judgement);
  e.presetStatus.textContent=preset==='custom'?'CUSTOM':PRESETS[preset].label.toUpperCase();
  e.stagePreset.textContent=preset==='custom'?'CUSTOM':PRESETS[preset].label.toUpperCase();e.stageConfig.textContent=`${c.bpm} BPM · ${c.notes.length} NOTES · ${fmtSpeed(s.speed)}`;
  state.root.querySelectorAll('[data-preset]').forEach(b=>b.classList.toggle('is-active',b.dataset.preset===preset));
  state.root.querySelectorAll('[data-segment="judgement"] button').forEach(b=>b.classList.toggle('is-active',b.dataset.value===s.judgement));
  state.root.querySelectorAll('[data-segment="fx"] button').forEach(b=>b.classList.toggle('is-active',b.dataset.value===s.fx));
  const map={bpm:s.bpm,speed:s.speed,density:s.density,offset:s.offset,energy:s.energy,volume:s.volume};
  for(const [key,val] of Object.entries(map)){const input=state.root.querySelector(`[data-setting="${key}"]`);if(input&&document.activeElement!==input)input.value=String(val);}
  state.root.querySelector('[data-value-bpm]').textContent=s.bpm;
  state.root.querySelector('[data-value-speed]').textContent=fmtSpeed(s.speed);
  state.root.querySelector('[data-value-density]').textContent=`${densityLabel(s.density)} · ${s.density.toFixed(2)}`;
  state.root.querySelector('[data-value-judgement]').textContent=windowsLabel(s.judgement);
  state.root.querySelector('[data-value-offset]').textContent=fmtOffset(s.offset);
  state.root.querySelector('[data-value-fx]').textContent=s.fx.toUpperCase();
  state.root.querySelector('[data-value-energy]').textContent=`${s.energy.toFixed(2)}×`;
  state.root.querySelector('[data-value-volume]').textContent=`${Math.round(s.volume*100)}%`;
}
function applySetting(state,key,value){
  const live=['speed','fx','volume'].includes(key);
  if(state.phase==='playing'&&!live)return;
  const next={...state.settings,[key]:value};state.settings=sanitize(next);saveSettings(state.settings);
  if(key==='volume')audio.setVolume(state.settings.volume);
  if(['bpm','density'].includes(key))rebuildChart(state);else updateConfigUI(state);
  draw(state,state.phase==='playing'?audio.songTime():previewTime(state));
}
function applyPreset(state,key){
  if(state.phase==='playing'||!PRESETS[key])return;
  state.settings=sanitize(PRESETS[key]);saveSettings(state.settings);rebuildChart(state);updateConfigUI(state);draw(state,previewTime(state));
}
function wireSettings(state){
  state.root.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>applyPreset(state,b.dataset.preset)));
  state.root.querySelectorAll('[data-setting]').forEach(input=>input.addEventListener('input',()=>{const k=input.dataset.setting,v=Number(input.value);applySetting(state,k,v);}));
  state.root.querySelectorAll('[data-segment]').forEach(group=>group.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>applySetting(state,group.dataset.segment,b.dataset.value))));
  state.elements.start.addEventListener('click',()=>startRun(state));
}
function wireInputs(state){
  state.root.querySelectorAll('[data-lane]').forEach(button=>button.addEventListener('pointerdown',event=>{event.preventDefault();if(state.phase!=='playing')return;judgeLane(state,Number(button.dataset.lane));pulsePad(button);}));
  const resize=()=>resizeCanvas(state);if('ResizeObserver'in globalThis){state.resizeObserver=new ResizeObserver(resize);state.resizeObserver.observe(state.canvas);}else addEventListener('resize',resize);state.fallbackResize=resize;
}
function lockRunSetup(state,locked){
  state.root.querySelectorAll('[data-preset], [data-setting="bpm"], [data-setting="density"], [data-setting="offset"], [data-setting="energy"], [data-segment="judgement"] button').forEach(n=>n.disabled=locked);
}
function previewTime(state){const c=state.chart,travel=BASE_TRAVEL/state.settings.speed;return Math.max(0,c.introBeats*c.beatSeconds-travel*.58);}
function resetRun(state){
  state.notes=state.chart.notes.map(n=>({...n,status:'pending',delta:null}));state.score=0;state.combo=0;state.maxCombo=0;state.counts={perfect:0,great:0,good:0,miss:0};state.particles=[];state.hitBursts=[];state.laneFlash.fill(0);state.judgeTimer=0;
  state.elements.result.hidden=true;state.elements.judge.textContent='READY';state.elements.delta.textContent=`Count-in · ${state.runSettings.bpm} BPM`;state.elements.progress.style.transform='scaleX(0)';updateHud(state);
}
async function startRun(state){
  if(state.destroyed||state.phase==='starting')return;
  if(state.phase==='playing'){audio.stop();cancelAnimationFrame(state.raf);state.phase='idle';}
  state.runSettings=sanitize(state.settings);rebuildChart(state);state.phase='starting';state.elements.start.disabled=true;state.elements.start.querySelector('span').textContent='Starting…';lockRunSetup(state,true);resetRun(state);
  try{await audio.start({bpm:state.chart.bpm,totalBeats:state.chart.totalBeats,energy:state.runSettings.energy,volume:state.runSettings.volume});}
  catch(error){console.error('[Pulse Grid v30 audio]',error);state.phase='idle';state.elements.start.disabled=false;state.elements.start.querySelector('span').textContent='Start run';lockRunSetup(state,false);state.elements.judge.textContent='AUDIO ERROR';state.elements.delta.textContent='Web Audio를 시작할 수 없습니다.';return;}
  if(state.destroyed||current!==state||route()!==ROUTE){audio.stop();return;}
  state.phase='playing';state.elements.start.disabled=false;state.elements.start.querySelector('span').textContent='Restart run';state.lastFrame=performance.now();state.root.focus({preventScroll:true});cancelAnimationFrame(state.raf);state.raf=requestAnimationFrame(()=>frame(state));
}
function finishRun(state){
  if(state.phase!=='playing')return;state.phase='finished';cancelAnimationFrame(state.raf);audio.stop();lockRunSetup(state,false);state.elements.start.querySelector('span').textContent='Play again';state.elements.judge.textContent='COMPLETE';state.elements.delta.textContent=`Max combo ${state.maxCombo}`;
  const acc=Chart.accuracy(state.counts),grade=acc>=98?'S':acc>=94?'A':acc>=88?'B':acc>=78?'C':'D';state.elements.grade.textContent=grade;state.elements.resultCopy.textContent=`${acc.toFixed(1)}% accuracy · ${fmtScore(state.score)} pts · ${state.counts.miss} miss`;state.elements.result.hidden=false;draw(state,state.chart.duration);
}
function judgeLane(state,lane){
  if(state.phase!=='playing')return;const now=audio.songTime(),s=state.runSettings,offset=s.offset/1000,w=Chart.windowsFor(s.judgement);let candidate=null,best=Infinity;
  for(const note of state.notes){if(note.status!=='pending'||note.lane!==lane)continue;const delta=now-(note.time+offset),abs=Math.abs(delta);if(abs<best){candidate=note;best=abs;}if(note.time+offset>now+w.miss)break;}
  state.laneFlash[lane]=1;if(!candidate||best>w.miss){showJudge(state,'EMPTY','No note in window','empty');spawnBurst(state,lane,'empty');return;}
  const delta=now-(candidate.time+offset),quality=Chart.classify(delta,w);candidate.status=quality;candidate.delta=delta;state.counts[quality]++;
  if(quality==='miss')state.combo=0;else{state.combo++;state.maxCombo=Math.max(state.maxCombo,state.combo);state.score+=SCORE_VALUE[quality]*(1+Math.min(state.combo,100)*.0035);}
  const ms=Math.round(delta*1000),side=ms<0?'EARLY':ms>0?'LATE':'ON TIME';showJudge(state,quality.toUpperCase(),`${side} · ${ms>0?'+':''}${ms} ms`,quality);spawnBurst(state,lane,quality);updateHud(state);
}
function sweepMisses(state,now){
  const s=state.runSettings,w=Chart.windowsFor(s.judgement),offset=s.offset/1000;let changed=false,lastLane=0;
  for(const note of state.notes){if(note.status!=='pending')continue;if(now<=note.time+offset+w.miss)break;note.status='miss';note.delta=w.miss;state.counts.miss++;state.combo=0;changed=true;lastLane=note.lane;}
  if(changed){showJudge(state,'MISS','Too late','miss');spawnBurst(state,lastLane,'miss');updateHud(state);}
}
function showJudge(state,label,detail,quality){const e=state.elements;e.judge.textContent=label;e.delta.textContent=detail;e.judge.dataset.quality=quality;e.judge.classList.remove('is-pop');void e.judge.offsetWidth;e.judge.classList.add('is-pop');state.judgeTimer=performance.now()+520;}
function updateHud(state){const e=state.elements;e.score.textContent=fmtScore(state.score);e.combo.textContent=state.combo;e.accuracy.textContent=`${Chart.accuracy(state.counts).toFixed(1)}%`;e.countPerfect.textContent=state.counts.perfect;e.countGreat.textContent=state.counts.great;e.countGood.textContent=state.counts.good;e.countMiss.textContent=state.counts.miss;}
function pulsePad(button){button.classList.remove('is-hit');void button.offsetWidth;button.classList.add('is-hit');setTimeout(()=>button.classList.remove('is-hit'),90);}
function spawnBurst(state,lane,quality){
  if(state.settings.fx==='low')return;const count=state.settings.fx==='high'?10:5,color=quality==='miss'?'#ff7070':LANE_COLORS[lane];state.hitBursts.push({lane,life:1,color});
  for(let i=0;i<count;i++)state.particles.push({lane,xj:(Math.random()-.5)*.55,vx:(Math.random()-.5)*90,vy:-40-Math.random()*110,life:.45+Math.random()*.3,max:.75,size:1.5+Math.random()*2.8,color});
}
function frame(state){
  if(state.destroyed||current!==state||route()!==ROUTE||state.phase!=='playing')return;const now=audio.songTime(),stamp=performance.now(),dt=Math.min(.05,(stamp-state.lastFrame)/1000);state.lastFrame=stamp;
  for(let i=0;i<4;i++)state.laneFlash[i]=Math.max(0,state.laneFlash[i]-dt*5.4);state.particles.forEach(p=>{p.life-=dt;p.vy+=220*dt;});state.particles=state.particles.filter(p=>p.life>0);state.hitBursts.forEach(p=>p.life-=dt*3.3);state.hitBursts=state.hitBursts.filter(p=>p.life>0);
  sweepMisses(state,now);if(state.judgeTimer&&stamp>state.judgeTimer){state.judgeTimer=0;state.elements.judge.classList.remove('is-pop');state.elements.judge.textContent=state.combo?`${state.combo} COMBO`:'—';state.elements.delta.textContent='';state.elements.judge.dataset.quality='';}
  state.elements.progress.style.transform=`scaleX(${clamp(now/state.chart.duration,0,1)})`;draw(state,now);
  if(now>state.chart.duration+.25){for(const n of state.notes)if(n.status==='pending'){n.status='miss';state.counts.miss++;}updateHud(state);finishRun(state);return;}state.raf=requestAnimationFrame(()=>frame(state));
}
function resizeCanvas(state){
  const rect=state.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const maxDpr=state.settings.fx==='high'?2.25:2,dpr=Math.min(maxDpr,Math.max(1,devicePixelRatio||1)),width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);if(state.canvas.width!==width||state.canvas.height!==height){state.canvas.width=width;state.canvas.height=height;}state.ctx.setTransform(dpr,0,0,dpr,0,0);state.cssWidth=rect.width;state.cssHeight=rect.height;state.dpr=dpr;draw(state,state.phase==='playing'?audio.songTime():previewTime(state));
}
function roundedRect(ctx,x,y,w,h,r){const radius=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();}
function draw(state,now){
  const ctx=state.ctx,w=state.cssWidth||state.canvas.clientWidth,h=state.cssHeight||state.canvas.clientHeight;if(!w||!h)return;const s=state.phase==='playing'?state.runSettings||state.settings:state.settings,c=state.chart,laneW=w/4,hitY=h-62,spawnY=18,offset=s.offset/1000,travel=BASE_TRAVEL/state.settings.speed,fx=state.settings.fx;
  const beatPhase=((now/c.beatSeconds)%1+1)%1,pulse=fx==='high'?Math.pow(1-beatPhase,5):0;
  const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#0b0e15');bg.addColorStop(.55,'#0a0c11');bg.addColorStop(1,'#07090c');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  if(fx!=='low'){
    const glow=ctx.createRadialGradient(w*.5,h*.68,20,w*.5,h*.68,Math.max(w,h)*.72);glow.addColorStop(0,`rgba(92,126,255,${.045+pulse*.035})`);glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  }
  for(let lane=0;lane<4;lane++){
    const x=lane*laneW,flash=state.laneFlash[lane];ctx.fillStyle=flash>0?`rgba(255,255,255,${.025+flash*.075})`:(lane%2?'rgba(255,255,255,.015)':'rgba(255,255,255,.006)');ctx.fillRect(x,0,laneW,h);
    if(lane){ctx.fillStyle='rgba(255,255,255,.075)';ctx.fillRect(x-.5,0,1,h);}
  }
  const beat=c.beatSeconds,first=Math.floor((now-travel)/beat)-1,last=Math.ceil((now+travel*.3)/beat)+2;
  for(let b=first;b<=last;b++){
    if(b<0)continue;const target=b*beat+offset,t=(target-now)/travel,y=hitY-t*(hitY-spawnY);if(y<0||y>hitY+8)continue;ctx.fillStyle=b%4===0?'rgba(255,255,255,.16)':'rgba(255,255,255,.045)';ctx.fillRect(0,Math.round(y),w,b%4===0?1.5:1);
  }
  const notes=state.notes.length?state.notes:c.notes,wMiss=Chart.windowsFor(s.judgement).miss;
  for(const note of notes){
    if(note.status&&note.status!=='pending')continue;const until=note.time+offset-now;if(until>travel+.12||until<-wMiss-.08)continue;const t=until/travel,y=hitY-t*(hitY-spawnY),x=note.lane*laneW+laneW*.15,nw=laneW*.70,nh=clamp(laneW*.18,15,25),color=LANE_COLORS[note.lane];
    if(fx==='high'&&until>0){const tail=Math.min(42,Math.max(8,28*(1-t)));const grad=ctx.createLinearGradient(0,y-tail,0,y);grad.addColorStop(0,'rgba(255,255,255,0)');grad.addColorStop(1,color+'55');ctx.fillStyle=grad;roundedRect(ctx,x+nw*.18,y-tail,nw*.64,tail,8);ctx.fill();}
    ctx.save();ctx.shadowColor=color;ctx.shadowBlur=fx==='low'?4:fx==='medium'?10:17;ctx.fillStyle=color;roundedRect(ctx,x,y-nh/2,nw,nh,Math.min(10,nh/2));ctx.fill();ctx.restore();
    const shine=ctx.createLinearGradient(x,y-nh/2,x,y+nh/2);shine.addColorStop(0,'rgba(255,255,255,.82)');shine.addColorStop(.35,'rgba(255,255,255,.18)');shine.addColorStop(1,'rgba(255,255,255,.03)');ctx.fillStyle=shine;roundedRect(ctx,x+3,y-nh/2+2,nw-6,nh-4,Math.min(8,nh/2));ctx.fill();
  }
  state.hitBursts.forEach(b=>{const cx=(b.lane+.5)*laneW,r=(1-b.life)*54+12;ctx.save();ctx.globalAlpha=Math.max(0,b.life)*.7;ctx.strokeStyle=b.color;ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,hitY,r,0,Math.PI*2);ctx.stroke();ctx.restore();});
  state.particles.forEach(p=>{const cx=(p.lane+.5+p.xj)*laneW,age=p.max-p.life,py=hitY+p.vy*age*.35+80*age*age,px=cx+p.vx*age*.35;ctx.save();ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(px,py,p.size,0,Math.PI*2);ctx.fill();ctx.restore();});
  ctx.fillStyle='rgba(255,255,255,.84)';ctx.fillRect(0,hitY,w,2);if(fx!=='low'){ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(0,hitY-6,w,14);}
  ctx.font='650 12px ui-sans-serif,system-ui';ctx.textAlign='center';ctx.textBaseline='middle';for(let lane=0;lane<4;lane++){ctx.fillStyle='rgba(245,244,240,.58)';ctx.fillText(LANE_KEYS[lane],lane*laneW+laneW/2,hitY+31);}
  if(state.phase==='idle'||state.phase==='finished'){ctx.fillStyle='rgba(6,8,12,.16)';ctx.fillRect(0,0,w,h);}
}
function mount(){
  if(route()!==ROUTE)return;const app=document.querySelector('#app');if(!app)return;if(current&&!current.destroyed&&current.root.isConnected)return;teardown();document.title='Pulse Grid — HJ';document.querySelectorAll('[data-nav]').forEach(n=>{n.classList.remove('active');n.removeAttribute('aria-current')});const settings=loadSettings(),chart=Chart.generateChart({bpm:settings.bpm,density:settings.density});app.innerHTML=template(settings,chart);current=createState(app.querySelector('[data-rhythm-v30]'),settings);requestAnimationFrame(()=>current?.root.focus({preventScroll:true}));
}
function teardown(){if(!current)return;current.destroyed=true;cancelAnimationFrame(current.raf);current.resizeObserver?.disconnect();if(!current.resizeObserver)removeEventListener('resize',current.fallbackResize);audio.stop();current=null;}
function sync(){if(route()===ROUTE)mount();else teardown();}
function onKeydown(event){if(route()!==ROUTE||!current||current.phase!=='playing'||event.repeat)return;const target=event.target;if(target&&/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))return;const lane=KEY_TO_LANE[event.code];if(lane===undefined)return;event.preventDefault();judgeLane(current,lane);const pad=current.root.querySelector(`[data-lane="${lane}"]`);if(pad)pulsePad(pad);}
addEventListener('hashchange',sync);addEventListener('keydown',onKeydown,{passive:false});
globalThis.HJRhythmGameV30=Object.freeze({installed:true,build:'RHYTHM30-GAME-20260916',sync,get phase(){return current?.phase||'off'}});queueMicrotask(sync);
})();
