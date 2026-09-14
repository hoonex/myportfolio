from pathlib import Path
import re

p = Path('journal-v14-vision.js')
s = p.read_text()


def replace_once(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s = s.replace(old, new, 1)


def sub_once(pattern, repl, label):
    global s
    out, n = re.subn(pattern, repl, s, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s = out

replace_once("BUILD='VISION14.5-20260914-1328'", "BUILD='VISION14.6-20260914-1450'", 'build')

replace_once(
    "let state={surface:true,wire:false,debug:false,play:true,mode:'orbit'},orbs=[],grabs=new Map(),lastPinches=new Map(),faceTriangles=null,pinchState=new Map(),trails=new Map(),sculpt={energy:0},resonance={bursts:[],energy:0,lastNotes:new Map(),audioError:''};",
    "let state={surface:true,wire:false,debug:false,play:true,mode:'orbit'},orbs=[],grabs=new Map(),lastPinches=new Map(),faceTriangles=null,pinchState=new Map(),trails=new Map(),sculpt={energy:0},resonance={bursts:[],energy:0,lastNotes:new Map(),audioError:''},piano={states:new Map(),active:new Map(),flashes:[]};",
    'state')
replace_once(
    "let audioEngine={ctx:null,master:null,dry:null,wet:null,delay:null,feedback:null,voices:new Map(),ready:false};",
    "let audioEngine={ctx:null,master:null,dry:null,wet:null,delay:null,feedback:null,voices:new Map(),pianoVoices:new Map(),ready:false};",
    'audio engine')
replace_once(
    "const RES_NOTES=[[48,'C3'],[50,'D3'],[52,'E3'],[55,'G3'],[57,'A3'],[60,'C4'],[62,'D4'],[64,'E4'],[67,'G4'],[69,'A4'],[72,'C5'],[74,'D5']];",
    "const RES_NOTES=[[48,'C3'],[50,'D3'],[52,'E3'],[55,'G3'],[57,'A3'],[60,'C4'],[62,'D4'],[64,'E4'],[67,'G4'],[69,'A4'],[72,'C5'],[74,'D5']];\nconst PIANO_KEYS=[{id:'L5',side:'Left',tip:20,pip:18,mcp:17,midi:60,name:'C4',finger:'L5'},{id:'L4',side:'Left',tip:16,pip:14,mcp:13,midi:62,name:'D4',finger:'L4'},{id:'L3',side:'Left',tip:12,pip:10,mcp:9,midi:64,name:'E4',finger:'L3'},{id:'L2',side:'Left',tip:8,pip:6,mcp:5,midi:65,name:'F4',finger:'L2'},{id:'L1',side:'Left',tip:4,pip:3,mcp:2,midi:67,name:'G4',finger:'L1'},{id:'R1',side:'Right',tip:4,pip:3,mcp:2,midi:69,name:'A4',finger:'R1'},{id:'R2',side:'Right',tip:8,pip:6,mcp:5,midi:71,name:'B4',finger:'R2'},{id:'R3',side:'Right',tip:12,pip:10,mcp:9,midi:72,name:'C5',finger:'R3'},{id:'R4',side:'Right',tip:16,pip:14,mcp:13,midi:74,name:'D5',finger:'R4'},{id:'R5',side:'Right',tip:20,pip:18,mcp:17,midi:76,name:'E5',finger:'R5'}];",
    'piano key map')

replace_once(
    '<button type="button" data-v14-mode="resonance">Resonance</button><button type="button" data-v14-mode="sculpt">Sculpt</button>',
    '<button type="button" data-v14-mode="resonance">Resonance</button><button type="button" data-v14-mode="piano">Piano</button><button type="button" data-v14-mode="sculpt">Sculpt</button>',
    'piano mode button')

replace_once(
    "qa('[data-v14-mode]').forEach(n=>n.addEventListener('click',async()=>{let mode=n.dataset.v14Mode;if(mode==='resonance')await activateAudioFromGesture();setMode(mode)}));q('[data-v13-stage]')?.addEventListener('pointerdown',()=>{if(state.mode==='resonance'&&audioEngine.ctx?.state!=='running')activateAudioFromGesture()},{passive:true});",
    "qa('[data-v14-mode]').forEach(n=>n.addEventListener('click',async()=>{let mode=n.dataset.v14Mode;if(isAudioMode(mode))await activateAudioFromGesture(mode);setMode(mode)}));q('[data-v13-stage]')?.addEventListener('pointerdown',()=>{if(isAudioMode(state.mode)&&audioEngine.ctx?.state!=='running')activateAudioFromGesture(state.mode)},{passive:true});",
    'audio mode binding')

replace_once(
    "const ART={orbit:['Orbit','양손으로 각각 다른 구체를 동시에 집고 던지세요.'],threads:['Threads','두 손으로 빛의 선을 그리고, 동시에 집으면 두 선이 연결됩니다.'],resonance:['Resonance','양손 핀치로 화음을 연주하세요. 높이는 음정, 좌우는 음색, 입은 공간감을 바꿉니다.'],sculpt:['Sculpt','두 핀치 사이의 형태를 늘리고 비틀어 보세요.']};",
    "const ART={orbit:['Orbit','양손으로 각각 다른 구체를 동시에 집고 던지세요.'],threads:['Threads','두 손으로 빛의 선을 그리고, 동시에 집으면 두 선이 연결됩니다.'],resonance:['Resonance','양손 핀치로 화음을 연주하세요. 높이는 음정, 좌우는 음색, 입은 공간감을 바꿉니다.'],piano:['Piano','열 손가락이 각각 하나의 건반입니다. 손가락을 굽혀 자기 타일을 눌러 연주하세요.'],sculpt:['Sculpt','두 핀치 사이의 형태를 늘리고 비틀어 보세요.']};",
    'ART')
replace_once(
    "function clearArtInteraction(){grabs.clear();lastPinches.clear();trails.clear();sculpt.energy=0;resonance.bursts=[];resonance.energy=0;resonance.lastNotes.clear()}",
    "function clearArtInteraction(){grabs.clear();lastPinches.clear();trails.clear();sculpt.energy=0;resonance.bursts=[];resonance.energy=0;resonance.lastNotes.clear();piano.states.clear();piano.active.clear();piano.flashes=[];silencePiano()}",
    'clear interaction')
replace_once(
    "function setMode(mode){if(!ART[mode]||state.mode===mode)return;if(state.mode==='resonance'&&mode!=='resonance')suspendAudio();state.mode=mode;clearArtInteraction();if(mode==='resonance')ensureAudioGraph();syncModeUI();draw(performance.now(),true)}",
    "function isAudioMode(mode){return mode==='resonance'||mode==='piano'}\nfunction setMode(mode){if(!ART[mode]||state.mode===mode)return;if(isAudioMode(state.mode)&&!isAudioMode(mode))suspendAudio();else if(isAudioMode(state.mode)&&isAudioMode(mode))silenceAudio();state.mode=mode;clearArtInteraction();if(isAudioMode(mode))ensureAudioGraph();syncModeUI();draw(performance.now(),true)}",
    'mode lifecycle')

replace_once("if(state.mode==='resonance')await activateAudioFromGesture();await ensureModels();", "if(isAudioMode(state.mode))await activateAudioFromGesture(state.mode);await ensureModels();", 'start audio')
replace_once("pinchState.clear();silenceAudio();", "pinchState.clear();piano.states.clear();piano.active.clear();silenceAudio();", 'stop piano state')

sub_once(
    r"async function activateAudioFromGesture\(\)\{.*?\nfunction makeVoice",
    """async function activateAudioFromGesture(mode=state.mode){if(!ensureAudioGraph())return false;let c=audioEngine.ctx;try{if(c.state!=='running')await c.resume();if(c.state!=='running'){audioEngine.ready=false;resonance.audioError='TAP AUDIO MODE FOR SOUND';return false}audioEngine.ready=true;resonance.audioError='';let unlock=c.createOscillator(),ug=c.createGain(),t=c.currentTime;unlock.frequency.setValueAtTime(523.25,t);ug.gain.setValueAtTime(.0001,t);ug.gain.exponentialRampToValueAtTime(.025,t+.01);ug.gain.exponentialRampToValueAtTime(.0001,t+.065);unlock.connect(ug);ug.connect(c.destination);unlock.start(t);unlock.stop(t+.07);if(mode==='piano')for(let k of PIANO_KEYS)makePianoVoice(k.id);else{makeVoice('Left');makeVoice('Right')}return true}catch(e){audioEngine.ready=false;resonance.audioError=String(e?.message||e||'AUDIO BLOCKED').toUpperCase();return false}}
function makeVoice""",
    'audio activation')

piano_audio = r'''function makePianoVoice(id){let c=audioEngine.ctx;if(!c||c.state!=='running')return null;if(audioEngine.pianoVoices.has(id))return audioEngine.pianoVoices.get(id);let o=c.createOscillator(),filter=c.createBiquadFilter(),gate=c.createGain(),pan=c.createStereoPanner?c.createStereoPanner():null,index=Math.max(0,PIANO_KEYS.findIndex(k=>k.id===id));o.type='triangle';filter.type='lowpass';filter.frequency.value=5200;filter.Q.value=1.8;gate.gain.value=0;o.connect(filter);filter.connect(gate);let out=gate;if(pan){gate.connect(pan);out=pan;pan.pan.value=clamp(index/(PIANO_KEYS.length-1)*2-1,-1,1)}out.connect(audioEngine.dry);out.connect(audioEngine.delay);o.start();let v={o,filter,gate,pan};audioEngine.pianoVoices.set(id,v);return v}
function gatePianoVoice(id,on,key,pressure=.7){if(!on&&!audioEngine.pianoVoices.has(id))return;let v=makePianoVoice(id),c=audioEngine.ctx;if(!v||!c)return;let t=c.currentTime;if(key)v.o.frequency.setTargetAtTime(midiHz(key.midi),t,.012);v.filter.frequency.setTargetAtTime(2600+clamp(pressure,0,1)*4200,t,.02);v.gate.gain.setTargetAtTime(on?.12+.07*clamp(pressure,0,1):0,t,on?.008:.045)}
function silencePiano(){if(!audioEngine.ctx)return;let t=audioEngine.ctx.currentTime;for(let v of audioEngine.pianoVoices.values())v.gate.gain.setTargetAtTime(0,t,.025)}
'''
marker = "function silenceAudio(){if(!audioEngine.ctx)return;let t=audioEngine.ctx.currentTime;for(let v of audioEngine.voices.values())v.gate.gain.setTargetAtTime(0,t,.025)}"
replace_once(marker, piano_audio + marker.replace("}", ";for(let v of audioEngine.pianoVoices.values())v.gate.gain.setTargetAtTime(0,t,.025)}", 1), 'piano audio')

piano_logic = r'''function fingerBend(P,mcp,pip,tip){let A=P?.[mcp],B=P?.[pip],C=P?.[tip];if(!A||!B||!C)return 0;let ax=B.x-A.x,ay=B.y-A.y,az=(B.z||0)-(A.z||0),bx=C.x-B.x,by=C.y-B.y,bz=(C.z||0)-(B.z||0),la=Math.hypot(ax,ay,az),lb=Math.hypot(bx,by,bz);if(la<1e-4||lb<1e-4)return 0;let cos=clamp((ax*bx+ay*by+az*bz)/(la*lb),-1,1);return clamp((.93-cos)/.88,0,1)}
function pianoFingerSamples(){let hands=hand?.landmarks||[],handed=hand?.handedness||hand?.handednesses||[],live=new Set(),out=[];for(let i=0;i<hands.length;i++){let P=hands[i],side=handed?.[i]?.[0]?.categoryName||handed?.[i]?.[0]?.displayName||'';for(let k of PIANO_KEYS){if(k.side!==side)continue;live.add(k.id);let bend=fingerBend(P,k.mcp,k.pip,k.tip),st=piano.states.get(k.id)||{on:false,open:0},strike=false;if(!st.on&&bend>.5){st.on=true;st.open=0;strike=true}else if(st.on){st.open=bend<.28?st.open+1:0;if(st.open>=2){st.on=false;st.open=0}}piano.states.set(k.id,st);out.push({key:k,active:st.on,strike,bend})}}for(let id of [...piano.states.keys()])if(!live.has(id)){let st=piano.states.get(id);if(st?.on)gatePianoVoice(id,false,null,0);piano.states.delete(id)}return out}
function updatePiano(dt,now){let samples=pianoFingerSamples(),seen=new Set();piano.active.clear();for(let s of samples){let k=s.key;seen.add(k.id);piano.active.set(k.id,s);gatePianoVoice(k.id,s.active,k,s.bend);if(s.strike){piano.flashes.push({slot:PIANO_KEYS.indexOf(k),a:1,t:now});if(piano.flashes.length>24)piano.flashes.splice(0,piano.flashes.length-24)}}for(let k of PIANO_KEYS)if(!seen.has(k.id))gatePianoVoice(k.id,false,null,0);for(let f of piano.flashes)f.a-=dt*2.8;piano.flashes=piano.flashes.filter(f=>f.a>0)}
'''
replace_once('function activeMap(ps){return new Map(ps.filter(p=>p.active).map(p=>[p.key,p]))}', piano_logic + 'function activeMap(ps){return new Map(ps.filter(p=>p.active).map(p=>[p.key,p]))}', 'piano interaction')

replace_once(
    "function updateArt(dt,ps,F,w,h,now){if(!state.play)return;if(state.mode==='orbit')updateOrbit(dt,ps,F,w,h,now);else if(state.mode==='threads')updateThreads(dt,ps,now);else if(state.mode==='resonance')updateResonance(dt,ps,F,w,h,now);else updateSculpt(dt,ps)}",
    "function updateArt(dt,ps,F,w,h,now){if(!state.play)return;if(state.mode==='orbit')updateOrbit(dt,ps,F,w,h,now);else if(state.mode==='threads')updateThreads(dt,ps,now);else if(state.mode==='resonance')updateResonance(dt,ps,F,w,h,now);else if(state.mode==='piano')updatePiano(dt,now);else updateSculpt(dt,ps)}",
    'updateArt piano')

piano_draw = r'''function drawPiano(ctx,w,h,now){let x0=w*.025,total=w*.95,gap=Math.max(2,w*.0035),kw=(total-gap*(PIANO_KEYS.length-1))/PIANO_KEYS.length,baseY=h*.675,kh=h*.255;ctx.save();ctx.fillStyle='rgba(255,255,255,.54)';ctx.font=`650 ${Math.max(9,w/105)}px ui-monospace`;ctx.textAlign='left';ctx.fillText('10 FINGERS · 10 KEYS',x0,baseY-Math.max(13,h*.025));for(let f of piano.flashes){let x=x0+f.slot*(kw+gap),g=ctx.createLinearGradient(0,baseY-kh*.95,0,baseY+kh);g.addColorStop(0,`rgba(130,205,255,0)`);g.addColorStop(1,`rgba(130,205,255,${.18*f.a})`);ctx.fillStyle=g;ctx.fillRect(x,baseY-kh*.9,kw,kh*1.9)}for(let i=0;i<PIANO_KEYS.length;i++){let k=PIANO_KEYS[i],s=piano.active.get(k.id),on=!!s?.active,pressure=s?.bend||0,x=x0+i*(kw+gap),y=baseY-(on?Math.min(8,h*.012):0),r=Math.min(10,kw*.16),hue=k.side==='Left'?198:318;ctx.save();ctx.shadowColor=on?`hsla(${hue} 100% 70% / .8)`:'transparent';ctx.shadowBlur=on?Math.max(12,w/45):0;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,kw,kh,r);else ctx.rect(x,y,kw,kh);ctx.fillStyle=on?`hsla(${hue} 88% ${72+pressure*10}% / .92)`:'rgba(245,248,255,.12)';ctx.fill();ctx.lineWidth=Math.max(1,w/900);ctx.strokeStyle=on?'rgba(255,255,255,.94)':'rgba(255,255,255,.2)';ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=on?'rgba(8,12,18,.92)':'rgba(255,255,255,.9)';ctx.font=`750 ${Math.max(12,w/70)}px ui-monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(k.name,x+kw*.5,y+kh*.56);ctx.fillStyle=on?'rgba(8,12,18,.58)':'rgba(255,255,255,.48)';ctx.font=`650 ${Math.max(8,w/125)}px ui-monospace`;ctx.fillText(k.finger,x+kw*.5,y+kh*.82);if(s){ctx.fillStyle=on?'rgba(8,12,18,.42)':'rgba(255,255,255,.2)';ctx.fillRect(x+kw*.18,y+kh*.12,kw*.64,Math.max(2,kh*.025));ctx.fillStyle=on?'rgba(8,12,18,.72)':`hsla(${hue} 90% 68% / .55)`;ctx.fillRect(x+kw*.18,y+kh*.12,kw*.64*clamp(pressure,0,1),Math.max(2,kh*.025))}ctx.restore()}let audioHint=audioEngine.ctx?.state==='running'?'':'TAP PIANO FOR AUDIO';if(audioHint){ctx.fillStyle='rgba(255,255,255,.68)';ctx.font=`600 ${Math.max(9,w/100)}px ui-monospace`;ctx.textAlign='right';ctx.fillText(audioHint,w-16,24)}ctx.restore()}
'''
replace_once('function drawArt(ctx,w,h,ps,F,now){if(!state.play)return;', piano_draw + 'function drawArt(ctx,w,h,ps,F,now){if(!state.play)return;', 'draw piano insertion')
replace_once(
    "function drawArt(ctx,w,h,ps,F,now){if(!state.play)return;if(state.mode==='orbit')drawOrbs(ctx,w,h);else if(state.mode==='threads')drawThreads(ctx,w,h,ps,now);else if(state.mode==='resonance')drawResonance(ctx,w,h,ps,F,now);else drawSculpt(ctx,w,h,ps,F)}",
    "function drawArt(ctx,w,h,ps,F,now){if(!state.play)return;if(state.mode==='orbit')drawOrbs(ctx,w,h);else if(state.mode==='threads')drawThreads(ctx,w,h,ps,now);else if(state.mode==='resonance')drawResonance(ctx,w,h,ps,F,now);else if(state.mode==='piano')drawPiano(ctx,w,h,now);else drawSculpt(ctx,w,h,ps,F)}",
    'drawArt piano')

# Seed/reset piano state too.
replace_once("resonance.lastNotes.clear();resonance.audioError=''}`", "resonance.lastNotes.clear();resonance.audioError='';piano.states.clear();piano.active.clear();piano.flashes=[]}`", 'seed piano reset')

p.write_text(s)

rev_old='SITE42-VISION14_5-20260914-1328'
rev_new='SITE43-VISION14_6-20260914-1450'
for path in ['journal-route-loader.js','index.html']:
    q=Path(path)
    t=q.read_text()
    if rev_old not in t:
        raise SystemExit(f'{path}: old revision missing')
    q.write_text(t.replace(rev_old,rev_new))
