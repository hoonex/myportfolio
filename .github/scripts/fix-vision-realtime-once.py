from pathlib import Path

p=Path('site/journal-v11-vision.js')
s=p.read_text()
old="raf=0,last=-1,handTask=null"
new="raf=0,vfc=0,last=-1,lastFaceInfer=-1e9,lastHandInfer=-1e9,liveFrames=0,faceRuns=0,handRuns=0,handTask=null"
assert old in s
s=s.replace(old,new,1)

a=s.index('async function start(){')
b=s.index('function stopStream(){',a)
s=s[:a]+'''async function activateStream(s){stream=s;let v=E().video;if(!v)throw Error('Vision video surface missing');v.srcObject=stream;await v.play();state.running=true;state.frozen=false;freeze=null;last=-1;lastFaceInfer=-1e9;lastHandInfer=performance.now()-36;liveFrames=0;faceRuns=0;handRuns=0;frames=0;stamp=performance.now();status(t().live,'active');metric('backend','MediaPipe · stream');sync();cancelFrame();scheduleFrame()}
async function start(){if(!navigator.mediaDevices?.getUserMedia){status(t().fail,'error');return}try{await ensureModels();let s=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:60}}});await activateStream(s)}catch(e){console.error('[Vision] start failed',e);state.running=false;status(`${t().fail} ${e?.name||''}`.trim(),'error');sync()}}
function scheduleFrame(){let v=E().video;if(!state.running||route()!==R||!v)return;if(typeof v.requestVideoFrameCallback==='function')vfc=v.requestVideoFrameCallback(loop);else raf=requestAnimationFrame(loop)}
function cancelFrame(){let v=E().video;if(vfc&&v?.cancelVideoFrameCallback)try{v.cancelVideoFrameCallback(vfc)}catch{}if(raf)cancelAnimationFrame(raf);vfc=0;raf=0}
'''+s[b:]

a=s.index('function stopStream(){')
b=s.index('function cleanup(){',a)
s=s[:a]+'''function stopStream(){stream?.getTracks?.().forEach(x=>x.stop());stream=null}function stop(){state.running=false;state.frozen=false;freeze=null;cancelFrame();stopStream();let v=E().video;if(v)v.srcObject=null;status(t().off,'idle');metric('backend','idle');sync();hand=null;face=null;gesture=null;draw();clearEdge()}'''+s[b:]

a=s.index('async function loop(now){')
b=s.index('function dist(',a)
s=s[:a]+'''function loop(now,meta){vfc=0;raf=0;if(!state.running||route()!==R)return;let v=E().video,fresh=!!meta||(v?.readyState>=2&&v.currentTime!==last);if(fresh&&v?.readyState>=2){last=v.currentTime;liveFrames++;if(!state.frozen){let started=performance.now(),did=0;try{if(!state.hands)hand=null;if(!state.face)face=null;if(state.face&&faceTask&&now-lastFaceInfer>=42){face=faceTask.detectForVideo(v,now);lastFaceInfer=now;faceRuns++;did++}if(state.hands&&handTask&&now-lastHandInfer>=72){hand=handTask.recognizeForVideo(v,now);lastHandInfer=now;handRuns++;gestureStep(now,hand);did++}if(did){infer=performance.now()-started;freeze={hand,face}}}catch(e){console.warn('[Vision] live frame failed',e)}}else if(freeze){hand=freeze.hand;face=freeze.face;if(state.hands&&handTask&&now-lastHandInfer>=72){try{gestureStep(now,handTask.recognizeForVideo(v,now));lastHandInfer=now;handRuns++}catch(e){console.warn('[Vision] frozen gesture command failed',e)}}}draw();if(state.edge&&now%120<18)drawCV().catch(()=>{});frames++;if(now-stamp>700){fps=frames*1000/(now-stamp);frames=0;stamp=now}metrics()}scheduleFrame()}
'''+s[b:]

