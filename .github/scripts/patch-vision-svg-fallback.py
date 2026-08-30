from pathlib import Path

js_path = Path('site/journal-v11-vision.js')
css_path = Path('site/journal-v11-vision.css')
pre_path = Path('.github/scripts/design-journal-vision-model-preflight.mjs')

js = js_path.read_text()
css = css_path.read_text()
pre = pre_path.read_text()

old = "E=()=>({root:q('[data-vision-lab]'),video:q('[data-vision-video]'),overlay:q('[data-vision-overlay]'),three:q('[data-vision-3d]'),edge:q('[data-vision-edge]'),status:q('[data-vision-status]'),ptr:q('[data-vision-pointer]')})"
new = "E=()=>({root:q('[data-vision-lab]'),video:q('[data-vision-video]'),overlay:q('[data-vision-overlay]'),svg:q('[data-vision-svg]'),three:q('[data-vision-3d]'),edge:q('[data-vision-edge]'),status:q('[data-vision-status]'),ptr:q('[data-vision-pointer]')})"
assert old in js
js = js.replace(old, new, 1)

old = '<canvas data-vision-overlay aria-label="Detected face and hand landmarks"></canvas><canvas data-vision-edge aria-hidden="true"></canvas>'
new = '<canvas data-vision-overlay aria-label="Detected face and hand landmarks"></canvas><svg data-vision-svg class="vision-svg-mesh-v11" aria-hidden="true" preserveAspectRatio="none"><path data-svg-mesh></path><path data-svg-oval></path><path data-svg-eyes></path><path data-svg-lips></path></svg><canvas data-vision-edge aria-hidden="true"></canvas>'
assert old in js
js = js.replace(old, new, 1)

needle = "function wire(ctx,links,P,col,width){if(!links?.length)return;ctx.strokeStyle=col;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();let n=0;for(let e of links){let i=e.start??e[0],j=e.end??e[1],A=P[i],B=P[j];if(!A||!B)continue;ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);n++}if(n)ctx.stroke()}\n"
assert needle in js
addon = needle + "function svgWire(links,P,stride=1){if(!links?.length)return '';let d='',n=0;for(let k=0;k<links.length;k+=stride){let e=links[k],i=e.start??e[0],j=e.end??e[1],A=P[i],B=P[j];if(!A||!B)continue;d+=`M${A.x.toFixed(1)} ${A.y.toFixed(1)}L${B.x.toFixed(1)} ${B.y.toFixed(1)}`;n++}return n?d:''}\nfunction drawSvgFace(a,sw,sh){let s=E().svg;if(!s)return false;let paths=[...s.querySelectorAll('path')];if(!a?.length||!mp?.FaceLandmarker){paths.forEach(p=>p.setAttribute('d',''));s.removeAttribute('data-active');return false}let r=s.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height),F=mp.FaceLandmarker,P=a.map(v=>framePoint(v,sw,sh,w,h,facing==='user'));s.setAttribute('viewBox',`0 0 ${w} ${h}`);let mesh=svgWire(F.FACE_LANDMARKS_TESSELATION,P,1),oval=svgWire(F.FACE_LANDMARKS_FACE_OVAL,P),eyes=svgWire([...(F.FACE_LANDMARKS_LEFT_EYE||[]),...(F.FACE_LANDMARKS_RIGHT_EYE||[])],P),lips=svgWire(F.FACE_LANDMARKS_LIPS,P);s.querySelector('[data-svg-mesh]')?.setAttribute('d',mesh);s.querySelector('[data-svg-oval]')?.setAttribute('d',oval);s.querySelector('[data-svg-eyes]')?.setAttribute('d',eyes);s.querySelector('[data-svg-lips]')?.setAttribute('d',lips);s.toggleAttribute('data-active',!!mesh);return mesh.length>1000}\n"
js = js.replace(needle, addon, 1)

