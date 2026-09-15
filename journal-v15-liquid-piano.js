/* Liquid Glass Piano v2 — single-pass WebGL2 refraction + low-overhead Web Audio. */
(()=>{
'use strict';
const R='/lab/piano',BUILD='PIANO2-WEBGL-20260915-1135',MAX_KEYS=32,MAX_POLY=12;
const app=document.querySelector('#app');if(!app)return;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
const WHITE_PCS=new Set([0,2,4,5,7,9,11]);
const NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const KEY_CODES=['KeyA','KeyW','KeyS','KeyE','KeyD','KeyF','KeyT','KeyG','KeyY','KeyH','KeyU','KeyJ','KeyK','KeyO','KeyL','KeyP','Semicolon'];
const KEY_MIDIS=Array.from({length:17},(_,i)=>60+i);
const PRESETS={
  glass:{label:'Glass',partials:[[1,'triangle',1],[2,'sine',.16]],attack:.006,decay:.34,sustain:.4,release:.26,cutoff:6100,q:1.8,delay:.16,feedback:.14,wet:.16},
  soft:{label:'Soft',partials:[[1,'sine',1]],attack:.014,decay:.58,sustain:.56,release:.42,cutoff:3400,q:.9,delay:.2,feedback:.11,wet:.10},
  bell:{label:'Bell',partials:[[1,'sine',1],[2.01,'sine',.28]],attack:.004,decay:.72,sustain:.18,release:.62,cutoff:7600,q:2.4,delay:.24,feedback:.17,wet:.2}
};
let root=null,audio=null,preset='glass',octave=0,sustain=false,volume=.72;
let voices=new Map(),voiceSeq=0,holders=new Map(),sourceState=new Map(),sustained=new Set(),pointerSources=new Map(),keysByMidi=new Map();
let renderer=null,resizeObserver=null,scrollNode=null,keydowns=new Set(),lastPlayed='—';
function midiHz(m){return 440*Math.pow(2,(m-69)/12)}
function noteName(m){let pc=((m%12)+12)%12,oct=Math.floor(m/12)-1;return `${NAMES[pc]}${oct}`}
function isWhite(m){return WHITE_PCS.has(((m%12)+12)%12)}
function ensureAudio(){
  if(audio){if(audio.ctx.state!=='running')audio.ctx.resume().catch(()=>{});return true}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
  try{
    const ctx=new AC({latencyHint:'interactive'}),master=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),delay=ctx.createDelay(.5),feedback=ctx.createGain(),compressor=ctx.createDynamicsCompressor();
    master.gain.value=volume;dry.gain.value=.94;wet.gain.value=PRESETS[preset].wet;delay.delayTime.value=PRESETS[preset].delay;feedback.gain.value=PRESETS[preset].feedback;
    compressor.threshold.value=-17;compressor.knee.value=16;compressor.ratio.value=3.5;compressor.attack.value=.004;compressor.release.value=.14;
    dry.connect(master);delay.connect(wet);wet.connect(master);delay.connect(feedback);feedback.connect(delay);master.connect(compressor);compressor.connect(ctx.destination);
    audio={ctx,master,dry,wet,delay,feedback,compressor};ctx.resume().catch(()=>{});return true;
  }catch(e){console.error('[Liquid Piano] audio init',e);return false}
}
function applyAudioPreset(){if(!audio)return;const c=PRESETS[preset],t=audio.ctx.currentTime;audio.wet.gain.setTargetAtTime(c.wet,t,.03);audio.delay.delayTime.setTargetAtTime(c.delay,t,.03);audio.feedback.gain.setTargetAtTime(c.feedback,t,.03)}
function prewarm(){ensureAudio()}
function stealVoice(){if(voices.size<MAX_POLY)return;let oldest=null;for(const [m,v] of voices)if(!oldest||v.seq<oldest[1].seq)oldest=[m,v];if(oldest)stopVoice(oldest[0],true)}
function startVoice(midi,velocity=.8){
  if(!ensureAudio()||!audio)return;stealVoice();
  const cfg=PRESETS[preset],c=audio.ctx,t=c.currentTime,f=midiHz(midi),gate=c.createGain(),filter=c.createBiquadFilter(),oscs=[];
  filter.type='lowpass';filter.frequency.setValueAtTime(cfg.cutoff,t);filter.Q.value=cfg.q;gate.gain.setValueAtTime(.0001,t);
  const peak=Math.max(.012,.145*clamp(velocity,.25,1));gate.gain.exponentialRampToValueAtTime(peak,t+cfg.attack);gate.gain.exponentialRampToValueAtTime(Math.max(.0002,peak*cfg.sustain),t+cfg.attack+cfg.decay);
  for(const [mul,type,level] of cfg.partials){const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f*mul,t);g.gain.value=level;o.connect(g);g.connect(filter);o.start(t);oscs.push(o)}
  filter.connect(gate);gate.connect(audio.dry);gate.connect(audio.delay);voices.set(midi,{gate,filter,oscs,cfg,seq:++voiceSeq});lastPlayed=noteName(midi);syncDisplay();renderer?.accent(midi);
}
function stopVoice(midi,fast=false){
  const v=voices.get(midi);if(!v||!audio)return;voices.delete(midi);const c=audio.ctx,t=c.currentTime,g=v.gate.gain,end=t+(fast?.035:v.cfg.release);
  try{g.cancelScheduledValues(t);g.setValueAtTime(Math.max(.0001,g.value||.02),t);g.exponentialRampToValueAtTime(.0001,end)}catch{g.setTargetAtTime(0,t,.025)}
  for(const o of v.oscs)try{o.stop(end+.03)}catch{}
  setTimeout(()=>{try{v.gate.disconnect();v.filter.disconnect()}catch{}},Math.max(70,(end-t+.05)*1000));
}
function keyVisual(baseMidi,on){keysByMidi.get(baseMidi)?.classList.toggle('is-down',on);renderer?.setPressed(baseMidi,on)}
function sourceDown(source,baseMidi,velocity=.8){
  const prev=sourceState.get(source);if(prev?.baseMidi===baseMidi)return;if(prev)sourceUp(source);
  const midi=baseMidi+octave*12;if(sustained.has(midi)){sustained.delete(midi);stopVoice(midi,true)}
  let set=holders.get(midi);if(!set){set=new Set();holders.set(midi,set)}set.add(source);sourceState.set(source,{baseMidi,midi});keyVisual(baseMidi,true);if(set.size===1)startVoice(midi,velocity);
}
function sourceUp(source){
  const st=sourceState.get(source);if(!st)return;sourceState.delete(source);const set=holders.get(st.midi);
  if(set){set.delete(source);if(!set.size){holders.delete(st.midi);if(sustain)sustained.add(st.midi);else stopVoice(st.midi)}}
  if(![...sourceState.values()].some(x=>x.baseMidi===st.baseMidi))keyVisual(st.baseMidi,false);
}
function releaseSustain(){for(const midi of sustained)if(!holders.has(midi))stopVoice(midi);sustained.clear()}
function allOff(fast=false){for(const source of [...sourceState.keys()])sourceUp(source);for(const midi of [...sustained])stopVoice(midi,fast);sustained.clear();holders.clear();pointerSources.clear();for(const el of keysByMidi.values())el.classList.remove('is-down');renderer?.releaseAll()}
function setPreset(next){if(!PRESETS[next]||next===preset)return;allOff(true);preset=next;applyAudioPreset();root?.querySelectorAll('[data-lp-preset]').forEach(b=>b.classList.toggle('active',b.dataset.lpPreset===preset));syncDisplay()}
function setOctave(next){next=clamp(next,-2,2);if(next===octave)return;allOff(true);octave=next;syncDisplay()}
function setSustain(next){sustain=!!next;root?.querySelector('[data-lp-sustain]')?.classList.toggle('active',sustain);if(!sustain)releaseSustain();syncDisplay()}
function syncDisplay(){if(!root)return;root.querySelector('[data-lp-note]')?.replaceChildren(document.createTextNode(lastPlayed));root.querySelector('[data-lp-octave]')?.replaceChildren(document.createTextNode(octave===0?'0':octave>0?`+${octave}`:`${octave}`));root.querySelector('[data-lp-preset-label]')?.replaceChildren(document.createTextNode(PRESETS[preset].label))}
function keyLabel(midi){const codeIndex=KEY_MIDIS.indexOf(midi),map={KeyA:'A',KeyW:'W',KeyS:'S',KeyE:'E',KeyD:'D',KeyF:'F',KeyT:'T',KeyG:'G',KeyY:'Y',KeyH:'H',KeyU:'U',KeyJ:'J',KeyK:'K',KeyO:'O',KeyL:'L',KeyP:'P',Semicolon:';'},kbd=codeIndex>=0?(map[KEY_CODES[codeIndex]]||''):'';return `<span>${noteName(midi)}</span>${kbd?`<small>${kbd}</small>`:''}`}
function keyboardMarkup(){
  const min=48,max=76,whites=[];for(let m=min;m<=max;m++)if(isWhite(m))whites.push(m);
  const whiteIndex=new Map(whites.map((m,i)=>[m,i])),black=[];for(let m=min;m<=max;m++)if(!isWhite(m)){let prev=m-1;while(prev>=min&&!isWhite(prev))prev--;const wi=whiteIndex.get(prev);if(Number.isInteger(wi))black.push({m,left:((wi+1)/whites.length)*100})}
  return `<div class="lp-keyboard-scroll" data-lp-scroll><div class="lp-keyboard" data-lp-board role="application" aria-label="Liquid Glass electronic piano"><div class="lp-whites">${whites.map(m=>`<button type="button" class="lp-key white" data-lp-midi="${m}" aria-label="${noteName(m)} piano key">${keyLabel(m)}</button>`).join('')}</div>${black.map(({m,left})=>`<button type="button" class="lp-key black" data-lp-midi="${m}" style="--left:${left}%" aria-label="${noteName(m)} piano key">${keyLabel(m)}</button>`).join('')}</div></div>`;
}
function markup(){return `<div class="lp-page" data-lp-root><section class="lp-hero"><div class="lp-kicker">WEBGL2 / REFRACTIVE INSTRUMENT</div><div><h1>Liquid<br>Piano.</h1><p>29개의 blur 레이어 대신 하나의 GPU 장면에서 실제 픽셀 좌표를 굴절시킵니다. 소리와 터치는 즉시, 유리는 한 번만 렌더합니다.</p></div></section><section class="lp-instrument"><div class="lp-chrome"><div class="lp-presets" role="group" aria-label="Sound preset">${Object.entries(PRESETS).map(([id,p])=>`<button type="button" data-lp-preset="${id}" class="${id===preset?'active':''}">${p.label}</button>`).join('')}</div><div class="lp-center"><button type="button" data-lp-oct-down aria-label="Octave down">−</button><div class="lp-readout"><span>OCT</span><strong data-lp-octave>0</strong></div><button type="button" data-lp-oct-up aria-label="Octave up">+</button></div><div class="lp-actions"><button type="button" data-lp-sustain>Sustain</button><label class="lp-volume"><span>VOL</span><input data-lp-volume type="range" min="0" max="100" value="72" aria-label="Volume"></label><button type="button" data-lp-full aria-label="Fullscreen">↗</button></div></div><div class="lp-stage" data-lp-stage data-renderer="boot"><canvas class="lp-gl-canvas" data-lp-gl aria-hidden="true"></canvas><div class="lp-field"><div class="lp-frequency"><span data-lp-note>—</span><small><b data-lp-preset-label>Glass</b> · <i data-lp-renderer>GPU INIT</i></small></div></div>${keyboardMarkup()}<div class="lp-hint"><span>A W S E D F T G Y H U J K O L P ;</span><span>Space = sustain · Z/X = octave</span></div></div></section><section class="lp-notes"><article><span>01</span><h2>One GPU surface</h2><p>건반마다 backdrop blur를 만들지 않습니다. 배경 텍스처를 한 번 만들고 모든 건반을 instanced WebGL2 refraction으로 합성합니다.</p></article><article><span>02</span><h2>Real displacement</h2><p>유리 경계의 법선으로 샘플 좌표를 이동하고 RGB 샘플을 분리해 실제 굴절과 색수차를 만듭니다. CSS blur가 아닙니다.</p></article><article><span>03</span><h2>Event-driven</h2><p>연주하지 않을 때 GPU animation loop를 멈춥니다. 오디오는 최대 12 voice로 제한하고 convolution 대신 가벼운 delay network를 사용합니다.</p></article></section></div>`}
function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(s)||'shader compile failed';gl.deleteShader(s);throw Error(msg)}return s}
function program(gl,vs,fs){const p=gl.createProgram(),a=compile(gl,gl.VERTEX_SHADER,vs),b=compile(gl,gl.FRAGMENT_SHADER,fs);gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);gl.deleteShader(a);gl.deleteShader(b);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const msg=gl.getProgramInfoLog(p)||'program link failed';gl.deleteProgram(p);throw Error(msg)}return p}
function makeRenderer(stage,canvas,keyEls){
  let gl;try{gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'})}catch{}
  if(!gl)return null;
  const count=Math.min(keyEls.length,MAX_KEYS),coarse=matchMedia?.('(pointer:coarse)')?.matches||false;
  const rects=new Float32Array(MAX_KEYS*4),meta=new Float32Array(MAX_KEYS*4),press=new Float32Array(MAX_KEYS),targets=new Float32Array(MAX_KEYS),midiToIndex=new Map(),hit=[];
  keyEls.slice(0,count).forEach((el,i)=>{const m=Number(el.dataset.lpMidi);midiToIndex.set(m,i);meta[i*4]=el.classList.contains('black')?1:0});
  const bgVS=`#version 300 es\nprecision highp float;out vec2 v_uv;const vec2 P[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));void main(){vec2 p=P[gl_VertexID];v_uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
  const bgFS=`#version 300 es\nprecision highp float;in vec2 v_uv;out vec4 outColor;uniform float u_energy;uniform float u_hue;vec3 pal(float h){vec3 k=vec3(0.,4.,2.);return .55+.45*cos(6.28318*(h+k/3.));}void main(){vec2 uv=v_uv;vec3 base=mix(vec3(.018,.026,.043),vec3(.055,.075,.11),uv.y);vec3 c1=pal(fract(u_hue));vec3 c2=pal(fract(u_hue+.22));float a=exp(-dot((uv-vec2(.24,.74))*vec2(2.4,2.0),(uv-vec2(.24,.74))*vec2(2.4,2.0)));float b=exp(-dot((uv-vec2(.78,.42))*vec2(2.0,2.2),(uv-vec2(.78,.42))*vec2(2.0,2.2)));vec2 g=abs(fract(uv*vec2(15.,9.))-.5);float grid=(1.-smoothstep(.47,.5,max(g.x,g.y)))*.035;vec3 col=base+c1*a*(.09+.12*u_energy)+c2*b*(.07+.1*u_energy)+grid;outColor=vec4(col,1.);}`;
  const keyVS=`#version 300 es\nprecision highp float;uniform vec2 u_cssSize;uniform vec4 u_rects[32];uniform vec4 u_meta[32];out vec2 v_local;flat out float v_kind;flat out float v_press;flat out vec2 v_size;const vec2 P[6]=vec2[6](vec2(0.,0.),vec2(1.,0.),vec2(0.,1.),vec2(0.,1.),vec2(1.,0.),vec2(1.,1.));void main(){int i=gl_InstanceID;vec4 r=u_rects[i];vec2 q=P[gl_VertexID];float pr=u_meta[i].y;vec2 px=r.xy+q*r.zw;px.y+=pr*(u_meta[i].x>.5?5.:7.);vec2 ndc=vec2(px.x/u_cssSize.x*2.-1.,1.-px.y/u_cssSize.y*2.);gl_Position=vec4(ndc,0.,1.);v_local=q;v_kind=u_meta[i].x;v_press=pr;v_size=r.zw;}`;
  const keyFS=`#version 300 es\nprecision highp float;uniform sampler2D u_scene;uniform vec2 u_resolution;uniform int u_pass;in vec2 v_local;flat in float v_kind;flat in float v_press;flat in vec2 v_size;out vec4 outColor;float sdRoundBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}void main(){int kind=int(v_kind+.5);if(kind!=u_pass)discard;vec2 halfS=max(vec2(3.),v_size*.5-vec2(1.25));vec2 p=(v_local-.5)*v_size;float rad=min(kind==0?20.:13.,min(halfS.x,halfS.y)*.34);float d=sdRoundBox(p,halfS,rad);float aa=max(fwidth(d)*1.25,.65);float mask=1.-smoothstep(-aa,aa,d);if(mask<.01)discard;float inside=max(-d,0.);float edge=1.-smoothstep(0.,kind==0?19.:12.,inside);vec2 q=p/max(halfS,vec2(1.));vec2 normal=normalize(vec2(q.x*1.28,q.y*.76)+vec2(.0001));vec2 dentQ=(v_local-vec2(.5,.66))*vec2(3.8,3.1);float dent=exp(-dot(dentQ,dentQ))*v_press;vec2 uv=gl_FragCoord.xy/u_resolution;float refr=(kind==0?4.6:5.8)*edge+dent*3.2;vec2 off=normal*refr/u_resolution;vec2 ca=normal*(.65+1.25*edge)/u_resolution;vec3 col=vec3(texture(u_scene,uv+off+ca).r,texture(u_scene,uv+off).g,texture(u_scene,uv+off-ca).b);float rim=1.-smoothstep(0.,1.65,abs(d));float fres=pow(edge,1.55);vec2 light=normalize(vec2(-.56,.83));float spec=pow(max(dot(normal,light),0.),18.)*edge;if(kind==0){col=mix(col,vec3(.82,.93,1.),.075+fres*.075);col+=vec3(.62,.82,1.)*(rim*.22+spec*.28);}else{col*=.39;col+=vec3(.025,.045,.075);col+=vec3(.42,.61,.84)*(rim*.12+spec*.18);}col+=v_press*(kind==0?vec3(.025,.055,.075):vec3(.02,.035,.055));outColor=vec4(col,1.);}`;
  let bgP,keyP,tex=null,fbo=null,w=0,h=0,cssW=0,cssH=0,raf=0,lastFrame=0,sceneDirty=true,sceneEnergy=.35,sceneHue=.56,destroyed=false,measureQueued=false;
  try{bgP=program(gl,bgVS,bgFS);keyP=program(gl,keyVS,keyFS)}catch(e){console.error('[Liquid Piano] WebGL shader',e);return null}
  const U={
    bg:{energy:gl.getUniformLocation(bgP,'u_energy'),hue:gl.getUniformLocation(bgP,'u_hue')},
    key:{cssSize:gl.getUniformLocation(keyP,'u_cssSize'),rects:gl.getUniformLocation(keyP,'u_rects[0]'),meta:gl.getUniformLocation(keyP,'u_meta[0]'),scene:gl.getUniformLocation(keyP,'u_scene'),resolution:gl.getUniformLocation(keyP,'u_resolution'),pass:gl.getUniformLocation(keyP,'u_pass')}
  };
  function alloc(){
    const r=stage.getBoundingClientRect();cssW=Math.max(2,r.width);cssH=Math.max(2,r.height);const dpr=Math.min(devicePixelRatio||1,coarse?.82:1),maxPx=coarse?850000:1500000,raw=cssW*cssH*dpr*dpr,scale=dpr*Math.min(1,Math.sqrt(maxPx/Math.max(raw,1)));w=Math.max(2,Math.round(cssW*scale));h=Math.max(2,Math.round(cssH*scale));if(canvas.width===w&&canvas.height===h)return false;canvas.width=w;canvas.height=h;canvas.style.width='100%';canvas.style.height='100%';
    if(tex)gl.deleteTexture(tex);if(fbo)gl.deleteFramebuffer(fbo);tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);sceneDirty=true;return true;
  }
  function measure(){if(destroyed)return;alloc();const sr=stage.getBoundingClientRect();hit.length=0;keyEls.slice(0,count).forEach((el,i)=>{const r=el.getBoundingClientRect(),x=r.left-sr.left,y=r.top-sr.top;rects.set([x,y,r.width,r.height],i*4);hit.push({i,midi:Number(el.dataset.lpMidi),black:el.classList.contains('black'),left:r.left,top:r.top,right:r.right,bottom:r.bottom})});hit.sort((a,b)=>Number(b.black)-Number(a.black));invalidate(true)}
  function scheduleMeasure(){if(measureQueued)return;measureQueued=true;requestAnimationFrame(()=>{measureQueued=false;measure()})}
  function hitTest(x,y){for(const r of hit)if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return r.midi;return null}
  function renderScene(){gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,w,h);gl.useProgram(bgP);gl.uniform1f(U.bg.energy,sceneEnergy);gl.uniform1f(U.bg.hue,sceneHue);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,null);sceneDirty=false}
  function renderKeys(){gl.viewport(0,0,w,h);for(let i=0;i<count;i++)meta[i*4+1]=press[i];gl.useProgram(keyP);gl.uniform2f(U.key.cssSize,cssW,cssH);gl.uniform4fv(U.key.rects,rects);gl.uniform4fv(U.key.meta,meta);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(U.key.scene,0);gl.uniform2f(U.key.resolution,w,h);gl.disable(gl.BLEND);gl.uniform1i(U.key.pass,0);gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);gl.uniform1i(U.key.pass,1);gl.drawArraysInstanced(gl.TRIANGLES,0,6,count)}
  function draw(){if(destroyed||!w||!h)return;if(sceneDirty)renderScene();else{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,null)}renderKeys()}
  function frame(ts){raf=0;if(destroyed)return;const dt=lastFrame?Math.min(2,(ts-lastFrame)/16.67):1;lastFrame=ts;let active=false;for(let i=0;i<count;i++){const k=targets[i]>press[i] ? .42 : .24;const next=press[i]+(targets[i]-press[i])*(1-Math.pow(1-k,dt));if(Math.abs(next-targets[i])>.008)active=true;press[i]=Math.abs(next-targets[i])<.008?targets[i]:next}draw();if(active)raf=requestAnimationFrame(frame);else lastFrame=0}
  function invalidate(force=false){if(force)sceneDirty=true;if(!raf)raf=requestAnimationFrame(frame)}
  function setPressed(m,on){const i=midiToIndex.get(m);if(i==null)return;targets[i]=on?1:0;invalidate(false)}
  function releaseAll(){targets.fill(0);invalidate(false)}
  function accent(m){sceneHue=((m%12)/12+.49)%1;sceneEnergy=.55;sceneDirty=true;invalidate(false)}
  function destroy(){destroyed=true;if(raf)cancelAnimationFrame(raf);try{gl.deleteProgram(bgP);gl.deleteProgram(keyP);if(tex)gl.deleteTexture(tex);if(fbo)gl.deleteFramebuffer(fbo)}catch{}}
  measure();stage.dataset.renderer='webgl2';return{setPressed,releaseAll,accent,measure:scheduleMeasure,hitTest,destroy};
}
function nav(){document.querySelectorAll('[data-nav]').forEach(n=>n.classList.remove('active'));document.querySelector('[data-nav="piano"]')?.classList.add('active')}
function bind(){
  const stage=root.querySelector('[data-lp-stage]'),board=root.querySelector('[data-lp-board]'),canvas=root.querySelector('[data-lp-gl]'),keyEls=[...root.querySelectorAll('[data-lp-midi]')];scrollNode=root.querySelector('[data-lp-scroll]');keysByMidi=new Map(keyEls.map(el=>[Number(el.dataset.lpMidi),el]));
  renderer=makeRenderer(stage,canvas,keyEls);stage.dataset.renderer=renderer?'webgl2':'fallback';root.querySelector('[data-lp-renderer]').textContent=renderer?'WEBGL2 REFRACTION':'LITE FALLBACK';
  root.querySelectorAll('[data-lp-preset]').forEach(b=>b.addEventListener('click',()=>{prewarm();setPreset(b.dataset.lpPreset)}));root.querySelector('[data-lp-oct-down]')?.addEventListener('click',()=>{prewarm();setOctave(octave-1)});root.querySelector('[data-lp-oct-up]')?.addEventListener('click',()=>{prewarm();setOctave(octave+1)});root.querySelector('[data-lp-sustain]')?.addEventListener('click',()=>{prewarm();setSustain(!sustain)});root.querySelector('[data-lp-volume]')?.addEventListener('input',e=>{volume=Number(e.currentTarget.value)/100;if(audio)audio.master.gain.setTargetAtTime(volume,audio.ctx.currentTime,.02)});root.querySelector('[data-lp-full]')?.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await stage?.requestFullscreen?.()}catch{}});
  const pointerVelocity=e=>e.pressure>0?clamp(.48+e.pressure*.52,.48,1):.78;
  board.addEventListener('pointerdown',e=>{const key=e.target.closest('[data-lp-midi]');if(!key)return;e.preventDefault();prewarm();const id=`p:${e.pointerId}`;pointerSources.set(e.pointerId,id);try{board.setPointerCapture(e.pointerId)}catch{}sourceDown(id,Number(key.dataset.lpMidi),pointerVelocity(e))});
  board.addEventListener('pointermove',e=>{const id=pointerSources.get(e.pointerId);if(!id)return;e.preventDefault();const fallback=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-lp-midi]');const midi=renderer?renderer.hitTest(e.clientX,e.clientY):Number(fallback?.dataset.lpMidi);const st=sourceState.get(id);if(Number.isFinite(midi)&&midi!==st?.baseMidi)sourceDown(id,midi,pointerVelocity(e))});
  const endPointer=e=>{const id=pointerSources.get(e.pointerId);if(!id)return;sourceUp(id);pointerSources.delete(e.pointerId);try{board.releasePointerCapture(e.pointerId)}catch{}};board.addEventListener('pointerup',endPointer);board.addEventListener('pointercancel',endPointer);
  resizeObserver?.disconnect();resizeObserver=new ResizeObserver(()=>renderer?.measure());resizeObserver.observe(stage);resizeObserver.observe(board);scrollNode?.addEventListener('scroll',()=>renderer?.measure(),{passive:true});
  syncDisplay();
}
function onKeyDown(e){if(route()!==R||e.repeat||e.target?.matches?.('input,textarea,select'))return;if(e.code==='Space'){e.preventDefault();if(!keydowns.has('Space')){keydowns.add('Space');prewarm();setSustain(true)}return}if(e.code==='KeyZ'){e.preventDefault();setOctave(octave-1);return}if(e.code==='KeyX'){e.preventDefault();setOctave(octave+1);return}const idx=KEY_CODES.indexOf(e.code);if(idx<0||keydowns.has(e.code))return;e.preventDefault();keydowns.add(e.code);prewarm();sourceDown(`k:${e.code}`,KEY_MIDIS[idx],.82)}
function onKeyUp(e){if(e.code==='Space'){keydowns.delete('Space');if(route()===R)setSustain(false);return}const idx=KEY_CODES.indexOf(e.code);if(idx<0)return;keydowns.delete(e.code);sourceUp(`k:${e.code}`)}
function teardown(){if(!root)return;allOff(true);resizeObserver?.disconnect();resizeObserver=null;renderer?.destroy();renderer=null;root=null;keysByMidi.clear();keydowns.clear()}
function mount(){if(route()!==R){teardown();return}if(root?.isConnected)return;teardown();app.innerHTML=markup();root=app.querySelector('[data-lp-root]');nav();bind();app.focus({preventScroll:true});scrollTo({top:0,behavior:'instant'})}
addEventListener('keydown',onKeyDown);addEventListener('keyup',onKeyUp);addEventListener('blur',()=>allOff(true));addEventListener('hashchange',()=>queueMicrotask(mount));mount();
})();