a=s.index('function wire(')
b=s.index('function proj(',a)
newblock='''function wire(ctx,links,P,col,width){if(!links?.length)return;ctx.strokeStyle=col;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();let n=0;for(let e of links){let i=e.start??e[0],j=e.end??e[1],A=P[i],B=P[j];if(!A||!B)continue;ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);n++}if(n)ctx.stroke()}
function faceMesh(ctx,a,w,h,sw,sh){let F=mp?.FaceLandmarker,M=F?.FACE_LANDMARKS_TESSELATION||[],P=a.map(v=>framePoint(v,sw,sh,w,h,facing==='user'));if(!M.length){ctx.fillStyle='rgba(181,255,230,.82)';for(let i=0;i<a.length;i+=4){ctx.beginPath();ctx.arc(P[i].x,P[i].y,Math.max(1,w/900),0,7);ctx.fill()}return 0}ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';if(mode!==2){let stride=mode===1?2:1;ctx.strokeStyle=mode===1?'rgba(91,215,168,.38)':'rgba(91,215,168,.52)';ctx.lineWidth=Math.max(.65,w/1150);ctx.beginPath();let n=0;for(let k=0;k<M.length;k+=stride){let e=M[k],i=e.start??e[0],j=e.end??e[1],A=P[i],B=P[j];if(!A||!B)continue;ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);n++}if(n)ctx.stroke()}wire(ctx,F.FACE_LANDMARKS_FACE_OVAL,P,'rgba(238,255,249,.9)',Math.max(1.15,w/650));wire(ctx,F.FACE_LANDMARKS_LIPS,P,'rgba(255,255,255,.82)',Math.max(.9,w/760));wire(ctx,F.FACE_LANDMARKS_LEFT_EYE,P,'rgba(124,160,255,.95)',Math.max(.9,w/760));wire(ctx,F.FACE_LANDMARKS_RIGHT_EYE,P,'rgba(124,160,255,.95)',Math.max(.9,w/760));for(let i=0;i<P.length;i+=18){let d=Math.max(1.2,w/720)*(1+Math.max(-.35,Math.min(.45,-(a[i]?.z||0)*4)));ctx.fillStyle='rgba(220,255,244,.78)';ctx.beginPath();ctx.arc(P[i].x,P[i].y,d,0,7);ctx.fill()}ctx.restore();return M.length}
function draw2(){let c=E().overlay;if(!c)return;let x=c.getContext('2d'),w=c.width,h=c.height,v=E().video,sw=v?.videoWidth||w,sh=v?.videoHeight||h;if(!state.trail)x.clearRect(0,0,w,h);else{x.fillStyle='rgba(7,9,13,.13)';x.fillRect(0,0,w,h)};(hand?.landmarks||[]).forEach((a,j)=>{let p=i=>framePoint(a[i],sw,sh,w,h,facing==='user');x.strokeStyle=j?'#ffa75b':'#7ca0ff';x.lineWidth=Math.max(1.5,w/700);if(mode!==2){x.beginPath();HC.forEach(([i,k])=>{let A=p(i),B=p(k);x.moveTo(A.x,A.y);x.lineTo(B.x,B.y)});x.stroke()}a.forEach((_,i)=>{let P=p(i);x.fillStyle=i===8?'#fff':'rgba(245,247,255,.94)';x.beginPath();x.arc(P.x,P.y,Math.max(2,w/320),0,7);x.fill()})});if(state.face)(face?.faceLandmarks||[]).forEach(a=>faceMesh(x,a,w,h,sw,sh))}
'''
s=s[:a]+newblock+s[b:]

old="state:()=>({...state,mode,zoom}),sources:{mediaPipe:V,opencv:'5.0.0'}"
new="startStreamForTest:async s=>{await ensureModels();await activateStream(s);return true},stopStreamForTest:()=>stop(),liveStats:()=>{let a=face?.faceLandmarks?.[0]||[],cx=a.length?a.reduce((n,p)=>n+p.x,0)/a.length:null;return{liveFrames,faceRuns,handRuns,facePoints:a.length,faceCenterX:cx,infer,fps}},state:()=>({...state,mode,zoom}),sources:{mediaPipe:V,opencv:'5.0.0'}"
assert old in s
s=s.replace(old,new,1)
p.write_text(s)