old = "function draw2(){let c=E().overlay;if(!c)return;let x=c.getContext('2d'),w=c.width,h=c.height,v=E().video,sw=v?.videoWidth||w,sh=v?.videoHeight||h;drawCameraFrame(x,v,w,h,facing==='user');(hand?.landmarks||[]).forEach((a,j)=>{let p=i=>framePoint(a[i],sw,sh,w,h,facing==='user');x.strokeStyle=j?'#ffa75b':'#7ca0ff';x.lineWidth=Math.max(1.8,w/620);if(mode!==2){x.beginPath();HC.forEach(([i,k])=>{let A=p(i),B=p(k);x.moveTo(A.x,A.y);x.lineTo(B.x,B.y)});x.stroke()}a.forEach((_,i)=>{let P=p(i);x.fillStyle=i===8?'#fff':'rgba(245,247,255,.96)';x.beginPath();x.arc(P.x,P.y,Math.max(2.2,w/300),0,7);x.fill()})});if(state.face)(face?.faceLandmarks||[]).forEach(a=>faceMesh(x,a,w,h,sw,sh))}"
new = "function draw2(){let c=E().overlay;if(!c)return;let x=c.getContext('2d'),w=c.width,h=c.height,v=E().video,sw=v?.videoWidth||w,sh=v?.videoHeight||h;drawCameraFrame(x,v,w,h,facing==='user');(hand?.landmarks||[]).forEach((a,j)=>{let p=i=>framePoint(a[i],sw,sh,w,h,facing==='user');x.strokeStyle=j?'#ffa75b':'#7ca0ff';x.lineWidth=Math.max(1.8,w/620);if(mode!==2){x.beginPath();HC.forEach(([i,k])=>{let A=p(i),B=p(k);x.moveTo(A.x,A.y);x.lineTo(B.x,B.y)});x.stroke()}a.forEach((_,i)=>{let P=p(i);x.fillStyle=i===8?'#fff':'rgba(245,247,255,.96)';x.beginPath();x.arc(P.x,P.y,Math.max(2.2,w/300),0,7);x.fill()})});let faces=state.face?(face?.faceLandmarks||[]):[];faces.forEach(a=>faceMesh(x,a,w,h,sw,sh));drawSvgFace(faces[0],sw,sh)}"
assert old in js
js = js.replace(old, new, 1)

old = "renderFaceMeshDiagnostic:(landmarks,sw,sh)=>{let c=E().overlay;if(!c||!Array.isArray(landmarks))return false;let x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);return faceMesh(x,landmarks,c.width,c.height,sw,sh)>0}"
new = "renderFaceMeshDiagnostic:(landmarks,sw,sh)=>{let c=E().overlay;if(!c||!Array.isArray(landmarks))return false;let x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);let canvasOk=faceMesh(x,landmarks,c.width,c.height,sw,sh)>0,svgOk=drawSvgFace(landmarks,sw,sh);return canvasOk&&svgOk}"
assert old in js
js = js.replace(old, new, 1)
js = js.replace("cameraSurface:'canvas-composite'", "cameraSurface:'canvas-composite+svg-fallback'", 1)

css_old = ".vision-stage-v11 video,.vision-stage-v11 [data-vision-overlay],.vision-stage-v11 [data-vision-edge]{position:absolute;inset:0;width:100%;height:100%}"
css_new = ".vision-stage-v11 video,.vision-stage-v11 [data-vision-overlay],.vision-stage-v11 [data-vision-svg],.vision-stage-v11 [data-vision-edge]{position:absolute;inset:0;width:100%;height:100%}"
assert css_old in css
css = css.replace(css_old, css_new, 1)
needle_css = ".is-mirrored .vision-stage-v11 video{transform:scaleX(-1)}.vision-stage-v11 [data-vision-overlay]{z-index:3;pointer-events:none;background:#07090d}\n"
assert needle_css in css
addon_css = needle_css + ".vision-stage-v11 [data-vision-svg]{z-index:5;pointer-events:none;overflow:visible;filter:drop-shadow(0 0 2px rgba(36,255,174,.5))}.vision-svg-mesh-v11 path{fill:none;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}.vision-svg-mesh-v11 [data-svg-mesh]{stroke:#20ff9f;stroke-width:1.45;opacity:.95}.vision-svg-mesh-v11 [data-svg-oval]{stroke:#effff8;stroke-width:2.7;opacity:1}.vision-svg-mesh-v11 [data-svg-eyes]{stroke:#5aa7ff;stroke-width:2.35;opacity:1}.vision-svg-mesh-v11 [data-svg-lips]{stroke:#fff;stroke-width:2.1;opacity:1}\n"
css = css.replace(needle_css, addon_css, 1)
css = css.replace(".vision-stage-v11::after{content:\"\";position:absolute;inset:0;z-index:5;", ".vision-stage-v11::after{content:\"\";position:absolute;inset:0;z-index:6;", 1)
css = css.replace(".vision-stage-watermark-v11{position:absolute;z-index:6;", ".vision-stage-watermark-v11{position:absolute;z-index:8;", 1)
css = css.replace(".vision-face-state-v11{position:absolute;z-index:7;", ".vision-face-state-v11{position:absolute;z-index:9;", 1)
css = css.replace(".vision-pointer-v11{position:absolute;z-index:7;", ".vision-pointer-v11{position:absolute;z-index:9;", 1)

