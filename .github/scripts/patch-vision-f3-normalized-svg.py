from pathlib import Path
import re

BUILD = 'F3-20260830-2000'


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'missing pattern: {label}')
    return text.replace(old, new, 1)

js_path = Path('site/journal-v11-vision.js')
js = js_path.read_text()
js = replace_once(js, "const R='/lab/vision',V='1.0.1',MOD=", f"const R='/lab/vision',V='1.0.1',BUILD='{BUILD}',MOD=", 'build constant')
js = replace_once(
    js,
    '<svg data-vision-svg class="vision-svg-mesh-v11" aria-hidden="true" preserveAspectRatio="none"><path data-svg-mesh></path><path data-svg-oval></path><path data-svg-eyes></path><path data-svg-lips></path></svg>',
    '<svg data-vision-svg class="vision-svg-mesh-v11" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><g data-svg-root><path data-svg-mesh></path><path data-svg-oval></path><path data-svg-eyes></path><path data-svg-lips></path></g></svg>',
    'svg markup')
js = replace_once(js, '<span>LIVE</span><b>MediaPipe / aligned mesh overlay</b>', '<span>LIVE · F3</span><b>MediaPipe / normalized SVG</b>', 'visible build marker')

pattern = re.compile(r"function drawSvgFace\(a,sw,sh\)\{.*?\}\nfunction faceMesh", re.S)
match = pattern.search(js)
if not match:
    raise SystemExit('missing drawSvgFace function')
new_draw_svg = """function drawSvgFace(a,sw,sh){let s=E().svg;if(!s)return false;let paths=[...s.querySelectorAll('path')],g=s.querySelector('[data-svg-root]');if(!a?.length||!mp?.FaceLandmarker){paths.forEach(p=>p.setAttribute('d',''));s.removeAttribute('data-active');return false}let w=Math.max(1,sw||1),h=Math.max(1,sh||1),F=mp.FaceLandmarker,P=a.map(v=>({x:v.x*w,y:v.y*h}));s.setAttribute('viewBox',`0 0 ${w} ${h}`);if(g)g.setAttribute('transform',facing==='user'?`translate(${w} 0) scale(-1 1)`:'');let mesh=svgWire(F.FACE_LANDMARKS_TESSELATION,P,1),oval=svgWire(F.FACE_LANDMARKS_FACE_OVAL,P),eyes=svgWire([...(F.FACE_LANDMARKS_LEFT_EYE||[]),...(F.FACE_LANDMARKS_RIGHT_EYE||[])],P),lips=svgWire(F.FACE_LANDMARKS_LIPS,P);s.querySelector('[data-svg-mesh]')?.setAttribute('d',mesh);s.querySelector('[data-svg-oval]')?.setAttribute('d',oval);s.querySelector('[data-svg-eyes]')?.setAttribute('d',eyes);s.querySelector('[data-svg-lips]')?.setAttribute('d',lips);s.toggleAttribute('data-active',!!mesh);return mesh.length>1000}
function faceMesh"""
js = js[:match.start()] + new_draw_svg + js[match.end():]
js = replace_once(js, "drawCameraFrame(x,v,w,h,facing==='user');", "x.clearRect(0,0,w,h);", 'direct video draw2')
js = replace_once(js, "cameraSurface:'canvas-composite+svg-fallback'", "cameraSurface:'direct-video+normalized-svg'", 'camera surface telemetry')
js_path.write_text(js)

css_path = Path('site/journal-v11-vision.css')
css = css_path.read_text()
css = replace_once(css, ".vision-stage-v11 video{object-fit:cover;transform:none;opacity:0;pointer-events:none;background:radial-gradient(circle at 50% 45%,#171c28,#06080c 68%)}", ".vision-stage-v11 video{z-index:1;display:block;object-fit:cover;transform:none;opacity:1;pointer-events:none;background:radial-gradient(circle at 50% 45%,#171c28,#06080c 68%)}", 'visible direct video')
css = replace_once(css, ".is-mirrored .vision-stage-v11 video{transform:scaleX(-1)}.vision-stage-v11 [data-vision-overlay]{z-index:3;pointer-events:none;background:#07090d}", ".is-mirrored .vision-stage-v11 video{transform:scaleX(-1)}.vision-stage-v11 [data-vision-overlay]{z-index:3;pointer-events:none;background:transparent}", 'transparent canvas overlay')
css = replace_once(css, ".vision-stage-v11 [data-vision-svg]{z-index:5;pointer-events:none;overflow:visible;filter:drop-shadow(0 0 2px rgba(36,255,174,.5))}", ".vision-stage-v11 [data-vision-svg]{z-index:5;display:block;pointer-events:none;overflow:hidden;opacity:1;mix-blend-mode:normal;filter:drop-shadow(0 0 3px rgba(36,255,174,.65));shape-rendering:geometricPrecision}", 'svg display layer')
css = replace_once(css, ".vision-svg-mesh-v11 [data-svg-mesh]{stroke:#20ff9f;stroke-width:1.45;opacity:.95}.vision-svg-mesh-v11 [data-svg-oval]{stroke:#effff8;stroke-width:2.7;opacity:1}.vision-svg-mesh-v11 [data-svg-eyes]{stroke:#5aa7ff;stroke-width:2.35;opacity:1}.vision-svg-mesh-v11 [data-svg-lips]{stroke:#fff;stroke-width:2.1;opacity:1}", ".vision-svg-mesh-v11 [data-svg-mesh]{stroke:#16ff98;stroke-width:2.15;opacity:1}.vision-svg-mesh-v11 [data-svg-oval]{stroke:#f2fff9;stroke-width:3.2;opacity:1}.vision-svg-mesh-v11 [data-svg-eyes]{stroke:#63afff;stroke-width:2.8;opacity:1}.vision-svg-mesh-v11 [data-svg-lips]{stroke:#fff;stroke-width:2.6;opacity:1}", 'strong svg strokes')
css_path.write_text(css)