p=Path('.github/scripts/design-journal-vision-model-preflight.mjs')
s=p.read_text()
needle="await page.locator('.vision-camera-card-v11').screenshot({ path: '.artifacts/design-journal/vision-real-face-mesh.png' });\n\nconst resources ="
assert needle in s
insert="""await page.locator('.vision-camera-card-v11').screenshot({ path: '.artifacts/design-journal/vision-real-face-mesh.png' });

const streamStarted = await page.evaluate(async REAL_FACE_IMAGE => {
  const response = await fetch(REAL_FACE_IMAGE, { cache: 'no-store' });
  if (!response.ok) throw new Error(`stream portrait download failed: ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement('canvas'); canvas.width = 480; canvas.height = 640;
  const ctx = canvas.getContext('2d'); let phase = 0;
  const paint = () => { phase += .22; ctx.fillStyle = '#090c12'; ctx.fillRect(0,0,canvas.width,canvas.height); const scale = Math.max(canvas.width/bitmap.width, canvas.height/bitmap.height) * 1.12; const w=bitmap.width*scale,h=bitmap.height*scale; const dx=(canvas.width-w)/2 + Math.sin(phase)*22, dy=(canvas.height-h)/2; ctx.drawImage(bitmap,dx,dy,w,h); };
  paint(); const stream = canvas.captureStream(24); const timer = setInterval(paint, 1000/24);
  window.__visionRealtimeFixture = { bitmap, stream, timer };
  return await window.HJVisionLab.startStreamForTest(stream);
}, REAL_FACE_IMAGE);
expect(streamStarted, 'Vision production stream harness did not start');
await page.waitForFunction(() => { const s=window.HJVisionLab?.liveStats?.(); return s?.liveFrames >= 18 && s?.faceRuns >= 5 && s?.facePoints > 400; }, { timeout: 12000 });
const liveSamples = [];
for (let i=0;i<6;i++) { await page.waitForTimeout(180); liveSamples.push(await page.evaluate(() => window.HJVisionLab.liveStats())); }
const liveLast = liveSamples.at(-1);
const centers = liveSamples.map(s => s.faceCenterX).filter(Number.isFinite);
const centerTravel = centers.length ? Math.max(...centers) - Math.min(...centers) : 0;
expect(liveLast.liveFrames >= 24, `Realtime stream did not deliver enough decoded frames: ${JSON.stringify(liveSamples)}`);
expect(liveLast.faceRuns >= 8, `Realtime FaceLandmarker did not repeat across the stream: ${JSON.stringify(liveSamples)}`);
expect(liveLast.facePoints > 400, `Realtime stream lost the detected human face: ${JSON.stringify(liveSamples)}`);
expect(centerTravel > .008, `Realtime face landmarks did not move with the moving human stream: ${JSON.stringify({centerTravel,liveSamples})}`);
await page.locator('.vision-camera-card-v11').screenshot({ path: '.artifacts/design-journal/vision-realtime-stream.png' });
await page.evaluate(() => { const f=window.__visionRealtimeFixture; if(f){clearInterval(f.timer);f.stream?.getTracks?.().forEach(t=>t.stop());f.bitmap?.close?.();delete window.__visionRealtimeFixture} window.HJVisionLab?.stopStreamForTest?.(); });

const resources ="""
s=s.replace(needle,insert,1)
old="expect(productSource.includes('function framePoint('), 'Vision product overlay must include object-fit/mirror projection correction');"
new=old+"\nexpect(productSource.includes('requestVideoFrameCallback'), 'Vision realtime loop must follow decoded video frames when supported');\nexpect(productSource.includes('liveStats'), 'Vision realtime loop must expose CI telemetry');"
assert old in s
s=s.replace(old,new,1)
p.write_text(s)
