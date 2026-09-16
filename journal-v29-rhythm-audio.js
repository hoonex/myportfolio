/* Pulse Grid v29 — Web Audio song clock + original procedural backing track. */
(()=>{
'use strict';
const AudioCtor=globalThis.AudioContext||globalThis.webkitAudioContext;
const midiToHz=midi=>440*Math.pow(2,(midi-69)/12);

function createEngine(){
  let ctx=null,master=null,compressor=null,noiseBuffer=null,startAt=0,running=false;
  const sources=new Set();

  function ensure(){
    if(!AudioCtor) throw new Error('Web Audio is not supported in this browser.');
    if(ctx) return ctx;
    ctx=new AudioCtor({latencyHint:'interactive'});
    compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-14;
    compressor.knee.value=14;
    compressor.ratio.value=5;
    compressor.attack.value=.003;
    compressor.release.value=.16;
    master=ctx.createGain();
    master.gain.value=.62;
    master.connect(compressor);
    compressor.connect(ctx.destination);
    noiseBuffer=ctx.createBuffer(1,Math.max(1,Math.floor(ctx.sampleRate*.12)),ctx.sampleRate);
    const data=noiseBuffer.getChannelData(0);
    for(let i=0;i<data.length;i++) data[i]=Math.random()*2-1;
    return ctx;
  }
  function remember(source){
    sources.add(source);
    source.addEventListener?.('ended',()=>sources.delete(source),{once:true});
    return source;
  }
  function envGain(at,peak,attack,release){
    const gain=ctx.createGain();
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),at+attack);
    gain.gain.exponentialRampToValueAtTime(.0001,at+attack+release);
    gain.connect(master);
    return gain;
  }
  function kick(at,amount=1){
    const osc=remember(ctx.createOscillator()),gain=ctx.createGain();
    osc.type='sine';
    osc.frequency.setValueAtTime(145,at);
    osc.frequency.exponentialRampToValueAtTime(48,at+.12);
    gain.gain.setValueAtTime(.72*amount,at);
    gain.gain.exponentialRampToValueAtTime(.0001,at+.2);
    osc.connect(gain);gain.connect(master);
    osc.start(at);osc.stop(at+.21);
  }
  function snare(at,amount=1){
    const source=remember(ctx.createBufferSource()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=noiseBuffer;
    filter.type='bandpass';filter.frequency.value=1750;filter.Q.value=.65;
    gain.gain.setValueAtTime(.42*amount,at);
    gain.gain.exponentialRampToValueAtTime(.0001,at+.14);
    source.connect(filter);filter.connect(gain);gain.connect(master);
    source.start(at);source.stop(at+.15);
    const osc=remember(ctx.createOscillator()),og=ctx.createGain();
    osc.type='triangle';osc.frequency.value=185;
    og.gain.setValueAtTime(.14*amount,at);og.gain.exponentialRampToValueAtTime(.0001,at+.09);
    osc.connect(og);og.connect(master);osc.start(at);osc.stop(at+.1);
  }
  function hat(at,amount=.5){
    const source=remember(ctx.createBufferSource()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    source.buffer=noiseBuffer;
    filter.type='highpass';filter.frequency.value=5200;
    gain.gain.setValueAtTime(.13*amount,at);
    gain.gain.exponentialRampToValueAtTime(.0001,at+.045);
    source.connect(filter);filter.connect(gain);gain.connect(master);
    source.start(at);source.stop(at+.05);
  }
  function bass(at,midi,duration=.28,amount=1){
    const osc=remember(ctx.createOscillator()),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    osc.type='sawtooth';osc.frequency.value=midiToHz(midi);
    filter.type='lowpass';filter.frequency.setValueAtTime(800,at);filter.frequency.exponentialRampToValueAtTime(220,at+duration);
    gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.18*amount,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    osc.connect(filter);filter.connect(gain);gain.connect(master);
    osc.start(at);osc.stop(at+duration+.03);
  }
  function pluck(at,midi,duration=.16,amount=1){
    const osc=remember(ctx.createOscillator()),gain=envGain(at,.055*amount,.006,duration);
    osc.type='triangle';osc.frequency.value=midiToHz(midi);
    const overtone=remember(ctx.createOscillator()),og=ctx.createGain();
    overtone.type='sine';overtone.frequency.value=midiToHz(midi+12);og.gain.value=.22;
    osc.connect(gain);overtone.connect(og);og.connect(gain);
    osc.start(at);overtone.start(at);osc.stop(at+duration+.03);overtone.stop(at+duration+.03);
  }
  function pad(at,midis,duration){
    const bus=ctx.createGain();
    bus.gain.setValueAtTime(.0001,at);bus.gain.linearRampToValueAtTime(.035,at+.12);bus.gain.linearRampToValueAtTime(.0001,at+duration);
    const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=1350;
    bus.connect(filter);filter.connect(master);
    for(const midi of midis){
      const osc=remember(ctx.createOscillator());osc.type='sine';osc.frequency.value=midiToHz(midi);
      osc.detune.value=(midi%2?4:-4);osc.connect(bus);osc.start(at);osc.stop(at+duration+.04);
    }
  }
  function scheduleTrack(songStart,bpm,totalBeats){
    const beat=60/bpm;
    const roots=[45,48,41,43];
    for(let b=0;b<4;b++){
      const at=songStart+b*beat;
      hat(at,1.2);pluck(at,84,b===3?.22:.1,.7);
    }
    const playableBeats=Math.max(0,totalBeats-4);
    const bars=Math.ceil(playableBeats/4);
    for(let bar=0;bar<bars;bar++){
      const barBeat=4+bar*4,root=roots[bar%roots.length];
      const barAt=songStart+barBeat*beat;
      pad(barAt,[root+12,root+15,root+19],beat*3.9);
      for(let q=0;q<4;q++){
        const at=songStart+(barBeat+q)*beat;
        if(q===0||q===2) kick(at,q===0?1:.82);
        if(q===1||q===3) snare(at,q===3?.9:1);
        bass(at,root+(q===3?7:0),Math.min(.31,beat*.72),q===0?1:.8);
        pluck(at+beat*.5,root+24+[0,7,3,10][q],.11,.75);
      }
      for(let eighth=0;eighth<8;eighth++) hat(songStart+(barBeat+eighth*.5)*beat,eighth%2?.65:.42);
      if(bar>=8){
        for(let s=0;s<4;s++) pluck(songStart+(barBeat+1+s*.5)*beat,root+31+[0,2,7,5][s],.08,.46);
      }
    }
  }
  async function start({bpm,totalBeats}){
    ensure();
    stop();
    if(ctx.state==='suspended') await ctx.resume();
    startAt=ctx.currentTime+.12;
    running=true;
    scheduleTrack(startAt,bpm,totalBeats);
    return startAt;
  }
  function stop(){
    for(const source of [...sources]){
      try{source.stop();}catch{}
      try{source.disconnect();}catch{}
    }
    sources.clear();
    running=false;
  }
  function songTime(){
    if(!ctx||!startAt) return 0;
    return ctx.currentTime-startAt;
  }
  function state(){return ctx?.state||'uninitialized'}
  function outputLatency(){
    if(!ctx) return null;
    const latency=(Number(ctx.baseLatency)||0)+(Number(ctx.outputLatency)||0);
    return latency>0?latency:null;
  }
  return Object.freeze({start,stop,songTime,state,outputLatency,get context(){return ctx},get running(){return running}});
}

globalThis.HJRhythmAudioV29=Object.freeze({build:'RHYTHM29-AUDIO-20260916',createEngine});
})();
