from pathlib import Path
import re

p = Path('journal-v14-vision.js')
s = p.read_text()


def one(old, new, label):
    global s
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    s = s.replace(old, new, 1)


one("BUILD='VISION14.2-20260912-1842'", "BUILD='VISION14.3-20260914-1043'", 'build')
one(
    "let state={surface:true,wire:false,debug:false,play:true,mode:'orbit'},orbs=[],grabs=new Map(),lastPinches=new Map(),faceTriangles=null,pinchState=new Map(),trails=new Map(),ripples=[],field=[],sculpt={energy:0};",
    "let state={surface:true,wire:false,debug:false,play:true,mode:'orbit'},orbs=[],grabs=new Map(),lastPinches=new Map(),faceTriangles=null,pinchState=new Map(),trails=new Map(),sculpt={energy:0},resonance={bursts:[],energy:0,lastNotes:new Map(),audioError:''};\nlet audioEngine={ctx:null,master:null,dry:null,wet:null,delay:null,feedback:null,voices:new Map(),ready:false};\nconst RES_NOTES=[[48,'C3'],[50,'D3'],[52,'E3'],[55,'G3'],[57,'A3'],[60,'C4'],[62,'D4'],[64,'E4'],[67,'G4'],[69,'A4'],[72,'C5'],[74,'D5']];",
    'state',
)
one('data-v14-mode="bloom">Bloom</button>', 'data-v14-mode="resonance">Resonance</button>', 'mode button')
one(
    "const ART={orbit:['Orbit','양손으로 각각 다른 구체를 동시에 집고 던지세요.'],threads:['Threads','두 손으로 빛의 선을 그리고, 동시에 집으면 두 선이 연결됩니다.'],bloom:['Bloom','손과 얼굴의 움직임으로 입자와 파동을 밀어내세요.'],sculpt:['Sculpt','두 핀치 사이의 형태를 늘리고 비틀어 보세요.']};",
    "const ART={orbit:['Orbit','양손으로 각각 다른 구체를 동시에 집고 던지세요.'],threads:['Threads','두 손으로 빛의 선을 그리고, 동시에 집으면 두 선이 연결됩니다.'],resonance:['Resonance','양손 핀치로 화음을 연주하세요. 높이는 음정, 좌우는 음색, 입은 공간감을 바꿉니다.'],sculpt:['Sculpt','두 핀치 사이의 형태를 늘리고 비틀어 보세요.']};",
    'ART',
)
one(
    "function seed(){orbs=[{x:.18,y:.25,r:.035,vx:.05,vy:.01,h:205},{x:.42,y:.28,r:.045,vx:-.03,vy:.02,h:154},{x:.72,y:.24,r:.032,vx:-.04,vy:.03,h:35},{x:.28,y:.68,r:.042,vx:.03,vy:-.02,h:285},{x:.56,y:.72,r:.034,vx:-.04,vy:.02,h:55},{x:.78,y:.62,r:.048,vx:.02,vy:-.03,h:190}];grabs.clear();lastPinches.clear();pinchState.clear();trails.clear();ripples=[];field=Array.from({length:72},(_,i)=>({x:(.11+i*.61803398875)%1,y:(.17+i*.41421356237)%1,vx:0,vy:0,h:(188+i*3.1)%360}));sculpt.energy=0}",
    "function seed(){orbs=[{x:.18,y:.25,r:.035,vx:.05,vy:.01,h:205},{x:.42,y:.28,r:.045,vx:-.03,vy:.02,h:154},{x:.72,y:.24,r:.032,vx:-.04,vy:.03,h:35},{x:.28,y:.68,r:.042,vx:.03,vy:-.02,h:285},{x:.56,y:.72,r:.034,vx:-.04,vy:.02,h:55},{x:.78,y:.62,r:.048,vx:.02,vy:-.03,h:190}];grabs.clear();lastPinches.clear();pinchState.clear();trails.clear();sculpt.energy=0;resonance.bursts=[];resonance.energy=0;resonance.lastNotes.clear();resonance.audioError=''}",
    'seed',
)
one(
    "function clearArtInteraction(){grabs.clear();lastPinches.clear();trails.clear();ripples=[];sculpt.energy=0}\nfunction setMode(mode){if(!ART[mode]||state.mode===mode)return;state.mode=mode;clearArtInteraction();syncModeUI();draw(performance.now(),true)}",
    "function clearArtInteraction(){grabs.clear();lastPinches.clear();trails.clear();sculpt.energy=0;resonance.bursts=[];resonance.energy=0;resonance.lastNotes.clear()}\nfunction setMode(mode){if(!ART[mode]||state.mode===mode)return;if(state.mode==='resonance'&&mode!=='resonance')suspendAudio();state.mode=mode;clearArtInteraction();if(mode==='resonance')ensureAudio();syncModeUI();draw(performance.now(),true)}",
    'mode lifecycle',
)

