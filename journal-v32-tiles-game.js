/* Pulse Grid Tiles v32 — no-death 40-tile speedrun with attempt accuracy. */
(()=>{
'use strict';
if(globalThis.HJTilesV32?.installed){globalThis.HJTilesV32.sync();return;}
const ROUTE='/lab/tiles',KEY='pulse-grid-tiles-speedrun-v2',GOAL=40;
const KEYS=Object.freeze({KeyD:0,KeyF:1,KeyJ:2,KeyK:3});
const MELODY=Object.freeze([60,60,67,67,69,69,67,65,65,64,64,62,62,60,67,67,65,65,64,64,62,67,67,65,65,64,64,62,60,60,67,67,69,69,67,65,65,64,64,62]);
const Audio=globalThis.HJTilesAudioV32;
if(!Audio){console.error('[Tiles v32] audio module not ready');return;}
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
let current=null;
const sequence=(()=>{let seed=0x342ad91,last=2;const result=[2];for(let i=1;i<4096;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;let next=(seed>>>0)%4;if(next===last)next=(next+1+((seed>>>9)%3))%4;result.push(next);last=next;}return result;})();
function previousBest(){try{const o=JSON.parse(localStorage.getItem(KEY)||'{}');return Number.isFinite(o.best)&&o.best>0?o.best:0;}catch{return 0;}}
function persist(s){try{localStorage.setItem(KEY,JSON.stringify({best:s.best}));}catch{}}
const timeText=seconds=>Number.isFinite(seconds)?seconds.toFixed(2)+'초':'—';
function template(){
 return '<div class="tiles-page tiles-speedrun-v32" data-tiles-v32 tabindex="-1"><div class="tiles-shell">'+
 '<header class="tiles-top"><a class="tiles-back" href="#/lab/rhythm" aria-label="Rhythm Studio로 돌아가기">←</a><div class="tiles-song"><span>PULSE GRID / SPEEDRUN</span><h1>반짝반짝 작은 별</h1><p>40타일 스피드런 · 실수해도 계속 플레이</p></div><a class="tiles-studio" href="#/lab/rhythm">Studio ↗</a></header>'+
 '<section class="tiles-hud tiles-hud-v32" aria-label="스피드런 진행 상황"><div><small>진행</small><strong data-count>0 / 40</strong></div><div><small>시간</small><strong data-time>00:00.00</strong></div><div><small>정확도</small><strong data-accuracy>100.0%</strong></div><div><small>최고 기록</small><strong data-best>—</strong></div></section>'+
 '<div class="tiles-stage"><canvas data-canvas aria-label="4레인 스피드런. 파란 시작 타일부터 검은 타일이 있는 레인을 누르세요. D F J K 키도 지원합니다."></canvas>'+
 '<div class="tiles-stage-banner" aria-live="polite"><span data-phase>READY</span><strong data-banner>파란 시작 타일을 눌러주세요</strong><small data-detail>D · F · J · K / 터치</small></div>'+
 '<div class="tiles-stage-bottom"><span data-combo>0 COMBO</span><span data-misses>오입력 0</span></div></div>'+
 '<section class="tiles-speedrun-controls"><div class="tiles-speedrun-head"><span>40 TILES · NO DEATH</span><strong data-audio-status>피아노 음원 준비 중…</strong></div>'+
 '<button class="tiles-start" type="button" data-start>스피드런 시작</button><p class="tiles-instructions">정답 타일 40개를 최대한 빠르게 누르세요. 다른 레인을 눌러도 종료되지 않으며 타일은 그대로 유지됩니다. 정확도 = 정답 입력 ÷ 전체 입력.</p>'+
 '<p class="tiles-audio-credit">피아노 녹음: <a href="https://github.com/Tonejs/audio/tree/master/salamander" target="_blank" rel="noopener noreferrer">Salamander Grand Piano · Alexander Holm</a> · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener noreferrer">CC BY 3.0</a>. 음원 로딩 전에는 합성 피아노 음색으로 대체됩니다.</p></section>'+
 '</div></div>';
}
function accuracy(s){return s.attempts?100*s.idx/s.attempts:100;}
function hud(s){
 s.$('count').textContent=Math.min(s.idx,GOAL)+' / '+GOAL;
 s.$('accuracy').textContent=accuracy(s).toFixed(1)+'%';
 s.$('best').textContent=s.best?timeText(s.best):'—';
 s.$('combo').textContent=s.combo+' COMBO';
 s.$('misses').textContent='오입력 '+s.mistakes;
 s.$('start').textContent=s.phase==='playing'?'다시 시작':s.phase==='finished'?'다시 도전':'스피드런 시작';
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
 const isBest=!s.best||s.elapsed<s.best;if(isBest){s.best=s.elapsed;persist(s);}
 hud(s);notice(s,isBest?'NEW RECORD!':'40타일 완주!',timeText(s.elapsed)+' · 정확도 '+accuracy(s).toFixed(1)+'% · 오입력 '+s.mistakes,86400000);
 s.$('phase').textContent='COMPLETE';draw(s,now);
}
function clock(t){const min=Math.floor(t/60),sec=(t%60).toFixed(2).padStart(5,'0');return String(min).padStart(2,'0')+':'+sec;}
function press(s,lane){
 if(s.disposed||s.phase==='finished')return;
 const now=performance.now(),correct=lane===sequence[s.idx];
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
 Audio.play(MELODY[note%MELODY.length]);
 notice(s,s.combo>1?s.combo+' COMBO':'GOOD',s.idx+' / '+GOAL,340);
 if(s.idx>=GOAL){finish(s,now);return;}
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
  const l=sequence[i],x=l*lane+3,y=target-rowH+(index-i)*rowH+slide;if(y>h||y+rowH<0)continue;
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
 const app=document.querySelector('#app');if(!app)return;app.innerHTML=template();const root=app.querySelector('[data-tiles-v32]');
 const s={root,canvas:root.querySelector('[data-canvas]'),g:null,phase:'ready',idx:0,attempts:0,mistakes:0,combo:0,maxCombo:0,best:previousBest(),started:0,elapsed:0,lastHit:0,flashLane:-1,flashWrong:-1,flashAt:0,animAt:0,noticeUntil:0,raf:0,disposed:false,observer:null};
 s.$=key=>root.querySelector('[data-'+key+']');s.g=s.canvas.getContext('2d',{alpha:false});
 s.canvas.addEventListener('pointerdown',event=>{if(event.button!==undefined&&event.button!==0)return;event.preventDefault();const r=s.canvas.getBoundingClientRect();if(!r.width)return;press(s,clamp(Math.floor((event.clientX-r.left)/r.width*4),0,3));},{passive:false});
 s.$('start').addEventListener('click',()=>{reset(s);root.focus({preventScroll:true});void Audio.warm().then(()=>{if(current===s&&!s.disposed)updateAudio(s);});});
 const onResize=()=>resize(s);s.fallbackResize=onResize;
 if('ResizeObserver'in globalThis){s.observer=new ResizeObserver(onResize);s.observer.observe(s.canvas);}else addEventListener('resize',onResize);
 reset(s);resize(s);root.focus({preventScroll:true});updateAudio(s);
 void Audio.prepare().then(()=>{if(current===s&&!s.disposed)updateAudio(s);});
 return s;
}
function teardown(){if(!current)return;const s=current;s.disposed=true;cancelAnimationFrame(s.raf);s.observer?.disconnect();if(!s.observer)removeEventListener('resize',s.fallbackResize);Audio.stop();current=null;}
function sync(){if(route()!==ROUTE){teardown();return;}if(current&&!current.disposed&&current.root.isConnected)return;teardown();document.title='Pulse Grid Speedrun — HJ';current=mount();}
addEventListener('hashchange',sync);
addEventListener('keydown',event=>{if(route()!==ROUTE||!current||event.repeat||!Object.hasOwn(KEYS,event.code))return;const target=event.target;if(target&&/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))return;event.preventDefault();press(current,KEYS[event.code]);},{passive:false});
globalThis.HJTilesV32=Object.freeze({installed:true,sync,build:'TILES32-SPEEDRUN-20260920',get phase(){return current?.phase||'off'}});
queueMicrotask(sync);
})();