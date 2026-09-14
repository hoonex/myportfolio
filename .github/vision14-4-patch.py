from pathlib import Path
import re

p = Path('journal-v14-vision.js')
s = p.read_text()

def one(old, new, label):
    global s
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s = s.replace(old, new, 1)

one("BUILD='VISION14.3-20260914-1043'", "BUILD='VISION14.4-20260914-1054'", 'build')

one(
    "qa('[data-v14-mode]').forEach(n=>n.addEventListener('click',()=>setMode(n.dataset.v14Mode)));q('[data-v14-full]')?.addEventListener('click',toggleFull);",
    "qa('[data-v14-mode]').forEach(n=>n.addEventListener('click',async()=>{let mode=n.dataset.v14Mode;if(mode==='resonance')await activateAudioFromGesture();setMode(mode)}));q('[data-v13-stage]')?.addEventListener('pointerdown',()=>{if(state.mode==='resonance'&&audioEngine.ctx?.state!=='running')activateAudioFromGesture()},{passive:true});q('[data-v14-full]')?.addEventListener('click',toggleFull);",
    'mode audio activation'
)

one(
    "function setMode(mode){if(!ART[mode]||state.mode===mode)return;if(state.mode==='resonance'&&mode!=='resonance')suspendAudio();state.mode=mode;clearArtInteraction();if(mode==='resonance')ensureAudio();syncModeUI();draw(performance.now(),true)}",
    "function setMode(mode){if(!ART[mode]||state.mode===mode)return;if(state.mode==='resonance'&&mode!=='resonance')suspendAudio();state.mode=mode;clearArtInteraction();if(mode==='resonance')ensureAudioGraph();syncModeUI();draw(performance.now(),true)}",
    'mode graph lifecycle'
)

one(
    "async function start(){if(!navigator.mediaDevices?.getUserMedia){status(T().fail,'error');return}try{await ensureModels();",
    "async function start(){if(!navigator.mediaDevices?.getUserMedia){status(T().fail,'error');return}try{if(state.mode==='resonance')await activateAudioFromGesture();await ensureModels();",
    'start audio activation'
)

loop_pat = re.compile(r"function loop\(now,meta\)\{.*?\nfunction size", re.S)
if len(loop_pat.findall(s)) != 1:
    raise SystemExit('loop block mismatch')
new_loop = """function loop(now,meta){vfc=raf=0;if(!running||route()!==R)return;let v=q('[data-v13-video]');if(v?.readyState>=2){let mediaTime=meta?.mediaTime??v.currentTime,fresh=meta||mediaTime!==lastVideoTime;if(fresh){lastVideoTime=mediaTime;let begin=performance.now(),runs=0,ts=Math.max(0,performance.now()),handDue=handTask&&now-lastH>=90&&!health.hand.recovering,faceDue=faceTask&&now-lastF>=105&&!health.face.recovering;if(handDue){try{hand=handTask.recognizeForVideo(v,ts);lastH=now;runs++;recordSuccess('hand');if(hand?.landmarks?.length)handEmptyRuns=0;else if(++handEmptyRuns>=18&&!health.hand.cpu){handEmptyRuns=0;console.warn('[Vision14.4] hand tracker returned sustained empty results; switching hand task to CPU');recover('hand')}}catch(e){recordFailure('hand',e)}}else if(faceDue){try{face=faceTask.detectForVideo(v,ts);lastF=now;runs++;recordSuccess('face')}catch(e){recordFailure('face',e)}}if(runs)infer=performance.now()-begin;draw(now);frames++;if(now-fpsAt>=700){fps=frames*1000/(now-fpsAt);frames=0;fpsAt=now}}}schedule()}
function size"""
s = loop_pat.sub(new_loop, s, count=1)

size_pat = re.compile(r"function size\(c\)\{.*?\}function cover", re.S)
if len(size_pat.findall(s)) != 1:
    raise SystemExit('size block mismatch')
new_size = "function size(c){let r=c.getBoundingClientRect(),coarse=globalThis.matchMedia?.('(pointer:coarse)')?.matches,cap=coarse?1.12:1.35,d=Math.min(cap,Math.max(1,devicePixelRatio||1)),w=Math.max(2,Math.round(r.width*d)),h=Math.max(2,Math.round(r.height*d));if(c.width!==w||c.height!==h){c.width=w;c.height=h}return{w,h}}function cover"
s = size_pat.sub(new_size, s, count=1)

