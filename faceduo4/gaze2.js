(()=>{
'use strict';

const CAL_POINTS=[
  [.12,.14],[.50,.14],[.88,.14],
  [.12,.50],[.50,.50],[.88,.50],
  [.12,.86],[.50,.86],[.88,.86],
  [.30,.30],[.70,.30],[.30,.70],[.70,.70]
];
const VERIFY_POINTS=[
  [.16,.18],[.84,.18],[.50,.50],[.16,.82],[.84,.82]
];
const IDS={
  lIris:[468,469,470,471,472],rIris:[473,474,475,476,477],
  lCorners:[33,133],rCorners:[362,263],
  lTop:[159,160],lBottom:[145,144],rTop:[386,385],rBottom:[374,380]
};
const gid=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const avg=(raw,ids)=>{
  let x=0,y=0,z=0,n=0;
  for(const id of ids){const p=raw?.[id];if(!p)continue;x+=p.x;y+=p.y;z+=p.z||0;n++}
  return n?{x:x/n,y:y/n,z:z/n}:null
};

let stream=null,raf=0,busy=false,lastDetect=0,mode='idle';
let calIndex=0,phase='idle',phaseStarted=0,pointSamples=[],calSamples=[];
let verifyIndex=0,verifySamples=[],verifyResults=[];
let model=null,flipOutputX=false,smoothed=null;
let rawLast=null,featureLast=null,missSince=0,lastLightCheck=0,lightLevel=100;
let targets=[],particles=[],score=0,lastSpawn=0,gameLast=0;

function eyeRatio(raw,corners,tops,bottoms,irisIds){
  const iris=avg(raw,irisIds),a=raw?.[corners[0]],b=raw?.[corners[1]],top=avg(raw,tops),bottom=avg(raw,bottoms);
  if(!iris||!a||!b||!top||!bottom)return null;
  const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),w=Math.max(1e-5,maxX-minX);
  const minY=Math.min(top.y,bottom.y),maxY=Math.max(top.y,bottom.y),h=Math.max(1e-5,maxY-minY);
  return {h:(iris.x-minX)/w,v:(iris.y-minY)/h,iris}
}
function features(raw){
  if(!raw||raw.length<478)return null;
  const L=eyeRatio(raw,IDS.lCorners,IDS.lTop,IDS.lBottom,IDS.lIris);
  const R=eyeRatio(raw,IDS.rCorners,IDS.rTop,IDS.rBottom,IDS.rIris);
  if(!L||!R)return null;
  const le=raw[234],re=raw[454],n=raw[1],f=raw[10],c=raw[152];
  if(!le||!re||!n||!f||!c)return null;
  const fw=Math.max(1e-5,Math.hypot(re.x-le.x,re.y-le.y));
  const yaw=(n.x-(le.x+re.x)/2)/fw;
  const pitch=(n.y-f.y)/Math.max(1e-5,c.y-f.y);
  return {
    h:(L.h+R.h)/2,v:(L.v+R.v)/2,dh:L.h-R.h,dv:L.v-R.v,
    yaw,pitch,l:L.iris,r:R.iris,faceWidth:Math.abs(re.x-le.x)
  }
}
function basis(f){return[1,f.h,f.v,f.h*f.v,f.h*f.h,f.v*f.v,f.yaw,f.pitch,f.dh,f.dv]}
function solveLinear(A,b){
  const n=b.length,M=A.map((r,i)=>r.slice().concat(b[i]));
  for(let i=0;i<n;i++){
    let p=i;
    for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r;
    if(Math.abs(M[p][i])<1e-10)return null;
    [M[i],M[p]]=[M[p],M[i]];
    const d=M[i][i]; for(let c=i;c<=n;c++)M[i][c]/=d;
    for(let r=0;r<n;r++){
      if(r===i)continue; const k=M[r][i]; if(!k)continue;
      for(let c=i;c<=n;c++)M[r][c]-=k*M[i][c]
    }
  }
  return M.map(r=>r[n])
}
function fitAxis(samples,key){
  const n=10,A=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0),lambda=.018;
  for(const s of samples){
    const x=basis(s.f),y=s[key];
    for(let i=0;i<n;i++){b[i]+=x[i]*y;for(let j=0;j<n;j++)A[i][j]+=x[i]*x[j]}
  }
  for(let i=1;i<n;i++)A[i][i]+=lambda;
  return solveLinear(A,b)
}
function dot(a,b){let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s}
function fitModel(){
  if(calSamples.length<70)throw new Error('보정 데이터가 부족합니다.');
  const bx=fitAxis(calSamples,'x'),by=fitAxis(calSamples,'y');
  if(!bx||!by)throw new Error('시선 보정식을 계산하지 못했습니다.');
  let err=0;
  for(const s of calSamples)err+=Math.hypot(dot(bx,basis(s.f))-s.x,dot(by,basis(s.f))-s.y);
  model={bx,by,trainError:err/calSamples.length};
  return model
}
function predictRaw(f){
  if(!model||!f)return null;
  return {x:clamp(dot(model.bx,basis(f)),0,1),y:clamp(dot(model.by,basis(f)),0,1)}
}
function predict(f){
  const p=predictRaw(f); if(!p)return null;
  const q={x:flipOutputX?1-p.x:p.x,y:p.y};
  if(!smoothed){smoothed=q;return q}
  const d=Math.hypot(q.x-smoothed.x,q.y-smoothed.y),alpha=clamp(.18+d*1.8,.18,.55);
  smoothed={x:smoothed.x*(1-alpha)+q.x*alpha,y:smoothed.y*(1-alpha)+q.y*alpha};
  return smoothed
}
function status(s){
  const a=gid('gazeStatus'),b=gid('calStatus');
  if(a)a.textContent=s;if(b)b.textContent=s
}
function resizeCanvas(){
  const c=gid('gazeCanvas'); if(!c)return;
  const r=c.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);
  const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
  if(c.width!==w||c.height!==h){c.width=w;c.height=h}
}
function mapVideoPoint(p){
  const v=gid('gazeVideo'),c=gid('gazeCanvas');
  if(!p||!v||!c||!v.videoWidth||!v.videoHeight)return null;
  const cw=c.width,ch=c.height,sw=v.videoWidth,sh=v.videoHeight,k=Math.max(cw/sw,ch/sh),rw=sw*k,rh=sh*k,ox=(cw-rw)/2,oy=(ch-rh)/2;
  return {x:cw-(ox+p.x*sw*k),y:oy+p.y*sh*k}
}
function attachStage(game){
  const v=gid('gazeVideo'),c=gid('gazeCanvas');
  const host=game?document.querySelector('#gazeGame .gameStage'):document.querySelector('#gazeCal .gazeStage');
  if(!v||!c||!host)return;
  host.insertBefore(v,host.firstChild);host.insertBefore(c,v.nextSibling)
}
function stop(){
  cancelAnimationFrame(raf);raf=0;busy=false;mode='idle';
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  const v=gid('gazeVideo');if(v)v.srcObject=null
}
async function start(){
  stop();attachStage(false);mode='loading';show('gazeCal');status('카메라 준비 중…');
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('카메라 접근이 제한되어 있습니다. Chrome에서 열어주세요.');
  const modelP=loadTask();stream=await openCamera();const v=gid('gazeVideo');v.srcObject=stream;await v.play();status('홍채 모델 준비 중…');await modelP;
  calIndex=0;calSamples=[];pointSamples=[];verifyResults=[];verifyIndex=0;model=null;flipOutputX=false;smoothed=null;missSince=0;
  const dotEl=gid('calDot');if(dotEl)dotEl.style.display='block';
  mode='cal';preparePoint();lastDetect=0;raf=requestAnimationFrame(loop)
}
function preparePoint(){
  const p=CAL_POINTS[calIndex],dotEl=gid('calDot'),prog=gid('calProgress');
  if(!p||!dotEl)return;
  dotEl.style.display='block';dotEl.style.left=(p[0]*100)+'%';dotEl.style.top=(p[1]*100)+'%';
  dotEl.classList.remove('capture');void dotEl.offsetWidth;dotEl.classList.add('capture');
  if(prog)prog.textContent=`보정 ${calIndex+1} / ${CAL_POINTS.length}`;
  phase='settle';phaseStarted=performance.now();pointSamples=[]
}
function prepareVerify(){
  const p=VERIFY_POINTS[verifyIndex],dotEl=gid('calDot'),prog=gid('calProgress');
  if(!p||!dotEl)return;
  dotEl.style.display='block';dotEl.style.left=(p[0]*100)+'%';dotEl.style.top=(p[1]*100)+'%';
  dotEl.classList.remove('capture');void dotEl.offsetWidth;dotEl.classList.add('capture');
  if(prog)prog.textContent=`검증 ${verifyIndex+1} / ${VERIFY_POINTS.length}`;
  phase='verifySettle';phaseStarted=performance.now();verifySamples=[]
}
function environmentMessage(f){
  if(lightLevel<48)return '환경이 너무 어두워요. 더 밝은 곳으로 이동해 주세요.';
  if(lightLevel<68)return '조금 어두워요. 얼굴 앞쪽이 밝아지면 정확도가 좋아집니다.';
  if(f?.faceWidth&&f.faceWidth<.22)return '얼굴이 조금 멀어요. 휴대폰을 조금 더 가까이 해주세요.';
  return null
}
function updateCalibration(now){
  if(mode!=='cal'||!featureLast)return;
  const env=environmentMessage(featureLast); if(env){status(env);return}
  const age=now-phaseStarted;
  if(age<480){status('점만 눈으로 따라보세요 · 고개와 휴대폰은 고정');return}
  if(age<1320){pointSamples.push({...featureLast});status('측정 중… 눈만 움직여 주세요');return}
  if(pointSamples.length<7){phaseStarted=now-480;return}
  const target=CAL_POINTS[calIndex],take=pointSamples.slice(-14);
  for(const f of take)calSamples.push({f,x:target[0],y:target[1]});
  calIndex++;
  if(calIndex>=CAL_POINTS.length){
    try{fitModel();mode='verify';verifyIndex=0;prepareVerify()}catch(e){status(e.message);calIndex=0;calSamples=[];preparePoint()}
    return
  }
  preparePoint()
}
function updateVerification(now){
  if(mode!=='verify'||!featureLast)return;
  const env=environmentMessage(featureLast); if(env){status(env);return}
  const age=now-phaseStarted;
  if(age<420){status('정확도 확인 중 · 점만 바라보세요');return}
  if(age<1050){verifySamples.push({...featureLast});status('검증 측정 중…');return}
  if(verifySamples.length<5){phaseStarted=now-420;return}
  const target=VERIFY_POINTS[verifyIndex],preds=verifySamples.slice(-10).map(predictRaw).filter(Boolean);
  const px=preds.reduce((s,p)=>s+p.x,0)/preds.length,py=preds.reduce((s,p)=>s+p.y,0)/preds.length;
  verifyResults.push({target,p:{x:px,y:py}});
  verifyIndex++;
  if(verifyIndex<VERIFY_POINTS.length){prepareVerify();return}
  finishVerification()
}
function finishVerification(){
  let normal=0,flipped=0;
  for(const r of verifyResults){
    normal+=Math.hypot(r.p.x-r.target[0],r.p.y-r.target[1]);
    flipped+=Math.hypot((1-r.p.x)-r.target[0],r.p.y-r.target[1])
  }
  normal/=verifyResults.length;flipped/=verifyResults.length;
  flipOutputX=flipped+0.015<normal;
  const err=Math.min(normal,flipped),pct=Math.round(err*100),dotEl=gid('calDot');if(dotEl)dotEl.style.display='none';
  if(err>.19)status(`보정 정확도가 낮아요 · 오차 약 ${pct}% · 더 밝은 곳에서 다시 보정하는 걸 권장합니다.`);
  else status(`보정 완료 · 검증 오차 약 ${pct}%${flipOutputX?' · 좌우 방향 자동 보정됨':''}`);
  mode='game';score=0;targets=[];particles=[];lastSpawn=0;gameLast=performance.now();smoothed=null;
  const s=gid('gazeScore');if(s)s.textContent='0';attachStage(true);show('gazeGame');setTimeout(resizeCanvas,0)
}
function sampleLight(inf,now){
  if(now-lastLightCheck<700)return;
  lastLightCheck=now;
  try{
    const ctx=inf.getContext('2d',{willReadFrequently:true}),w=inf.width,h=inf.height,step=Math.max(4,Math.floor(Math.min(w,h)/28)),data=ctx.getImageData(0,0,w,h).data;
    let sum=0,n=0;
    for(let y=0;y<h;y+=step)for(let x=0;x<w;x+=step){const i=(y*w+x)*4;sum+=data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722;n++}
    if(n)lightLevel=sum/n
  }catch{}
}
function spawn(now){
  const c=gid('gazeCanvas');if(!c||targets.length>=6||now-lastSpawn<850)return;lastSpawn=now;
  const margin=.11,x=margin+Math.random()*(1-margin*2),y=.18+Math.random()*.68,r=.045+Math.random()*.025;
  targets.push({x,y,r,heat:0,crack:0,seed:Math.random()*9999})
}
function shatter(t){
  score+=100;const s=gid('gazeScore');if(s)s.textContent=String(score);
  for(let i=0;i<18;i++){const a=Math.random()*Math.PI*2,sp=.18+Math.random()*.38;particles.push({x:t.x,y:t.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-.08,life:1,rot:Math.random()*6})}
}
function updateGame(pred,dt,now){
  spawn(now);let hit=null;
  if(pred)for(const t of targets){if(Math.hypot(pred.x-t.x,pred.y-t.y)<t.r*1.15){hit=t;break}}
  for(const t of targets){if(t===hit){t.heat+=dt;t.crack=clamp(t.heat/560,0,1)}else t.heat=Math.max(0,t.heat-dt*.35)}
  const dead=targets.filter(t=>t.heat>=560);for(const t of dead)shatter(t);targets=targets.filter(t=>t.heat<560);
  for(const p of particles){p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=.32*dt/1000;p.life-=dt/720;p.rot+=dt*.004}particles=particles.filter(p=>p.life>0)
}
function drawTarget(q,t,w,h){
  const x=t.x*w,y=t.y*h,r=t.r*Math.min(w,h),glow=6+t.crack*18;q.save();q.translate(x,y);q.shadowBlur=glow;q.shadowColor='rgba(83,215,255,.65)';
  const g=q.createRadialGradient(-r*.28,-r*.34,r*.08,0,0,r);g.addColorStop(0,'rgba(238,252,255,.95)');g.addColorStop(.46,'rgba(112,220,245,.68)');g.addColorStop(1,'rgba(31,102,134,.40)');
  q.fillStyle=g;q.strokeStyle='rgba(220,249,255,.9)';q.lineWidth=Math.max(1.2,w/700);q.beginPath();
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8,rr=r*(i%2?.92:1),px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?q.lineTo(px,py):q.moveTo(px,py)}
  q.closePath();q.fill();q.stroke();
  if(t.crack>.08){q.shadowBlur=0;q.strokeStyle=`rgba(255,255,255,${.25+t.crack*.7})`;q.lineWidth=1.1;const n=3+Math.floor(t.crack*5);for(let i=0;i<n;i++){const a=(i/n*Math.PI*2)+t.seed*.01;q.beginPath();q.moveTo(0,0);q.lineTo(Math.cos(a)*r*(.45+t.crack*.5),Math.sin(a)*r*(.45+t.crack*.5));q.stroke()}}
  q.restore()
}
function drawGame(pred){
  const c=gid('gazeCanvas');if(!c)return;resizeCanvas();const q=c.getContext('2d'),w=c.width,h=c.height;q.clearRect(0,0,w,h);
  const vign=q.createRadialGradient(w*.5,h*.48,w*.1,w*.5,h*.5,w*.72);vign.addColorStop(0,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(0,0,0,.34)');q.fillStyle=vign;q.fillRect(0,0,w,h);
  for(const t of targets)drawTarget(q,t,w,h);
  for(const p of particles){q.save();q.globalAlpha=clamp(p.life,0,1);q.translate(p.x*w,p.y*h);q.rotate(p.rot);q.fillStyle='rgba(174,237,255,.82)';const s=5+8*p.life;q.beginPath();q.moveTo(-s,-s*.4);q.lineTo(s*.9,0);q.lineTo(-s*.5,s*.7);q.closePath();q.fill();q.restore()}
  if(pred&&rawLast){
    const L=mapVideoPoint(avg(rawLast,IDS.lIris)),R=mapVideoPoint(avg(rawLast,IDS.rIris)),tx=pred.x*w,ty=pred.y*h;
    q.save();q.globalCompositeOperation='lighter';q.lineCap='round';
    for(const o of [L,R]){if(!o)continue;const grad=q.createLinearGradient(o.x,o.y,tx,ty);grad.addColorStop(0,'rgba(190,245,255,.95)');grad.addColorStop(.5,'rgba(68,199,255,.88)');grad.addColorStop(1,'rgba(120,235,255,.72)');q.strokeStyle=grad;q.shadowBlur=14;q.shadowColor='rgba(58,200,255,.95)';q.lineWidth=Math.max(2.2,w/340);q.beginPath();q.moveTo(o.x,o.y);q.lineTo(tx,ty);q.stroke()}
    q.shadowBlur=20;q.fillStyle='rgba(180,247,255,.92)';q.beginPath();q.arc(tx,ty,Math.max(5,w/110),0,Math.PI*2);q.fill();q.restore()
  }
}
async function loop(t){
  raf=requestAnimationFrame(loop);const v=gid('gazeVideo');if(busy||!task||!v?.videoWidth||t-lastDetect<68)return;busy=true;lastDetect=t;
  try{
    const inf=gid('gazeInfer'),max=820,k=Math.min(1,max/Math.max(v.videoWidth,v.videoHeight));inf.width=Math.max(1,Math.round(v.videoWidth*k));inf.height=Math.max(1,Math.round(v.videoHeight*k));inf.getContext('2d').drawImage(v,0,0,inf.width,inf.height);sampleLight(inf,t);
    const r=task.detect(inf),raw=r.faceLandmarks?.[0];
    if(!raw?.length){
      if(!missSince)missSince=t;
      const msg=lightLevel<60?'얼굴이 잘 안 보여요. 더 밝은 곳으로 이동해 주세요.':(t-missSince>1200?'얼굴과 눈이 잘 보이게 정면을 맞춰 주세요. 안경 반사가 심하면 각도를 조금 바꿔보세요.':'얼굴과 눈을 찾는 중…');status(msg);return
    }
    missSince=0;rawLast=raw;featureLast=features(raw);
    if(!featureLast){status(lightLevel<60?'홍채가 잘 안 보여요. 밝은 곳으로 이동해 주세요.':'홍채를 찾는 중… 눈을 크게 뜨고 화면을 바라봐 주세요.');return}
    if(mode==='cal')updateCalibration(t);else if(mode==='verify')updateVerification(t);else if(mode==='game'){const pred=predict(featureLast),dt=Math.min(80,t-gameLast||16);gameLast=t;updateGame(pred,dt,t);drawGame(pred)}
  }catch(e){status('시선 추적 오류 · '+(e?.message||e))}finally{busy=false}
}
function back(){stop();model=null;smoothed=null;const d=gid('calDot');if(d)d.style.display='block';show('launcher')}
function bind(){
  gid('modeFace')?.addEventListener('click',()=>show('home'));
  gid('modeGaze')?.addEventListener('click',()=>show('gazeIntro'));
  gid('faceBack')?.addEventListener('click',()=>show('launcher'));
  gid('gazeBack')?.addEventListener('click',back);
  gid('gazeCalBack')?.addEventListener('click',back);
  gid('gazeStart')?.addEventListener('click',()=>start().catch(e=>{stop();show('gazeIntro');status(e?.message||String(e));alert('시선 추적을 시작하지 못했습니다.\n'+(e?.message||String(e))}));
  gid('gazeGameBack')?.addEventListener('click',back);
  gid('recalibrate')?.addEventListener('click',()=>{stop();start().catch(e=>{show('gazeIntro');status(e?.message||String(e))})});
  if(mode==='new')show('launcher');
  if(!navigator.mediaDevices?.getUserMedia){const n=gid('cameraEnvNote');if(n)n.textContent='현재 브라우저에서는 카메라 접근이 제한되어 있습니다. Chrome에서 열어주세요.'}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();