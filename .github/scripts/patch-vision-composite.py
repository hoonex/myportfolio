from pathlib import Path

js=Path('site/journal-v11-vision.js')
s=js.read_text()

old="function resize(){[E().overlay,E().three,E().edge].forEach(c=>{if(!c)return;let r=c.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1),w=Math.max(2,Math.round(r.width*d)),h=Math.max(2,Math.round(r.height*d));if(c.width!==w||c.height!==h){c.width=w;c.height=h}});draw()}"
new="function resize(){let overlay=E().overlay;[overlay,E().three,E().edge].forEach(c=>{if(!c)return;let r=c.getBoundingClientRect(),d=Math.min(c===overlay?1.25:2,devicePixelRatio||1),w=Math.max(2,Math.round(r.width*d)),h=Math.max(2,Math.round(r.height*d));if(c.width!==w||c.height!==h){c.width=w;c.height=h}});draw()}"
assert old in s
s=s.replace(old,new,1)

needle="function wire(ctx,links,P,col,width){"
assert needle in s
camera="""function drawCameraFrame(ctx,v,w,h,mirror){ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle='#07090d';ctx.fillRect(0,0,w,h);let sw=v?.videoWidth||0,sh=v?.videoHeight||0;if(sw&&sh&&v.readyState>=2){let z=Math.max(w/sw,h/sh),rw=sw*z,rh=sh*z,dx=(w-rw)/2,dy=(h-rh)/2;if(mirror){ctx.translate(w,0);ctx.scale(-1,1)}ctx.drawImage(v,dx,dy,rw,rh)}ctx.restore()}
"""
s=s.replace(needle,camera+needle,1)

old="ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';if(mode!==2){let stride=mode===1?2:1;ctx.strokeStyle=mode===1?'rgba(91,215,168,.38)':'rgba(91,215,168,.52)';ctx.lineWidth=Math.max(.65,w/1150);"
new="ctx.save();ctx.globalCompositeOperation='source-over';ctx.lineCap='round';ctx.lineJoin='round';if(mode!==2){let stride=mode===1?2:1;ctx.strokeStyle=mode===1?'rgba(72,255,185,.62)':'rgba(72,255,185,.86)';ctx.lineWidth=Math.max(1.25,w/820);"
assert old in s
s=s.replace(old,new,1)

s=s.replace("wire(ctx,F.FACE_LANDMARKS_FACE_OVAL,P,'rgba(238,255,249,.9)',Math.max(1.15,w/650));","wire(ctx,F.FACE_LANDMARKS_FACE_OVAL,P,'rgba(220,255,242,.98)',Math.max(1.8,w/520));",1)
s=s.replace("wire(ctx,F.FACE_LANDMARKS_LIPS,P,'rgba(255,255,255,.82)',Math.max(.9,w/760));","wire(ctx,F.FACE_LANDMARKS_LIPS,P,'rgba(255,255,255,.95)',Math.max(1.35,w/680));",1)
s=s.replace("wire(ctx,F.FACE_LANDMARKS_LEFT_EYE,P,'rgba(124,160,255,.95)',Math.max(.9,w/760));","wire(ctx,F.FACE_LANDMARKS_LEFT_EYE,P,'rgba(128,178,255,.98)',Math.max(1.4,w/680));",1)
s=s.replace("wire(ctx,F.FACE_LANDMARKS_RIGHT_EYE,P,'rgba(124,160,255,.95)',Math.max(.9,w/760));","wire(ctx,F.FACE_LANDMARKS_RIGHT_EYE,P,'rgba(128,178,255,.98)',Math.max(1.4,w/680));",1)

start=s.index('function draw2(){')
end=s.index('function proj(',start)
old=s[start:end]
new="""function draw2(){let c=E().overlay;if(!c)return;let x=c.getContext('2d'),w=c.width,h=c.height,v=E().video,sw=v?.videoWidth||w,sh=v?.videoHeight||h;drawCameraFrame(x,v,w,h,facing==='user');(hand?.landmarks||[]).forEach((a,j)=>{let p=i=>framePoint(a[i],sw,sh,w,h,facing==='user');x.strokeStyle=j?'#ffa75b':'#7ca0ff';x.lineWidth=Math.max(1.8,w/620);if(mode!==2){x.beginPath();HC.forEach(([i,k])=>{let A=p(i),B=p(k);x.moveTo(A.x,A.y);x.lineTo(B.x,B.y)});x.stroke()}a.forEach((_,i)=>{let P=p(i);x.fillStyle=i===8?'#fff':'rgba(245,247,255,.96)';x.beginPath();x.arc(P.x,P.y,Math.max(2.2,w/300),0,7);x.fill()})});if(state.face)(face?.faceLandmarks||[]).forEach(a=>faceMesh(x,a,w,h,sw,sh))}
"""
s=s[:start]+new+s[end:]