audio = r'''function midiHz(m){return 440*Math.pow(2,(m-69)/12)}
function resonanceNoteAtY(y){let i=clamp(Math.round((1-clamp(y,.08,.92))*(RES_NOTES.length-1)),0,RES_NOTES.length-1),n=RES_NOTES[i];return{index:i,midi:n[0],name:n[1],hz:midiHz(n[0])}}
function ensureAudio(){let AC=window.AudioContext||window.webkitAudioContext;if(!AC){resonance.audioError='Web Audio unavailable';return false}try{if(!audioEngine.ctx){let c=new AC(),master=c.createGain(),dry=c.createGain(),wet=c.createGain(),delay=c.createDelay(.8),feedback=c.createGain();master.gain.value=.42;dry.gain.value=.9;wet.gain.value=.16;delay.delayTime.value=.18;feedback.gain.value=.22;dry.connect(master);delay.connect(wet);wet.connect(master);delay.connect(feedback);feedback.connect(delay);master.connect(c.destination);Object.assign(audioEngine,{ctx:c,master,dry,wet,delay,feedback,ready:true});resonance.audioError=''}if(audioEngine.ctx.state==='suspended')audioEngine.ctx.resume().catch(()=>{});return true}catch(e){resonance.audioError=String(e?.message||e||'Audio unavailable');audioEngine.ready=false;return false}}
function makeVoice(key){if(!audioEngine.ready||!audioEngine.ctx)return null;if(audioEngine.voices.has(key))return audioEngine.voices.get(key);let c=audioEngine.ctx,o1=c.createOscillator(),o2=c.createOscillator(),g1=c.createGain(),g2=c.createGain(),filter=c.createBiquadFilter(),gate=c.createGain(),pan=c.createStereoPanner?c.createStereoPanner():null;o1.type=key==='Left'?'sine':'triangle';o2.type='sine';g1.gain.value=.82;g2.gain.value=.18;filter.type='lowpass';filter.Q.value=5;gate.gain.value=0;o1.connect(g1);o2.connect(g2);g1.connect(filter);g2.connect(filter);filter.connect(gate);let out=gate;if(pan){gate.connect(pan);out=pan}out.connect(audioEngine.dry);out.connect(audioEngine.delay);o1.start();o2.start();let v={o1,o2,filter,gate,pan};audioEngine.voices.set(key,v);return v}
function gateVoice(key,on,note,x,quality=.6){let v=makeVoice(key);if(!v)return;let c=audioEngine.ctx,t=c.currentTime;if(note){v.o1.frequency.setTargetAtTime(note.hz,t,.022);v.o2.frequency.setTargetAtTime(note.hz*2,t,.025)}let cutoff=650+Math.pow(clamp(x,0,1),1.7)*7200;v.filter.frequency.setTargetAtTime(cutoff,t,.035);v.filter.Q.setTargetAtTime(3+quality*8,t,.04);if(v.pan)v.pan.pan.setTargetAtTime(clamp(x*2-1,-1,1),t,.035);v.gate.gain.setTargetAtTime(on?.13+.07*quality:0,t,on?.018:.055)}
function silenceAudio(){if(!audioEngine.ctx)return;let t=audioEngine.ctx.currentTime;for(let v of audioEngine.voices.values())v.gate.gain.setTargetAtTime(0,t,.035)}
function suspendAudio(){silenceAudio();let c=audioEngine.ctx;if(c?.state==='running')setTimeout(()=>{if(state.mode!=='resonance'&&c.state==='running')c.suspend().catch(()=>{})},90)}
function updateResonance(dt,ps,F,w,h,now){let active=ps.filter(p=>p.active),live=new Set(ps.map(p=>p.key)),space=clamp(blend('jawOpen')*1.35,0,1);resonance.energy+=(Math.min(1,active.length*.5)-resonance.energy)*Math.min(1,dt*7);if(state.mode==='resonance'&&audioEngine.ready&&audioEngine.ctx){let c=audioEngine.ctx,t=c.currentTime;audioEngine.wet.gain.setTargetAtTime(.07+space*.38,t,.06);audioEngine.delay.delayTime.setTargetAtTime(.13+space*.22,t,.06);let d=active.length>1?hypot(active[0].x-active[1].x,active[0].y-active[1].y):.75;audioEngine.feedback.gain.setTargetAtTime(.16+(1-clamp(d,.12,.85))*.27,t,.07)}for(let p of ps){if(!p.active){if(audioEngine.voices.has(p.key))gateVoice(p.key,false,null,p.x,p.quality);continue}let note=resonanceNoteAtY(p.y),prev=resonance.lastNotes.get(p.key);gateVoice(p.key,true,note,p.x,p.quality);if(prev!==note.midi){resonance.bursts.push({x:p.x,y:p.y,r:.012,a:1,h:p.side==='Left'?194:318,label:note.name});resonance.lastNotes.set(p.key,note.midi)}}for(let [key] of audioEngine.voices)if(!live.has(key))gateVoice(key,false,null,.5,.5);for(let r of resonance.bursts){r.r+=dt*.24;r.a-=dt*.7}resonance.bursts=resonance.bursts.filter(r=>r.a>0&&r.r<.35)}'''