pinch_pat = re.compile(r"function pinches\(NH,H,handed,world,w,h\)\{.*?\nfunction gestureLabel", re.S)
if len(pinch_pat.findall(s)) != 1:
    raise SystemExit('pinches block mismatch')
new_pinch = """function pinches(NH,H,handed,world,w,h){let live=new Set(),out=[];for(let i=0;i<NH.length;i++){let N=NH[i],P=H[i]?.P,W=world?.[i];if(!N?.[4]||!N?.[8]||!P?.[4]||!P?.[8])continue;let side=handed?.[i]?.[0]?.categoryName||handed?.[i]?.[0]?.displayName||`H${i+1}`,key=side;live.add(key);let screenPalm=(dist2(P[5],P[17])+dist2(P[0],P[9]))*.5,screenGap=dist2(P[4],P[8]),contactPx=Math.max(9,screenPalm*.22),screenRatio=screenGap/Math.max(20,screenPalm),normPalm=(dist2(N[5],N[17])+dist2(N[0],N[9]))*.5,normRatio=dist2(N[4],N[8])/Math.max(.035,normPalm),worldPalm=W?.[5]&&W?.[17]?(dist3(W[5],W[17])+dist3(W[0],W[9]))*.5:0,worldRatio=worldPalm?dist3(W[4],W[8])/Math.max(.015,worldPalm):99,ratio=Math.min(screenRatio,normRatio,worldRatio),instant=clamp(1-(ratio-.12)/.42,0,1),st=pinchState.get(key)||{ema:instant,on:false,close:0,open:0};st.ema=st.ema*.6+instant*.4;let closing=st.ema>.58||screenRatio<.32||normRatio<.30||worldRatio<.32,opening=st.ema<.28&&screenRatio>.46&&normRatio>.44&&(worldRatio===99||worldRatio>.46);st.close=closing?st.close+1:0;st.open=opening?st.open+1:0;if(!st.on&&(screenGap<=contactPx||worldRatio<.24||normRatio<.24||st.close>=2))st.on=true;if(st.on&&st.open>=2)st.on=false;pinchState.set(key,st);let a=P[4],b=P[8];out.push({key,active:st.on,x:(a.x+b.x)/(2*w),y:(a.y+b.y)/(2*h),ratio,side,quality:st.ema,a,b,gapPx:screenGap,thresholdPx:contactPx,screenRatio,normRatio,worldRatio})}for(let key of [...pinchState.keys()])if(!live.has(key))pinchState.delete(key);return out.sort((a,b)=>a.side.localeCompare(b.side))}
function gestureLabel"""
s = pinch_pat.sub(new_pinch, s, count=1)

audio_pat = re.compile(r"function ensureAudio\(\)\{.*?\nfunction updateResonance", re.S)
if len(audio_pat.findall(s)) != 1:
    raise SystemExit('audio block mismatch')
