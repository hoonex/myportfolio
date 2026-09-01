(()=>{
'use strict';
const GAZE_POINTS=[
  [.14,.16],[.50,.16],[.86,.16],
  [.14,.50],[.50,.50],[.86,.50],
  [.14,.84],[.50,.84],[.86,.84]
];
const GAZE_IDS={
  lIris:[468,469,470,471,472],rIris:[473,474,475,476,477],
  lCorners:[33,133],rCorners:[362,263],
  lTop:[159,160],lBottom:[145,144],rTop:[386,385],rBottom:[374,380]
};
let gazeStream=null,gazeRaf=0,gazeBusy=false,gazeLast=0,gazeRaw=null,gazeFeature=null;
let gazeMode='idle',calIndex=0,calPhase='idle',calStarted=0,calSamples=[],calPointSamples=[];
let gazeModel=null,gazeSmoothed=null,gazeLastPredAt=0,recentFeatures=[];
let targets=[],particles=[],score=0,lastSpawn=0,gameLast=0;
const gid=id=>document.getElementById(id);
const gclamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const avg=(raw,ids)=>{let x=0,y=0,z=0,n=0;for(const id of ids){const p=raw?.[id];if(!p)continue;x+=p.x;y+=p.y;z+=p.z||0;n++}return n?{x:x/n,y:y/n,z:z/n}:null};
const avgPts=(raw,ids)=>avg(raw,ids);
function eyeRatio(raw,corners,tops,bottoms,irisIds){
  const iris=avg(raw,irisIds),a=raw?.[corners[0]],b=raw?.[corners[1]],top=avgPts(raw,tops),bottom=avgPts(raw,bottoms);
  if(!iris||!a||!b||!top||!bottom)return null;
  const minX=Math.min(a.x,b.x),maxX=Math.max(a.x,b.x),w=Math.max(1e-5,maxX-minX);
  const minY=Math.min(top.y,bottom.y),maxY=Math.max(top.y,bottom.y),h=Math.max(1e-5,maxY-minY);
  return{h:(iris.x-minX)/w,v:(iris.y-minY)/h,iris};
}
function gazeFeatures(raw){
  if(!raw||raw.length<478)return null;
  const L=eyeRatio(raw,GAZE_IDS.lCorners,GAZE_IDS.lTop,GAZE_IDS.lBottom,GAZE_IDS.lIris);
  const R=eyeRatio(raw,GAZE_IDS.rCorners,GAZE_IDS.rTop,GAZE_IDS.rBottom,GAZE_IDS.rIris);
  if(!L||!R)return null;
  const le=raw[234],re=raw[454],n=raw[1],f=raw[10],c=raw[152];
  if(!le||!re||!n||!f||!c)return null;
  const fw=Math.max(1e-5,Math.hypot(re.x-le.x,re.y-le.y));
  const yaw=(n.x-(le.x+re.x)/2)/fw;
  const pitch=(n.y-f.y)/Math.max(1e-5,c.y-f.y);
  const h=(L.h+R.h)/2,v=(L.v+R.v)/2,dh=L.h-R.h,dv=L.v-R.v;
  return{h,v,dh,dv,yaw,pitch,l:L.iris,r:R.iris};
}
function basis(f){return[1,f.h,f.v,f.h*f.v,f.h*f.h,f.v*f.v,f.yaw,f.pitch,f.dh,f.dv]}
function solveLinear(A,b){
  const n=b.length,M=A.map((r,i)=>r.slice().concat(b[i]));
  for(let i=0;i<n;i++){
    let p=i;for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r;
    if(Math.abs(M[p][i])<1e-10)return null;
    [M[i],M[p]]=[M[p],M[i]];const d=M[i][i];for(let c=i;c<=n;c++)M[i][c]/=d;
    for(let r=0;r<n;r++){if(r===i)continue;const k=M[r][i];if(!k)continue;for(let c=i;c<=n;c++)M[r][c]-=k*M[i][c]}
  }
  return M.map(r=>r[n]);
}
function fitAxis(samples,key){
  const n=10,A=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0),lambda=.012;
  for(const s of samples){const x=basis(s.f),y=s[key];for(let i=0;i<n;i++){b[i]+=x[i]*y;for(let j=0;j<n;j++)A[i][j]+=x[i]*x[j]}}
  for(let i=1;i<n;i++)A[i][i]+=lambda;
  return solveLinear(A,b);
}
function dot(a,b){let s=0;for(let i=0;i<a.length;i++)s+=a[i]*b[i];return s}
function fitGazeModel(){
  if(calSamples.length<36)throw new Error('보정 데이터가 부족합니다.');
  const bx=fitAxis(calSamples,'x'),by=fitAxis(calSamples,'y');if(!bx||!by)throw new Error('시선 보정식을 계산하지 못했습니다.');
  let err=0,n=0;for(const s of calSamples){const x=dot(bx,basis(s.f)),y=dot(by,basis(s.f));err+=Math.hypot(x-s.x,y-s.y);n++}
  gazeModel={bx,by,error:err/Math.max(1,n)};return gazeModel;
}
function predictGaze(f){
  if(!gazeModel||!f)return null;const p={x:gclamp(dot(gazeModel.bx,basis(f)),0,1),y:gclamp(dot(gazeModel.by,basis(f)),0,1)};
  const now=performance.now();if(!gazeSmoothed){gazeSmoothed=p;gazeLastPredAt=now;return p}
  const d=Math.hypot(p.x-gazeSmoothed.x,p.y-gazeSmoothed.y),alpha=gclamp(.20+d*1.9,.20,.58);
  gazeSmoothed={x:gazeSmoothed.x*(1-alpha)+p.x*alpha,y:gazeSmoothed.y*(1-alpha)+p.y*alpha};gazeLastPredAt=now;return gazeSmoothed;
}
function setGazeStatus(s){const e=gid('gazeStatus'),c=gid('calStatus');if(e)e.textContent=s;if(c)c.textContent=s}
function resizeGazeCanvas(){
  const c=gid('gazeCanvas');if(!c)return;const r=c.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1),w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));if(c.width!==w||c.height!==h){c.width=w;c.height=h}
}
function mapVideoPoint(p){
  const v=gid('gazeVideo'),c=gid('gazeCanvas');if(!p||!v||!c||!v.videoWidth||!v.videoHeight)return null;
  const cw=c.width,ch=c.height,sw=v.videoWidth,sh=v.videoHeight,k=Math.max(cw/sw,ch/sh),rw=sw*k,rh=sh*k,ox=(cw-rw)/2,oy=(ch-rh)/2;
  return{x:cw-(ox+p.x*sw*k),y:oy+p.y*sh*k};
}
function attachGazeStage(game){
  const v=gid('gazeVideo'),c=gid('gazeCanvas'),host=game?document.querySelector('#gazeGame .gameStage'):document.querySelector('#gazeCal .gazeStage');
  if(!v||!c||!host)return;host.insertBefore(v,host.firstChild);host.insertBefore(c,v.nextSibling);
}
async function startGazeCamera(){
  stopGaze();attachGazeStage(false);gazeMode='loading';show('gazeCal');setGazeStatus('카메라 준비 중…');
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('이 브라우저에서는 카메라 기능을 사용할 수 없습니다. Chrome에서 열어주세요.');
  const modelP=loadTask();gazeStream=await openCamera();const v=gid('gazeVideo');v.srcObject=gazeStream;await v.play();setGazeStatus('홍채 모델 준비 중…');await modelP;
  setGazeStatus('보정 시작 · 고개는 고정하고 점만 눈으로 따라보세요');gazeMode='cal';calIndex=0;calSamples=[];calPointSamples=[];gazeModel=null;gazeSmoothed=null;recentFeatures=[];prepareCalPoint();gazeLast=0;gazeRaf=requestAnimationFrame(gazeLoop);
}
function stopGaze(){
  cancelAnimationFrame(gazeRaf);gazeRaf=0;gazeBusy=false;gazeMode='idle';if(gazeStream){gazeStream.getTracks().forEach(t=>t.stop());gazeStream=null}const v=gid('gazeVideo');if(v)v.srcObject=null;
}
function prepareCalPoint(){
  const p=GAZE_POINTS[calIndex],dotEl=gid('calDot'),prog=gid('calProgress');if(!p||!dotEl)return;
  dotEl.style.left=(p[0]*100)+'%';dotEl.style.top=(p[1]*100)+'%';dotEl.classList.remove('capture');void dotEl.offsetWidth;dotEl.classList.add('capture');
  if(prog)prog.textContent=`${calIndex+1} / ${GAZE_POINTS.length}`;calPhase='settle';calStarted=performance.now();calPointSamples=[];
}
function updateCalibration(now){
  if(gazeMode!=='cal'||!gazeFeature)return;const age=now-calStarted;
  if(age<520){setGazeStatus('점만 바라봐 주세요');return}
  calPhase='collect';if(age<1220){calPointSamples.push({...gazeFeature});setGazeStatus('측정 중… 눈만 움직이고 고개는 고정');return}
  const target=GAZE_POINTS[calIndex];if(calPointSamples.length<4){calStarted=now-520;return}
  const start=Math.max(0,calPointSamples.length-10);for(const f of calPointSamples.slice(start))calSamples.push({f,x:target[0],y:target[1]});
  calIndex++;
  if(calIndex>=GAZE_POINTS.length){finishCalibration();return}
  prepareCalPoint();
}
function finishCalibration(){
  try{const m=fitGazeModel(),pct=Math.round(m.error*100);gid('calDot').style.display='none';setGazeStatus(`보정 완료 · 추정 오차 약 ${pct}%`);gazeMode='game';score=0;targets=[];particles=[];lastSpawn=0;gameLast=performance.now();gazeSmoothed=null;gid('gazeScore').textContent='0';attachGazeStage(true);show('gazeGame');setTimeout(()=>{resizeGazeCanvas();},0)}catch(e){setGazeStatus(e.message);calIndex=0;calSamples=[];gid('calDot').style.display='block';prepareCalPoint()}
}
function spawnTarget(now){
  const c=gid('gazeCanvas');if(!c||targets.length>=6||now-lastSpawn<850)return;lastSpawn=now;
  const margin=.11,x=margin+Math.random()*(1-margin*2),y=.18+Math.random()*.68,r=.045+Math.random()*.025;
  targets.push({x,y,r,heat:0,crack:0,seed:Math.random()*9999});
}
function shatter(t){
  score+=100;gid('gazeScore').textContent=String(score);for(let i=0;i<18;i++){const a=Math.random()*Math.PI*2,sp=.18+Math.random()*.38;particles.push({x:t.x,y:t.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-.08,life:1,rot:Math.random()*6})}
}
function updateGame(pred,dt,now){
  spawnTarget(now);let hit=null;if(pred){for(const t of targets){const d=Math.hypot(pred.x-t.x,pred.y-t.y);if(d<t.r*1.15){hit=t;break}}}
  for(const t of targets){if(t===hit){t.heat+=dt;t.crack=gclamp(t.heat/520,0,1)}else t.heat=Math.max(0,t.heat-dt*.35)}
  const dead=targets.filter(t=>t.heat>=520);for(const t of dead)shatter(t);targets=targets.filter(t=>t.heat<520);
  for(const p of particles){p.x+=p.vx*dt/1000;p.y+=p.vy*dt/1000;p.vy+=.32*dt/1000;p.life-=dt/720;p.rot+=dt*.004}particles=particles.filter(p=>p.life>0);
}
function drawTarget(q,t,w,h){
  const x=t.x*w,y=t.y*h,r=t.r*Math.min(w,h),glow=6+t.crack*18;q.save();q.translate(x,y);q.shadowBlur=glow;q.shadowColor='rgba(83,215,255,.65)';
  const g=q.createRadialGradient(-r*.28,-r*.34,r*.08,0,0,r);g.addColorStop(0,'rgba(238,252,255,.95)');g.addColorStop(.46,'rgba(112,220,245,.68)');g.addColorStop(1,'rgba(31,102,134,.40)');q.fillStyle=g;q.strokeStyle='rgba(220,249,255,.9)';q.lineWidth=Math.max(1.2,w/700);q.beginPath();
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/8,rr=r*(i%2?.92:1);const px=Math.cos(a)*rr,py=Math.sin(a)*rr;i?q.lineTo(px,py):q.moveTo(px,py)}q.closePath();q.fill();q.stroke();
  if(t.crack>.08){q.shadowBlur=0;q.strokeStyle=`rgba(255,255,255,${.25+t.crack*.7})`;q.lineWidth=1.1;const n=3+Math.floor(t.crack*5);for(let i=0;i<n;i++){const a=(i/n*Math.PI*2)+t.seed*.01;q.beginPath();q.moveTo(0,0);q.lineTo(Math.cos(a)*r*(.45+t.crack*.5),Math.sin(a)*r*(.45+t.crack*.5));q.stroke()}}
  q.restore();
}
function drawGame(pred){
  const c=gid('gazeCanvas');if(!c)return;resizeGazeCanvas();const q=c.getContext('2d'),w=c.width,h=c.height;q.clearRect(0,0,w,h);
  const vign=q.createRadialGradient(w*.5,h*.48,w*.1,w*.5,h*.5,w*.72);vign.addColorStop(0,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(0,0,0,.34)');q.fillStyle=vign;q.fillRect(0,0,w,h);
  for(const t of targets)drawTarget(q,t,w,h);
  for(const p of particles){q.save();q.globalAlpha=gclamp(p.life,0,1);q.translate(p.x*w,p.y*h);q.rotate(p.rot);q.fillStyle='rgba(174,237,255,.82)';const s=5+8*p.life;q.beginPath();q.moveTo(-s,-s*.4);q.lineTo(s*.9,0);q.lineTo(-s*.5,s*.7);q.closePath();q.fill();q.restore()}
  if(pred&&gazeRaw){const L=mapVideoPoint(avg(gazeRaw,GAZE_IDS.lIris)),R=mapVideoPoint(avg(gazeRaw,GAZE_IDS.rIris)),tx=pred.x*w,ty=pred.y*h;q.save();q.globalCompositeOperation='lighter';q.lineCap='round';for(const o of [L,R]){if(!o)continue;const grad=q.createLinearGradient(o.x,o.y,tx,ty);grad.addColorStop(0,'rgba(190,245,255,.95)');grad.addColorStop(.5,'rgba(68,199,255,.88)');grad.addColorStop(1,'rgba(120,235,255,.72)');q.strokeStyle=grad;q.shadowBlur=14;q.shadowColor='rgba(58,200,255,.95)';q.lineWidth=Math.max(2.2,w/340);q.beginPath();q.moveTo(o.x,o.y);q.lineTo(tx,ty);q.stroke()}
    q.shadowBlur=20;q.fillStyle='rgba(180,247,255,.92)';q.beginPath();q.arc(tx,ty,Math.max(5,w/110),0,Math.PI*2);q.fill();q.restore()}
}
async function gazeLoop(t){
  gazeRaf=requestAnimationFrame(gazeLoop);if(gazeBusy||!task||!gid('gazeVideo')?.videoWidth||t-gazeLast<68)return;gazeBusy=true;gazeLast=t;
  try{const v=gid('gazeVideo'),inf=gid('gazeInfer'),max=820,k=Math.min(1,max/Math.max(v.videoWidth,v.videoHeight));inf.width=Math.max(1,Math.round(v.videoWidth*k));inf.height=Math.max(1,Math.round(v.videoHeight*k));inf.getContext('2d').drawImage(v,0,0,inf.width,inf.height);const r=task.detect(inf),raw=r.faceLandmarks?.[0];if(!raw?.length){setGazeStatus('얼굴과 눈이 보이도록 맞춰 주세요');return}gazeRaw=raw;gazeFeature=gazeFeatures(raw);if(!gazeFeature){setGazeStatus('홍채를 찾는 중…');return}
    recentFeatures.push({t,f:gazeFeature});while(recentFeatures.length&&t-recentFeatures[0].t>700)recentFeatures.shift();
    if(gazeMode==='cal')updateCalibration(t);else if(gazeMode==='game'){const pred=predictGaze(gazeFeature),dt=Math.min(80,t-gameLast||16);gameLast=t;updateGame(pred,dt,t);drawGame(pred)}
  }catch(e){setGazeStatus('시선 추적 오류 · '+(e?.message||e))}finally{gazeBusy=false}
}
function backToLauncher(){stopGaze();gazeModel=null;gazeSmoothed=null;const d=gid('calDot');if(d)d.style.display='block';show('launcher')}
function bindGazeUI(){
  gid('modeFace')?.addEventListener('click',()=>show('home'));
  gid('modeGaze')?.addEventListener('click',()=>show('gazeIntro'));
  gid('faceBack')?.addEventListener('click',()=>show('launcher'));
  gid('gazeBack')?.addEventListener('click',backToLauncher);
  gid('gazeCalBack')?.addEventListener('click',backToLauncher);
  gid('gazeStart')?.addEventListener('click',()=>startGazeCamera().catch(e=>{stopGaze();show('gazeIntro');setGazeStatus(e?.message||String(e));alert('시선 추적을 시작하지 못했습니다.\n'+(e?.message||String(e)))}));
  gid('gazeGameBack')?.addEventListener('click',backToLauncher);
  gid('recalibrate')?.addEventListener('click',()=>{stopGaze();startGazeCamera().catch(e=>{show('gazeIntro');setGazeStatus(e?.message||String(e))})});
  if(mode==='new')show('launcher');
  if(!navigator.mediaDevices?.getUserMedia){const n=gid('cameraEnvNote');if(n)n.textContent='현재 브라우저에서는 카메라 접근이 제한되어 있습니다. Chrome에서 열어주세요.'}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindGazeUI,{once:true});else bindGazeUI();
})();