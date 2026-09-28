/* Head-Coupled Display v34 — front-camera view tracking with a pointer fallback. */
(()=>{
'use strict';
const R='/lab/depth';
const BUILD='HEAD35-20260928';
const PAGE_TITLE='Head-Coupled Display — HJ';
const MPV='1.0.1';
const MODS=[
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MPV}/vision_bundle.mjs`,
  `https://unpkg.com/@mediapipe/tasks-vision@${MPV}/vision_bundle.mjs`
];
const WASMS=[
  `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MPV}/wasm`,
  `https://unpkg.com/@mediapipe/tasks-vision@${MPV}/wasm`
];
const FM='https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const app=document.querySelector('#app');
if(!app)return;
const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const q=s=>root?.querySelector(s)||null;
const qa=s=>[...(root?.querySelectorAll(s)||[])];

let root=null,video=null,stream=null,faceTask=null,mp=null,fileset=null,modelPromise=null;
let running=false,raf=0,lastInfer=0,lastVideoTime=-1,lastFaceAt=0,lastFace=null;
let mode='depth',source='pointer';
let target={x:0,y:0,z:0},smooth={x:0,y:0,z:0};
let calibration={cx:.5,cy:.5,scale:.3,ready:false};
let calibrationSamples=[],poseHistory=[],filteredFace=null;
let inferMs=0,fps=0,frameCount=0,fpsAt=performance.now();

function markup(){
  return `<div class="hc-page" data-hc-root data-build="${BUILD}">
    <header class="hc-hero">
      <div class="hc-kicker">CAMERA / HEAD-COUPLED DISPLAY</div>
      <div class="hc-hero-grid">
        <h1>Move your head.<br><em>Not your phone.</em></h1>
        <div class="hc-hero-copy">
          <p>전면 카메라가 홍채 중심과 얼굴 크기를 함께 추적합니다. 화면은 그 위치를 가상 시점으로 사용해 평면 디스플레이 안쪽에 공간이 있는 것처럼 반응합니다.</p>
          <span>영상은 화면에 저장하지 않습니다. 얼굴 랜드마크 계산은 브라우저에서 실행되며 MediaPipe 런타임과 모델은 외부에서 내려받습니다.</span>
        </div>
      </div>
    </header>

    <section class="hc-shell" aria-label="Head coupled display experiment">
      <div class="hc-toolbar">
        <div class="hc-actions">
          <button class="hc-primary" type="button" data-hc-start>전면 카메라 시작</button>
          <button type="button" data-hc-stop disabled>중지</button>
          <button type="button" data-hc-center>중앙 다시 맞추기</button>
        </div>
        <div class="hc-mode" role="tablist" aria-label="Rendering mode">
          <button type="button" data-hc-mode="depth" role="tab" aria-selected="true"><b>DEPTH</b><span>3D window</span></button>
          <button type="button" data-hc-mode="face" role="tab" aria-selected="false"><b>FACE ME</b><span>view compensation</span></button>
        </div>
        <div class="hc-status" data-hc-state="idle"><i></i><span data-hc-status>카메라 꺼짐 · 포인터로 미리보기</span></div>
      </div>

      <div class="hc-stage" data-hc-stage tabindex="0" aria-label="Head tracked 3D scene. Move your head after starting the camera, or move the pointer for a preview.">
        <div class="hc-camera-chip" aria-hidden="true">
          <div class="hc-camera-preview"><video data-hc-video muted playsinline></video><span class="hc-face-bracket"></span></div>
          <div><b data-hc-source>POINTER</b><span data-hc-fps>preview</span></div>
        </div>

        <div class="hc-viewport" data-hc-viewport>
          <div class="hc-depth-scene" data-hc-depth>
            <div class="hc-far-grid"></div>
            <div class="hc-orbit hc-orbit-a"></div>
            <div class="hc-orbit hc-orbit-b"></div>
            <div class="hc-shadow"></div>
            <div class="hc-object" aria-hidden="true">
              <div class="hc-object-side hc-object-side--right"></div>
              <div class="hc-object-side hc-object-side--bottom"></div>
              <div class="hc-object-face">
                <span class="hc-object-index">VIEW / 01</span>
                <div class="hc-object-title">A flat screen.<br><strong>With a viewpoint.</strong></div>
                <div class="hc-object-axis"><i></i><span>X</span><i></i><span>Y</span><i></i><span>Z</span></div>
              </div>
            </div>
            <div class="hc-near-mark hc-near-mark--a">+</div>
            <div class="hc-near-mark hc-near-mark--b">+</div>
          </div>

          <div class="hc-face-scene" data-hc-face hidden>
            <div class="hc-comp-grid"></div>
            <div class="hc-comp-shadow"></div>
            <article class="hc-comp-card">
              <span>VIEW / 02</span>
              <h2>Always facing<br>your viewpoint.</h2>
              <p>머리를 옆이나 위로 움직이면 화면 속 평면을 반대 방향으로 미리 왜곡해 정면 인상을 유지합니다.</p>
              <div class="hc-corners" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
            </article>
            <div class="hc-sight hc-sight--x"></div>
            <div class="hc-sight hc-sight--y"></div>
          </div>
        </div>

        <div class="hc-readout" aria-live="polite">
          <span><b>X</b><i data-hc-x>+0.00</i></span>
          <span><b>Y</b><i data-hc-y>+0.00</i></span>
          <span><b>Z</b><i data-hc-z>+0.00</i></span>
        </div>
        <div class="hc-hint" data-hc-hint>포인터를 움직여 미리 보거나 전면 카메라를 시작하세요.</div>
      </div>

      <div class="hc-explain">
        <article><span>01 / TRANSLATION</span><h3>눈의 중간점</h3><p>양쪽 눈의 중간 위치를 화면 기준 X·Y 시점으로 사용합니다. 고개를 돌리는 각도보다 실제 머리 이동량을 우선합니다.</p></article>
        <article><span>02 / DISTANCE</span><h3>얼굴 크기</h3><p>얼굴 높이를 주축으로 두 눈 사이 거리도 함께 사용해 상대적인 앞뒤 거리를 추정합니다. 고개 회전 때문에 Z축이 튀는 현상을 줄였습니다.</p></article>
        <article><span>03 / COMPENSATION</span><h3>역방향 왜곡</h3><p>FACE ME는 관측 위치에 따라 평면을 역회전해 정면 인상을 보정합니다. 정밀한 실물 보정에는 화면 크기·카메라 위치 보정값이 추가로 필요합니다.</p></article>
      </div>
    </section>
  </div>`;
}

function setStatus(text,state='idle'){
  const n=q('[data-hc-status]');
  if(n)n.textContent=text;
  root?.setAttribute('data-hc-state',state);
}
function setSource(name,detail){
  const s=q('[data-hc-source]'),f=q('[data-hc-fps]');
  if(s)s.textContent=name;
  if(f)f.textContent=detail;
}
function nav(){
  document.querySelectorAll('[data-nav]').forEach(n=>{n.classList.remove('active');n.removeAttribute('aria-current')});
}
function setMode(next){
  if(next!=='depth'&&next!=='face')return;
  mode=next;
  qa('[data-hc-mode]').forEach(button=>{
    const on=button.dataset.hcMode===mode;
    button.classList.toggle('active',on);
    button.setAttribute('aria-selected',on?'true':'false');
  });
  const depth=q('[data-hc-depth]'),face=q('[data-hc-face]');
  if(depth)depth.hidden=mode!=='depth';
  if(face)face.hidden=mode!=='face';
  const hint=q('[data-hc-hint]');
  if(hint)hint.textContent=mode==='depth'
    ? '좌우·상하·앞뒤로 머리를 움직여 화면 안쪽을 들여다보세요.'
    : '옆으로 크게 움직여도 카드가 시점을 향하도록 보정되는지 확인하세요.';
}
function fmt(v){return `${v>=0?'+':''}${v.toFixed(2)}`}

function applyPose(now){
  const speed=source==='camera'?.16:.22;
  smooth.x=lerp(smooth.x,target.x,speed);
  smooth.y=lerp(smooth.y,target.y,speed);
  smooth.z=lerp(smooth.z,target.z,.12);
  if(!root)return;
  root.style.setProperty('--hc-x',smooth.x.toFixed(4));
  root.style.setProperty('--hc-y',smooth.y.toFixed(4));
  root.style.setProperty('--hc-z',smooth.z.toFixed(4));
  root.style.setProperty('--hc-x-px',`${(smooth.x*34).toFixed(2)}px`);
  root.style.setProperty('--hc-y-px',`${(smooth.y*28).toFixed(2)}px`);
  root.style.setProperty('--hc-depth-px',`${(smooth.z*22).toFixed(2)}px`);
  root.style.setProperty('--hc-yaw',`${(smooth.x*15).toFixed(2)}deg`);
  root.style.setProperty('--hc-pitch',`${(-smooth.y*12).toFixed(2)}deg`);
  root.style.setProperty('--hc-comp-yaw',`${(smooth.x*20).toFixed(2)}deg`);
  root.style.setProperty('--hc-comp-pitch',`${(-smooth.y*15).toFixed(2)}deg`);
  const x=q('[data-hc-x]'),y=q('[data-hc-y]'),z=q('[data-hc-z]');
  if(x)x.textContent=fmt(smooth.x);if(y)y.textContent=fmt(smooth.y);if(z)z.textContent=fmt(smooth.z);
  const viewport=q('[data-hc-viewport]');
  if(viewport)viewport.style.perspectiveOrigin=`${50+smooth.x*11}% ${50-smooth.y*9}%`;
  if(running&&now-lastFaceAt>700){
    target.x*=.93;target.y*=.93;target.z*=.93;
    setStatus('얼굴을 찾는 중… 화면 중앙을 바라보세요.','search');
  }
}

async function importRuntime(){
  if(mp)return mp;
  let last;
  for(const url of MODS){
    try{mp=await import(url);return mp}catch(error){last=error;console.warn('[Head34] MediaPipe runtime source failed',url,error)}
  }
  throw last||new Error('MediaPipe runtime unavailable');
}
async function ensureModel(){
  if(faceTask)return faceTask;
  if(modelPromise)return modelPromise;
  modelPromise=(async()=>{
    setStatus('얼굴 추적 모델 불러오는 중…','loading');
    const mod=await importRuntime();
    if(!fileset){
      let last;
      for(const wasm of WASMS){
        try{fileset=await mod.FilesetResolver.forVisionTasks(wasm);break}catch(error){last=error;console.warn('[Head34] WASM source failed',wasm,error)}
      }
      if(!fileset)throw last||new Error('MediaPipe WASM unavailable');
    }
    const base={baseOptions:{modelAssetPath:FM},runningMode:'VIDEO',numFaces:1,minFaceDetectionConfidence:.50,minFacePresenceConfidence:.50,minTrackingConfidence:.50,outputFacialTransformationMatrixes:false,outputFaceBlendshapes:false};
    try{faceTask=await mod.FaceLandmarker.createFromOptions(fileset,{...base,baseOptions:{...base.baseOptions,delegate:'GPU'}})}
    catch(error){console.warn('[Head34] GPU init failed; CPU fallback',error);faceTask=await mod.FaceLandmarker.createFromOptions(fileset,base)}
    return faceTask;
  })().finally(()=>modelPromise=null);
  return modelPromise;
}

const median=values=>{
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!sorted.length)return 0;
  const mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])*.5;
};
const deadzone=(value,size)=>Math.abs(value)<size?0:Math.sign(value)*(Math.abs(value)-size);
function meanPoint(landmarks,indices){
  let x=0,y=0,n=0;
  for(const index of indices){
    const point=landmarks[index];
    if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))continue;
    x+=point.x;y+=point.y;n++;
  }
  return n?{x:x/n,y:y/n}:null;
}
function facePose(landmarks){
  if(!landmarks||landmarks.length<468)return null;
  // 468/473 are iris centres when the 478-landmark model is available.
  const irisReady=!!(landmarks.length>=478&&landmarks[468]&&landmarks[473]);
  const left=irisReady?landmarks[468]:meanPoint(landmarks,[33,133,159,145]);
  const right=irisReady?landmarks[473]:meanPoint(landmarks,[263,362,386,374]);
  const forehead=landmarks[10],chin=landmarks[152];
  if(!left||!right||!forehead||!chin)return null;
  const mx=(left.x+right.x)*.5,my=(left.y+right.y)*.5;
  const eye=Math.hypot(left.x-right.x,left.y-right.y);
  const faceHeight=Math.hypot(forehead.x-chin.x,forehead.y-chin.y);
  if(!Number.isFinite(eye)||!Number.isFinite(faceHeight)||eye<.025||faceHeight<.12)return null;
  // Face height is much less sensitive to yaw than eye distance. Eye spacing still adds a small cue.
  const scale=faceHeight*.78+eye*1.15*.22;
  return {mx,my,eye,faceHeight,scale,iris:irisReady};
}
function stabilizePose(pose){
  if(!filteredFace){filteredFace={...pose};return filteredFace}
  const maxXY=.045,maxScale=Math.max(.012,filteredFace.scale*.075);
  const dx=clamp(pose.mx-filteredFace.mx,-maxXY,maxXY);
  const dy=clamp(pose.my-filteredFace.my,-maxXY,maxXY);
  const ds=clamp(pose.scale-filteredFace.scale,-maxScale,maxScale);
  filteredFace={
    ...pose,
    mx:lerp(filteredFace.mx,filteredFace.mx+dx,.52),
    my:lerp(filteredFace.my,filteredFace.my+dy,.52),
    scale:lerp(filteredFace.scale,filteredFace.scale+ds,.42)
  };
  return filteredFace;
}
function calibrateFrom(samples){
  if(!samples.length)return false;
  calibration={
    cx:median(samples.map(p=>p.mx)),
    cy:median(samples.map(p=>p.my)),
    scale:median(samples.map(p=>p.scale)),
    ready:true
  };
  calibrationSamples=[];
  return calibration.scale>.05;
}
function consumeFace(result,now){
  const raw=facePose(result?.faceLandmarks?.[0]);
  if(!raw)return;
  const pose=stabilizePose(raw);
  lastFace=pose;lastFaceAt=now;
  poseHistory.push({...pose});
  if(poseHistory.length>10)poseHistory.shift();

  if(!calibration.ready){
    calibrationSamples.push({...pose});
    if(calibrationSamples.length>12)calibrationSamples.shift();
    const progress=Math.round(calibrationSamples.length/12*100);
    if(calibrationSamples.length<12){
      source='camera';
      setStatus(`중앙 시점 보정 중… ${progress}% · 잠깐 정면을 보세요.`,'search');
      return;
    }
    calibrateFrom(calibrationSamples);
    target={x:0,y:0,z:0};
  }

  // Front-camera pixels are intentionally mirrored for an intuitive physical direction.
  const dx=deadzone(calibration.cx-pose.mx,.0045);
  const dy=deadzone(calibration.cy-pose.my,.0045);
  const dz=deadzone(pose.scale/calibration.scale-1,.012);
  target.x=clamp(dx*3.25,-1.08,1.08);
  target.y=clamp(dy*3.05,-1.0,1.0);
  target.z=clamp(dz*2.35,-.9,.9);
  source='camera';
  setStatus(`얼굴 추적 중 · ${pose.iris?'홍채':'눈'} + 얼굴 크기 안정화`,'live');
}
function infer(now){
  if(!running||!faceTask||!video||video.readyState<2)return;
  if(now-lastInfer<34||video.currentTime===lastVideoTime)return;
  lastInfer=now;lastVideoTime=video.currentTime;
  const start=performance.now();
  try{consumeFace(faceTask.detectForVideo(video,now),now);inferMs=performance.now()-start}
  catch(error){console.warn('[Head34] inference failed',error);setStatus('추적이 잠시 끊겼습니다. 다시 찾는 중…','search')}
  frameCount++;
  if(now-fpsAt>=1000){fps=Math.round(frameCount*1000/(now-fpsAt));frameCount=0;fpsAt=now;setSource('CAMERA',`${fps} fps · ${Math.round(inferMs)} ms`)}
}
function loop(now){
  if(route()===R&&document.title!==PAGE_TITLE)document.title=PAGE_TITLE;
  infer(now);applyPose(now);raf=requestAnimationFrame(loop);
}
function startLoop(){if(!raf)raf=requestAnimationFrame(loop)}
function stopLoop(){if(raf){cancelAnimationFrame(raf);raf=0}}

