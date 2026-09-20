/* Pulse Grid Tiles v33 — configurable song library and long runs. */
(()=>{
'use strict';
if(globalThis.HJTilesV33?.installed){globalThis.HJTilesV33.sync();return;}
const ROUTE='/lab/tiles',KEY='pulse-grid-tiles-song-library-v3';
const GOALS=Object.freeze([100,300,1000,0]);const DEFAULT_GOAL=100;
const KEYS=Object.freeze({KeyD:0,KeyF:1,KeyJ:2,KeyK:3});
const SONGS=Object.freeze({
twinkle:Object.freeze({title:'반짝반짝 작은 별',subtitle:'영국 전래 선율 · 그랜드 피아노',melody:Object.freeze([60,60,67,67,69,69,67,65,65,64,64,62,62,60,67,67,65,65,64,64,62,67,67,65,65,64,64,62,60,60,67,67,69,69,67,65,65,64,64,62,62,60])}),
ode:Object.freeze({title:'환희의 송가',subtitle:'베토벤 · 교향곡 제9번 주제',melody:Object.freeze([64,64,65,67,67,65,64,62,60,60,62,64,64,62,62,64,64,65,67,67,65,64,62,60,60,62,64,62,60,60])}),
jacques:Object.freeze({title:'프레르 자크',subtitle:'프랑스 전래 동요 · 그랜드 피아노',melody:Object.freeze([60,62,64,60,60,62,64,60,64,65,67,64,65,67,67,69,67,65,64,60,67,69,67,65,64,60,60,67,60,60,67,60])})
});
const Audio=globalThis.HJTilesAudioV32;
if(!Audio){console.error('[Tiles v32] audio module not ready');return;}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
let current=null;
let seed=0x342ad91,last=2;const sequence=[2];
function laneAt(index){
 if(!Number.isSafeInteger(index)||index<0)throw new RangeError('tile index');
 while(sequence.length<=index){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  let next=(seed>>>0)%4;if(next===last)next=(next+1+((seed>>>9)%3))%4;
  sequence.push(next);last=next;}return sequence[index];
}
function loadPrefs(){
 try{const o=JSON.parse(localStorage.getItem(KEY)||'{}');
 const song=Object.hasOwn(SONGS,o.song)?o.song:'twinkle',goal=GOALS.includes(o.goal)?o.goal:DEFAULT_GOAL;
 return {song,goal,records:o.records&&typeof o.records==='object'?o.records:{}};}
 catch{return {song:'twinkle',goal:DEFAULT_GOAL,records:{}};}
}
const recordKey=s=>s.song+':'+s.goal;
function bestFor(s){const n=Number(s.records[recordKey(s)]);return Number.isFinite(n)&&n>0?n:0;}
function persist(s){try{localStorage.setItem(KEY,JSON.stringify({song:s.song,goal:s.goal,records:s.records}));}catch{}}
function checkpoint(s){if(s.goal!==0||s.idx<=bestFor(s))return;
 s.records[recordKey(s)]=s.idx;if(s.idx%10===0)persist(s);
}
const timeText=seconds=>Number.isFinite(seconds)?seconds.toFixed(2)+'초':'—';
const goalText=n=>n?n.toLocaleString()+'타일':'무한 타일';
const bestText=s=>s.goal===0?(bestFor(s)?bestFor(s).toLocaleString()+'타일':'—'):(bestFor(s)?timeText(bestFor(s)):'—');
function template(s){const song=SONGS[s.song];
 return '<div class="tiles-page tiles-speedrun-v32 tiles-library-v33" data-tiles-v33 tabindex="-1"><div class="tiles-shell">'+
 '<header class="tiles-top"><a class="tiles-back" href="#/lab/rhythm" aria-label="Rhythm Studio로 돌아가기">←</a><div class="tiles-song"><span>PULSE GRID / SPEEDRUN</span><h1 data-song-title>'+song.title+'</h1><p data-song-subtitle>'+song.subtitle+'</p></div><a class="tiles-studio" href="#/lab/rhythm">Studio ↗</a></header>'+
 '<section class="tiles-hud tiles-hud-v32" aria-label="스피드런 진행 상황"><div><small>진행</small><strong data-count>0 / '+(s.goal?s.goal.toLocaleString():'∞')+'</strong></div><div><small>시간</small><strong data-time>00:00.00</strong></div><div><small>정확도</small><strong data-accuracy>100.0%</strong></div><div><small>최고 기록</small><strong data-best>—</strong></div></section>'+
 '<div class="tiles-stage"><canvas data-canvas aria-label="4레인 스피드런. 파란 시작 타일부터 검은 타일이 있는 레인을 누르세요. D F J K 키도 지원합니다."></canvas>'+
 '<div class="tiles-stage-banner" aria-live="polite"><span data-phase>READY</span><strong data-banner>파란 시작 타일을 눌러주세요</strong><small data-detail>D · F · J · K / 터치</small></div>'+
 '<div class="tiles-stage-bottom"><span data-combo>0 COMBO</span><span data-misses>오입력 0</span></div></div>'+
 '<section class="tiles-speedrun-controls"><div class="tiles-speedrun-head"><span data-goal-label>'+goalText(s.goal)+' · NO DEATH</span><strong data-audio-status>피아노 음원 준비 중…</strong></div>'+
 '<div class="tiles-library-controls"><label class="tiles-choice">노래 선택<select data-song aria-label="재생할 노래 선택">'+Object.entries(SONGS).map(([id,item])=>'<option value="'+id+'"'+(id===s.song?' selected':'')+'>'+item.title+'</option>').join('')+'</select></label>'+
 '<label class="tiles-choice">플레이 길이<select data-goal aria-label="완주 타일 수 선택">'+GOALS.map(n=>'<option value="'+n+'"'+(n===s.goal?' selected':'')+'>'+goalText(n)+'</option>').join('')+'</select></label></div>'+
 '<button class="tiles-start" type="button" data-start>스피드런 시작</button><p class="tiles-instructions">노래와 길이를 골라 정답 타일을 빠르게 누르세요. 틀려도 계속 진행됩니다. 무한 모드는 최다 진행 타일 수를 기록하며 멜로디는 반복됩니다. 정확도 = 정답 입력 ÷ 전체 입력.</p>'+
 '<p class="tiles-audio-credit">피아노 녹음: <a href="https://github.com/Tonejs/audio/tree/master/salamander" target="_blank" rel="noopener noreferrer">Salamander Grand Piano · Alexander Holm</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>. 음원 로딩 전에는 합성 피아노 음색으로 대체됩니다.</p></section>'+
 '</div></div>';
}
function accuracy(s){return s.attempts?100*s.idx/s.attempts:100;}
function hud(s){
 s.$('count').textContent=s.goal?Math.min(s.idx,s.goal).toLocaleString()+' / '+s.goal.toLocaleString():s.idx.toLocaleString()+' / ∞';
 s.$('accuracy').textContent=accuracy(s).toFixed(1)+'%';
 s.$('best').textContent=bestText(s);
 s.$('combo').textContent=s.combo+' COMBO';
 s.$('misses').textContent='오입력 '+s.mistakes;
 s.$('start').textContent=s.phase==='playing'?'다시 시작':s.phase==='finished'?'다시 도전':'스피드런 준비';
 s.$('song').disabled=s.phase==='playing';s.$('goal').disabled=s.phase==='playing';s.$('goal-label').textContent=goalText(s.goal)+' · NO DEATH';
 s.$('phase').textContent=s.phase==='finished'?'COMPLETE':s.phase==='playing'?'SPEEDRUN':'READY';
}
function reset(s){
 cancelAnimationFrame(s.raf);s.phase='ready';s.idx=0;s.attempts=0;s.mistakes=0;s.combo=0;s.maxCombo=0;s.started=0;s.elapsed=0;s.lastHit=0;s.flashLane=-1;s.flashWrong=-1;s.flashAt=0;s.animAt=0;s.noticeUntil=0;
 s.$('time').textContent='00:00.00';s.$('banner').textContent='파란 시작 타일을 눌러주세요';s.$('detail').textContent='D · F · J · K / 터치';hud(s);draw(s,performance.now());
}
function notice(s,message,detail,ms=400){
 s.$('banner').textContent=message;s.$('detail').textContent=detail;s.noticeUntil=performance.now()+ms;
}
function finish(s,now){
 s.phase='finished';s.elapsed=(now-s.started)/1000;
 cancelAnimationFrame(s.raf);s.$('time').textContent=clock(s.elapsed);
 const oldBest=bestFor(s),isBest=!oldBest||s.elapsed<oldBest;if(isBest){s.records[recordKey(s)]=s.elapsed;persist(s);}
 hud(s);notice(s,isBest?'NEW RECORD!':goalText(s.goal)+' 완주!',timeText(s.elapsed)+' · 정확도 '+accuracy(s).toFixed(1)+'% · 오입력 '+s.mistakes,86400000);
 s.$('phase').textContent='COMPLETE';draw(s,now);
}
function clock(t){const min=Math.floor(t/60),sec=(t%60).toFixed(2).padStart(5,'0');return String(min).padStart(2,'0')+':'+sec;}
function press(s,lane){
 if(s.disposed||s.phase==='finished')return;
 const now=performance.now(),correct=lane===laneAt(s.idx);
 if(s.phase==='ready'){
  if(!correct){notice(s,'시작 타일을 눌러주세요','파란 타일에서 시작합니다');return;}
  s.phase='playing';s.started=now;void Audio.warm().then(()=>{if(current===s&&!s.disposed)updateAudio(s);});
  s.raf=requestAnimationFrame(()=>tick(s));
 }
 s.attempts++;
 if(!correct){
  s.mistakes++;s.combo=0;s.flashWrong=lane;s.flashAt=now;notice(s,'WRONG','게임은 계속됩니다 · 다음 타일을 눌러주세요',380);hud(s);draw(s,now);return;
 }
 const note=s.idx;s.idx++;s.combo++;s.maxCombo=Math.max(s.combo,s.maxCombo);s.lastHit=now;s.animAt=now;s.flashLane=lane;
 const melody=SONGS[s.song].melody;Audio.play(melody[note%melody.length]);
 checkpoint(s);notice(s,s.combo>1?s.combo+' COMBO':'GOOD',s.goal?s.idx.toLocaleString()+' / '+s.goal.toLocaleString():s.idx.toLocaleString()+' / ∞',340);
 if(s.goal>0&&s.idx>=s.goal){finish(s,now);return;}
 hud(s);draw(s,now);
}
function updateAudio(s){
 s.$('audio-status').textContent=Audio.ready?'그랜드 피아노 녹음 재생 중':Audio.sampleCount>0?'피아노 음원 일부 준비됨 · 합성 음색 보조':'음원 준비 중 · 합성 음색 사용';
}
function resize(s){const r=s.canvas.getBoundingClientRect();if(!r.width||!r.height)return;const d=Math.min(2,Math.max(1,globalThis.devicePixelRatio||1)),w=Math.round(r.width*d),h=Math.round(r.height*d);if(s.canvas.width!==w||s.canvas.height!==h){s.canvas.width=w;s.canvas.height=h;}s.g.setTransform(d,0,0,d,0,0);s.w=r.width;s.h=r.height;draw(s,performance.now());}
function rounded(g,x,y,w,h,r){if(w<=0||h<=0)return;g.beginPath();g.roundRect(x,y,w,h,Math.min(r,w/2,h/2));}
function draw(s,now){
 const g=s.g,w=s.w,h=s.h;if(!g||!w||!h)return;g.clearRect(0,0,w,h);
 const bg=g.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#9ddafa');bg.addColorStop(.5,'#bae2ff');bg.addColorStop(1,'#91bdf0');g.fillStyle=bg;g.fillRect(0,0,w,h);
 const lane=w/4,rowH=clamp(h*.185,74,132),target=h-72;
 for(let i=0;i<4;i++){g.fillStyle=i%2?'rgba(43,119,188,.038)':'rgba(255,255,255,.1)';g.fillRect(i*lane,0,lane,h);if(i){g.fillStyle='rgba(255,255,255,.7)';g.fillRect(i*lane-1,0,1,h);}}
 for(let i=0;i<36;i++){const x=((i*137+19)%101)/101*w,y=((i*79+31)%103)/103*h;g.fillStyle='rgba(255,255,255,.23)';g.beginPath();g.arc(x,y,1+i%3*.45,0,Math.PI*2);g.fill();}
 const p=clamp((now-s.animAt)/165,0,1),ease=p*p*(3-2*p),slide=s.phase==='playing'&&s.idx>0?-rowH*(1-ease):0;
 const index=s.phase==='ready'?0:s.idx;
 for(let i=index+7;i>=Math.max(0,index-1);i--){
  const l=laneAt(i),x=l*lane+3,y=target-rowH+(index-i)*rowH+slide;if(y>h||y+rowH<0)continue;
  const start=s.phase==='ready'&&i===0;
  g.save();g.shadowColor=start?'rgba(12,99,159,.36)':'rgba(0,12,35,.3)';g.shadowBlur=start?16:8;g.shadowOffsetY=3;
  const fill=g.createLinearGradient(x,y,x+lane,y+rowH);fill.addColorStop(0,start?'#4db4d1':'#1c2e4c');fill.addColorStop(1,start?'#2683b0':'#0b101e');
  g.fillStyle=fill;rounded(g,x,y+3,lane-6,rowH-7,5);g.fill();g.restore();
  g.fillStyle='rgba(255,255,255,.15)';rounded(g,x+5,y+7,lane-16,3,1.5);g.fill();
  if(start){g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='700 '+clamp(lane*.27,19,35)+'px system-ui';g.fillText('시작',x+(lane-6)/2,y+rowH/2);}
 }
 g.fillStyle='rgba(255,255,255,.83)';g.fillRect(0,target,w,3);
 if(s.phase==='playing'&&now-s.lastHit<210){g.fillStyle='rgba(255,255,255,'+(1-(now-s.lastHit)/210)*.32+')';g.fillRect(s.flashLane*lane,target-rowH,lane,rowH);}
 if(s.phase==='playing'&&s.flashWrong>=0&&now-s.flashAt<240){g.fillStyle='rgba(237,52,66,'+(1-(now-s.flashAt)/240)*.28+')';g.fillRect(s.flashWrong*lane,target-rowH,lane,rowH);}
 if(s.phase==='finished'){g.fillStyle='rgba(6,22,44,.3)';g.fillRect(0,0,w,h);}
}
function tick(s){
 if(s.disposed||current!==s||route()!==ROUTE||s.phase!=='playing')return;
 const now=performance.now();s.$('time').textContent=clock((now-s.started)/1000);
 if(s.noticeUntil&&now>s.noticeUntil){s.noticeUntil=0;s.$('banner').textContent=s.combo+' COMBO';s.$('detail').textContent='정확도 '+accuracy(s).toFixed(1)+'% · 다음 타일을 누르세요';}
 draw(s,now);s.raf=requestAnimationFrame(()=>tick(s));
}
function mount(){
 const app=document.querySelector('#app');if(!app)return;const preferences=loadPrefs();app.innerHTML=template(preferences);const root=app.querySelector('[data-tiles-v33]');
 const s={root,canvas:root.querySelector('[data-canvas]'),g:null,...preferences,phase:'ready',idx:0,attempts:0,mistakes:0,combo:0,maxCombo:0,started:0,elapsed:0,lastHit:0,flashLane:-1,flashWrong:-1,flashAt:0,animAt:0,noticeUntil:0,raf:0,disposed:false,observer:null};
 s.$=key=>root.querySelector('[data-'+key+']');s.g=s.canvas.getContext('2d',{alpha:false});
 s.canvas.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;event.preventDefault();const r=s.canvas.getBoundingClientRect();if(!r.width)return;press(s,clamp(Math.floor((event.clientX-r.left)/r.width*4),0,3));},{passive:false});
 s.$('start').addEventListener('click',()=>{persist(s);reset(s);root.focus({preventScroll:true});void Audio.warm().then(()=>{if(current===s&&!s.disposed)updateAudio(s);});});
 s.$('song').addEventListener('change',()=>{if(s.phase==='playing')return;const next=s.$('song').value;if(!Object.hasOwn(SONGS,next))return;s.song=next;s.$('song-title').textContent=SONGS[next].title;s.$('song-subtitle').textContent=SONGS[next].subtitle;reset(s);persist(s);});
 s.$('goal').addEventListener('change',()=>{if(s.phase==='playing')return;const next=Number(s.$('goal').value);if(!GOALS.includes(next))return;s.goal=next;reset(s);persist(s);});
 const onResize=()=>resize(s);s.fallbackResize=onResize;
 if('ResizeObserver'in globalThis){s.observer=new ResizeObserver(onResize);s.observer.observe(s.canvas);}else addEventListener('resize',onResize);
 reset(s);resize(s);root.focus({preventScroll:true});updateAudio(s);
 void Audio.prepare().then(()=>{if(current===s&&!s.disposed)updateAudio(s);});
 return s;
}
function teardown(){if(!current)return;const s=current;persist(s);s.disposed=true;cancelAnimationFrame(s.raf);s.observer?.disconnect();if(!s.observer)removeEventListener('resize',s.fallbackResize);Audio.stop();current=null;}
function sync(){if(route()!==ROUTE){teardown();return;}if(current&&!current.disposed&&current.root.isConnected)return;teardown();document.title='Pulse Grid Speedrun — HJ';current=mount();}
addEventListener('hashchange',sync);
addEventListener('keydown',event=>{if(route()!==ROUTE||!current||event.repeat||!Object.hasOwn(KEYS,event.code))return;const target=event.target;if(target&&/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))return;event.preventDefault();press(current,KEYS[event.code]);},{passive:false});
globalThis.HJTilesV33=Object.freeze({installed:true,sync,build:'TILES33-SONG-LIBRARY-20260921',get phase(){return current?.phase||'off'}});
queueMicrotask(sync);
})();