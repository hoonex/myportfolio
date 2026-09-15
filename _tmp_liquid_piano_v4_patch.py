from pathlib import Path
import re

REV='SITE51-LIQUIDPIANO4-ULTRA-20260916-0751'
BUILD='PIANO4-ULTRA-20260916-0751'

js_p=Path('journal-v15-liquid-piano.js')
css_p=Path('journal-v15-liquid-piano.css')
loader_p=Path('journal-route-loader.js')
index_p=Path('index.html')
js=js_p.read_text()
css=css_p.read_text()
loader=loader_p.read_text()
index=index_p.read_text()

js=js.replace('/* Liquid Glass Piano v3 — single-surface WebGL2 refraction, pro controls, event-driven rendering. */','/* Liquid Glass Piano v4 — ultra-light single-surface optical refraction. */',1)
js=js.replace("BUILD='PIANO3_2-REALPIANO-20260915-1522'",f"BUILD='{BUILD}'",1)
js=js.replace("const STORAGE='hj-liquid-piano-v3';","const STORAGE='hj-liquid-piano-v4';",1)

old_modes="""const MODES={
  compact:{label:'Compact',min:60,max:76,keyWidth:72,keyHeight:300},
  standard:{label:'Standard',min:48,max:76,keyWidth:54,keyHeight:330},
  wide:{label:'Wide',min:36,max:84,keyWidth:42,keyHeight:310},
  performance:{label:'Performance',min:48,max:76,keyWidth:76,keyHeight:370}
};"""
new_modes="""const MODES={
  compact:{label:'Compact',min:60,max:72,keyWidth:42,keyHeight:258},
  standard:{label:'Standard',min:48,max:76,keyWidth:50,keyHeight:306},
  wide:{label:'Wide',min:36,max:84,keyWidth:38,keyHeight:286},
  performance:{label:'Performance',min:48,max:76,keyWidth:58,keyHeight:318}
};"""
assert old_modes in js
js=js.replace(old_modes,new_modes,1)

old_quality="""const QUALITY={
  performance:{label:'Performance',mobilePx:260000,desktopPx:420000,mobileDpr:.68,desktopDpr:.8,maxPoly:8,shader:0},
  balanced:{label:'Balanced',mobilePx:470000,desktopPx:820000,mobileDpr:.88,desktopDpr:1,maxPoly:12,shader:1},
  quality:{label:'Quality',mobilePx:760000,desktopPx:1350000,mobileDpr:1,desktopDpr:1.2,maxPoly:16,shader:2}
};"""
new_quality="""const QUALITY={
  performance:{label:'Performance',mobilePx:135000,desktopPx:300000,mobileDpr:.48,desktopDpr:.68,maxPoly:6,shader:0},
  balanced:{label:'Balanced',mobilePx:240000,desktopPx:560000,mobileDpr:.64,desktopDpr:.88,maxPoly:8,shader:1},
  quality:{label:'Quality',mobilePx:430000,desktopPx:980000,mobileDpr:.82,desktopDpr:1.05,maxPoly:12,shader:2}
};"""
assert old_quality in js
js=js.replace(old_quality,new_quality,1)

js=js.replace("const SAMPLE_PREFETCH=new Set([45,48,51,54,57,60,63,66,69,72,75]);","const SAMPLE_PREFETCH=new Set();",1)
old_defaults="""const DEFAULTS={
  mode:'standard',quality:(globalThis.matchMedia?.('(pointer:coarse)')?.matches?'performance':'balanced'),keyWidth:54,keyHeight:330,blackHeight:61,labels:true,glide:true,"""
new_defaults="""const DEFAULTS={
  mode:(globalThis.matchMedia?.('(pointer:coarse)')?.matches?'compact':'standard'),quality:(globalThis.matchMedia?.('(pointer:coarse)')?.matches?'performance':'balanced'),keyWidth:(globalThis.matchMedia?.('(pointer:coarse)')?.matches?42:50),keyHeight:(globalThis.matchMedia?.('(pointer:coarse)')?.matches?258:306),blackHeight:61,labels:!globalThis.matchMedia?.('(pointer:coarse)')?.matches,glide:true,"""
assert old_defaults in js
js=js.replace(old_defaults,new_defaults,1)

js=js.replace('function prewarm(){ensureAudio();primeSampleDecodes()}','function prewarm(){ensureAudio()}',1)
js=js.replace("setTimeout(()=>{if(route()===R){prefetchSamples();installSampleCredit()}},0)","setTimeout(()=>{if(route()===R)installSampleCredit()},0)",1)

