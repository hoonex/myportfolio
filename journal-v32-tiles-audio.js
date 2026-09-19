/* Pulse Grid Tiles v32: Salamander grand samples with immediate acoustic-style fallback. */
(()=>{
'use strict';
if(globalThis.HJTilesAudioV32)return;
const BASE='https://tonejs.github.io/audio/salamander/';
const ANCHORS=[{midi:60,file:'C4.mp3'},{midi:63,file:'Ds4.mp3'},{midi:66,file:'Fs4.mp3'},{midi:69,file:'A4.mp3'}];
const AC=globalThis.AudioContext||globalThis.webkitAudioContext;
let ctx=null,master=null,loadPromise=null;
const decoding=new Map();
const raw=new Map(),buffers=new Map(),voices=new Set();
const nearest=midi=>ANCHORS.reduce((a,b)=>Math.abs(a.midi-midi)<=Math.abs(b.midi-midi)?a:b);
function ensure(){
 if(!AC)return null;
 if(ctx){if(ctx.state==='suspended')void ctx.resume().catch(()=>{});return ctx;}
 ctx=new AC({latencyHint:'interactive'});
 master=ctx.createGain();master.gain.value=.8;
 const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;comp.attack.value=.005;comp.release.value=.2;
 master.connect(comp);comp.connect(ctx.destination);if(ctx.state==='suspended')void ctx.resume().catch(()=>{});return ctx;
}
async function prepare(){
 if(loadPromise)return loadPromise;
 loadPromise=Promise.all(ANCHORS.map(async anchor=>{
  try{const response=await fetch(BASE+anchor.file,{mode:'cors',cache:'force-cache'});if(!response.ok)throw new Error('HTTP '+response.status);raw.set(anchor.midi,await response.arrayBuffer());return true;}
  catch(error){console.warn('[Tiles piano sample]',anchor.file,error);return false;}
 })).then(()=>{if(ctx)return decode();return raw.size;});
 return loadPromise;
}
async function decode(){
 if(!ctx)return 0;
 await Promise.all([...raw].map(async ([midi,bytes])=>{
  if(buffers.has(midi))return;
  if(decoding.has(midi))return decoding.get(midi);
  const job=ctx.decodeAudioData(bytes.slice(0)).then(buffer=>{buffers.set(midi,buffer);}).catch(err=>{console.warn('[Tiles piano decode]',midi,err);}).finally(()=>decoding.delete(midi));
  decoding.set(midi,job);return job;
 }));
 return buffers.size;
}
function warm(){ensure();return prepare().then(()=>decode());}
function play(midi){
 const c=ensure();if(!c)return;
 if(raw.size>buffers.size)void decode();
 const t=c.currentTime,anchor=nearest(midi),sample=buffers.get(anchor.midi);
 if(sample){
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=sample;
  source.playbackRate.value=Math.pow(2,(midi-anchor.midi)/12);
  gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.32,t+.004);
  gain.gain.setTargetAtTime(.0001,t+.42,.35);source.connect(gain);gain.connect(master);
  source.start(t);source.stop(t+Math.min(2.4,sample.duration/Math.max(.1,source.playbackRate.value)));
  voices.add(source);source.onended=()=>{voices.delete(source);try{source.disconnect();gain.disconnect();}catch{}};
  return;
 }
 // A short multispectral struck-string fallback plays immediately while recordings load.
 const fundamental=440*Math.pow(2,(midi-69)/12),bus=c.createGain();
 bus.gain.setValueAtTime(.0001,t);bus.gain.exponentialRampToValueAtTime(.16,t+.003);
 bus.gain.exponentialRampToValueAtTime(.025,t+.27);bus.gain.exponentialRampToValueAtTime(.0001,t+1.1);bus.connect(master);
 [1,2,3,4,5].forEach((multiple,i)=>{
  const osc=c.createOscillator(),g=c.createGain();osc.type='sine';osc.frequency.value=fundamental*multiple;g.gain.value=[1,.24,.11,.07,.035][i];
  osc.connect(g);g.connect(bus);osc.start(t);osc.stop(t+1.12);
  voices.add(osc);osc.onended=()=>{voices.delete(osc);try{osc.disconnect();g.disconnect();}catch{}};
 });
}
function stop(){for(const source of voices){try{source.stop();}catch{}}voices.clear();}
globalThis.HJTilesAudioV32=Object.freeze({play,prepare,warm,stop,get ready(){return buffers.size===ANCHORS.length},get sampleCount(){return buffers.size},get hasWebAudio(){return !!AC}});
})();