marker = 'function activeMap(ps){return new Map(ps.filter(p=>p.active).map(p=>[p.key,p]))}'
one(marker, audio + '\n' + marker, 'audio insertion')

pat = r"function updateBloom\(.*?\nfunction updateSculpt"
if len(re.findall(pat, s, re.S)) != 1:
    raise SystemExit('updateBloom block mismatch')
s = re.sub(pat, 'function updateSculpt', s, count=1, flags=re.S)
one(
    "function updateArt(dt,ps,F,w,h,now){if(!state.play)return;if(state.mode==='orbit')updateOrbit(dt,ps,F,w,h,now);else if(state.mode==='threads')updateThreads(dt,ps,now);else if(state.mode==='bloom')updateBloom(dt,ps,F,w,h,now);else updateSculpt(dt,ps)}",
    "function updateArt(dt,ps,F,w,h,now){if(!state.play)return;if(state.mode==='orbit')updateOrbit(dt,ps,F,w,h,now);else if(state.mode==='threads')updateThreads(dt,ps,now);else if(state.mode==='resonance')updateResonance(dt,ps,F,w,h,now);else updateSculpt(dt,ps)}",
    'updateArt',
)

draw = r'''function drawResonance(ctx,w,h,ps,F,now){let active=ps.filter(p=>p.active),reduced=matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<RES_NOTES.length;i++){let y=(.92-i/(RES_NOTES.length-1)*.84)*h,on=active.some(p=>resonanceNoteAtY(p.y).index===i),amp=on&&!reduced?Math.max(2,Math.min(w,h)*.008):0;ctx.beginPath();for(let j=0;j<=28;j++){let x=j/28*w,yy=y+(amp?Math.sin(j*.82+now*.009+i*.47)*amp:0);j?ctx.lineTo(x,yy):ctx.moveTo(x,yy)}ctx.strokeStyle=on?'rgba(255,255,255,.72)':'rgba(145,205,255,.13)';ctx.lineWidth=on?Math.max(1.8,w/520):Math.max(.7,w/1100);ctx.shadowColor=on?'rgba(105,205,255,.76)':'transparent';ctx.shadowBlur=on?Math.max(8,w/70):0;ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=on?'rgba(255,255,255,.76)':'rgba(205,230,255,.25)';ctx.font=`600 ${Math.max(9,w/105)}px ui-monospace`;ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(RES_NOTES[i][1],Math.max(8,w*.018),y)}for(let p of active){let note=resonanceNoteAtY(p.y),x=p.x*w,y=p.y*h,r=Math.max(16,w/52),hue=p.side==='Left'?194:318,g=ctx.createRadialGradient(x,y,2,x,y,r*1.9);g.addColorStop(0,'rgba(255,255,255,.98)');g.addColorStop(.18,`hsla(${hue} 100% 72% / .78)`);g.addColorStop(1,`hsla(${hue} 100% 58% / 0)`);ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*1.9,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.96)';ctx.font=`700 ${Math.max(13,w/62)}px ui-monospace`;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(note.name,x,y-r*.68)}if(active.length>=2){let A=active[0],B=active[1],ax=A.x*w,ay=A.y*h,bx=B.x*w,by=B.y*h,dx=bx-ax,dy=by-ay,d=Math.max(1,Math.hypot(dx,dy)),nx=-dy/d,ny=dx/d,nA=resonanceNoteAtY(A.y),nB=resonanceNoteAtY(B.y),interval=Math.abs(nA.midi-nB.midi),amp=reduced?0:Math.min(w,h)*(.008+.0025*interval);ctx.beginPath();for(let i=0;i<=42;i++){let t=i/42,e=Math.sin(Math.PI*t),x=ax+dx*t,y=ay+dy*t,off=Math.sin(t*Math.PI*(4+interval*.45)+now*.012)*amp*e;i?ctx.lineTo(x+nx*off,y+ny*off):ctx.moveTo(x+nx*off,y+ny*off)}ctx.strokeStyle='rgba(255,255,255,.88)';ctx.lineWidth=Math.max(2.2,w/360);ctx.shadowColor='rgba(142,178,255,.9)';ctx.shadowBlur=Math.max(12,w/42);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,.78)';ctx.font=`650 ${Math.max(10,w/92)}px ui-monospace`;ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(`${nA.name} + ${nB.name}`,(ax+bx)/2,(ay+by)/2-Math.max(12,h*.025))}for(let r of resonance.bursts){ctx.strokeStyle=`hsla(${r.h} 100% 72% / ${r.a})`;ctx.lineWidth=Math.max(1.2,w/700);ctx.beginPath();ctx.arc(r.x*w,r.y*h,r.r*Math.min(w,h),0,Math.PI*2);ctx.stroke()}if(F?.center){let j=clamp(blend('jawOpen')*1.35,0,1);if(j>.08){ctx.strokeStyle=`rgba(118,213,255,${.08+j*.35})`;ctx.lineWidth=Math.max(1,w/850);ctx.beginPath();ctx.arc(F.center.x,F.center.y,Math.min(w,h)*(.055+j*.045),0,Math.PI*2);ctx.stroke()}}ctx.restore();if(resonance.audioError){ctx.save();ctx.fillStyle='rgba(255,255,255,.68)';ctx.font=`600 ${Math.max(9,w/100)}px ui-monospace`;ctx.textAlign='right';ctx.fillText('AUDIO VISUAL ONLY',w-16,24);ctx.restore()}}'''