old="sources:{mediaPipe:V,opencv:'5.0.0'}"
new="sources:{mediaPipe:V,opencv:'5.0.0',cameraSurface:'canvas-composite'}"
assert old in s
s=s.replace(old,new,1)
js.write_text(s)

css=Path('site/journal-v11-vision.css')
c=css.read_text()
old=".vision-stage-v11 video{object-fit:cover;transform:none;background:radial-gradient(circle at 50% 45%,#171c28,#06080c 68%)}"
new=".vision-stage-v11 video{object-fit:cover;transform:none;opacity:0;pointer-events:none;background:radial-gradient(circle at 50% 45%,#171c28,#06080c 68%)}"
assert old in c
c=c.replace(old,new,1)
old=".is-mirrored .vision-stage-v11 video{transform:scaleX(-1)}.vision-stage-v11 [data-vision-overlay]{z-index:3;pointer-events:none}"
new=".is-mirrored .vision-stage-v11 video{transform:scaleX(-1)}.vision-stage-v11 [data-vision-overlay]{z-index:3;pointer-events:none;background:#07090d}"
assert old in c
c=c.replace(old,new,1)
c=c.replace(".vision-stage-v11 [data-vision-edge]{z-index:2;", ".vision-stage-v11 [data-vision-edge]{z-index:4;",1)
c=c.replace(".vision-stage-v11::after{content:\"\";position:absolute;inset:0;z-index:4;", ".vision-stage-v11::after{content:\"\";position:absolute;inset:0;z-index:5;",1)
c=c.replace(".vision-stage-watermark-v11{position:absolute;z-index:5;", ".vision-stage-watermark-v11{position:absolute;z-index:6;",1)
c=c.replace(".vision-face-state-v11{position:absolute;z-index:6;", ".vision-face-state-v11{position:absolute;z-index:7;",1)
c=c.replace(".vision-pointer-v11{position:absolute;z-index:6;", ".vision-pointer-v11{position:absolute;z-index:7;",1)
css.write_text(c)

pre=Path('.github/scripts/design-journal-vision-model-preflight.mjs')
p=pre.read_text()
old="expect(productSource.includes('liveStats'), 'Vision realtime loop must expose CI telemetry');"
new=old+"\nexpect(productSource.includes('function drawCameraFrame('), 'Vision camera and mesh must share one composited canvas surface');"
assert old in p
p=p.replace(old,new,1)
needle="const liveLast = liveSamples.at(-1);"
insert="""const surfaceContract = await page.evaluate(() => { const v=document.querySelector('[data-vision-video]'),c=document.querySelector('[data-vision-overlay]'); const vs=getComputedStyle(v),cs=getComputedStyle(c); const px=c?.getContext('2d')?.getImageData(Math.max(0,Math.floor(c.width/2)),Math.max(0,Math.floor(c.height/2)),1,1)?.data; return { videoOpacity:Number(vs.opacity), overlayZ:Number(cs.zIndex), centerAlpha:px?.[3]??0, cameraSurface:window.HJVisionLab?.sources?.cameraSurface||'' }; });
expect(surfaceContract.videoOpacity === 0, `Visible camera must come from the composited canvas, not a separate video GPU layer: ${JSON.stringify(surfaceContract)}`);
expect(surfaceContract.overlayZ >= 3 && surfaceContract.centerAlpha > 240 && surfaceContract.cameraSurface === 'canvas-composite', `Composited camera/mesh surface is not opaque and active: ${JSON.stringify(surfaceContract)}`);
const liveLast = liveSamples.at(-1);"""
assert needle in p
p=p.replace(needle,insert,1)
pre.write_text(p)
