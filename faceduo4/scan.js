function buildUI(){
  const g=$('segments');g.innerHTML='';
  for(let i=0;i<N;i++){
    const a=i/N*Math.PI*2,x1=50+44*Math.cos(a-.062),y1=70+63*Math.sin(a-.062),x2=50+44*Math.cos(a+.062),y2=70+63*Math.sin(a+.062),p=document.createElementNS('http://www.w3.org/2000/svg','path');
    p.setAttribute('d',`M${x1} ${y1} L${x2} ${y2}`);p.classList.add('seg');g.appendChild(p)
  }
  $('chips').innerHTML=LABELS.map(x=>`<span class="chip">${x}</span>`).join('')
}
function coverMap(sw,sh,dw,dh){const k=Math.max(dw/sw,dh/sh),rw=sw*k,rh=sh*k,ox=(dw-rw)/2,oy=(dh-rh)/2;return p=>({x:dw-(ox+p.x*sw*k),y:oy+p.y*sh*k})}
const WIRES=[[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10],[33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246,33],[362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398,362],[61,146,91,181,84,17,314,405,321,375,291,308,324,318,402,317,14,87,178,88,95,78,61],[168,6,197,195,5,4,1,2,98],[168,6,197,195,5,4,1,2,327]];
const FUSION_ANCHORS=[33,133,362,263,1,6,10,152,234,454,61,291,98,327,172,397];
const HQ_REQ={center:7,right:4,left:4,up:4,down:4},HQ_COVERAGE=22;
const CONTOUR_IDS=new Set([10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]);
const DETAIL_IDS=new Set([33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246,362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398,61,146,91,181,84,17,314,405,321,375,291,308,324,318,402,317,14,87,178,88,95,78,70,63,105,66,107,55,65,336,296,334,293,300,276,283,468,469,470,471,472,473,474,475,476,477]);
const NOSE_IDS=new Set([1,2,4,5,6,19,94,97,98,168,195,197,326,327]);
let smoothMeshState=null,binQuality=Array(N).fill(0),currentBin=-1,inferMax=900,inferSamples=[],meshAdj=null;
function drawLive(raw){
  const c=$('overlay'),r=c.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1),w=Math.round(r.width*d),h=Math.round(r.height*d);if(c.width!==w||c.height!==h){c.width=w;c.height=h}
  const q=c.getContext('2d');q.clearRect(0,0,w,h);if(!raw?.length)return;const mp=coverMap($('video').videoWidth,$('video').videoHeight,w,h),P=raw.map(mp);
  q.strokeStyle='rgba(132,211,255,.72)';q.lineWidth=Math.max(1,w/620);
  for(const wire of WIRES){q.beginPath();for(let j=0;j<wire.length;j++){const p=P[wire[j]];if(!p)continue;j?q.lineTo(p.x,p.y):q.moveTo(p.x,p.y)}q.stroke()}
  if(vision?.FaceLandmarker?.FACE_LANDMARKS_TESSELATION){q.globalAlpha=.25;q.beginPath();for(const e of vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION){const a=P[e.start],b=P[e.end];if(!a||!b)continue;q.moveTo(a.x,a.y);q.lineTo(b.x,b.y)}q.stroke();q.globalAlpha=1}
}
function canonical(raw){
  const sw=$('video').videoWidth,sh=$('video').videoHeight;if(!sw||!sh)return null;
  const p=raw.map(v=>[v.x*sw,v.y*sh,(v.z||0)*sw]),L=[33,133].map(i=>p[i]),R=[362,263].map(i=>p[i]),lc=[(L[0][0]+L[1][0])/2,(L[0][1]+L[1][1])/2],rc=[(R[0][0]+R[1][0])/2,(R[0][1]+R[1][1])/2],cx=(lc[0]+rc[0])/2,cy=(lc[1]+rc[1])/2,dx=rc[0]-lc[0],dy=rc[1]-lc[1],s=Math.hypot(dx,dy);if(!s)return null;
  const ca=dx/s,sa=dy/s,z0=(L[0][2]+L[1][2]+R[0][2]+R[1][2])/4;
  return p.map(v=>{const x=v[0]-cx,y=v[1]-cy;return[(x*ca+y*sa)/s,(-x*sa+y*ca)/s,(v[2]-z0)/s]})
}
function pose(raw){const sw=$('video').videoWidth,sh=$('video').videoHeight,p=i=>[raw[i].x*sw,raw[i].y*sh],L=p(234),R=p(454),N=p(1),F=p(10),C=p(152),fw=Math.hypot(R[0]-L[0],R[1]-L[1])||1,cx=(L[0]+R[0])/2,yaw=(N[0]-cx)/fw,pitch=(N[1]-F[1])/((C[1]-F[1])||1);return{yaw,pitch}}
function feature(m){const d=(a,b)=>dist(m[a],m[b]);return[d(234,454),d(10,152),d(172,397),d(33,133),d(362,263),d(133,362),d(98,327),d(61,291),d(1,152),d(10,1),d(13,14),d(6,152)]}
function shapeSig(m){const d=(a,b)=>dist(m[a],m[b]);return[[234,454],[10,152],[172,397],[33,263],[133,362],[98,327],[61,291],[1,152],[10,1],[6,152],[58,288],[93,323],[132,361],[148,377]].map(x=>d(x[0],x[1]))}
function medianMesh(frames){if(!frames.length)return null;const n=frames[0].mesh.length,out=[];for(let i=0;i<n;i++)out.push([med(frames.map(f=>f.mesh[i][0])),med(frames.map(f=>f.mesh[i][1])),med(frames.map(f=>f.mesh[i][2]))]);return out}
function medianVec(frames){if(!frames.length)return Array(12).fill(0);const n=frames[0].feat.length;return Array.from({length:n},(_,i)=>med(frames.map(f=>f.feat[i])))}
function eyeNormalize(mesh){
  if(!mesh?.length)return null;
  const lc=[(mesh[33][0]+mesh[133][0])/2,(mesh[33][1]+mesh[133][1])/2,(mesh[33][2]+mesh[133][2])/2],rc=[(mesh[362][0]+mesh[263][0])/2,(mesh[362][1]+mesh[263][1])/2,(mesh[362][2]+mesh[263][2])/2],cx=(lc[0]+rc[0])/2,cy=(lc[1]+rc[1])/2,cz=(lc[2]+rc[2])/2,dx=rc[0]-lc[0],dy=rc[1]-lc[1],s=Math.hypot(dx,dy)||1,ca=dx/s,sa=dy/s;
  return mesh.map(v=>{const x=v[0]-cx,y=v[1]-cy;return[(x*ca+y*sa)/s,(-x*sa+y*ca)/s,(v[2]-cz)/s]})
}
function rotate3D(mesh,yaw,pitch){const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);return mesh.map(v=>{const x1=v[0]*cy+v[2]*sy,z1=-v[0]*sy+v[2]*cy,y1=v[1];return[x1,y1*cx-z1*sx,y1*sx+z1*cx]})}
function meshError(a,b){let s=0,n=0;for(const i of FUSION_ANCHORS){const p=a?.[i],q=b?.[i];if(!p||!q)continue;const dx=p[0]-q[0],dy=p[1]-q[1],dz=(p[2]-q[2])*.35;s+=dx*dx+dy*dy+dz*dz;n++}return n?Math.sqrt(s/n):1e9}
function stabilizeFrame(mesh){
  const n=eyeNormalize(mesh);if(!n)return{mesh,stability:.5};
  if(!smoothMeshState){smoothMeshState=n.map(p=>p.slice());return{mesh:n,stability:1}}
  const motion=meshError(n,smoothMeshState),alpha=clamp(.36+motion*5.4,.36,.84),out=n.map((p,i)=>[smoothMeshState[i][0]*(1-alpha)+p[0]*alpha,smoothMeshState[i][1]*(1-alpha)+p[1]*alpha,smoothMeshState[i][2]*(1-alpha)+p[2]*alpha]);
  smoothMeshState=out;return{mesh:out,stability:clamp(1-motion/.28,.58,1)}
}
function poseAngles(fr){const yaw=clamp(fr.pose.yaw/.16,-1.18,1.18)*.60,dy=(fr.pose.pitch-(basePitch??fr.pose.pitch)),pitch=clamp(dy/.09,-1.18,1.18)*.44;return{yaw,pitch}}
function frontalize(fr,ref){
  const ang=poseAngles(fr),yf=[.78,1,1.22],pf=[.78,1,1.22],ys=ang.yaw?[-1,1]:[1],ps=ang.pitch?[-1,1]:[1];let best=null,bestErr=1e9;
  for(const sy of ys)for(const sp of ps)for(const fy of yf)for(const fp of pf){const m=eyeNormalize(rotate3D(fr.mesh,sy*ang.yaw*fy,sp*ang.pitch*fp)),e=meshError(m,ref);if(e<bestErr){bestErr=e;best=m}}
  const confidence=(1/(1+Math.pow(bestErr/.075,2)))*(fr.stability||1);return{mesh:best,error:bestErr,weight:clamp(confidence,.08,1)}
}
function evenlyPick(arr,max){if(arr.length<=max)return arr.slice();const out=[];for(let i=0;i<max;i++)out.push(arr[Math.round(i*(arr.length-1)/(max-1))]);return out}
function viewWeight(id,axis,bucket){let w=1;if(DETAIL_IDS.has(id))w*=bucket==='center'?1.35:.82;if(CONTOUR_IDS.has(id))w*=bucket==='left'||bucket==='right'?1.22:1;if(NOSE_IDS.has(id)&&axis===2)w*=bucket==='left'||bucket==='right'?1.35:1.05;if(id>=468&&id<=477)w*=bucket==='center'?1.6:.55;return w}
function weightedRobustCoord(frames,id,axis){
  if(!frames.length)return 0;const vals=frames.map(f=>f.mesh[id][axis]),m=med(vals),dev=vals.map(v=>Math.abs(v-m)),mad=med(dev),floor=axis===2?.010:.006,scale=Math.max(floor,mad*1.4826),cut=scale*2.8;let num=0,den=0;
  for(let i=0;i<frames.length;i++){const d=Math.abs(vals[i]-m);if(d>cut*1.5)continue;const hub=d<=scale*1.45?1:(scale*1.45)/(d||1),w=(frames[i].weight||1)*viewWeight(id,axis,frames[i].bucket)*hub;num+=vals[i]*w;den+=w}
  return den?num/den:m
}
function adjacency(){
  if(meshAdj)return meshAdj;meshAdj=Array.from({length:478},()=>new Set());
  const edges=vision?.FaceLandmarker?.FACE_LANDMARKS_TESSELATION||[];for(const e of edges){if(e.start<478&&e.end<478){meshAdj[e.start].add(e.end);meshAdj[e.end].add(e.start)}}return meshAdj
}
function smoothSurface(mesh){
  const adj=adjacency();let cur=mesh.map(p=>p.slice());
  for(let pass=0;pass<2;pass++){
    const next=cur.map(p=>p.slice());
    for(let i=0;i<cur.length;i++){
      const ns=[...(adj[i]||[])];if(ns.length<2||FUSION_ANCHORS.includes(i))continue;let ax=0,ay=0,az=0;for(const j of ns){ax+=cur[j][0];ay+=cur[j][1];az+=cur[j][2]}ax/=ns.length;ay/=ns.length;az/=ns.length;
      const detail=DETAIL_IDS.has(i),contour=CONTOUR_IDS.has(i),nose=NOSE_IDS.has(i),axy=detail?.012:contour?.018:.045,azw=detail?.025:nose?.065:contour?.045:.095;
      next[i][0]=cur[i][0]*(1-axy)+ax*axy;next[i][1]=cur[i][1]*(1-axy)+ay*axy;next[i][2]=cur[i][2]*(1-azw)+az*azw
    }
    cur=next
  }
  return cur
}
function fuseMultiView(){
  const ref=eyeNormalize(medianMesh(centerFrames));if(!ref)throw Error('정면 mesh가 부족합니다.');
  const groups={center:evenlyPick(centerFrames,16),right:evenlyPick(orbitFrames.filter(f=>f.bucket==='right'),16),left:evenlyPick(orbitFrames.filter(f=>f.bucket==='left'),16),up:evenlyPick(orbitFrames.filter(f=>f.bucket==='up'),14),down:evenlyPick(orbitFrames.filter(f=>f.bucket==='down'),14)},all=[];
  for(const fr of groups.center){const m=eyeNormalize(fr.mesh),e=meshError(m,ref);all.push({mesh:m,error:e,weight:clamp((1/(1+Math.pow(e/.07,2)))*(fr.stability||1),.12,1),bucket:'center'})}
  for(const k of ['right','left','up','down'])for(const fr of groups[k]){const x=frontalize(fr,ref);all.push({...x,bucket:k})}
  const errs=all.map(f=>f.error).filter(Number.isFinite),em=med(errs),emad=med(errs.map(v=>Math.abs(v-em))),limit=Math.max(.07,em+Math.max(.025,emad*2.7)),transformed=all.filter(f=>f.bucket==='center'||f.error<=limit);
  if(transformed.length<HQ_REQ.center+12)return{mesh:ref,frames:transformed.length,error:null,quality:65,groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))};
  const out=[];for(let i=0;i<ref.length;i++){
    let x=weightedRobustCoord(transformed,i,0),y=weightedRobustCoord(transformed,i,1),z=weightedRobustCoord(transformed,i,2);const rb=DETAIL_IDS.has(i)?.22:CONTOUR_IDS.has(i)?.07:.11,zb=NOSE_IDS.has(i)?.10:DETAIL_IDS.has(i)?.30:.20;
    x=x*(1-rb)+ref[i][0]*rb;y=y*(1-rb)+ref[i][1]*rb;z=z*(1-zb)+ref[i][2]*zb;out.push([x,y,z])
  }
  const fused=eyeNormalize(smoothSurface(out)),meanErr=transformed.reduce((s,f)=>s+f.error,0)/transformed.length,coverage=binQuality.filter(n=>n>=1.55).length,balance=KEYS.reduce((s,k)=>s+Math.min(1,(groups[k]?.length||0)/HQ_REQ[k]),0)/KEYS.length,errScore=Math.exp(-meanErr*7.5),quality=Math.round(clamp((errScore*.46+Math.min(1,coverage/HQ_COVERAGE)*.34+balance*.20)*100,0,100));
  return{mesh:fused,frames:transformed.length,error:meanErr,quality,groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))}
}
function bucketName(yaw,dy){if(Math.abs(yaw)<.05&&Math.abs(dy)<.045)return'center';if(yaw>.105)return'right';if(yaw<-.105)return'left';if(dy<-.07)return'up';if(dy>.07)return'down';return null}
function bucketCounts(){const o={center:centerFrames.length,right:0,left:0,up:0,down:0};for(const f of orbitFrames)if(f.bucket)o[f.bucket]++;return o}
function updateProgress(){
  const counts=bucketCounts(),coverage=binQuality.filter(n=>n>=1.55).length,ring=Math.min(1,coverage/HQ_COVERAGE),bp=KEYS.reduce((s,k)=>s+Math.min(1,counts[k]/HQ_REQ[k]),0)/5,p=Math.min(99,Math.floor((ring*.74+bp*.26)*100)),done=coverage>=HQ_COVERAGE&&KEYS.every(k=>counts[k]>=HQ_REQ[k]);
  $('percent').textContent=(done?100:p)+'%';document.querySelectorAll('.seg').forEach((e,i)=>{e.classList.toggle('done',binQuality[i]>=1.55);e.classList.toggle('current',i===currentBin)});document.querySelectorAll('.chip').forEach((e,i)=>e.classList.toggle('done',counts[KEYS[i]]>=HQ_REQ[KEYS[i]]));
  if(done)finishScan();else if(p>70){const miss=KEYS.find(k=>counts[k]<HQ_REQ[k]);const t={center:'정면을 잠시 더',right:'오른쪽으로 조금 더',left:'왼쪽으로 조금 더',up:'고개를 조금 더 위로',down:'고개를 조금 더 아래로'};$('hint').textContent=t[miss]||'빈 구간을 천천히 훑어주세요'}
}
function resetScan(){phaseName='front';basePitch=null;hold=0;lastLoop=performance.now();centerFrames=[];orbitFrames=[];bins=Array(N).fill(0);binQuality=Array(N).fill(0);currentBin=-1;bestFront=null;captured=null;busy=false;smoothMeshState=null;inferMax=900;inferSamples=[];$('percent').textContent='0%';$('phase').textContent='정면 보정';$('capTitle').textContent='정면을 바라봐 주세요';$('hint').textContent='얼굴을 가운데 맞추고 잠시 유지하세요';buildUI()}
function stopCamera(){cancelAnimationFrame(raf);raf=0;stream?.getTracks().forEach(t=>t.stop());stream=null;$('video').srcObject=null}
async function startCamera(){resetScan();show('camera');const modelP=loadTask();stream=await openCamera();$('video').srcObject=stream;await $('video').play();$('modelState').textContent='카메라 켜짐 · 고정밀 모델 준비 중';await modelP;$('modelState').textContent='고정밀 얼굴 측정 준비 완료';lastDetect=0;raf=requestAnimationFrame(loop)}
async function loop(t){
  raf=requestAnimationFrame(loop);if(!task||busy||$('video').readyState<2||t-lastDetect<88)return;busy=true;lastDetect=t;
  try{
    const v=$('video'),inf=$('infer'),k=Math.min(1,inferMax/Math.max(v.videoWidth,v.videoHeight));inf.width=Math.max(1,Math.round(v.videoWidth*k));inf.height=Math.max(1,Math.round(v.videoHeight*k));inf.getContext('2d').drawImage(v,0,0,inf.width,inf.height);
    const ts=performance.now(),r=task.detect(inf),elapsed=performance.now()-ts,raw=r.faceLandmarks?.[0];$('perf').textContent=Math.round(elapsed)+'ms';inferSamples.push(elapsed);if(inferSamples.length>=8){const avg=inferSamples.reduce((s,x)=>s+x,0)/inferSamples.length;if(avg>115&&inferMax>760)inferMax-=60;else if(avg<58&&inferMax<960)inferMax+=30;inferSamples=[]}
    if(!raw?.length){$('hint').textContent='얼굴을 화면 안에 맞춰 주세요';return}drawLive(raw);const base=canonical(raw),po=pose(raw);if(!base)return;const stable=stabilizeFrame(base),m=stable.mesh,fr={mesh:m,feat:feature(m),pose:po,stability:stable.stability};
    if(phaseName==='front'){
      const frontOK=Math.abs(po.yaw)<.06;if(frontOK){const dt=Math.min(140,t-lastLoop);hold+=dt;centerFrames.push(fr);if(centerFrames.length>24)centerFrames.shift();if(!bestFront||Math.abs(po.yaw)<Math.abs(bestFront.pose.yaw))bestFront=fr;$('percent').textContent=Math.min(20,Math.floor(hold/720*20))+'%';if(hold>=720&&centerFrames.length>=HQ_REQ.center){basePitch=med(centerFrames.map(x=>x.pose.pitch));phaseName='orbit';$('phase').textContent='고정밀 다각도 측정';$('capTitle').textContent='고개를 천천히 움직여 주세요';$('hint').textContent='원을 따라 좌·우·위·아래를 천천히 훑어주세요'}}else{hold=Math.max(0,hold-80);$('hint').textContent='정면을 바라봐 주세요'}
    }else if(phaseName==='orbit'){
      const dy=po.pitch-basePitch,x=clamp(-po.yaw/.16,-1.25,1.25),y=clamp(dy/.09,-1.25,1.25),rad=Math.hypot(x,y);currentBin=-1;if(rad>.36&&rad<1.36){const a=(Math.atan2(y,x)+Math.PI*2)%(Math.PI*2),bin=Math.round(a/(Math.PI*2)*N)%N,currentQuality=clamp(fr.stability,.58,1),bucket=bucketName(po.yaw,dy);currentBin=bin;bins[bin]++;binQuality[bin]+=currentQuality;orbitFrames.push({...fr,bucket,bin,quality:currentQuality});if(orbitFrames.length>280)orbitFrames.shift()}updateProgress()
    }
    lastLoop=t
  }catch(e){log('DETECT '+(e?.message||e));$('modelState').textContent='DETECT 오류'}finally{busy=false}
}
function makePayload(){
  const fused=fuseMultiView(),cm=fused.mesh;if(!cm)throw Error('다각도 mesh fusion에 실패했습니다.');const groups={center:centerFrames,right:orbitFrames.filter(f=>f.bucket==='right'),left:orbitFrames.filter(f=>f.bucket==='left'),up:orbitFrames.filter(f=>f.bucket==='up'),down:orbitFrames.filter(f=>f.bucket==='down')},views={};for(const k of KEYS)views[k]=medianVec(groups[k]);
  return{version:4,canonical:cm,features:feature(cm),views,shape:shapeSig(cm),coverage:binQuality.filter(n=>n>=1.55).length,fusion:{method:'weighted-pose-refine-huber-laplacian-v2',frames:fused.frames,quality:fused.quality,meanAnchorError:fused.error==null?null:+fused.error.toFixed(5),groups:fused.groups||null},capturedAt:new Date().toISOString()}
}
let finishing=false;async function finishScan(){
  if(finishing||phaseName==='done')return;finishing=true;phaseName='done';$('percent').textContent='100%';$('phase').textContent='정밀 합성 중';$('capTitle').textContent='다각도 메쉬 합성 중';
  try{captured=makePayload();stopCamera();drawWire($('myMesh'),captured.canonical,'#73c9ff');$('captureInfo').textContent=`478개 점 · ${captured.fusion?.frames||0}프레임 융합 · 측정 품질 ${captured.fusion?.quality||'-'}% · 범위 ${captured.coverage}/24 · 사진 저장 없음`;show('me');renderActions()}catch(e){fail(e);phaseName='orbit'}finally{finishing=false}
}