/* Pulse Grid Tiles: standalone, original four-lane tile mode. */
(()=>{
'use strict';
if(globalThis.HJTilesV31?.installed){globalThis.HJTilesV31.sync();return;}
const ROUTE='/lab/tiles',KEY='pulse-grid-tiles-v1',GOAL=40;
const KEYS={KeyD:0,KeyF:1,KeyJ:2,KeyK:3};
const MELODY=[60,60,67,67,69,69,67,65,65,64,64,62,62,60,67,67,65,65,64,64,62,67,67,65,65,64,64,62,60,60,67,67,69,69,67,65,65,64,64,62,62,60];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
let active=null,ac=null;
const voices=new Set();
const sequence=(()=>{let seed=0x342ad91,last=2;const out=[2];for(let i=1;i<4096;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;let v=(seed>>>0)%4;if(v===last)v=(v+1+((seed>>>9)%3))%4;out.push(v);last=v;}return out;})();
function prefs(){try{const p=JSON.parse(localStorage.getItem(KEY)||'{}');return {mode:p.mode==='combo'?'combo':'classic',bpm:clamp(Number(p.bpm)||132,90,200),classicBest:Number(p.classicBest)||0,comboBest:Number(p.comboBest)||0};}catch{return {mode:'classic',bpm:132,classicBest:0,comboBest:0};}}
function save(s){try{localStorage.setItem(KEY,JSON.stringify({mode:s.mode,bpm:s.bpm,classicBest:s.classicBest,comboBest:s.comboBest}));}catch{}}
function playNote(i){
 const A=globalThis.AudioContext||globalThis.webkitAudioContext;if(!A)return;
 try{if(!ac)ac=new A({latencyHint:'interactive'});if(ac.state==='suspended')void ac.resume();
 const t=ac.currentTime,f=440*Math.pow(2,(MELODY[i%MELODY.length]-69)/12),gain=ac.createGain();
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.14,t+.014);gain.gain.exponentialRampToValueAtTime(.0001,t+.37);gain.connect(ac.destination);
 for(const [type,oct,vol] of [['triangle',1,1],['sine',2,.13]]){
  const osc=ac.createOscillator(),level=ac.createGain();osc.type=type;osc.frequency.value=f*oct;level.gain.value=vol;osc.connect(level);level.connect(gain);
  osc.start(t);osc.stop(t+.4);voices.add(osc);osc.onended=()=>{voices.delete(osc);try{osc.disconnect();level.disconnect();}catch{}};
 }}catch(err){console.warn('[Tiles audio]',err);}
}
function html(s){return '<div class="tiles-page" data-tiles-root tabindex="-1"><div class="tiles-shell">'+
 '<header class="tiles-top"><a class="tiles-back" href="#/lab/rhythm" aria-label="Pulse Grid 설정으로 돌아가기">←</a><div class="tiles-song"><span> PULSE GRID / TILES </span><h1>반짝반짝 작은 별</h1><p>영국 전래 선율 · 독자적인 신시사이저 편곡</p></div><a class="tiles-studio" href="#/lab/rhythm">Rhythm Studio ↗</a></header>'+
 '<section class="tiles-hud" aria-label="진행 상황"><div><small>현재 기록</small><strong data-count>0 / 40</strong></div><div><small>COMBO</small><strong data-combo>0</strong></div><div><small>최고 기록</small><strong data-best>—</strong></div></section>'+
 '<div class="tiles-stage"><canvas data-canvas aria-label="4레인 타일 게임. 화면의 다음 타일을 터치하거나 키보드 D F J K를 누르세요."></canvas><div class="tiles-stage-banner" aria-live="polite"><span data-phase>READY</span><strong data-banner>시작 타일을 눌러주세요</strong><small data-detail>D · F · J · K / 터치</small></div><div class="tiles-stage-bottom"><span data-time>00:00.00</span><span data-live>BPM '+s.bpm+'</span></div></div>'+
 '<section class="tiles-items" aria-label="아이템"><button type="button" data-item="boost" aria-label="다음 10타일 점수 두 배"><span class="tiles-item-symbol">↑</span><span class="tiles-item-label">BOOST</span><b data-stock="boost">3</b></button><button type="button" data-item="freeze" aria-label="콤보 모드 제한 시간 3초 추가"><span class="tiles-item-symbol">✳</span><span class="tiles-item-label">FREEZE</span><b data-stock="freeze">3</b></button><button type="button" data-item="shield" aria-label="다음 실수 또는 시간 초과 한 번 방어"><span class="tiles-item-symbol">◇</span><span class="tiles-item-label">SHIELD</span><b data-stock="shield">3</b></button></section>'+
 '<section class="tiles-controls"><div class="tiles-tabs" role="group" aria-label="플레이 모드"><button data-mode="classic" type="button">클래식 <span>40 TILES</span></button><button data-mode="combo" type="button">콤보 <span>ENDLESS</span></button></div><label class="tiles-tempo">BPM <input type="range" min="90" max="200" step="2" data-bpm value="'+s.bpm+'"><output data-bpm-value>'+s.bpm+'</output></label><button class="tiles-start" type="button" data-start>게임 시작</button><p class="tiles-instructions">파란 시작 타일을 누르세요. 클래식은 40타일 완주 시간, 콤보는 제한 시간 안에 누른 타일의 점수를 기록합니다.</p></section>'+
 '</div></div>';}
function bestText(s){return s.mode==='classic'?(s.classicBest?s.classicBest.toFixed(2)+'초':'—'):(s.comboBest||0).toLocaleString()+' pts';}
function hud(s){
 s.$('count').textContent=s.mode==='classic'?Math.min(s.idx,GOAL)+' / '+GOAL:s.score.toLocaleString()+' pts';
 s.$('combo').textContent=String(s.combo);s.$('best').textContent=bestText(s);
 s.$('phase').textContent=s.phase==='ready'?'READY':s.phase==='ended'?'RESULT':s.mode==='combo'?'COMBO':'CLASSIC';
 if(s.phase==='ready'){s.$('banner').textContent='시작 타일을 눌러주세요';s.$('detail').textContent='D · F · J · K / 터치';}
 s.$('start').textContent=s.phase==='playing'?'다시 시작':s.phase==='ended'?'다시 플레이':'게임 시작';
 s.$('bpm').value=String(s.bpm);s.$('bpm').disabled=s.phase==='playing';s.$('bpm-value').textContent=String(s.bpm);s.$('live').textContent='BPM '+s.bpm;
 s.root.querySelectorAll('[data-mode]').forEach(b=>{const on=b.dataset.mode===s.mode;b.classList.toggle('is-current',on);b.setAttribute('aria-pressed',String(on));});
 for(const k of ['boost','freeze','shield']){const b=s.root.querySelector('[data-item="'+k+'"]');b.querySelector('b').textContent=String(s.stock[k]);b.disabled=s.phase!=='playing'||!s.stock[k]||(k==='freeze'&&s.mode!=='combo')||(k==='shield'&&s.shield);b.classList.toggle('is-active',k==='shield'?s.shield:k==='boost'?s.boostLeft>0:performance.now()<s.freezeUntil);}
}
function notice(s,message,ms=550){s.notice=message;s.noticeUntil=performance.now()+ms;s.$('banner').textContent=message;s.$('detail').textContent='';}
function reset(s){
 cancelAnimationFrame(s.raf);s.phase='ready';s.idx=0;s.combo=0;s.score=0;s.started=0;s.ended=0;s.deadline=0;s.boostLeft=0;s.shield=false;s.freezeUntil=0;
 s.stock={boost:3,freeze:3,shield:3};s.lastHit=0;s.animAt=0;s.flashLane=-1;s.notice='';s.noticeUntil=0;s.$('time').textContent='00:00.00';hud(s);draw(s,performance.now());
}
function allowance(s){return clamp(60/s.bpm*1.85,.48,1.45)*1000;}
function finish(s,won,reason){
 s.phase='ended';s.ended=performance.now();cancelAnimationFrame(s.raf);
 const elapsed=(s.ended-s.started)/1000;
 if(s.mode==='classic'&&won&&(!s.classicBest||elapsed<s.classicBest))s.classicBest=elapsed;
 if(s.mode==='combo'&&s.score>s.comboBest)s.comboBest=s.score;
 save(s);hud(s);s.$('phase').textContent=won?'COMPLETE':'GAME OVER';s.$('banner').textContent=won?'40타일 완주!':reason;
 s.$('detail').textContent=won?elapsed.toFixed(2)+'초 · '+s.score.toLocaleString()+' points':s.combo+' combo · '+s.score.toLocaleString()+' points';draw(s,s.ended);
}
function hit(s,lane){
 const now=performance.now(),index=s.idx;
 if(s.phase==='ready'){if(lane!==sequence[0]){notice(s,'파란 시작 타일을 누르세요');return;}s.phase='playing';s.started=now;s.raf=requestAnimationFrame(()=>tick(s));}
 s.idx++;s.combo++;s.score+=100*(s.boostLeft>0?2:1);if(s.boostLeft>0)s.boostLeft--;
 s.lastHit=now;s.animAt=now;s.flashLane=lane;s.deadline=now+allowance(s);playNote(index);
 notice(s,s.combo>1?s.combo+' COMBO':'PERFECT',450);
 if(s.mode==='classic'&&s.idx>=GOAL){finish(s,true,'');return;}hud(s);
}
function fail(s,reason){
 if(s.shield){s.shield=false;s.deadline=performance.now()+allowance(s);notice(s,'SHIELD · 실수 방어');hud(s);return;}
 finish(s,false,reason);
}
function press(s,lane){
 if(s.phase==='ended')return;
 if(s.phase==='ready'){hit(s,lane);return;}
 if(s.phase!=='playing')return;
 if(s.mode==='combo'&&performance.now()>s.deadline){fail(s,'시간 초과');return;}
 if(lane!==sequence[s.idx]){fail(s,'다른 타일을 눌렀습니다');return;}
 hit(s,lane);
}
function useItem(s,k){
 if(s.phase!=='playing'||!s.stock[k]||(k==='freeze'&&s.mode!=='combo')||(k==='shield'&&s.shield))return;
 s.stock[k]--;
 if(k==='boost'){s.boostLeft+=10;notice(s,'BOOST · 다음 10타일 ×2');}
 if(k==='freeze'){s.deadline+=3000;s.freezeUntil=performance.now()+3000;notice(s,'FREEZE · 제한 시간 +3초');}
 if(k==='shield'){s.shield=true;notice(s,'SHIELD · 다음 실수 1회 방어');}
 hud(s);
}
function resize(s){const r=s.canvas.getBoundingClientRect();if(!r.width||!r.height)return;const d=Math.min(2,Math.max(1,globalThis.devicePixelRatio||1)),w=Math.round(r.width*d),h=Math.round(r.height*d);if(s.canvas.width!==w||s.canvas.height!==h){s.canvas.width=w;s.canvas.height=h;}s.g.setTransform(d,0,0,d,0,0);s.w=r.width;s.h=r.height;draw(s,performance.now());}
function rect(g,x,y,w,h,r){if(w<=0||h<=0)return;g.beginPath();g.roundRect(x,y,w,h,Math.min(r,w/2,h/2));}
function draw(s,now){
 const g=s.g,w=s.w,h=s.h;if(!g||!w||!h)return;g.clearRect(0,0,w,h);
 const bg=g.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#9ddafa');bg.addColorStop(.5,'#bae2ff');bg.addColorStop(1,'#91bdf0');g.fillStyle=bg;g.fillRect(0,0,w,h);
 const lane=w/4,rowH=clamp(h*.185,74,132),target=h-72;
 for(let i=0;i<4;i++){g.fillStyle=i%2?'rgba(43,119,188,.038)':'rgba(255,255,255,.10)';g.fillRect(i*lane,0,lane,h);if(i){g.fillStyle='rgba(255,255,255,.7)';g.fillRect(i*lane-1,0,1,h);}}
 for(let i=0;i<36;i++){const x=((i*137+19)%101)/101*w,y=((i*79+31)%103)/103*h;g.fillStyle='rgba(255,255,255,.23)';g.beginPath();g.arc(x,y,1+i%3*.45,0,Math.PI*2);g.fill();}
 const p=clamp((now-s.animAt)/165,0,1),ease=p*p*(3-2*p),slide=s.phase==='playing'&&s.idx>0?-rowH*(1-ease):0;
 const index=s.phase==='ready'?0:s.idx;
 for(let i=index+7;i>=Math.max(0,index-1);i--){
  const l=sequence[i],x=l*lane+3,y=target-rowH+(index-i)*rowH+slide;if(y>h||y+rowH<0)continue;
  const start=s.phase==='ready'&&i===0;
  g.save();g.shadowColor=start?'rgba(12,99,159,.36)':'rgba(0,12,35,.30)';g.shadowBlur=start?16:8;g.shadowOffsetY=3;
  const fill=g.createLinearGradient(x,y,x+lane,y+rowH);fill.addColorStop(0,start?'#4db4d1':'#1c2e4c');fill.addColorStop(1,start?'#2683b0':'#0b101e');
  g.fillStyle=fill;rect(g,x,y+3,lane-6,rowH-7,5);g.fill();g.restore();
  g.fillStyle='rgba(255,255,255,.15)';rect(g,x+5,y+7,lane-16,3,1.5);g.fill();
  if(start){g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.font='700 '+clamp(lane*.27,19,35)+'px system-ui';g.fillText('시작',x+(lane-6)/2,y+rowH/2);}
 }
 g.fillStyle='rgba(255,255,255,.83)';g.fillRect(0,target,w,3);
 if(s.phase==='playing'&&now-s.lastHit<210){g.fillStyle='rgba(255,255,255,'+(1-(now-s.lastHit)/210)*.32+')';g.fillRect(s.flashLane*lane,target-rowH,lane,rowH);}
 if(s.phase==='ended'){g.fillStyle='rgba(6,22,44,.3)';g.fillRect(0,0,w,h);}
}
function tick(s){
 if(s.disposed||active!==s||route()!==ROUTE||s.phase!=='playing')return;
 const now=performance.now();
 if(s.mode==='combo'&&now>s.deadline){fail(s,'시간 초과');if(s.phase==='ended')return;}
 if(s.notice&&now>s.noticeUntil){s.notice='';s.$('banner').textContent=s.combo+' COMBO';s.$('detail').textContent='다음 타일을 누르세요';}
 const seconds=(now-s.started)/1000,mm=Math.floor(seconds/60),ss=(seconds%60).toFixed(2).padStart(5,'0');s.$('time').textContent=String(mm).padStart(2,'0')+':'+ss;
 draw(s,now);s.raf=requestAnimationFrame(()=>tick(s));
}
function mount(){
 const app=document.querySelector('#app');if(!app)return;const p=prefs();app.innerHTML=html(p);const root=app.querySelector('[data-tiles-root]');
 const s={root,canvas:root.querySelector('[data-canvas]'),...p,phase:'ready',idx:0,combo:0,score:0,started:0,ended:0,deadline:0,boostLeft:0,shield:false,freezeUntil:0,stock:{boost:3,freeze:3,shield:3},lastHit:0,animAt:0,flashLane:-1,notice:'',noticeUntil:0,raf:0,disposed:false,observer:null};
 s.g=s.canvas.getContext('2d',{alpha:false});s.$=key=>root.querySelector('[data-'+key+']');
 s.canvas.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();const box=s.canvas.getBoundingClientRect();press(s,clamp(Math.floor((e.clientX-box.left)/box.width*4),0,3));});
 s.$('start').addEventListener('click',()=>{reset(s);hit(s,sequence[0]);root.focus({preventScroll:true});});
 root.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{s.mode=b.dataset.mode;reset(s);save(s);}));
 s.$('bpm').addEventListener('input',()=>{if(s.phase==='playing')return;s.bpm=clamp(Number(s.$('bpm').value)||132,90,200);save(s);hud(s);});
 root.querySelectorAll('[data-item]').forEach(b=>b.addEventListener('click',()=>useItem(s,b.dataset.item)));
 const onResize=()=>resize(s);s.fallbackResize=onResize;if('ResizeObserver'in globalThis){s.observer=new ResizeObserver(onResize);s.observer.observe(s.canvas);}else addEventListener('resize',onResize);
 reset(s);resize(s);root.focus({preventScroll:true});return s;
}
function teardown(){if(!active)return;const s=active;s.disposed=true;cancelAnimationFrame(s.raf);s.observer?.disconnect();if(!s.observer)removeEventListener('resize',s.fallbackResize);for(const v of voices){try{v.stop();}catch{}}voices.clear();active=null;}
function sync(){if(route()!==ROUTE){teardown();return;}if(active&&!active.disposed&&active.root.isConnected)return;teardown();document.title='Pulse Grid Tiles — HJ';active=mount();}
addEventListener('hashchange',sync);
addEventListener('keydown',e=>{if(route()!==ROUTE||!active||e.repeat||!Object.hasOwn(KEYS,e.code))return;const el=e.target;if(el&&/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))return;e.preventDefault();press(active,KEYS[e.code]);},{passive:false});
globalThis.HJTilesV31=Object.freeze({installed:true,sync,build:'TILES31-20260919',get phase(){return active?.phase||'off';}});
queueMicrotask(sync);
})();