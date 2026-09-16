/* Liquid Piano v28 audio engine — sound first, samples warm off the input hot path. */
(()=>{
'use strict';
function createAudioEngine({settings,presets,sampleBase,sampleAnchors,isActive,onChange,onNote}){
  let audio=null,preset='grand',volume=.72,voiceSeq=0;
  const voices=new Map(),bank={raw:new Map(),buffers:new Map(),fetching:new Map(),decoding:new Map()};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const hz=m=>440*Math.pow(2,(m-69)/12);
  const poly=()=>settings.polyphony;
  function notify(){onChange?.(voices.size,poly(),preset)}
  function ensure(){
    if(audio){if(audio.ctx.state!=='running')audio.ctx.resume().catch(()=>{});return audio}
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    try{
      const ctx=new AC({latencyHint:'interactive'}),master=ctx.createGain(),dry=ctx.createGain(),wet=ctx.createGain(),delay=ctx.createDelay(.65),feedback=ctx.createGain(),bass=ctx.createBiquadFilter(),compressor=ctx.createDynamicsCompressor();
      master.gain.value=volume;dry.gain.value=.96;wet.gain.value=.08;delay.delayTime.value=.12;feedback.gain.value=.08;
      bass.type='lowshelf';bass.frequency.value=210;bass.gain.value=5.25;compressor.threshold.value=-18;compressor.knee.value=16;compressor.ratio.value=3.4;compressor.attack.value=.003;compressor.release.value=.15;
      dry.connect(master);delay.connect(wet);wet.connect(master);delay.connect(feedback);feedback.connect(delay);master.connect(bass);bass.connect(compressor);compressor.connect(ctx.destination);
      audio={ctx,master,dry,wet,delay,feedback,bass,compressor};applySettings();ctx.resume().catch(()=>{});return audio;
    }catch(error){console.error('[Liquid Piano] audio init',error);return null}
  }
  function applySettings(){if(!audio)return;const t=audio.ctx.currentTime,sp=settings.space;audio.wet.gain.setTargetAtTime(.015+sp*.42,t,.035);audio.delay.delayTime.setTargetAtTime(.075+sp*.28,t,.04);audio.feedback.gain.setTargetAtTime(.035+sp*.34,t,.04)}
  function nearest(midi){let best=sampleAnchors[0],d=Infinity;for(const a of sampleAnchors){const x=Math.abs(a.midi-midi);if(x<d){best=a;d=x}}return best}
  function fetchSample(anchor){
    if(!anchor||bank.buffers.has(anchor.midi)||bank.raw.has(anchor.midi))return Promise.resolve(anchor);if(bank.fetching.has(anchor.midi))return bank.fetching.get(anchor.midi);
    const p=fetch(sampleBase+anchor.file,{cache:'force-cache',mode:'cors'}).then(r=>{if(!r.ok)throw Error(`sample ${r.status} ${anchor.file}`);return r.arrayBuffer()}).then(buf=>{bank.raw.set(anchor.midi,buf);bank.fetching.delete(anchor.midi);return anchor}).catch(error=>{bank.fetching.delete(anchor.midi);console.warn('[Liquid Piano] sample fetch',anchor.file,error);return null});bank.fetching.set(anchor.midi,p);return p;
  }
  function decodeSample(anchor){
    if(!anchor||!audio)return Promise.resolve(null);if(bank.buffers.has(anchor.midi))return Promise.resolve(bank.buffers.get(anchor.midi));if(bank.decoding.has(anchor.midi))return bank.decoding.get(anchor.midi);
    const p=(bank.raw.has(anchor.midi)?Promise.resolve(anchor):fetchSample(anchor)).then(a=>{if(!a||!bank.raw.has(anchor.midi)||!audio)return null;return audio.ctx.decodeAudioData(bank.raw.get(anchor.midi).slice(0))}).then(buf=>{if(buf)bank.buffers.set(anchor.midi,buf);bank.decoding.delete(anchor.midi);return buf}).catch(error=>{bank.decoding.delete(anchor.midi);console.warn('[Liquid Piano] sample decode',anchor?.file,error);return null});bank.decoding.set(anchor.midi,p);return p;
  }
  function warmLater(anchor){if(!anchor||bank.buffers.has(anchor.midi)||bank.decoding.has(anchor.midi))return;const run=()=>{if(isActive()&&audio)decodeSample(anchor)};if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:900});else setTimeout(run,80)}
  function steal(){while(voices.size>=poly()){let oldest=null;for(const [m,v] of voices)if(!oldest||v.seq<oldest[1].seq)oldest=[m,v];if(!oldest)break;noteOff(oldest[0],true)}}
  function noteOn(midi,velocity=.8){
    const a=ensure();if(!a)return false;steal();const c=a.ctx,t=c.currentTime,anchor=nearest(midi),sample=preset==='grand'?bank.buffers.get(anchor.midi):null,vel=clamp(velocity*settings.velocity,.2,1),bassComp=midi<45?1.5:midi<52?1.34:midi<60?1.17:1;
    if(sample){
      const source=c.createBufferSource(),gate=c.createGain(),pan=c.createStereoPanner?c.createStereoPanner():null;source.buffer=sample;source.playbackRate.setValueAtTime(Math.pow(2,(midi-anchor.midi)/12),t);gate.gain.setValueAtTime(.0001,t);gate.gain.exponentialRampToValueAtTime(Math.max(.018,.21*vel*bassComp),t+.004);source.connect(gate);let out=gate;if(pan){gate.connect(pan);pan.pan.value=clamp(((midi-60)/24)*settings.stereo,-settings.stereo,settings.stereo);out=pan}out.connect(a.dry);out.connect(a.delay);source.start(t);voices.set(midi,{gate,filter:null,pan,oscs:[],source,seq:++voiceSeq});onNote?.(midi);notify();return true;
    }
    const base=presets[preset],f=hz(midi),gate=c.createGain(),filter=c.createBiquadFilter(),pan=c.createStereoPanner?c.createStereoPanner():null,oscs=[];filter.type='lowpass';filter.frequency.setValueAtTime(settings.brightness,t);filter.Q.value=settings.resonance;gate.gain.setValueAtTime(.0001,t);const peak=Math.max(.008,.145*vel*bassComp);gate.gain.exponentialRampToValueAtTime(peak,t+settings.attack);gate.gain.exponentialRampToValueAtTime(Math.max(.0002,peak*settings.sustain),t+settings.attack+settings.decay);
    base.partials.forEach(([mul,type,level],i)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f*mul,t);o.detune.value=(i?1:-.35)*settings.detune;g.gain.value=level;o.connect(g);g.connect(filter);o.start(t);oscs.push(o)});filter.connect(gate);let out=gate;if(pan){gate.connect(pan);pan.pan.value=clamp(((midi-60)/24)*settings.stereo,-settings.stereo,settings.stereo);out=pan}out.connect(a.dry);out.connect(a.delay);voices.set(midi,{gate,filter,pan,oscs,source:null,seq:++voiceSeq});onNote?.(midi);notify();if(preset==='grand')warmLater(anchor);return true;
  }
  function noteOff(midi,fast=false){
    const v=voices.get(midi);if(!v||!audio)return;voices.delete(midi);const t=audio.ctx.currentTime,g=v.gate.gain,end=t+(fast?.03:settings.release);try{g.cancelScheduledValues(t);g.setValueAtTime(Math.max(.0001,g.value||.02),t);g.exponentialRampToValueAtTime(.0001,end)}catch{g.setTargetAtTime(0,t,.02)}for(const o of v.oscs||[])try{o.stop(end+.025)}catch{};if(v.source)try{v.source.stop(end+.03)}catch{};setTimeout(()=>{try{v.gate.disconnect();v.filter?.disconnect();v.pan?.disconnect();v.source?.disconnect()}catch{}},Math.max(60,(end-t+.04)*1000));notify();
  }
  function stopAll(fast=true){for(const midi of [...voices.keys()])noteOff(midi,fast)}
  function setPreset(next){if(!presets[next]||next===preset)return false;stopAll(true);preset=next;const p=presets[next];Object.assign(settings,{attack:p.attack,decay:p.decay,sustain:p.sustain,release:p.release,brightness:p.brightness,resonance:p.resonance,space:p.space,detune:p.detune,stereo:p.stereo});applySettings();notify();return true}
  function setVolume(v){volume=clamp(Number(v)||0,0,1);if(audio)audio.master.gain.setTargetAtTime(volume,audio.ctx.currentTime,.02)}
  return{ensure,applySettings,noteOn,noteOff,stopAll,setPreset,setVolume,getPreset:()=>preset,getVoiceCount:()=>voices.size,getPolyphony:poly};
}
globalThis.HJPianoAudioV28={createAudioEngine};
})();