new_audio = """function ensureAudioGraph(){let AC=window.AudioContext||window.webkitAudioContext;if(!AC){resonance.audioError='WEB AUDIO UNAVAILABLE';return false}try{if(!audioEngine.ctx){let c=new AC({latencyHint:'interactive'}),master=c.createGain(),dry=c.createGain(),wet=c.createGain(),delay=c.createDelay(.8),feedback=c.createGain();master.gain.value=.68;dry.gain.value=.96;wet.gain.value=.14;delay.delayTime.value=.16;feedback.gain.value=.18;dry.connect(master);delay.connect(wet);wet.connect(master);delay.connect(feedback);feedback.connect(delay);master.connect(c.destination);Object.assign(audioEngine,{ctx:c,master,dry,wet,delay,feedback,ready:false});resonance.audioError='TAP RESONANCE FOR AUDIO'}return true}catch(e){resonance.audioError=String(e?.message||e||'AUDIO UNAVAILABLE').toUpperCase();audioEngine.ready=false;return false}}
async function activateAudioFromGesture(){if(!ensureAudioGraph())return false;let c=audioEngine.ctx;try{if(c.state!=='running')await c.resume();if(c.state!=='running'){audioEngine.ready=false;resonance.audioError='TAP RESONANCE FOR AUDIO';return false}audioEngine.ready=true;resonance.audioError='';let o=c.createOscillator(),g=c.createGain();g.gain.setValueAtTime(.00001,c.currentTime);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.018);return true}catch(e){audioEngine.ready=false;resonance.audioError=String(e?.message||e||'AUDIO BLOCKED').toUpperCase();return false}}
function makeVoice(key){let c=audioEngine.ctx;if(!c||c.state!=='running')return null;audioEngine.ready=true;if(audioEngine.voices.has(key))return audioEngine.voices.get(key);let o1=c.createOscillator(),o2=c.createOscillator(),g1=c.createGain(),g2=c.createGain(),filter=c.createBiquadFilter(),gate=c.createGain(),pan=c.createStereoPanner?c.createStereoPanner():null;o1.type=key==='Left'?'sine':'triangle';o2.type='sine';g1.gain.value=.84;g2.gain.value=.16;filter.type='lowpass';filter.Q.value=4.5;gate.gain.value=0;o1.connect(g1);o2.connect(g2);g1.connect(filter);g2.connect(filter);filter.connect(gate);let out=gate;if(pan){gate.connect(pan);out=pan}out.connect(audioEngine.dry);out.connect(audioEngine.delay);o1.start();o2.start();let v={o1,o2,filter,gate,pan};audioEngine.voices.set(key,v);return v}
function gateVoice(key,on,note,x,quality=.6){let v=makeVoice(key);if(!v)return;let c=audioEngine.ctx,t=c.currentTime;if(note){v.o1.frequency.setTargetAtTime(note.hz,t,.018);v.o2.frequency.setTargetAtTime(note.hz*2,t,.022)}let cutoff=760+Math.pow(clamp(x,0,1),1.55)*7600;v.filter.frequency.setTargetAtTime(cutoff,t,.028);v.filter.Q.setTargetAtTime(2.5+quality*7,t,.032);if(v.pan)v.pan.pan.setTargetAtTime(clamp(x*2-1,-1,1),t,.03);v.gate.gain.setTargetAtTime(on?.18+.09*quality:0,t,on?.012:.04)}
function silenceAudio(){if(!audioEngine.ctx)return;let t=audioEngine.ctx.currentTime;for(let v of audioEngine.voices.values())v.gate.gain.setTargetAtTime(0,t,.025)}
function suspendAudio(){silenceAudio();let c=audioEngine.ctx;if(c?.state==='running')setTimeout(()=>{if(state.mode!=='resonance'&&c.state==='running')c.suspend().then(()=>{audioEngine.ready=false}).catch(()=>{})},70)}
function updateResonance"""
s = audio_pat.sub(new_audio, s, count=1)

one(
    "if(state.mode==='resonance'&&audioEngine.ready&&audioEngine.ctx){let c=audioEngine.ctx,t=c.currentTime;",
    "if(state.mode==='resonance'&&audioEngine.ctx?.state==='running'){audioEngine.ready=true;let c=audioEngine.ctx,t=c.currentTime;",
    'resonance running gate'
)

one("for(let j=0;j<=28;j++){let x=j/28*w", "for(let j=0;j<=16;j++){let x=j/16*w", 'string segments')
one("for(let i=0;i<=42;i++){let t=i/42", "for(let i=0;i<=24;i++){let t=i/24", 'bridge segments')

one(
    "if(resonance.audioError){ctx.save();ctx.fillStyle='rgba(255,255,255,.68)';ctx.font=`600 ${Math.max(9,w/100)}px ui-monospace`;ctx.textAlign='right';ctx.fillText('AUDIO VISUAL ONLY',w-16,24);ctx.restore()}",
    "let audioHint=resonance.audioError||(audioEngine.ctx&&audioEngine.ctx.state!=='running'?'TAP RESONANCE FOR AUDIO':'');if(audioHint){ctx.save();ctx.fillStyle='rgba(255,255,255,.72)';ctx.font=`600 ${Math.max(9,w/100)}px ui-monospace`;ctx.textAlign='right';ctx.fillText(audioHint,w-16,24);ctx.restore()}",
    'audio hint'
)

p.write_text(s)

loader = Path('journal-route-loader.js')
ls = loader.read_text()
old_rev = 'SITE40-VISION14_3-20260914-1043'
new_rev = 'SITE41-VISION14_4-20260914-1054'
if ls.count(old_rev) != 1:
    raise SystemExit(f'loader rev count {ls.count(old_rev)}')
loader.write_text(ls.replace(old_rev, new_rev, 1))

idx = Path('index.html')
isrc = idx.read_text()
if isrc.count(old_rev) != 2:
    raise SystemExit(f'index rev count {isrc.count(old_rev)}')
idx.write_text(isrc.replace(old_rev, new_rev))