pat = r"function drawBloom\(.*?\nfunction drawSculpt"
if len(re.findall(pat, s, re.S)) != 1:
    raise SystemExit('drawBloom block mismatch')
s = re.sub(pat, draw + '\nfunction drawSculpt', s, count=1, flags=re.S)
one(
    "function drawArt(ctx,w,h,ps,F,now){if(!state.play)return;if(state.mode==='orbit')drawOrbs(ctx,w,h);else if(state.mode==='threads')drawThreads(ctx,w,h,ps,now);else if(state.mode==='bloom')drawBloom(ctx,w,h,F);else drawSculpt(ctx,w,h,ps,F)}",
    "function drawArt(ctx,w,h,ps,F,now){if(!state.play)return;if(state.mode==='orbit')drawOrbs(ctx,w,h);else if(state.mode==='threads')drawThreads(ctx,w,h,ps,now);else if(state.mode==='resonance')drawResonance(ctx,w,h,ps,F,now);else drawSculpt(ctx,w,h,ps,F)}",
    'drawArt',
)
one(
    "handEmptyRuns=0;grab=null;lastPinch=null;pinchState.clear();lastVideoTime=-1;",
    "handEmptyRuns=0;grabs.clear();lastPinches.clear();pinchState.clear();silenceAudio();suspendAudio();lastVideoTime=-1;",
    'stop cleanup',
)

p.write_text(s)

for fp in ['journal-route-loader.js', 'index.html']:
    q = Path(fp)
    t = q.read_text()
    old = 'SITE38-VISION14_2-20260912-1842'
    new = 'SITE40-VISION14_3-20260914-1043'
    if old not in t:
        raise SystemExit(f'{fp}: old cache revision missing')
    q.write_text(t.replace(old, new))
