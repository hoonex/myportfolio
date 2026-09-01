(()=>{
'use strict';
const el=id=>document.getElementById(id);
const FALLBACK_WIRES=[
[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10],
[33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246,33],
[362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398,362],
[61,146,91,181,84,17,314,405,321,375,291,308,324,318,402,317,14,87,178,88,95,78,61],
[168,6,197,195,5,4,1,2,98],[168,6,197,195,5,4,1,2,327]
];
const OUTLINE=FALLBACK_WIRES[0];
function meshBounds(mesh){const pts=OUTLINE.map(i=>mesh?.[i]).filter(Boolean);if(!pts.length)return[-1,1,-1,1];const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);return[Math.min(...xs),Math.max(...xs),Math.min(...ys),Math.max(...ys)]}
function simpleWire(canvas,mesh,color='#73c9ff'){
 if(!canvas||!mesh?.length)return;
 const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1),w=Math.max(220,Math.round((r.width||300)*d)),h=Math.max(250,Math.round((r.height||r.width*1.08||330)*d));canvas.width=w;canvas.height=h;
 const q=canvas.getContext('2d'),[x0,x1,y0,y1]=meshBounds(mesh),fw=Math.max(.001,x1-x0),fh=Math.max(.001,y1-y0),s=Math.min(w*.76/fw,h*.78/fh),cx=(x0+x1)/2,cy=(y0+y1)/2,mp=p=>[w/2+(p[0]-cx)*s,h/2+(p[1]-cy)*s];
 const bg=q.createRadialGradient(w*.5,h*.42,8,w*.5,h*.5,w*.72);bg.addColorStop(0,'#172029');bg.addColorStop(1,'#07090c');q.fillStyle=bg;q.fillRect(0,0,w,h);
 q.strokeStyle='rgba(115,201,255,.16)';q.lineWidth=Math.max(.6,w/1050);
 const edges=(typeof vision!=='undefined'&&vision?.FaceLandmarker?.FACE_LANDMARKS_TESSELATION)||[];
 if(edges.length){q.beginPath();for(const e of edges){const a=mesh[e.start],b=mesh[e.end];if(!a||!b)continue;const A=mp(a),B=mp(b);q.moveTo(A[0],A[1]);q.lineTo(B[0],B[1])}q.stroke()}
 q.strokeStyle=color;q.lineWidth=Math.max(1.4,w/600);q.globalAlpha=.92;q.lineCap='round';
 for(const wire of FALLBACK_WIRES){q.beginPath();let first=true;for(const id of wire){const p=mesh[id];if(!p)continue;const P=mp(p);first?(q.moveTo(P[0],P[1]),first=false):q.lineTo(P[0],P[1])}q.stroke()}
 q.globalAlpha=1;
}
function mix(a,b,t){const x=t/100;return a.map((p,i)=>[p[0]*(1-x)+b[i][0]*x,p[1]*(1-x)+b[i][1]*x,p[2]*(1-x)+b[i][2]*x])}
function syntheticFallback(mesh){const c=el('synthetic');if(!c||!mesh?.length)return;const q=c.getContext('2d'),w=c.width,h=c.height,[x0,x1,y0,y1]=meshBounds(mesh),s=Math.min(w*.70/(x1-x0),h*.72/(y1-y0)),cx=(x0+x1)/2,cy=(y0+y1)/2,mp=i=>{const p=mesh[i];return[w/2+(p[0]-cx)*s,h/2+(p[1]-cy)*s]};q.clearRect(0,0,w,h);const g=q.createLinearGradient(0,0,0,h);g.addColorStop(0,'#eee9e2');g.addColorStop(1,'#d7d0c7');q.fillStyle=g;q.fillRect(0,0,w,h);q.fillStyle='#d9a991';q.strokeStyle='rgba(72,45,39,.25)';q.lineWidth=2;q.beginPath();OUTLINE.forEach((id,j)=>{const P=mp(id);j?q.lineTo(P[0],P[1]):q.moveTo(P[0],P[1])});q.closePath();q.fill();q.stroke();for(const ids of [[33,133],[362,263]]){const A=mp(ids[0]),B=mp(ids[1]);q.strokeStyle='#352e2b';q.lineWidth=7;q.lineCap='round';q.beginPath();q.moveTo(A[0],A[1]);q.lineTo(B[0],B[1]);q.stroke()}const n=mp(1),mL=mp(61),mR=mp(291);q.fillStyle='rgba(94,48,42,.34)';q.beginPath();q.arc(n[0],n[1],5,0,Math.PI*2);q.fill();q.strokeStyle='#985a60';q.lineWidth=6;q.beginPath();q.moveTo(mL[0],mL[1]);q.quadraticCurveTo((mL[0]+mR[0])/2,(mL[1]+mR[1])/2+5,mR[0],mR[1]);q.stroke()}
if(typeof window.drawWire!=='function'){window.drawWire=simpleWire;try{log('RENDER rescue · drawWire')}catch{}}
if(typeof window.renderResult!=='function')window.renderResult=function(j){
 const r=j.result,a=j.creator?.canonical,b=j.guest?.canonical;if(!r||!a||!b)throw Error('비교 결과 데이터가 부족합니다.');
 const names={faceShape:'얼굴형',eyes:'눈',nose:'코',mouth:'입',jaw:'턱',symmetry:'대칭'};el('score').textContent=Number(r.overall).toFixed(1);el('scoreLabel').textContent=r.label||'비교 완료';el('bars').innerHTML=Object.entries(r.parts||{}).map(([k,v])=>`<div class="barRow"><span>${names[k]||k}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v}</b></div>`).join('');show('result');simpleWire(el('meshA'),a,'#77bdf8');simpleWire(el('meshB'),b,'#f4a7ba');const range=el('mix');const update=()=>{const t=+range.value,m=t===50&&r.mergedMesh?r.mergedMesh:mix(a,b,t);el('mixA').textContent='A '+(100-t)+'%';el('mixB').textContent='B '+t+'%';simpleWire(el('meshM'),m,'#70dfa9');syntheticFallback(m)};range.oninput=update;range.value=50;update()
};
if(typeof window.renderActions!=='function')window.renderActions=async function(){
 const a=el('actions');if(!a)return;a.innerHTML='';
 if(typeof mode!=='undefined'&&mode==='guest'){
   const b=document.createElement('button');b.className='btn primary';b.textContent='메쉬 비교 전송 중…';b.disabled=true;a.appendChild(b);
   try{const j=await api({action:'join',id:sessionId,token:sessionToken,guest:captured},25000);window.renderResult(j)}catch(e){b.disabled=false;b.textContent='비교 다시 시도';b.onclick=()=>window.renderActions();fail(e)}return
 }
 const b=document.createElement('button');b.className='btn primary';b.textContent='친구와 얼굴 구조 비교하기';b.onclick=async()=>{try{const j=await api({action:'create',creator:captured},25000);sessionId=j.id;sessionToken=j.ownerToken;localStorage.setItem('fd_owner:'+j.id,j.ownerToken);history.replaceState(null,'','#owner='+j.id);const link=CANON+'?join='+encodeURIComponent(j.id+'.'+j.inviteToken);el('inviteLink').value=link;show('wait');clearInterval(pollTimer);const poll=async()=>{try{const x=await api({action:'get',id:sessionId,token:sessionToken});if(x.status==='complete'){clearInterval(pollTimer);window.renderResult(x)}}catch(e){try{log('POLL '+e.message)}catch{}}};poll();pollTimer=setInterval(poll,2500)}catch(e){fail(e)}};a.appendChild(b);
 const r=document.createElement('button');r.className='btn';r.textContent='다시 스캔';r.onclick=()=>startCamera().catch(fail);a.appendChild(r)
};
})();