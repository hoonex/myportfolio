/* Liquid Glass Piano v3 — single-surface WebGL2 refraction, pro controls, event-driven rendering. */
(()=>{
'use strict';
const R='/lab/piano',BUILD='PIANO3_2-REALPIANO-20260915-1522',MAX_KEYS=64;
const app=document.querySelector('#app');if(!app)return;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
const WHITE_PCS=new Set([0,2,4,5,7,9,11]);
const NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const KEY_CODES=['KeyA','KeyW','KeyS','KeyE','KeyD','KeyF','KeyT','KeyG','KeyY','KeyH','KeyU','KeyJ','KeyK','KeyO','KeyL','KeyP','Semicolon'];
const KEY_MIDIS=Array.from({length:17},(_,i)=>60+i);
const STORAGE='hj-liquid-piano-v3';
const MODES={
  compact:{label:'Compact',min:60,max:76,keyWidth:72,keyHeight:300},
  standard:{label:'Standard',min:48,max:76,keyWidth:54,keyHeight:330},
  wide:{label:'Wide',min:36,max:84,keyWidth:42,keyHeight:310},
  performance:{label:'Performance',min:48,max:76,keyWidth:76,keyHeight:370}
};
const QUALITY={
  performance:{label:'Performance',mobilePx:260000,desktopPx:420000,mobileDpr:.68,desktopDpr:.8,maxPoly:8,shader:0},
  balanced:{label:'Balanced',mobilePx:470000,desktopPx:820000,mobileDpr:.88,desktopDpr:1,maxPoly:12,shader:1},
  quality:{label:'Quality',mobilePx:760000,desktopPx:1350000,mobileDpr:1,desktopDpr:1.2,maxPoly:16,shader:2}
};
const PRESETS={
  glass:{label:'Glass',partials:[[1,'triangle',1],[2,'sine',.16]],attack:.006,decay:.34,sustain:.40,release:.26,brightness:6100,resonance:1.8,space:.18,detune:3,stereo:.5},
  soft:{label:'Soft',partials:[[1,'sine',1]],attack:.018,decay:.62,sustain:.58,release:.46,brightness:3400,resonance:.9,space:.12,detune:0,stereo:.34},
  bell:{label:'Bell',partials:[[1,'sine',1],[2.01,'sine',.28]],attack:.004,decay:.78,sustain:.18,release:.66,brightness:7600,resonance:2.4,space:.28,detune:5,stereo:.62}
};
const SAMPLE_BASE='https://tonejs.github.io/audio/salamander/';
const SAMPLE_ANCHORS=[
  [21,'A0.mp3'],[24,'C1.mp3'],[27,'Ds1.mp3'],[30,'Fs1.mp3'],[33,'A1.mp3'],
  [36,'C2.mp3'],[39,'Ds2.mp3'],[42,'Fs2.mp3'],[45,'A2.mp3'],[48,'C3.mp3'],
  [51,'Ds3.mp3'],[54,'Fs3.mp3'],[57,'A3.mp3'],[60,'C4.mp3'],[63,'Ds4.mp3'],
  [66,'Fs4.mp3'],[69,'A4.mp3'],[72,'C5.mp3'],[75,'Ds5.mp3'],[78,'Fs5.mp3'],
  [81,'A5.mp3'],[84,'C6.mp3'],[87,'Ds6.mp3'],[90,'Fs6.mp3'],[93,'A6.mp3'],[96,'C7.mp3']
].map(([midi,file])=>({midi,file}));
const SAMPLE_PREFETCH=new Set([45,48,51,54,57,60,63,66,69,72,75]);
const DEFAULTS={
  mode:'standard',quality:(globalThis.matchMedia?.('(pointer:coarse)')?.matches?'performance':'balanced'),keyWidth:54,keyHeight:330,blackHeight:61,labels:true,glide:true,
  attack:.006,decay:.34,sustain:.40,release:.26,brightness:6100,resonance:1.8,space:.18,detune:3,stereo:.5,velocity:.86,polyphony:12,
  refraction:1,chromatic:.72,depth:.82
};
let settings=loadSettings(),root=null,audio=null,preset='glass',octave=0,sustainPedal=false,volume=.72,sampleBank={raw:new Map(),buffers:new Map(),fetching:new Map(),decoding:new Map()};
let voices=new Map(),voiceSeq=0,holders=new Map(),sourceState=new Map(),sustained=new Set(),pointerSources=new Map(),keysByMidi=new Map(),keydowns=new Set();
let renderer=null,resizeObserver=null,scrollNode=null,boardHost=null,lastPlayed='—',pseudoFull=false;
function loadSettings(){try{return normalizeSettings({...DEFAULTS,...JSON.parse(localStorage.getItem(STORAGE)||'{}')})}catch{return {...DEFAULTS}}}
function normalizeSettings(s){
  if(!MODES[s.mode])s.mode='standard';if(!QUALITY[s.quality])s.quality='balanced';
  s.keyWidth=clamp(Number(s.keyWidth)||54,32,96);s.keyHeight=clamp(Number(s.keyHeight)||330,190,430);s.blackHeight=clamp(Number(s.blackHeight)||61,48,75);
  s.attack=clamp(Number(s.attack)||.006,.002,.18);s.decay=clamp(Number(s.decay)||.34,.05,1.6);s.sustain=clamp(Number(s.sustain),.05,.95);s.release=clamp(Number(s.release)||.26,.04,2.2);
  s.brightness=clamp(Number(s.brightness)||6100,700,12000);s.resonance=clamp(Number(s.resonance)||1.8,.2,8);s.space=clamp(Number(s.space)||.18,0,.7);s.detune=clamp(Number(s.detune)||0,0,24);
  s.stereo=clamp(Number(s.stereo)||0,0,1);s.velocity=clamp(Number(s.velocity)||.86,.35,1);s.polyphony=clamp(Math.round(Number(s.polyphony)||12),4,16);
  s.refraction=clamp(Number(s.refraction)||1,.25,1.8);s.chromatic=clamp(Number(s.chromatic)||0,0,1.4);s.depth=clamp(Number(s.depth)||.82,.25,1.6);
  s.labels=s.labels!==false;s.glide=s.glide!==false;return s;
}
function saveSettings(){try{localStorage.setItem(STORAGE,JSON.stringify(settings))}catch{}}
function midiHz(m){return 440*Math.pow(2,(m-69)/12)}
function noteName(m){const pc=((m%12)+12)%12,oct=Math.floor(m/12)-1;return `${NAMES[pc]}${oct}`}
function isWhite(m){return WHITE_PCS.has(((m%12)+12)%12)}
function effectivePoly(){return Math.min(settings.polyphony,QUALITY[settings.quality].maxPoly)}
function ensureAudio(){
  if(audio){if(audio.ctx.state!=='running')audio.ctx.resume().catch(()=>{});return true}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
  try{
    const ctx=new AC({latencyHint:'interactive'}),master=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),delay=ctx.createDelay(.65),feedback=ctx.createGain(),bass=ctx.createBiquadFilter(),compressor=ctx.createDynamicsCompressor();
    master.gain.value=volume;dry.gain.value=.96;bass.type='lowshelf';bass.frequency.value=210;bass.gain.value=5.25;compressor.threshold.value=-18;compressor.knee.value=16;compressor.ratio.value=3.4;compressor.attack.value=.003;compressor.release.value=.15;
    dry.connect(master);delay.connect(wet);wet.connect(master);delay.connect(feedback);feedback.connect(delay);master.connect(bass);bass.connect(compressor);compressor.connect(ctx.destination);
    audio={ctx,master,dry,wet,delay,feedback,bass,compressor};applyAudioSettings();ctx.resume().catch(()=>{});return true;
  }catch(e){console.error('[Liquid Piano] audio init',e);return false}
}
function applyAudioSettings(){
  if(!audio)return;const t=audio.ctx.currentTime,sp=settings.space;
  audio.wet.gain.setTargetAtTime(.015+sp*.42,t,.035);audio.delay.delayTime.setTargetAtTime(.075+sp*.28,t,.04);audio.feedback.gain.setTargetAtTime(.035+sp*.34,t,.04);
}
function nearestSample(midi){let best=SAMPLE_ANCHORS[0],d=Infinity;for(const a of SAMPLE_ANCHORS){const x=Math.abs(a.midi-midi);if(x<d){best=a;d=x}}return best}
function fetchSample(anchor){
  if(sampleBank.buffers.has(anchor.midi)||sampleBank.raw.has(anchor.midi))return Promise.resolve(anchor);
  if(sampleBank.fetching.has(anchor.midi))return sampleBank.fetching.get(anchor.midi);
  const p=fetch(SAMPLE_BASE+anchor.file,{cache:'force-cache',mode:'cors'}).then(r=>{if(!r.ok)throw new Error(`sample ${r.status} ${anchor.file}`);return r.arrayBuffer()}).then(buf=>{sampleBank.raw.set(anchor.midi,buf);sampleBank.fetching.delete(anchor.midi);return anchor}).catch(e=>{sampleBank.fetching.delete(anchor.midi);console.warn('[Liquid Piano] sample fetch',anchor.file,e);return null});
  sampleBank.fetching.set(anchor.midi,p);return p;
}
function decodeSample(anchor){
  if(!anchor||!audio)return Promise.resolve(null);if(sampleBank.buffers.has(anchor.midi))return Promise.resolve(sampleBank.buffers.get(anchor.midi));if(sampleBank.decoding.has(anchor.midi))return sampleBank.decoding.get(anchor.midi);
  const p=(sampleBank.raw.has(anchor.midi)?Promise.resolve(anchor):fetchSample(anchor)).then(a=>{if(!a||!sampleBank.raw.has(anchor.midi))return null;const raw=sampleBank.raw.get(anchor.midi).slice(0);return audio.ctx.decodeAudioData(raw)}).then(buf=>{if(buf)sampleBank.buffers.set(anchor.midi,buf);sampleBank.decoding.delete(anchor.midi);return buf}).catch(e=>{sampleBank.decoding.delete(anchor.midi);console.warn('[Liquid Piano] sample decode',anchor.file,e);return null});
  sampleBank.decoding.set(anchor.midi,p);return p;
}
function prefetchSamples(){for(const a of SAMPLE_ANCHORS)if(SAMPLE_PREFETCH.has(a.midi))fetchSample(a)}
function primeSampleDecodes(){if(!audio)return;for(const midi of [48,57,60,69,72])decodeSample(nearestSample(midi))}
function installSampleCredit(){
  if(!root||root.querySelector('[data-lp-sample-credit]'))return;const p=document.createElement('p');p.className='lp-sample-credit';p.dataset.lpSampleCredit='';p.innerHTML='Piano recordings: <strong>Salamander Grand Piano</strong> · Yamaha C5 · Alexander Holm · <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>. Synth fallback remains available while a sample is loading.';root.append(p);
}
function prewarm(){ensureAudio();primeSampleDecodes()}
setTimeout(()=>{if(route()===R){prefetchSamples();installSampleCredit()}},0)
function stealVoice(){while(voices.size>=effectivePoly()){let oldest=null;for(const [m,v] of voices)if(!oldest||v.seq<oldest[1].seq)oldest=[m,v];if(!oldest)break;stopVoice(oldest[0],true)}}
function startVoice(midi,velocity=.8){
  if(!ensureAudio()||!audio)return;stealVoice();const anchor=nearestSample(midi),sample=sampleBank.buffers.get(anchor.midi),c=audio.ctx,t=c.currentTime,vel=clamp(velocity*settings.velocity,.2,1),bassComp=midi<45?1.5:midi<52?1.34:midi<60?1.17:1;
  if(sample){
    const source=c.createBufferSource(),gate=c.createGain(),pan=c.createStereoPanner?c.createStereoPanner():null;
    source.buffer=sample;source.playbackRate.setValueAtTime(Math.pow(2,(midi-anchor.midi)/12),t);gate.gain.setValueAtTime(.0001,t);gate.gain.exponentialRampToValueAtTime(Math.max(.018,.21*vel*bassComp),t+.006);
    source.connect(gate);let out=gate;if(pan){gate.connect(pan);pan.pan.value=clamp(((midi-60)/24)*settings.stereo,-settings.stereo,settings.stereo);out=pan}out.connect(audio.dry);out.connect(audio.delay);source.start(t);
    voices.set(midi,{gate,filter:null,pan,oscs:[],source,seq:++voiceSeq,sample:true});lastPlayed=noteName(midi);syncDisplay();renderer?.accent(midi);return;
  }
  decodeSample(anchor);
  const base=PRESETS[preset],f=midiHz(midi),gate=c.createGain(),filter=c.createBiquadFilter(),pan=c.createStereoPanner?c.createStereoPanner():null,oscs=[];
  filter.type='lowpass';filter.frequency.setValueAtTime(settings.brightness,t);filter.Q.value=settings.resonance;gate.gain.setValueAtTime(.0001,t);
  const peak=Math.max(.008,.145*vel*bassComp);gate.gain.exponentialRampToValueAtTime(peak,t+settings.attack);gate.gain.exponentialRampToValueAtTime(Math.max(.0002,peak*settings.sustain),t+settings.attack+settings.decay);
  base.partials.forEach(([mul,type,level],i)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f*mul,t);o.detune.value=(i?1:-.35)*settings.detune;g.gain.value=level;o.connect(g);g.connect(filter);o.start(t);oscs.push(o)});
  filter.connect(gate);let out=gate;if(pan){gate.connect(pan);pan.pan.value=clamp(((midi-60)/24)*settings.stereo,-settings.stereo,settings.stereo);out=pan}out.connect(audio.dry);out.connect(audio.delay);
  voices.set(midi,{gate,filter,pan,oscs,source:null,seq:++voiceSeq,sample:false});lastPlayed=noteName(midi);syncDisplay();renderer?.accent(midi);
}
function stopVoice(midi,fast=false){
  const v=voices.get(midi);if(!v||!audio)return;voices.delete(midi);const t=audio.ctx.currentTime,g=v.gate.gain,end=t+(fast?.035:settings.release);
  try{g.cancelScheduledValues(t);g.setValueAtTime(Math.max(.0001,g.value||.02),t);g.exponentialRampToValueAtTime(.0001,end)}catch{g.setTargetAtTime(0,t,.025)}
  for(const o of v.oscs||[])try{o.stop(end+.035)}catch{};if(v.source)try{v.source.stop(end+.04)}catch{}
  setTimeout(()=>{try{v.gate.disconnect();v.filter?.disconnect();v.pan?.disconnect();v.source?.disconnect()}catch{}},Math.max(70,(end-t+.05)*1000));
}
function keyVisual(baseMidi,on){keysByMidi.get(baseMidi)?.classList.toggle('is-down',on);renderer?.setPressed(baseMidi,on)}
function sourceDown(source,baseMidi,velocity=.8){
  const prev=sourceState.get(source);if(prev?.baseMidi===baseMidi)return;if(prev)sourceUp(source);
  const midi=baseMidi+octave*12;if(sustained.has(midi)){sustained.delete(midi);stopVoice(midi,true)}
  let set=holders.get(midi);if(!set){set=new Set();holders.set(midi,set)}set.add(source);sourceState.set(source,{baseMidi,midi});keyVisual(baseMidi,true);if(set.size===1)startVoice(midi,velocity);
}
function sourceUp(source){
  const st=sourceState.get(source);if(!st)return;sourceState.delete(source);const set=holders.get(st.midi);
  if(set){set.delete(source);if(!set.size){holders.delete(st.midi);if(sustainPedal)sustained.add(st.midi);else stopVoice(st.midi)}}
  if(![...sourceState.values()].some(x=>x.baseMidi===st.baseMidi))keyVisual(st.baseMidi,false);
}
function releaseSustain(){for(const midi of sustained)if(!holders.has(midi))stopVoice(midi);sustained.clear()}
function allOff(fast=false){for(const source of [...sourceState.keys()])sourceUp(source);for(const midi of [...sustained])stopVoice(midi,fast);sustained.clear();holders.clear();pointerSources.clear();for(const el of keysByMidi.values())el.classList.remove('is-down');renderer?.releaseAll()}
function setPreset(next){
  if(!PRESETS[next]||next===preset)return;allOff(true);preset=next;const p=PRESETS[next];
  Object.assign(settings,{attack:p.attack,decay:p.decay,sustain:p.sustain,release:p.release,brightness:p.brightness,resonance:p.resonance,space:p.space,detune:p.detune,stereo:p.stereo});
  applyAudioSettings();saveSettings();root?.querySelectorAll('[data-lp-preset]').forEach(b=>b.classList.toggle('active',b.dataset.lpPreset===preset));syncSettingsUI();syncDisplay();
}
function setOctave(next){next=clamp(next,-2,2);if(next===octave)return;allOff(true);octave=next;syncDisplay()}
function setSustain(next){sustainPedal=!!next;root?.querySelector('[data-lp-sustain]')?.classList.toggle('active',sustainPedal);if(!sustainPedal)releaseSustain();syncDisplay()}
function syncDisplay(){
  if(!root)return;root.querySelector('[data-lp-note]')?.replaceChildren(document.createTextNode(lastPlayed));root.querySelector('[data-lp-octave]')?.replaceChildren(document.createTextNode(octave===0?'0':octave>0?`+${octave}`:`${octave}`));
  root.querySelector('[data-lp-preset-label]')?.replaceChildren(document.createTextNode(PRESETS[preset].label));root.querySelector('[data-lp-poly-live]')?.replaceChildren(document.createTextNode(`${voices.size}/${effectivePoly()}`));
}
function keyLabel(midi){
  const codeIndex=KEY_MIDIS.indexOf(midi),map={KeyA:'A',KeyW:'W',KeyS:'S',KeyE:'E',KeyD:'D',KeyF:'F',KeyT:'T',KeyG:'G',KeyY:'Y',KeyH:'H',KeyU:'U',KeyJ:'J',KeyK:'K',KeyO:'O',KeyL:'L',KeyP:'P',Semicolon:';'},kbd=codeIndex>=0?(map[KEY_CODES[codeIndex]]||''):'';
  return `<span>${noteName(midi)}</span>${kbd?`<small>${kbd}</small>`:''}`;
}
function keyboardMarkup(){
  const mode=MODES[settings.mode],min=mode.min,max=mode.max,whites=[];for(let m=min;m<=max;m++)if(isWhite(m))whites.push(m);
  const gap=5,blackW=Math.max(18,settings.keyWidth*.62),whiteIndex=new Map(whites.map((m,i)=>[m,i])),black=[];
  for(let m=min;m<=max;m++)if(!isWhite(m)){let prev=m-1;while(prev>=min&&!isWhite(prev))prev--;const wi=whiteIndex.get(prev);if(Number.isInteger(wi))black.push({m,left:(wi+1)*(settings.keyWidth+gap)-gap/2-blackW/2})}
  const width=whites.length*settings.keyWidth+(whites.length-1)*gap;
  return `<div class="lp-keyboard-scroll" data-lp-scroll><div class="lp-keyboard ${settings.labels?'show-labels':'hide-labels'}" data-lp-board role="application" aria-label="Liquid Glass electronic piano" style="--lp-key-h:${settings.keyHeight}px;--lp-black-h:${settings.blackHeight}%;--lp-white-w:${settings.keyWidth}px;--lp-gap:${gap}px;width:${width}px;height:${settings.keyHeight}px"><div class="lp-whites">${whites.map(m=>`<button type="button" class="lp-key white" data-lp-midi="${m}" aria-label="${noteName(m)} piano key">${keyLabel(m)}</button>`).join('')}</div>${black.map(({m,left})=>`<button type="button" class="lp-key black" data-lp-midi="${m}" style="left:${left}px;width:${blackW}px" aria-label="${noteName(m)} piano key">${keyLabel(m)}</button>`).join('')}</div></div>`;
}
function range(id,label,min,max,step,value,fmt=''){
  return `<label class="lp-setting"><span>${label}<b data-lp-value="${id}">${formatValue(id,value,fmt)}</b></span><input type="range" data-lp-setting="${id}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
}
function formatValue(id,v,fmt=''){
  if(['attack','decay','release'].includes(id))return `${Number(v).toFixed(Number(v)<.1?3:2)}s`;
  if(id==='sustain'||id==='space'||id==='stereo'||id==='velocity'||id==='refraction'||id==='chromatic'||id==='depth')return Number(v).toFixed(2);
  if(id==='brightness')return `${Math.round(v/100)/10}k`;
  if(id==='detune')return `${Math.round(v)}¢`;
  return `${Math.round(v)}${fmt}`;
}
function settingsMarkup(){
  return `<aside class="lp-settings" data-lp-settings-panel aria-label="Piano settings">
    <div class="lp-settings-head"><div><span>INSTRUMENT</span><strong>Detailed controls</strong></div><button type="button" data-lp-settings-close aria-label="Close settings">×</button></div>
    <section><h3>Keyboard</h3><div class="lp-mode-grid">${Object.entries(MODES).map(([id,m])=>`<button type="button" data-lp-mode="${id}" class="${settings.mode===id?'active':''}">${m.label}</button>`).join('')}</div>
      ${range('keyWidth','Key width',32,96,1,settings.keyWidth,'px')}${range('keyHeight','Key height',190,430,5,settings.keyHeight,'px')}${range('blackHeight','Black key',48,75,1,settings.blackHeight,'%')}
      <div class="lp-toggle-row"><button type="button" data-lp-toggle="labels" class="${settings.labels?'active':''}">Labels</button><button type="button" data-lp-toggle="glide" class="${settings.glide?'active':''}">Glissando</button></div>
    </section>
    <section><h3>Sound</h3>${range('attack','Attack',.002,.18,.002,settings.attack)}${range('decay','Decay',.05,1.6,.01,settings.decay)}${range('sustain','Sustain',.05,.95,.01,settings.sustain)}${range('release','Release',.04,2.2,.02,settings.release)}
      ${range('brightness','Brightness',700,12000,100,settings.brightness)}${range('resonance','Resonance',.2,8,.1,settings.resonance)}${range('space','Space',0,.7,.01,settings.space)}${range('detune','Detune',0,24,1,settings.detune)}${range('stereo','Stereo',0,1,.02,settings.stereo)}${range('velocity','Velocity',.35,1,.01,settings.velocity)}${range('polyphony','Polyphony',4,16,1,settings.polyphony)}
    </section>
    <section><h3>Liquid / performance</h3><div class="lp-mode-grid">${Object.entries(QUALITY).map(([id,q])=>`<button type="button" data-lp-quality="${id}" class="${settings.quality===id?'active':''}">${q.label}</button>`).join('')}</div>
      ${range('refraction','Refraction',.25,1.8,.01,settings.refraction)}${range('chromatic','Chromatic',0,1.4,.01,settings.chromatic)}${range('depth','Glass depth',.25,1.6,.01,settings.depth)}
      <p class="lp-perf-note">Performance는 실제 굴절을 유지하면서 렌더 해상도와 RGB 샘플 수를 줄입니다. Idle 상태에서는 RAF가 0입니다.</p>
    </section>
  </aside>`;
}
function markup(){
  return `<div class="lp-page" data-lp-root>
    <section class="lp-hero"><div class="lp-kicker">WEBGL2 / REFRACTIVE INSTRUMENT</div><div><h1>Liquid<br>Piano.</h1><p>한 장의 GPU surface에서 배경 픽셀 좌표를 실제로 굴절시키고, 건반은 투명한 입력 레이어만 남깁니다. 연주하지 않을 때 렌더 루프는 멈춥니다.</p></div></section>
    <section class="lp-instrument"><div class="lp-stage" data-lp-stage data-renderer="boot">
      <canvas class="lp-gl-canvas" data-lp-gl aria-hidden="true"></canvas>
      <div class="lp-stagebar">
        <div class="lp-presets" role="group" aria-label="Sound preset">${Object.entries(PRESETS).map(([id,p])=>`<button type="button" data-lp-preset="${id}" class="${id===preset?'active':''}">${p.label}</button>`).join('')}</div>
        <div class="lp-center"><button type="button" data-lp-oct-down aria-label="Octave down">−</button><div class="lp-readout"><span>OCT</span><strong data-lp-octave>0</strong></div><button type="button" data-lp-oct-up aria-label="Octave up">+</button></div>
        <div class="lp-actions"><button type="button" data-lp-sustain>Sustain</button><label class="lp-volume"><span>VOL</span><input data-lp-volume type="range" min="0" max="100" value="72" aria-label="Volume"></label><button type="button" data-lp-settings-open aria-label="Open settings">⌘</button><button type="button" data-lp-full aria-label="Fullscreen">⛶</button></div>
      </div>
      <div class="lp-field"><div class="lp-frequency"><span data-lp-note>—</span><small><b data-lp-preset-label>Glass</b> · <i data-lp-renderer>GPU INIT</i> · VOICES <em data-lp-poly-live>0/${effectivePoly()}</em></small></div></div>
      <div data-lp-board-host>${keyboardMarkup()}</div>
      <div class="lp-hint"><span>A W S E D F T G Y H U J K O L P ;</span><span>Space sustain · Z/X octave · settings ⌘</span></div>
      ${settingsMarkup()}
    </div></section>
    <section class="lp-notes"><article><span>01</span><h2>Single-pass optics</h2><p>SDF 법선으로 배경 texture sampling 좌표를 이동하고, Fresnel·specular·chromatic aberration을 한 WebGL2 surface에서 합성합니다.</p></article><article><span>02</span><h2>Zero idle animation</h2><p>키 press가 settle되면 requestAnimationFrame을 완전히 중지합니다. 건반별 backdrop-filter도 없습니다.</p></article><article><span>03</span><h2>Instrument controls</h2><p>건반 폭·높이·범위, ADSR, filter, space, detune, stereo, polyphony, 굴절 품질을 연주 중 직접 조절합니다.</p></article></section>
  </div>`;
}
function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const msg=gl.getShaderInfoLog(s)||'shader compile failed';gl.deleteShader(s);throw Error(msg)}return s}
function program(gl,vs,fs){const p=gl.createProgram(),a=compile(gl,gl.VERTEX_SHADER,vs),b=compile(gl,gl.FRAGMENT_SHADER,fs);gl.attachShader(p,a);gl.attachShader(p,b);gl.linkProgram(p);gl.deleteShader(a);gl.deleteShader(b);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const msg=gl.getProgramInfoLog(p)||'program link failed';gl.deleteProgram(p);throw Error(msg)}return p}
function makeRenderer(stage,canvas,keyEls){
  let gl;try{gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'})}catch{}
  if(!gl)return null;
  const count=Math.min(keyEls.length,MAX_KEYS),coarse=matchMedia?.('(pointer:coarse)')?.matches||false;
  const rects=new Float32Array(MAX_KEYS*4),meta=new Float32Array(MAX_KEYS*4),press=new Float32Array(MAX_KEYS),targets=new Float32Array(MAX_KEYS),midiToIndex=new Map(),hit=[];
  keyEls.slice(0,count).forEach((el,i)=>{const m=Number(el.dataset.lpMidi);midiToIndex.set(m,i);meta[i*4]=el.classList.contains('black')?1:0});
  const bgVS=`#version 300 es
precision highp float;out vec2 v_uv;const vec2 P[3]=vec2[3](vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));void main(){vec2 p=P[gl_VertexID];v_uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
  const bgFS=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 outColor;uniform float u_energy;uniform float u_hue;
vec3 pal(float h){vec3 k=vec3(0.,4.,2.);return .54+.46*cos(6.28318*(h+k/3.));}
void main(){vec2 uv=v_uv;vec3 base=mix(vec3(.013,.020,.033),vec3(.050,.070,.105),uv.y);vec3 c1=pal(fract(u_hue)),c2=pal(fract(u_hue+.21));
float a=exp(-dot((uv-vec2(.22,.72))*vec2(2.4,2.0),(uv-vec2(.22,.72))*vec2(2.4,2.0)));
float b=exp(-dot((uv-vec2(.80,.43))*vec2(2.0,2.2),(uv-vec2(.80,.43))*vec2(2.0,2.2)));
vec2 g=abs(fract(uv*vec2(22.,13.))-.5);float grid=(1.-smoothstep(.475,.5,max(g.x,g.y)))*.045;
float bands=.022*(.5+.5*sin((uv.x*9.+uv.y*4.)*6.28318));
outColor=vec4(base+c1*a*(.08+.12*u_energy)+c2*b*(.065+.10*u_energy)+grid+bands,1.);}`;
  const keyVS=`#version 300 es
precision highp float;uniform vec2 u_cssSize;uniform vec4 u_rects[64];uniform vec4 u_meta[64];out vec2 v_local;flat out float v_kind;flat out float v_press;flat out vec2 v_size;
const vec2 P[6]=vec2[6](vec2(0.,0.),vec2(1.,0.),vec2(0.,1.),vec2(0.,1.),vec2(1.,0.),vec2(1.,1.));
void main(){int i=gl_InstanceID;vec4 r=u_rects[i];vec2 q=P[gl_VertexID];float pr=u_meta[i].y;vec2 px=r.xy+q*r.zw;px.y+=pr*(u_meta[i].x>.5?5.:7.);vec2 ndc=vec2(px.x/u_cssSize.x*2.-1.,1.-px.y/u_cssSize.y*2.);gl_Position=vec4(ndc,0.,1.);v_local=q;v_kind=u_meta[i].x;v_press=pr;v_size=r.zw;}`;
  const keyFS=`#version 300 es
precision highp float;uniform sampler2D u_scene;uniform vec2 u_resolution;uniform int u_pass;uniform float u_quality;uniform float u_refraction;uniform float u_chromatic;uniform float u_depth;
in vec2 v_local;flat in float v_kind;flat in float v_press;flat in vec2 v_size;out vec4 outColor;
float sdRoundBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
void main(){int kind=int(v_kind+.5);if(kind!=u_pass)discard;vec2 halfS=max(vec2(3.),v_size*.5-vec2(1.25));vec2 p=(v_local-.5)*v_size;float rad=min(kind==0?20.:13.,min(halfS.x,halfS.y)*.34);
float pressProfile=exp(-dot((v_local-vec2(.5,.66))*vec2(3.8,3.0),(v_local-vec2(.5,.66))*vec2(3.8,3.0)))*v_press;p.y+=pressProfile*2.2*u_depth;
float d=sdRoundBox(p,halfS,rad),aa=max(fwidth(d)*1.25,.65),mask=1.-smoothstep(-aa,aa,d);if(mask<.01)discard;
float inside=max(-d,0.),edge=1.-smoothstep(0.,kind==0?20.:12.,inside);vec2 q=p/max(halfS,vec2(1.)),normal;
if(u_quality<.5)normal=normalize(vec2(q.x*1.28,q.y*.76)+vec2(.0001));
else{float e=1.15;normal=normalize(vec2(sdRoundBox(p+vec2(e,0.),halfS,rad)-sdRoundBox(p-vec2(e,0.),halfS,rad),sdRoundBox(p+vec2(0.,e),halfS,rad)-sdRoundBox(p-vec2(0.,e),halfS,rad))+vec2(.00001));}
vec2 uv=gl_FragCoord.xy/u_resolution;float refr=((kind==0?4.8:6.0)*edge*u_depth+pressProfile*3.2)*u_refraction;vec2 off=normal*refr/u_resolution;
vec3 col;if(u_quality<.5||u_chromatic<.01)col=texture(u_scene,uv+off).rgb;else{vec2 ca=normal*(.45+1.35*edge)*u_chromatic/u_resolution;col=vec3(texture(u_scene,uv+off+ca).r,texture(u_scene,uv+off).g,texture(u_scene,uv+off-ca).b);}
float rim=1.-smoothstep(0.,1.6,abs(d)),fres=pow(edge,1.45),spec=pow(max(dot(normal,normalize(vec2(-.56,.83))),0.),18.)*edge;
if(kind==0){col=mix(col,vec3(.86,.95,1.),.055+fres*.085);col+=vec3(.64,.84,1.)*(rim*.24+spec*.30);}else{col*=.36;col+=vec3(.022,.040,.068);col+=vec3(.44,.64,.88)*(rim*.13+spec*.18);}
col+=pressProfile*(kind==0?vec3(.035,.065,.085):vec3(.018,.035,.055));outColor=vec4(col,1.);}`;
  let bgP,keyP,tex=null,fbo=null,w=0,h=0,cssW=0,cssH=0,raf=0,lastFrame=0,sceneDirty=true,sceneEnergy=.35,sceneHue=.56,destroyed=false,measureQueued=false;
  try{bgP=program(gl,bgVS,bgFS);keyP=program(gl,keyVS,keyFS)}catch(e){console.error('[Liquid Piano] WebGL shader',e);return null}
  const U={bg:{energy:gl.getUniformLocation(bgP,'u_energy'),hue:gl.getUniformLocation(bgP,'u_hue')},key:{
    cssSize:gl.getUniformLocation(keyP,'u_cssSize'),rects:gl.getUniformLocation(keyP,'u_rects[0]'),meta:gl.getUniformLocation(keyP,'u_meta[0]'),scene:gl.getUniformLocation(keyP,'u_scene'),resolution:gl.getUniformLocation(keyP,'u_resolution'),pass:gl.getUniformLocation(keyP,'u_pass'),
    quality:gl.getUniformLocation(keyP,'u_quality'),refraction:gl.getUniformLocation(keyP,'u_refraction'),chromatic:gl.getUniformLocation(keyP,'u_chromatic'),depth:gl.getUniformLocation(keyP,'u_depth')
  }};
  function alloc(){
    const r=stage.getBoundingClientRect(),q=QUALITY[settings.quality];cssW=Math.max(2,r.width);cssH=Math.max(2,r.height);const dpr=Math.min(devicePixelRatio||1,coarse?q.mobileDpr:q.desktopDpr),maxPx=coarse?q.mobilePx:q.desktopPx,raw=cssW*cssH*dpr*dpr,scale=dpr*Math.min(1,Math.sqrt(maxPx/Math.max(raw,1)));w=Math.max(2,Math.round(cssW*scale));h=Math.max(2,Math.round(cssH*scale));
    if(canvas.width===w&&canvas.height===h)return false;canvas.width=w;canvas.height=h;canvas.style.width='100%';canvas.style.height='100%';
    if(tex)gl.deleteTexture(tex);if(fbo)gl.deleteFramebuffer(fbo);tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);gl.bindFramebuffer(gl.FRAMEBUFFER,null);sceneDirty=true;return true;
  }
  function measure(){if(destroyed)return;alloc();const sr=stage.getBoundingClientRect();hit.length=0;keyEls.slice(0,count).forEach((el,i)=>{const r=el.getBoundingClientRect(),x=r.left-sr.left,y=r.top-sr.top;rects.set([x,y,r.width,r.height],i*4);hit.push({midi:Number(el.dataset.lpMidi),black:el.classList.contains('black'),left:r.left,top:r.top,right:r.right,bottom:r.bottom})});hit.sort((a,b)=>Number(b.black)-Number(a.black));invalidate(true)}
  function scheduleMeasure(){if(measureQueued)return;measureQueued=true;requestAnimationFrame(()=>{measureQueued=false;measure()})}
  function hitTest(x,y){for(const r of hit)if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return r.midi;return null}
  function renderScene(){gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.viewport(0,0,w,h);gl.useProgram(bgP);gl.uniform1f(U.bg.energy,sceneEnergy);gl.uniform1f(U.bg.hue,sceneHue);gl.drawArrays(gl.TRIANGLES,0,3);gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,null);sceneDirty=false}
  function renderKeys(){
    gl.viewport(0,0,w,h);for(let i=0;i<count;i++)meta[i*4+1]=press[i];gl.useProgram(keyP);gl.uniform2f(U.key.cssSize,cssW,cssH);gl.uniform4fv(U.key.rects,rects);gl.uniform4fv(U.key.meta,meta);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(U.key.scene,0);gl.uniform2f(U.key.resolution,w,h);
    gl.uniform1f(U.key.quality,QUALITY[settings.quality].shader);gl.uniform1f(U.key.refraction,settings.refraction);gl.uniform1f(U.key.chromatic,settings.chromatic);gl.uniform1f(U.key.depth,settings.depth);gl.disable(gl.BLEND);
    gl.uniform1i(U.key.pass,0);gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);gl.uniform1i(U.key.pass,1);gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);
  }
  function draw(){if(destroyed||!w||!h)return;if(sceneDirty)renderScene();else{gl.bindFramebuffer(gl.READ_FRAMEBUFFER,fbo);gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER,null);gl.blitFramebuffer(0,0,w,h,0,0,w,h,gl.COLOR_BUFFER_BIT,gl.NEAREST);gl.bindFramebuffer(gl.FRAMEBUFFER,null)}renderKeys()}
  function frame(ts){raf=0;if(destroyed)return;const dt=lastFrame?Math.min(2,(ts-lastFrame)/16.67):1;lastFrame=ts;let active=false;for(let i=0;i<count;i++){const k=targets[i]>press[i]?.42:.24;const next=press[i]+(targets[i]-press[i])*(1-Math.pow(1-k,dt));if(Math.abs(next-targets[i])>.008)active=true;press[i]=Math.abs(next-targets[i])<.008?targets[i]:next}draw();if(active)raf=requestAnimationFrame(frame);else lastFrame=0}
  function invalidate(force=false){if(force)sceneDirty=true;if(!raf)raf=requestAnimationFrame(frame)}
  function setPressed(m,on){const i=midiToIndex.get(m);if(i==null)return;targets[i]=on?1:0;invalidate(false)}
  function releaseAll(){targets.fill(0);invalidate(false)}
  function accent(m){sceneHue=((m%12)/12+.49)%1;sceneEnergy=.58;sceneDirty=true;invalidate(false)}
  function opticsChanged(realloc=false){if(realloc)alloc();sceneDirty=true;invalidate(false)}
  function destroy(){destroyed=true;if(raf)cancelAnimationFrame(raf);try{gl.deleteProgram(bgP);gl.deleteProgram(keyP);if(tex)gl.deleteTexture(tex);if(fbo)gl.deleteFramebuffer(fbo)}catch{}}
  measure();stage.dataset.renderer='webgl2';return{setPressed,releaseAll,accent,measure:scheduleMeasure,hitTest,opticsChanged,destroy};
}
function nav(){document.querySelectorAll('[data-nav]').forEach(n=>n.classList.remove('active'));document.querySelector('[data-nav="piano"]')?.classList.add('active')}
function syncSettingsUI(){
  if(!root)return;root.querySelectorAll('[data-lp-mode]').forEach(b=>b.classList.toggle('active',b.dataset.lpMode===settings.mode));root.querySelectorAll('[data-lp-quality]').forEach(b=>b.classList.toggle('active',b.dataset.lpQuality===settings.quality));
  root.querySelectorAll('[data-lp-setting]').forEach(input=>{const id=input.dataset.lpSetting;if(id in settings)input.value=settings[id]});
  root.querySelectorAll('[data-lp-toggle]').forEach(b=>b.classList.toggle('active',!!settings[b.dataset.lpToggle]));
  root.querySelectorAll('[data-lp-value]').forEach(el=>{const id=el.dataset.lpValue;el.textContent=formatValue(id,settings[id],id==='keyWidth'||id==='keyHeight'?'px':id==='blackHeight'?'%':'')});
}
function rebuildKeyboard({center=true}={}){
  if(!root||!boardHost)return;allOff(true);renderer?.destroy();renderer=null;resizeObserver?.disconnect();boardHost.innerHTML=keyboardMarkup();const stage=root.querySelector('[data-lp-stage]'),canvas=root.querySelector('[data-lp-gl]'),board=root.querySelector('[data-lp-board]'),keyEls=[...root.querySelectorAll('[data-lp-midi]')];
  scrollNode=root.querySelector('[data-lp-scroll]');keysByMidi=new Map(keyEls.map(el=>[Number(el.dataset.lpMidi),el]));renderer=makeRenderer(stage,canvas,keyEls);stage.dataset.renderer=renderer?'webgl2':'fallback';root.querySelector('[data-lp-renderer]').textContent=renderer?`WEBGL2 ${settings.quality.toUpperCase()}`:'LITE FALLBACK';
  resizeObserver=new ResizeObserver(()=>renderer?.measure());resizeObserver.observe(stage);resizeObserver.observe(board);scrollNode?.addEventListener('scroll',()=>renderer?.measure(),{passive:true});
  if(center)requestAnimationFrame(()=>{const c=keysByMidi.get(60),s=scrollNode;if(c&&s){s.scrollLeft=Math.max(0,c.offsetLeft-s.clientWidth*.35)}renderer?.measure()});
}
function applyMode(mode){
  if(!MODES[mode])return;settings.mode=mode;settings.keyWidth=MODES[mode].keyWidth;settings.keyHeight=MODES[mode].keyHeight;if(mode==='performance')settings.labels=false;else if(mode==='compact')settings.labels=true;
  saveSettings();syncSettingsUI();rebuildKeyboard();
}
function applySetting(id,value){
  if(!(id in settings))return;settings[id]=typeof DEFAULTS[id]==='boolean'?!!value:Number(value);settings=normalizeSettings(settings);saveSettings();
  if(['keyWidth','keyHeight','blackHeight'].includes(id)){syncSettingsUI();rebuildKeyboard({center:false});return}
  if(['attack','decay','sustain','release','brightness','resonance','space','detune','stereo','velocity','polyphony'].includes(id)){if(id==='space')applyAudioSettings();syncSettingsUI();syncDisplay();return}
  if(['refraction','chromatic','depth'].includes(id)){syncSettingsUI();renderer?.opticsChanged(false)}
}
function setQuality(q){if(!QUALITY[q]||q===settings.quality)return;settings.quality=q;saveSettings();syncSettingsUI();renderer?.opticsChanged(true);root.querySelector('[data-lp-renderer]').textContent=`WEBGL2 ${q.toUpperCase()}`;syncDisplay()}
function toggleSettings(on){root?.querySelector('[data-lp-settings-panel]')?.classList.toggle('open',on)}
async function toggleFullscreen(){
  const stage=root?.querySelector('[data-lp-stage]');if(!stage)return;
  try{
    if(document.fullscreenElement){await document.exitFullscreen();return}
    if(stage.requestFullscreen){await stage.requestFullscreen();return}
  }catch{}
  pseudoFull=!pseudoFull;stage.classList.toggle('is-pseudo-fullscreen',pseudoFull);document.documentElement.classList.toggle('lp-pseudo-fullscreen',pseudoFull);requestAnimationFrame(()=>renderer?.measure());
}
function bind(){
  const stage=root.querySelector('[data-lp-stage]');boardHost=root.querySelector('[data-lp-board-host]');
  rebuildKeyboard();
  root.querySelectorAll('[data-lp-preset]').forEach(b=>b.addEventListener('click',()=>{prewarm();setPreset(b.dataset.lpPreset)}));
  root.querySelector('[data-lp-oct-down]')?.addEventListener('click',()=>{prewarm();setOctave(octave-1)});root.querySelector('[data-lp-oct-up]')?.addEventListener('click',()=>{prewarm();setOctave(octave+1)});
  root.querySelector('[data-lp-sustain]')?.addEventListener('click',()=>{prewarm();setSustain(!sustainPedal)});root.querySelector('[data-lp-volume]')?.addEventListener('input',e=>{volume=Number(e.currentTarget.value)/100;if(audio)audio.master.gain.setTargetAtTime(volume,audio.ctx.currentTime,.02)});
  root.querySelector('[data-lp-full]')?.addEventListener('click',toggleFullscreen);root.querySelector('[data-lp-settings-open]')?.addEventListener('click',()=>toggleSettings(true));root.querySelector('[data-lp-settings-close]')?.addEventListener('click',()=>toggleSettings(false));
  root.querySelectorAll('[data-lp-mode]').forEach(b=>b.addEventListener('click',()=>applyMode(b.dataset.lpMode)));root.querySelectorAll('[data-lp-quality]').forEach(b=>b.addEventListener('click',()=>setQuality(b.dataset.lpQuality)));
  root.querySelectorAll('[data-lp-toggle]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.lpToggle;settings[id]=!settings[id];saveSettings();syncSettingsUI();if(id==='labels')rebuildKeyboard({center:false})}));
  root.querySelectorAll('[data-lp-setting]').forEach(input=>input.addEventListener('input',e=>applySetting(e.currentTarget.dataset.lpSetting,e.currentTarget.value)));
  const pointerVelocity=e=>e.pressure>0?clamp(.45+e.pressure*.55,.45,1):.8;
  boardHost.addEventListener('pointerdown',e=>{const key=e.target.closest('[data-lp-midi]');if(!key)return;e.preventDefault();prewarm();const id=`p:${e.pointerId}`,board=root.querySelector('[data-lp-board]');pointerSources.set(e.pointerId,id);try{board?.setPointerCapture(e.pointerId)}catch{}sourceDown(id,Number(key.dataset.lpMidi),pointerVelocity(e))});
  boardHost.addEventListener('pointermove',e=>{const id=pointerSources.get(e.pointerId);if(!id||!settings.glide)return;e.preventDefault();const fallback=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-lp-midi]'),midi=renderer?renderer.hitTest(e.clientX,e.clientY):Number(fallback?.dataset.lpMidi),st=sourceState.get(id);if(Number.isFinite(midi)&&midi!==st?.baseMidi)sourceDown(id,midi,pointerVelocity(e))});
  const endPointer=e=>{const id=pointerSources.get(e.pointerId);if(!id)return;sourceUp(id);pointerSources.delete(e.pointerId);try{root.querySelector('[data-lp-board]')?.releasePointerCapture(e.pointerId)}catch{}};
  boardHost.addEventListener('pointerup',endPointer);boardHost.addEventListener('pointercancel',endPointer);
  addEventListener('fullscreenchange',()=>{pseudoFull=false;document.documentElement.classList.remove('lp-pseudo-fullscreen');requestAnimationFrame(()=>renderer?.measure())});
  syncSettingsUI();syncDisplay();
}
function onKeyDown(e){
  if(route()!==R||e.repeat||e.target?.matches?.('input,textarea,select'))return;
  if(e.code==='Space'){e.preventDefault();if(!keydowns.has('Space')){keydowns.add('Space');prewarm();setSustain(true)}return}
  if(e.code==='KeyZ'){e.preventDefault();setOctave(octave-1);return}if(e.code==='KeyX'){e.preventDefault();setOctave(octave+1);return}
  const idx=KEY_CODES.indexOf(e.code);if(idx<0||keydowns.has(e.code))return;e.preventDefault();keydowns.add(e.code);prewarm();sourceDown(`k:${e.code}`,KEY_MIDIS[idx],.84);
}
function onKeyUp(e){if(e.code==='Space'){keydowns.delete('Space');if(route()===R)setSustain(false);return}const idx=KEY_CODES.indexOf(e.code);if(idx<0)return;keydowns.delete(e.code);sourceUp(`k:${e.code}`)}
function teardown(){
  if(!root)return;allOff(true);resizeObserver?.disconnect();resizeObserver=null;renderer?.destroy();renderer=null;if(pseudoFull){pseudoFull=false;document.documentElement.classList.remove('lp-pseudo-fullscreen')}root=null;boardHost=null;keysByMidi.clear();keydowns.clear();
}
function mount(){if(route()!==R){teardown();return}if(root?.isConnected)return;teardown();app.innerHTML=markup();root=app.querySelector('[data-lp-root]');nav();bind();app.focus({preventScroll:true});scrollTo({top:0,behavior:'instant'})}
addEventListener('keydown',onKeyDown);addEventListener('keyup',onKeyUp);addEventListener('blur',()=>allOff(true));addEventListener('hashchange',()=>queueMicrotask(mount));mount();
})();