bg_pat=r"  const bgFS=`#version 300 es[\s\S]*?`;\n  const keyVS="
bg_new="""  const bgFS=`#version 300 es
precision mediump float;in vec2 v_uv;out vec4 outColor;uniform float u_energy;uniform float u_hue;
vec3 pal(float h){vec3 k=vec3(0.,4.,2.);return .54+.46*cos(6.28318*(h+k/3.));}
void main(){vec2 uv=v_uv;vec3 base=mix(vec3(.010,.016,.028),vec3(.048,.066,.098),uv.y);vec3 c1=pal(fract(u_hue)),c2=pal(fract(u_hue+.21));
vec2 d1=(uv-vec2(.22,.70))*vec2(2.25,1.9),d2=(uv-vec2(.80,.42))*vec2(1.9,2.05);float a=exp(-dot(d1,d1)),b=exp(-dot(d2,d2));
float rail=1.-smoothstep(.035,.052,abs(fract(uv.x*6.5+uv.y*.16)-.5));float hline=1.-smoothstep(.020,.032,abs(fract(uv.y*8.0)-.5));
float ribbons=.5+.5*sin((uv.x*8.5+uv.y*2.6)*6.28318);float hard=step(.86,ribbons)*.085;
outColor=vec4(base+c1*a*(.10+.08*u_energy)+c2*b*(.085+.07*u_energy)+vec3(.18,.24,.31)*(rail*.24+hline*.10)+hard,1.);}`;
  const keyVS="""
js,n=re.subn(bg_pat,bg_new,js,count=1)
assert n==1, 'bg shader not replaced'

key_pat=r"  const keyFS=`#version 300 es[\s\S]*?`;\n  let bgP,keyP,tex=null,fbo=null,w=0,h=0,cssW=0,cssH=0,raf=0,lastFrame=0,sceneDirty=true,sceneEnergy=.35,sceneHue=.56,destroyed=false,measureQueued=false;"
key_new="""  const keyFS=`#version 300 es
precision mediump float;uniform sampler2D u_scene;uniform vec2 u_resolution;uniform vec2 u_cssSize;uniform int u_pass;uniform float u_quality;uniform float u_refraction;uniform float u_chromatic;uniform float u_depth;
in vec2 v_local;flat in float v_kind;flat in float v_press;flat in vec2 v_size;out vec4 outColor;
float sdRoundBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
void main(){int kind=int(v_kind+.5);if(kind!=u_pass)discard;vec2 halfS=max(vec2(3.),v_size*.5-vec2(1.25));vec2 p=(v_local-.5)*v_size;float rad=min(kind==0?20.:13.,min(halfS.x,halfS.y)*.34);
float pressProfile=exp(-dot((v_local-vec2(.5,.67))*vec2(3.6,2.8),(v_local-vec2(.5,.67))*vec2(3.6,2.8)))*v_press;p.y+=pressProfile*1.8*u_depth;
float d=sdRoundBox(p,halfS,rad),aa=max(fwidth(d)*1.15,.55),mask=1.-smoothstep(-aa,aa,d);if(mask<.01)discard;
float inside=max(-d,0.),edge=1.-smoothstep(0.,kind==0?20.:12.,inside);vec2 q=p/max(halfS,vec2(1.));
vec2 slope=vec2(q.x*.88,q.y*.36);slope+=vec2((v_local.x-.5)*.30,(v_local.y-.67)*.44)*pressProfile*u_depth;float bend=(kind==0?13.0:16.0)*(.28+edge*.92)*(.48+u_depth*.52)*u_refraction;
vec2 uv=gl_FragCoord.xy/u_resolution,off=slope*bend/max(u_cssSize,vec2(1.));vec3 col;
if(u_quality<1.5||u_chromatic<.01)col=texture(u_scene,uv+off).rgb;else{vec2 n=normalize(slope+vec2(.0001));vec2 ca=n*(.65+1.5*edge)*u_chromatic/max(u_cssSize,vec2(1.));col=vec3(texture(u_scene,uv+off+ca).r,texture(u_scene,uv+off).g,texture(u_scene,uv+off-ca).b);}
vec2 n=normalize(slope+vec2(.0001));float rim=1.-smoothstep(0.,1.45,abs(d)),fres=pow(edge,1.22),spec=pow(max(dot(n,normalize(vec2(-.58,.82))),0.),20.)*edge;float body=clamp(1.-dot(q*vec2(.78,.56),q*vec2(.78,.56)),0.,1.);
if(kind==0){col=mix(col,vec3(.91,.97,1.),.035+body*.025+fres*.075);col+=vec3(.62,.84,1.)*(rim*.28+spec*.34);}else{col*=.40;col+=vec3(.018,.034,.060);col+=vec3(.42,.66,.92)*(rim*.16+spec*.22);}
col+=pressProfile*(kind==0?vec3(.030,.060,.082):vec3(.016,.032,.054));outColor=vec4(col,1.);}`;
  let bgP,keyP,tex=null,fbo=null,w=0,h=0,cssW=0,cssH=0,raf=0,sceneDirty=true,sceneEnergy=.32,sceneHue=.56,destroyed=false,measureQueued=false;"""
