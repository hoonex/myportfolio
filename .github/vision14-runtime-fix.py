from pathlib import Path
import re

p = Path('journal-v14-vision.js')
s = p.read_text()


def sub_once(pattern, repl, label, flags=re.S):
    global s
    out, n = re.subn(pattern, repl, s, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s = out

s = s.replace("BUILD='VISION14.4-20260914-1054'", "BUILD='VISION14.5-20260914-1328'", 1)
if "BUILD='VISION14.5-20260914-1328'" not in s:
    raise SystemExit('build revision replacement failed')

# Tight pinch: require thumb/index to be visibly much closer before engaging.
sub_once(
    r"function pinches\(NH,H,handed,world,w,h\)\{.*?\nfunction gestureLabel",
    """function pinches(NH,H,handed,world,w,h){let live=new Set(),out=[];for(let i=0;i<NH.length;i++){let N=NH[i],P=H[i]?.P,W=world?.[i];if(!N?.[4]||!N?.[8]||!P?.[4]||!P?.[8])continue;let side=handed?.[i]?.[0]?.categoryName||handed?.[i]?.[0]?.displayName||`H${i+1}`,key=side;live.add(key);let screenPalm=(dist2(P[5],P[17])+dist2(P[0],P[9]))*.5,screenGap=dist2(P[4],P[8]),contactPx=Math.max(6,screenPalm*.16),screenRatio=screenGap/Math.max(20,screenPalm),normPalm=(dist2(N[5],N[17])+dist2(N[0],N[9]))*.5,normRatio=dist2(N[4],N[8])/Math.max(.035,normPalm),worldPalm=W?.[5]&&W?.[17]?(dist3(W[5],W[17])+dist3(W[0],W[9]))*.5:0,worldRatio=worldPalm?dist3(W[4],W[8])/Math.max(.015,worldPalm):99,ratio=Math.min(screenRatio,normRatio,worldRatio),instant=clamp(1-(ratio-.09)/.32,0,1),st=pinchState.get(key)||{ema:instant,on:false,close:0,open:0};st.ema=st.ema*.64+instant*.36;let closing=st.ema>.66||screenRatio<.24||normRatio<.22||worldRatio<.23,opening=st.ema<.25&&screenRatio>.38&&normRatio>.36&&(worldRatio===99||worldRatio>.38);st.close=closing?st.close+1:0;st.open=opening?st.open+1:0;if(!st.on&&(screenGap<=contactPx||worldRatio<.18||normRatio<.18||st.close>=2))st.on=true;if(st.on&&st.open>=2)st.on=false;pinchState.set(key,st);let a=P[4],b=P[8];out.push({key,active:st.on,x:(a.x+b.x)/(2*w),y:(a.y+b.y)/(2*h),ratio,side,quality:st.ema,a,b,gapPx:screenGap,thresholdPx:contactPx,screenRatio,normRatio,worldRatio})}for(let key of [...pinchState.keys()])if(!live.has(key))pinchState.delete(key);return out.sort((a,b)=>a.side.localeCompare(b.side))}
function gestureLabel""",
    'pinches'
)

# Start both synth voices while we are still inside the user's explicit gesture.
sub_once(
    r"async function activateAudioFromGesture\(\)\{.*?\nfunction makeVoice",
    """async function activateAudioFromGesture(){if(!ensureAudioGraph())return false;let c=audioEngine.ctx;try{if(c.state!=='running')await c.resume();if(c.state!=='running'){audioEngine.ready=false;resonance.audioError='TAP RESONANCE FOR AUDIO';return false}audioEngine.ready=true;resonance.audioError='';let unlock=c.createOscillator(),ug=c.createGain();ug.gain.setValueAtTime(.0001,c.currentTime);unlock.connect(ug);ug.connect(c.destination);unlock.start(c.currentTime);unlock.stop(c.currentTime+.025);makeVoice('Left');makeVoice('Right');return true}catch(e){audioEngine.ready=false;resonance.audioError=String(e?.message||e||'AUDIO BLOCKED').toUpperCase();return false}}
function makeVoice""",
    'audio activation'
)

# Lower capture workload on phones.
s = s.replace("width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:60}", "width:{ideal:960},height:{ideal:540},frameRate:{ideal:30,max:30}", 1)
if "width:{ideal:960},height:{ideal:540},frameRate:{ideal:30,max:30}" not in s:
    raise SystemExit('camera workload replacement failed')

# Never run hand and face inference synchronously in the same video frame.
sub_once(
    r"function loop\(now,meta\)\{.*?\nfunction size",
    """function loop(now,meta){vfc=raf=0;if(!running||route()!==R)return;let v=q('[data-v13-video]');if(v?.readyState>=2){let mediaTime=meta?.mediaTime??v.currentTime,fresh=meta||mediaTime!==lastVideoTime;if(fresh){lastVideoTime=mediaTime;let begin=performance.now(),runs=0,ts=Math.max(0,performance.now()),ranHand=false;if(handTask&&now-lastH>=85&&!health.hand.recovering){try{hand=handTask.recognizeForVideo(v,ts);lastH=now;runs++;ranHand=true;recordSuccess('hand');if(hand?.landmarks?.length)handEmptyRuns=0;else if(++handEmptyRuns>=18&&!health.hand.cpu){handEmptyRuns=0;console.warn('[Vision14.5] hand tracker returned sustained empty results; switching hand task to CPU');recover('hand')}}catch(e){recordFailure('hand',e)}}if(!ranHand&&faceTask&&now-lastF>=120&&!health.face.recovering){try{face=faceTask.detectForVideo(v,ts);lastF=now;runs++;recordSuccess('face')}catch(e){recordFailure('face',e)}}if(runs)infer=performance.now()-begin;draw(now);frames++;if(now-fpsAt>=700){fps=frames*1000/(now-fpsAt);frames=0;fpsAt=now}}}schedule()}
function size""",
    'inference loop'
)

s = s.replace("Math.min(1.5,Math.max(1,devicePixelRatio||1))", "Math.min(1.25,Math.max(1,devicePixelRatio||1))", 1)
if "Math.min(1.25,Math.max(1,devicePixelRatio||1))" not in s:
    raise SystemExit('DPR replacement failed')

p.write_text(s)

# Bump cache revision without touching unrelated portfolio revision.
rev_old='SITE41-VISION14_4-20260914-1054'
rev_new='SITE42-VISION14_5-20260914-1328'
for path in ['journal-route-loader.js','index.html']:
    q=Path(path)
    t=q.read_text()
    if rev_old not in t:
        raise SystemExit(f'{path}: old revision missing')
    q.write_text(t.replace(rev_old,rev_new))
