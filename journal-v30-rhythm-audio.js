/* Pulse Grid v30 — configurable Web Audio song clock + procedural track. */
(()=>{
'use strict';
const AudioCtor=globalThis.AudioContext||globalThis.webkitAudioContext;
const midiToHz=midi=>440*Math.pow(2,(midi-69)/12);
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

function createEngine(){
  let ctx=null,master=null,compressor=null,fxDelay=null,fxFeedback=null,noiseBuffer=null,startAt=0,running=false,volume=.72;
  const sources=new Set();
  function ensure(){
    if(!AudioCtor)throw new Error('Web Audio is not supported in this browser.');
    if(ctx)return ctx;
    ctx=new AudioCtor({latencyHint:'interactive'});
    compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-16;compressor.knee.value=16;compressor.ratio.value=4.5;compressor.attack.value=.003;compressor.release.value=.16;
    master=ctx.createGain();master.gain.value=volume;
    fxDelay=ctx.createDelay(.5);fxDelay.delayTime.value=.18;
    fxFeedback=ctx.createGain();fxFeedback.gain.value=.16;
    fxDelay.connect(fxFeedback);fxFeedback.connect(fxDelay);fxDelay.connect(master);
    master.connect(compressor);compressor.connect(ctx.destination);
    noiseBuffer=ctx.createBuffer(1,Math.max(1,Math.floor(ctx.sampleRate*.16)),ctx.sampleRate);
    const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    return ctx;
  }
  function remember(source){sources.add(source);source.addEventListener?.('ended',()=>sources.delete(source),{once:true});return source;}
  function panNode(value=0){if(!ctx.createStereoPanner)return null;const p=ctx.createStereoPanner();p.pan.value=clamp(value,-1,1);return p;}
  function connectOut(node,send=.0,pan=0){
    const p=panNode(pan);
    if(p){node.connect(p);p.connect(master);if(send>0)p.connect(fxDelay);}
    else{node.connect(master);if(send>0)node.connect(fxDelay);}
  }
  function kick(at,amount=1){
    const osc=remember(ctx.createOscillator()),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(150,at);osc.frequency.exponentialRampToValueAtTime(46,at+.13);
    gain.gain.setValueAtTime(.76*amount,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.22);osc.connect(gain);connectOut(gain);osc.start(at);osc.stop(at+.23);
  }
  function snare(at,amount=1,pan=0){
    const src=remember(ctx.createBufferSource()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=noiseBuffer;filter.type='bandpass';filter.frequency.value=1850;filter.Q.value=.7;
    gain.gain.setValueAtTime(.42*amount,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.15);src.connect(filter);filter.connect(gain);connectOut(gain,.08,pan);src.start(at);src.stop(at+.16);
    const osc=remember(ctx.createOscillator()),og=ctx.createGain();osc.type='triangle';osc.frequency.value=188;og.gain.setValueAtTime(.13*amount,at);og.gain.exponentialRampToValueAtTime(.0001,at+.09);osc.connect(og);connectOut(og,0,pan);osc.start(at);osc.stop(at+.1);
  }
  function hat(at,amount=.5,pan=0){
    const src=remember(ctx.createBufferSource()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();src.buffer=noiseBuffer;filter.type='highpass';filter.frequency.value=5600;
    gain.gain.setValueAtTime(.12*amount,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.05);src.connect(filter);filter.connect(gain);connectOut(gain,.03,pan);src.start(at);src.stop(at+.055);
  }
  function bass(at,midi,duration=.28,amount=1){
    const osc=remember(ctx.createOscillator()),sub=remember(ctx.createOscillator()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    osc.type='sawtooth';sub.type='sine';osc.frequency.value=midiToHz(midi);sub.frequency.value=midiToHz(midi-12);
    filter.type='lowpass';filter.frequency.setValueAtTime(920,at);filter.frequency.exponentialRampToValueAtTime(210,at+duration);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.16*amount,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(filter);sub.connect(filter);filter.connect(gain);connectOut(gain);osc.start(at);sub.start(at);osc.stop(at+duration+.03);sub.stop(at+duration+.03);
  }
  function pluck(at,midi,duration=.16,amount=1,pan=0){
    const osc=remember(ctx.createOscillator()),over=remember(ctx.createOscillator()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    osc.type='triangle';over.type='sine';osc.frequency.value=midiToHz(midi);over.frequency.value=midiToHz(midi+12);filter.type='lowpass';filter.frequency.value=4200;
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.055*amount,at+.006);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(filter);over.connect(filter);filter.connect(gain);connectOut(gain,.2,pan);osc.start(at);over.start(at);osc.stop(at+duration+.03);over.stop(at+duration+.03);
  }
  function pad(at,midis,duration,amount=1){
    const bus=ctx.createGain(),filter=ctx.createBiquadFilter();bus.gain.setValueAtTime(.0001,at);bus.gain.linearRampToValueAtTime(.03*amount,at+.12);bus.gain.linearRampToValueAtTime(.0001,at+duration);
    filter.type='lowpass';filter.frequency.value=1450;bus.connect(filter);connectOut(filter,.25);
    midis.forEach((m,i)=>{const o=remember(ctx.createOscillator());o.type=i===0?'sine':'triangle';o.frequency.value=midiToHz(m);o.detune.value=i%2?4:-4;o.connect(bus);o.start(at);o.stop(at+duration+.04);});
  }
  function scheduleTrack(songStart,{bpm,totalBeats,energy=1}){
    const e=clamp(Number(energy)||1,.65,1.35),beat=60/bpm,roots=[45,48,41,43];
    for(let b=0;b<4;b++){const at=songStart+b*beat;hat(at,1.15*e,(b%2?.25:-.25));pluck(at,84,b===3?.22:.1,.7*e,b%2?.3:-.3);}
    const bars=Math.ceil(Math.max(0,totalBeats-4)/4);
    for(let bar=0;bar<bars;bar++){
      const barBeat=4+bar*4,root=roots[bar%roots.length],barAt=songStart+barBeat*beat;
      pad(barAt,[root+12,root+15,root+19],beat*3.9,.82+e*.18);
      for(let q=0;q<4;q++){
        const at=songStart+(barBeat+q)*beat;
        if(q===0||q===2)kick(at,(q===0?1:.82)*e);
        if(q===1||q===3)snare(at,(q===3?.92:1)*e,q===1?-.1:.1);
        bass(at,root+(q===3?7:0),Math.min(.32,beat*.72),(.78+(q===0?.22:0))*e);
        pluck(at+beat*.5,root+24+[0,7,3,10][q],Math.min(.13,beat*.3),.68*e,q%2?.35:-.35);
      }
      for(let eighth=0;eighth<8;eighth++)hat(songStart+(barBeat+eighth*.5)*beat,(eighth%2?.58:.4)*e,eighth%2?.42:-.42);
      if(bar>=8){for(let s=0;s<4;s++)pluck(songStart+(barBeat+1+s*.5)*beat,root+31+[0,2,7,5][s],.08,.42*e,s%2?.5:-.5);}
      if(bar%4===3&&e>1){for(let s=0;s<4;s++)snare(songStart+(barBeat+3+s*.25)*beat,.28*e,(s-1.5)*.25);}
    }
  }
  async function start(config){
    ensure();stop();if(ctx.state==='suspended')await ctx.resume();
    volume=clamp(Number(config.volume)||.72,0,1);master.gain.setTargetAtTime(volume,ctx.currentTime,.015);
    startAt=ctx.currentTime+.12;running=true;scheduleTrack(startAt,config);return startAt;
  }
  function setVolume(value){volume=clamp(Number(value)||0,0,1);if(master&&ctx)master.gain.setTargetAtTime(volume,ctx.currentTime,.02);}
  function stop(){for(const s of [...sources]){try{s.stop();}catch{}try{s.disconnect();}catch{}}sources.clear();running=false;}
  function songTime(){return(!ctx||!startAt)?0:ctx.currentTime-startAt;}
  function outputLatency(){if(!ctx)return null;const v=(Number(ctx.baseLatency)||0)+(Number(ctx.outputLatency)||0);return v>0?v:null;}
  return Object.freeze({start,stop,songTime,setVolume,outputLatency,get context(){return ctx},get running(){return running}});
}

globalThis.HJRhythmAudioV30=Object.freeze({build:'RHYTHM30-AUDIO-20260916',createEngine});
})();