js,n=re.subn(key_pat,key_new,js,count=1)
assert n==1, 'key shader/state not replaced'

old_frame="""  function frame(ts){raf=0;if(destroyed)return;const dt=lastFrame?Math.min(2,(ts-lastFrame)/16.67):1;lastFrame=ts;let active=false;for(let i=0;i<count;i++){const k=targets[i]>press[i]?.42:.24;const next=press[i]+(targets[i]-press[i])*(1-Math.pow(1-k,dt));if(Math.abs(next-targets[i])>.008)active=true;press[i]=Math.abs(next-targets[i])<.008?targets[i]:next}draw();if(active)raf=requestAnimationFrame(frame);else lastFrame=0}
  function invalidate(force=false){if(force)sceneDirty=true;if(!raf)raf=requestAnimationFrame(frame)}"""
new_frame="""  function frame(){raf=0;if(destroyed)return;for(let i=0;i<count;i++)press[i]=targets[i];draw()}
  function invalidate(force=false){if(force)sceneDirty=true;if(!raf)raf=requestAnimationFrame(frame)}"""
assert old_frame in js, 'frame block missing'
js=js.replace(old_frame,new_frame,1)

old_accent="  function accent(m){sceneHue=((m%12)/12+.49)%1;sceneEnergy=.58;sceneDirty=true;invalidate(false)}"
new_accent="  function accent(m){if(settings.quality==='quality'&&!coarse){sceneHue=((m%12)/12+.49)%1;sceneEnergy=.48;sceneDirty=true}invalidate(false)}"
assert old_accent in js
js=js.replace(old_accent,new_accent,1)

# Make copy match the new renderer contract.
js=js.replace('한 장의 GPU surface에서 배경 픽셀 좌표를 실제로 굴절시키고, 건반은 투명한 입력 레이어만 남깁니다. 연주하지 않을 때 렌더 루프는 멈춥니다.','건반 전체를 하나의 convex optical surface로 계산해 뒤 장면의 texture 좌표를 실제로 굴절시킵니다. 모바일은 한 입력당 한 frame만 그리고 바로 멈춥니다.',1)
js=js.replace('SDF 법선으로 배경 texture sampling 좌표를 이동하고, Fresnel·specular·chromatic aberration을 한 WebGL2 surface에서 합성합니다.','건반 전체의 렌즈 기울기로 texture 좌표를 이동하고, rim·Fresnel·specular를 같은 WebGL2 pass에서 합성합니다.',1)
js=js.replace('키 press가 settle되면 requestAnimationFrame을 완전히 중지합니다. 건반별 backdrop-filter도 없습니다.','모바일은 press/release 이벤트를 한 frame으로 coalesce합니다. 건반별 backdrop-filter와 idle animation은 없습니다.',1)
js=js.replace('Performance는 실제 굴절을 유지하면서 렌더 해상도와 RGB 샘플 수를 줄입니다. Idle 상태에서는 RAF가 0입니다.','Performance는 실제 좌표 굴절을 유지하면서 단일 texture sample과 초저해상도 surface를 사용합니다. Idle RAF는 0입니다.',1)

css=css.replace('/* Liquid Glass Piano v3 — real single-canvas refraction + pro instrument controls. */','/* Liquid Glass Piano v4 — ultra-light single-canvas optical refraction. */',1)
css=css.replace('min-height:clamp(640px,69vw,790px)','min-height:clamp(560px,62vw,720px)',1)
css=css.replace('.lp-stage{min-height:700px}', '.lp-stage{min-height:610px}',1)
css=css.replace('.lp-stage{min-height:690px;border-radius:18px}', '.lp-stage{min-height:550px;border-radius:18px}',1)
if '@media(pointer:coarse)' not in css:
    css += "\n@media(pointer:coarse){.lp-stage::after{box-shadow:inset 0 1px rgba(255,255,255,.07),inset 0 -34px 60px rgba(0,0,0,.14)}.lp-key span,.lp-key small{text-shadow:none;transition:none}.lp-settings{box-shadow:0 14px 38px rgba(0,0,0,.34)}}\n"

loader,n=re.subn(r"const DEPLOY_REV = '[^']+';",f"const DEPLOY_REV = '{REV}';",loader,count=1)
assert n==1
index,n=re.subn(r"journal-route-loader\.js\?v=[^\"]+",f"journal-route-loader.js?v={REV}",index,count=1)
assert n==1

js_p.write_text(js)
css_p.write_text(css)
loader_p.write_text(loader)
index_p.write_text(index)

# Contract checks that are independent of node syntax.
assert BUILD in js
assert "mobilePx:135000" in js
assert "u_quality<1.5" in js
assert "function frame(){raf=0" in js
assert "primeSampleDecodes()" not in js[js.index('function prewarm'):js.index('function stealVoice')]
assert REV in loader and REV in index
print('patched liquid piano v4 ultra')