async function start(){
  if(running)return;
  const startButton=q('[data-hc-start]');
  startButton?.setAttribute('disabled','');
  setStatus('카메라 권한과 모델 준비 중…','loading');
  try{
    const [_,media]=await Promise.all([
      ensureModel(),
      navigator.mediaDevices?.getUserMedia?.({video:{facingMode:'user',width:{ideal:960},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:false})
        ?? Promise.reject(new Error('getUserMedia unavailable'))
    ]);
    if(route()!==R){media.getTracks().forEach(track=>track.stop());return}
    stream=media;video=q('[data-hc-video]');
    if(!video)throw new Error('video surface unavailable');
    video.srcObject=stream;await video.play();
    running=true;source='camera';calibration.ready=false;calibrationSamples=[];poseHistory=[];filteredFace=null;lastFace=null;lastFaceAt=performance.now();
    q('[data-hc-stop]')?.removeAttribute('disabled');
    root?.classList.add('is-camera');
    setSource('CAMERA','searching');
    setStatus('얼굴을 찾는 중… 화면 중앙을 바라보세요.','search');
    startLoop();
  }catch(error){
    console.error('[Head34] camera start failed',error);
    stopStream();source='pointer';
    setStatus(error?.name==='NotAllowedError'?'카메라 권한이 거부됨 · 포인터 미리보기 사용 가능':'카메라 또는 얼굴 모델을 시작할 수 없음 · 포인터 미리보기 사용 가능','error');
    setSource('POINTER','preview');
    startButton?.removeAttribute('disabled');
  }
}
function stopStream(){
  stream?.getTracks?.().forEach(track=>track.stop());stream=null;
  if(video){video.pause?.();video.srcObject=null}
}
function stop({reset=true}={}){
  running=false;stopStream();source='pointer';root?.classList.remove('is-camera');
  q('[data-hc-start]')?.removeAttribute('disabled');q('[data-hc-stop]')?.setAttribute('disabled','');
  setSource('POINTER','preview');setStatus('카메라 꺼짐 · 포인터로 미리보기','idle');
  if(reset){target={x:0,y:0,z:0};calibration.ready=false;calibrationSamples=[];poseHistory=[];filteredFace=null;lastFace=null}
}
function recenter(){
  if(running&&lastFace){
    const samples=poseHistory.length?poseHistory:[lastFace];
    calibrateFrom(samples);
    target={x:0,y:0,z:0};smooth={x:0,y:0,z:0};
    setStatus('최근 여러 프레임 기준으로 정면을 다시 맞춤.','live');
  }else{
    target={x:0,y:0,z:0};smooth={x:0,y:0,z:0};applyPose(performance.now());
    setStatus('포인터 시점을 중앙으로 초기화함.','idle');
  }
}
function pointerPose(event){
  if(running||!root)return;
  const stage=q('[data-hc-stage]');if(!stage)return;
  const rect=stage.getBoundingClientRect();
  const x=clamp(((event.clientX-rect.left)/rect.width-.5)*2,-1,1);
  const y=clamp((.5-(event.clientY-rect.top)/rect.height)*2,-1,1);
  target.x=x;target.y=y;target.z=clamp((Math.abs(x)+Math.abs(y))*.08,-.1,.15);source='pointer';
  setSource('POINTER','preview');setStatus('포인터 미리보기 · 카메라를 켜면 실제 시점을 추적합니다.','idle');
}
function pointerLeave(){if(running)return;target.x=0;target.y=0;target.z=0}
function bind(){
  q('[data-hc-start]')?.addEventListener('click',start);
  q('[data-hc-stop]')?.addEventListener('click',()=>stop());
  q('[data-hc-center]')?.addEventListener('click',recenter);
  qa('[data-hc-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.hcMode)));
  const stage=q('[data-hc-stage]');
  stage?.addEventListener('pointermove',pointerPose,{passive:true});stage?.addEventListener('pointerleave',pointerLeave,{passive:true});
  stage?.addEventListener('keydown',event=>{
    if(running)return;
    const step=event.shiftKey?.25:.12;
    if(event.key==='ArrowLeft')target.x=clamp(target.x-step,-1,1);
    else if(event.key==='ArrowRight')target.x=clamp(target.x+step,-1,1);
    else if(event.key==='ArrowUp')target.y=clamp(target.y+step,-1,1);
    else if(event.key==='ArrowDown')target.y=clamp(target.y-step,-1,1);
    else return;
    event.preventDefault();
  });
}
function mount(){
  if(route()!==R){if(running)stop({reset:false});stopLoop();return}
  if(root&&document.contains(root)){document.title=PAGE_TITLE;startLoop();return}
  stopLoop();
  app.innerHTML=markup();root=app.querySelector('[data-hc-root]');video=q('[data-hc-video]');
  nav();bind();setMode(mode);document.title=PAGE_TITLE;
  target={x:0,y:0,z:0};smooth={x:0,y:0,z:0};calibration.ready=false;calibrationSamples=[];poseHistory=[];filteredFace=null;source='pointer';
  startLoop();requestAnimationFrame(()=>app.focus({preventScroll:true}));
}
function routeChange(){if(route()===R)mount();else if(root){stop({reset:false});stopLoop();root=null;video=null}}
addEventListener('hashchange',()=>requestAnimationFrame(routeChange));
document.addEventListener('hj:rendered',()=>requestAnimationFrame(routeChange));
document.addEventListener('visibilitychange',()=>{if(document.hidden){lastInfer=performance.now()}else if(route()===R)startLoop()});

// Small deterministic hook used for local visual verification; it does not bypass camera permission.
window.__HJHeadCoupledDebug={
  build:BUILD,
  setPose(x=0,y=0,z=0){target={x:clamp(+x||0,-1.2,1.2),y:clamp(+y||0,-1.2,1.2),z:clamp(+z||0,-1,1)};source='pointer';startLoop()},
  setMode,
  recenter,
  state:()=>({route:route(),mode,running,source,target:{...target},smooth:{...smooth},calibration:{...calibration},lastFace:lastFace?{...lastFace}:null})
};
queueMicrotask(mount);
})();