loader_path = Path('site/journal-route-loader.js')
loader = loader_path.read_text()
loader = replace_once(loader, "  const route = () => (location.hash.slice(1) || '/').split('?')[0];\n  const assetUrl = rel => new URL(`./${rel}`, document.baseURI).href;", f"  const route = () => (location.hash.slice(1) || '/').split('?')[0];\n  const VISION_REV = '{BUILD}';\n  const assetUrl = rel => {{\n    const url = new URL(`./${{rel}}`, document.baseURI);\n    if (/^journal-v1[12]-vision/.test(rel)) url.searchParams.set('v', VISION_REV);\n    return url.href;\n  }};", 'vision cache bust')
loader_path.write_text(loader)

pre_path = Path('.github/scripts/design-journal-vision-model-preflight.mjs')
pre = pre_path.read_text()
pre = replace_once(pre, "const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });", "const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (Linux; Android 16; SM-S931N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36' });", 'android UA')
pre = replace_once(pre, "expect(productSource.includes('function drawCameraFrame('), 'Vision camera and mesh must share one composited canvas surface');", "expect(productSource.includes('preserveAspectRatio=\"xMidYMid slice\"'), 'Vision SVG must use source-space cover projection');\nexpect(productSource.includes('data-svg-root'), 'Vision SVG must expose a source-space mirror root');", 'normalized svg source assertions')
old_surface = "const surfaceContract = await page.evaluate(() => { const v=document.querySelector('[data-vision-video]'),c=document.querySelector('[data-vision-overlay]'),s=document.querySelector('[data-vision-svg]'),mesh=s?.querySelector('[data-svg-mesh]'); const vs=getComputedStyle(v),cs=getComputedStyle(c),ss=s?getComputedStyle(s):null; const px=c?.getContext('2d')?.getImageData(Math.max(0,Math.floor(c.width/2)),Math.max(0,Math.floor(c.height/2)),1,1)?.data; return { videoOpacity:Number(vs.opacity), overlayZ:Number(cs.zIndex), svgZ:Number(ss?.zIndex||0), centerAlpha:px?.[3]??0, svgActive:s?.hasAttribute('data-active')||false, svgMeshLength:mesh?.getAttribute('d')?.length||0, svgStroke:mesh?getComputedStyle(mesh).stroke:'', cameraSurface:window.HJVisionLab?.sources?.cameraSurface||'' }; });\nexpect(surfaceContract.videoOpacity === 0, `Visible camera must come from the composited canvas, not a separate video GPU layer: ${JSON.stringify(surfaceContract)}`);\nexpect(surfaceContract.overlayZ >= 3 && surfaceContract.centerAlpha > 240 && surfaceContract.cameraSurface === 'canvas-composite+svg-fallback', `Composited camera/mesh surface is not opaque and active: ${JSON.stringify(surfaceContract)}`);\nexpect(surfaceContract.svgActive && surfaceContract.svgZ > surfaceContract.overlayZ && surfaceContract.svgMeshLength > 1000 && surfaceContract.svgStroke !== 'none', `Android SVG face-mesh fallback is not visibly active: ${JSON.stringify(surfaceContract)}`);"
new_surface = "const surfaceContract = await page.evaluate(() => { const v=document.querySelector('[data-vision-video]'),c=document.querySelector('[data-vision-overlay]'),s=document.querySelector('[data-vision-svg]'),mesh=s?.querySelector('[data-svg-mesh]'),root=s?.querySelector('[data-svg-root]'); const vs=getComputedStyle(v),cs=getComputedStyle(c),ss=s?getComputedStyle(s):null; return { videoOpacity:Number(vs.opacity), overlayZ:Number(cs.zIndex), svgZ:Number(ss?.zIndex||0), svgActive:s?.hasAttribute('data-active')||false, svgMeshLength:mesh?.getAttribute('d')?.length||0, svgStroke:mesh?getComputedStyle(mesh).stroke:'', viewBox:s?.getAttribute('viewBox')||'', preserve:s?.getAttribute('preserveAspectRatio')||'', rootTransform:root?.getAttribute('transform')||'', cameraSurface:window.HJVisionLab?.sources?.cameraSurface||'' }; });\nexpect(surfaceContract.videoOpacity === 1 && surfaceContract.cameraSurface === 'direct-video+normalized-svg', `Direct mobile camera surface is not active: ${JSON.stringify(surfaceContract)}`);\nexpect(surfaceContract.svgActive && surfaceContract.svgZ > surfaceContract.overlayZ && surfaceContract.svgMeshLength > 1000 && surfaceContract.svgStroke !== 'none', `Normalized SVG face mesh is not visibly active: ${JSON.stringify(surfaceContract)}`);\nexpect(surfaceContract.preserve === 'xMidYMid slice' && surfaceContract.viewBox.split(' ').length === 4 && surfaceContract.rootTransform.includes('scale(-1 1)'), `Normalized SVG source projection drift: ${JSON.stringify(surfaceContract)}`);"
pre = replace_once(pre, old_surface, new_surface, 'surface contract')
pre_path.write_text(pre)

print('patched Vision F3: direct video + source-space normalized SVG + cache bust')
