from pathlib import Path
import re

BUILD='F4-20260830-2024'

def repl(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing {label}')
    return text.replace(old, new, 1)

def sub(text, pattern, new, label):
    out,n=re.subn(pattern,new,text,count=1,flags=re.S)
    if n!=1:
        raise SystemExit(f'missing {label}: {n}')
    return out

js_path=Path('site/journal-v11-vision.js')
js=js_path.read_text()
js=repl(js,"BUILD='F3-20260830-2000'",f"BUILD='{BUILD}'",'js build')
js=repl(js,'<span>LIVE · F3</span><b>MediaPipe / normalized SVG</b>','<span>LIVE · F4</span><b>MediaPipe / single canvas</b>','watermark')
js=repl(js,"ctx.strokeStyle=mode===1?'rgba(72,255,185,.62)':'rgba(72,255,185,.86)';ctx.lineWidth=Math.max(1.25,w/820);","ctx.strokeStyle=mode===1?'rgba(55,255,176,.72)':'rgba(32,255,154,.98)';ctx.lineWidth=Math.max(2.15,w/520);",'mesh stroke')
new_draw2="""function drawCanvasProof(ctx,w,h,active){ctx.save();ctx.globalCompositeOperation='source-over';ctx.font=`700 ${Math.max(13,Math.round(w/55))}px ui-monospace,SFMono-Regular,Menlo,monospace`;let label=`F4 · CANVAS${active?' · MESH':''}`,pad=Math.max(8,w/110),tw=ctx.measureText(label).width,bh=Math.max(30,h/24),x=w-tw-pad*2-Math.max(10,w/70),y=Math.max(12,h/55);ctx.fillStyle='rgba(5,18,14,.78)';ctx.fillRect(x,y,tw+pad*2,bh);ctx.strokeStyle='rgba(70,255,180,.9)';ctx.lineWidth=Math.max(1,w/900);ctx.strokeRect(x+.5,y+.5,tw+pad*2-1,bh-1);ctx.fillStyle='#8dffd1';ctx.textBaseline='middle';ctx.fillText(label,x+pad,y+bh/2);ctx.restore()}
function draw2(){let c=E().overlay;if(!c)return;let x=c.getContext('2d'),w=c.width,h=c.height,v=E().video,sw=v?.videoWidth||w,sh=v?.videoHeight||h;drawCameraFrame(x,v,w,h,facing==='user');(hand?.landmarks||[]).forEach((a,j)=>{let p=i=>framePoint(a[i],sw,sh,w,h,facing==='user');x.strokeStyle=j?'#ffa75b':'#7ca0ff';x.lineWidth=Math.max(1.8,w/620);if(mode!==2){x.beginPath();HC.forEach(([i,k])=>{let A=p(i),B=p(k);x.moveTo(A.x,A.y);x.lineTo(B.x,B.y)});x.stroke()}a.forEach((_,i)=>{let P=p(i);x.fillStyle=i===8?'#fff':'rgba(245,247,255,.96)';x.beginPath();x.arc(P.x,P.y,Math.max(2.2,w/300),0,7);x.fill()})});let faces=state.face?(face?.faceLandmarks||[]):[];faces.forEach(a=>faceMesh(x,a,w,h,sw,sh));drawSvgFace(null,sw,sh);drawCanvasProof(x,w,h,!!faces.length)}
function proj"""
js=sub(js,r"function draw2\(\)\{.*?\}\nfunction proj",new_draw2,'draw2 composite')
js=repl(js,"renderFaceMeshDiagnostic:(landmarks,sw,sh)=>{let c=E().overlay;if(!c||!Array.isArray(landmarks))return false;let x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);let canvasOk=faceMesh(x,landmarks,c.width,c.height,sw,sh)>0,svgOk=drawSvgFace(landmarks,sw,sh);return canvasOk&&svgOk}","renderFaceMeshDiagnostic:(landmarks,sw,sh)=>{let c=E().overlay;if(!c||!Array.isArray(landmarks))return false;let x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);return faceMesh(x,landmarks,c.width,c.height,sw,sh)>0}",'diagnostic renderer')
js=repl(js,"cameraSurface:'direct-video+normalized-svg'","cameraSurface:'single-canvas-composite'",'surface telemetry')
js_path.write_text(js)

css_path=Path('site/journal-v11-vision.css')
css=css_path.read_text()
css=repl(css,'.vision-stage-v11 video{z-index:1;display:block;object-fit:cover;transform:none;opacity:1;pointer-events:none;background:radial-gradient(circle at 50% 45%,#171c28,#06080c 68%)}','.vision-stage-v11 video{z-index:0;display:block;object-fit:cover;transform:none;opacity:0;pointer-events:none;background:radial-gradient(circle at 50% 45%,#171c28,#06080c 68%)}','hide native video')
css=repl(css,".is-mirrored .vision-stage-v11 video{transform:scaleX(-1)}.vision-stage-v11 [data-vision-overlay]{z-index:3;pointer-events:none;background:transparent}",".is-mirrored .vision-stage-v11 video{transform:scaleX(-1)}.vision-stage-v11 [data-vision-overlay]{z-index:3;display:block;pointer-events:none;background:#07090d;transform:translateZ(0);backface-visibility:hidden}",'canvas surface')
css=sub(css,r"\.vision-stage-v11 \[data-vision-svg\]\{.*?\}\.vision-svg-mesh-v11 path",'.vision-stage-v11 [data-vision-svg]{display:none!important}.vision-svg-mesh-v11 path','disable svg surface')
css_path.write_text(css)

loader_path=Path('site/journal-route-loader.js')
loader=loader_path.read_text()
loader=repl(loader,"const VISION_REV = 'F3-20260830-2000';",f"const VISION_REV = '{BUILD}';",'loader rev')
loader_path.write_text(loader)

index_path=Path('site/index.html')
index=index_path.read_text()
index=repl(index,'./journal-route-loader.js?v=F3-20260830-2000',f'./journal-route-loader.js?v={BUILD}','index loader rev')
index_path.write_text(index)

pre_path=Path('.github/scripts/design-journal-vision-model-preflight.mjs')
pre=pre_path.read_text()
pre=repl(pre,"expect(productSource.includes('preserveAspectRatio=\"xMidYMid slice\"'), 'Vision SVG must use source-space cover projection');\nexpect(productSource.includes('data-svg-root'), 'Vision SVG must expose a source-space mirror root');\nexpect(productSource.includes('function drawSvgFace('), 'Vision must include an SVG mesh fallback for Android compositor variance');","expect(productSource.includes('function drawCameraFrame('), 'Vision must composite camera pixels into the visible canvas');\nexpect(productSource.includes(\"cameraSurface:'single-canvas-composite'\"), 'Vision must expose the single-canvas Android compositor contract');\nexpect(productSource.includes('F4 · CANVAS'), 'Vision visible canvas must carry an in-pixel F4 proof marker');",'preflight source contract')
pre=sub(pre,r"const surfaceContract = await page\.evaluate\(\(\) => \{.*?expect\(surfaceContract\.preserve === 'xMidYMid slice'.*?\);","""const surfaceContract = await page.evaluate(() => { const v=document.querySelector('[data-vision-video]'),c=document.querySelector('[data-vision-overlay]'),s=document.querySelector('[data-vision-svg]'); const vs=getComputedStyle(v),cs=getComputedStyle(c),ss=s?getComputedStyle(s):null; const px=c?.getContext('2d')?.getImageData(Math.max(0,Math.floor(c.width/2)),Math.max(0,Math.floor(c.height/2)),1,1)?.data; return { videoOpacity:Number(vs.opacity), canvasZ:Number(cs.zIndex), centerAlpha:px?.[3]??0, svgDisplay:ss?.display||'', cameraSurface:window.HJVisionLab?.sources?.cameraSurface||'' }; });
expect(surfaceContract.videoOpacity === 0 && surfaceContract.cameraSurface === 'single-canvas-composite', `Native Android video layer was not removed from the visible presentation path: ${JSON.stringify(surfaceContract)}`);
expect(surfaceContract.canvasZ >= 3 && surfaceContract.centerAlpha > 240, `Single composited camera+mesh canvas is not visibly opaque: ${JSON.stringify(surfaceContract)}`);
expect(surfaceContract.svgDisplay === 'none', `Legacy SVG overlay must stay out of the F4 presentation path: ${JSON.stringify(surfaceContract)}`);""",'surface contract')
pre_path.write_text(pre)
print('patched Vision F4 single-canvas compositor')
