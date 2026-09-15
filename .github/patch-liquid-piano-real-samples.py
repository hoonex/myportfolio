from pathlib import Path
import re

JS = Path('journal-v15-liquid-piano.js')
CSS = Path('journal-v15-liquid-piano.css')
LOADER = Path('journal-route-loader.js')
INDEX = Path('index.html')

js = JS.read_text()
css = CSS.read_text()
loader = LOADER.read_text()
index = INDEX.read_text()

old_build = "PIANO3_1-MOBILEPERF-20260915-1428"
new_build = "PIANO3_2-REALPIANO-20260915-1522"
old_site = "SITE49-LIQUIDPIANO3_1-MOBILEPERF-20260915-1428"
new_site = "SITE50-LIQUIDPIANO3_2-REALPIANO-20260915-1522"

assert old_build in js
js = js.replace(old_build, new_build, 1)

sample_consts = r"""
const SAMPLE_BASE='https://tonejs.github.io/audio/salamander/';
const SAMPLE_ANCHORS=[
  [21,'A0.mp3'],[24,'C1.mp3'],[27,'Ds1.mp3'],[30,'Fs1.mp3'],[33,'A1.mp3'],
  [36,'C2.mp3'],[39,'Ds2.mp3'],[42,'Fs2.mp3'],[45,'A2.mp3'],[48,'C3.mp3'],
  [51,'Ds3.mp3'],[54,'Fs3.mp3'],[57,'A3.mp3'],[60,'C4.mp3'],[63,'Ds4.mp3'],
  [66,'Fs4.mp3'],[69,'A4.mp3'],[72,'C5.mp3'],[75,'Ds5.mp3'],[78,'Fs5.mp3'],
  [81,'A5.mp3'],[84,'C6.mp3'],[87,'Ds6.mp3'],[90,'Fs6.mp3'],[93,'A6.mp3'],[96,'C7.mp3']
].map(([midi,file])=>({midi,file}));
const SAMPLE_PREFETCH=new Set([45,48,51,54,57,60,63,66,69,72,75]);
""".strip()
needle = "const DEFAULTS={"
assert needle in js
js = js.replace(needle, sample_consts + "\n" + needle, 1)

old_state = "let settings=loadSettings(),root=null,audio=null,preset='glass',octave=0,sustainPedal=false,volume=.72;"
new_state = "let settings=loadSettings(),root=null,audio=null,preset='glass',octave=0,sustainPedal=false,volume=.72,sampleBank={raw:new Map(),buffers:new Map(),fetching:new Map(),decoding:new Map()};"
assert old_state in js
js = js.replace(old_state, new_state, 1)

ensure_pat = re.compile(r"function ensureAudio\(\)\{.*?\n\}\nfunction applyAudioSettings\(\)\{", re.S)
ensure_repl = r"""function ensureAudio(){
  if(audio){if(audio.ctx.state!=='running')audio.ctx.resume().catch(()=>{});return true}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;
  try{
    const ctx=new AC({latencyHint:'interactive'}),master=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),delay=ctx.createDelay(.65),feedback=ctx.createGain(),bass=ctx.createBiquadFilter(),compressor=ctx.createDynamicsCompressor();
    master.gain.value=volume;dry.gain.value=.96;bass.type='lowshelf';bass.frequency.value=210;bass.gain.value=5.25;compressor.threshold.value=-18;compressor.knee.value=16;compressor.ratio.value=3.4;compressor.attack.value=.003;compressor.release.value=.15;
    dry.connect(master);delay.connect(wet);wet.connect(master);delay.connect(feedback);feedback.connect(delay);master.connect(bass);bass.connect(compressor);compressor.connect(ctx.destination);
    audio={ctx,master,dry,wet,delay,feedback,bass,compressor};applyAudioSettings();ctx.resume().catch(()=>{});return true;
  }catch(e){console.error('[Liquid Piano] audio init',e);return false}
}
function applyAudioSettings(){"""
js, n = ensure_pat.subn(ensure_repl, js, count=1)
assert n == 1, n

prewarm_pat = re.compile(r"function prewarm\(\)\{ensureAudio\(\)\}")
prewarm_repl = r"""function nearestSample(midi){let best=SAMPLE_ANCHORS[0],d=Infinity;for(const a of SAMPLE_ANCHORS){const x=Math.abs(a.midi-midi);if(x<d){best=a;d=x}}return best}
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
setTimeout(()=>{if(route()===R){prefetchSamples();installSampleCredit()}},0)"""
js, n = prewarm_pat.subn(prewarm_repl, js, count=1)
assert n == 1, n

start_pat = re.compile(r"function startVoice\(midi,velocity=\.8\)\{.*?\n\}\nfunction stopVoice\(midi,fast=false\)\{", re.S)
start_repl = r"""function startVoice(midi,velocity=.8){
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
function stopVoice(midi,fast=false){"""
js, n = start_pat.subn(start_repl, js, count=1)
assert n == 1, n

old_stop = "for(const o of v.oscs)try{o.stop(end+.035)}catch{}\n  setTimeout(()=>{try{v.gate.disconnect();v.filter.disconnect();v.pan?.disconnect()}catch{}},Math.max(70,(end-t+.05)*1000));"
new_stop = "for(const o of v.oscs||[])try{o.stop(end+.035)}catch{};if(v.source)try{v.source.stop(end+.04)}catch{}\n  setTimeout(()=>{try{v.gate.disconnect();v.filter?.disconnect();v.pan?.disconnect();v.source?.disconnect()}catch{}},Math.max(70,(end-t+.05)*1000));"
assert old_stop in js
js = js.replace(old_stop, new_stop, 1)

# Keep attribution visually quiet and outside the hot rendering surface.
credit_css = "\n.lp-sample-credit{margin:12px 4px 0;color:var(--muted);font-size:.68rem;line-height:1.5}.lp-sample-credit a{color:inherit;text-underline-offset:2px}.lp-sample-credit strong{color:var(--text);font-weight:650}\n"
if '.lp-sample-credit{' not in css:
    css += credit_css

assert old_site in loader
loader = loader.replace(old_site, new_site, 1)
assert old_site in index
index = index.replace(old_site, new_site, 1)

JS.write_text(js)
CSS.write_text(css)
LOADER.write_text(loader)
INDEX.write_text(index)