pre_old = "const surfaceContract = await page.evaluate(() => { const v=document.querySelector('[data-vision-video]'),c=document.querySelector('[data-vision-overlay]'); const vs=getComputedStyle(v),cs=getComputedStyle(c); const px=c?.getContext('2d')?.getImageData(Math.max(0,Math.floor(c.width/2)),Math.max(0,Math.floor(c.height/2)),1,1)?.data; return { videoOpacity:Number(vs.opacity), overlayZ:Number(cs.zIndex), centerAlpha:px?.[3]??0, cameraSurface:window.HJVisionLab?.sources?.cameraSurface||'' }; });\nexpect(surfaceContract.videoOpacity === 0, `Visible camera must come from the composited canvas, not a separate video GPU layer: ${JSON.stringify(surfaceContract)}`);\nexpect(surfaceContract.overlayZ >= 3 && surfaceContract.centerAlpha > 240 && surfaceContract.cameraSurface === 'canvas-composite', `Composited camera/mesh surface is not opaque and active: ${JSON.stringify(surfaceContract)}`);"
pre_new = "const surfaceContract = await page.evaluate(() => { const v=document.querySelector('[data-vision-video]'),c=document.querySelector('[data-vision-overlay]'),s=document.querySelector('[data-vision-svg]'),mesh=s?.querySelector('[data-svg-mesh]'); const vs=getComputedStyle(v),cs=getComputedStyle(c),ss=s?getComputedStyle(s):null; const px=c?.getContext('2d')?.getImageData(Math.max(0,Math.floor(c.width/2)),Math.max(0,Math.floor(c.height/2)),1,1)?.data; return { videoOpacity:Number(vs.opacity), overlayZ:Number(cs.zIndex), svgZ:Number(ss?.zIndex||0), centerAlpha:px?.[3]??0, svgActive:s?.hasAttribute('data-active')||false, svgMeshLength:mesh?.getAttribute('d')?.length||0, svgStroke:mesh?getComputedStyle(mesh).stroke:'', cameraSurface:window.HJVisionLab?.sources?.cameraSurface||'' }; });\nexpect(surfaceContract.videoOpacity === 0, `Visible camera must come from the composited canvas, not a separate video GPU layer: ${JSON.stringify(surfaceContract)}`);\nexpect(surfaceContract.overlayZ >= 3 && surfaceContract.centerAlpha > 240 && surfaceContract.cameraSurface === 'canvas-composite+svg-fallback', `Composited camera/mesh surface is not opaque and active: ${JSON.stringify(surfaceContract)}`);\nexpect(surfaceContract.svgActive && surfaceContract.svgZ > surfaceContract.overlayZ && surfaceContract.svgMeshLength > 1000 && surfaceContract.svgStroke !== 'none', `Android SVG face-mesh fallback is not visibly active: ${JSON.stringify(surfaceContract)}`);"
assert pre_old in pre
pre = pre.replace(pre_old, pre_new, 1)
pre = pre.replace("expect(productSource.includes('function drawCameraFrame('), 'Vision camera and mesh must share one composited canvas surface');", "expect(productSource.includes('function drawCameraFrame('), 'Vision camera and mesh must share one composited canvas surface');\nexpect(productSource.includes('function drawSvgFace('), 'Vision must include an SVG mesh fallback for Android compositor variance');", 1)

js_path.write_text(js)
css_path.write_text(css)
pre_path.write_text(pre)
print('patched Vision with dual canvas + SVG live face mesh')
