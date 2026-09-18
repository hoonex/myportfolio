/* Pulse Grid v30 — configurable deterministic chart + judgement model. */
(()=>{
'use strict';
const LANES=4;
const INTRO_BEATS=4;
const PLAY_BARS=16;
const BPM_MIN=90,BPM_MAX=200;
const DENSITY_MIN=.6,DENSITY_MAX=1.5;
const WINDOWS=Object.freeze({
  relaxed:Object.freeze({perfect:.065,great:.120,good:.175,miss:.235}),
  standard:Object.freeze({perfect:.045,great:.090,good:.135,miss:.180}),
  tight:Object.freeze({perfect:.032,great:.064,good:.100,miss:.145})
});
const WEIGHTS=Object.freeze({perfect:1,great:.82,good:.5,miss:0});
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

function buildBeatChart(density=1){
  const d=clamp(Number(density)||1,DENSITY_MIN,DENSITY_MAX);
  const pool=[];
  const add=(lane,beat,priority=.8,kind='tap')=>pool.push({lane,beat,priority,kind});
  const easy=[[0,1,2,3],[3,2,1,0]];
  const flow=[
    [0,1,2,3,2,1,0,2],
    [3,2,1,0,1,2,3,1],
    [0,2,1,3,0,1,2,3],
    [3,1,2,0,3,2,1,0]
  ];
  const dense=[
    [0,1,0,2,1,3,2,3,1,2,0,1,3,2,1,3],
    [3,2,3,1,2,0,1,0,2,1,3,2,0,1,2,0]
  ];
  for(let bar=0;bar<PLAY_BARS;bar++){
    const base=INTRO_BEATS+bar*4;
    if(bar<2){
      const p=easy[bar%2];
      for(let s=0;s<4;s++) add(p[s],base+s,.52);
      if(d>=1.25){for(let s=0;s<4;s++) add((p[s]+2)%4,base+s+.5,1.22);}
      continue;
    }
    if(bar<10){
      const p=flow[(bar-2)%flow.length];
      for(let s=0;s<8;s++) add(p[s],base+s*.5,s%2===0?.62:.78);
      if(bar>=6){
        add(3-p[3],base+1.5,.96);add(3-p[7],base+3.5,.96);
      }
      if(d>=1.18){
        add((p[1]+2)%4,base+.75,1.15);add((p[5]+2)%4,base+2.75,1.15);
      }
      continue;
    }
    if(bar<14){
      const p=flow[(bar+1)%flow.length];
      for(let s=0;s<8;s++){
        if(s===5&&bar%2===0) continue;
        add(p[s],base+s*.5,.68);
        if(s===2||s===6) add((p[s]+2)%4,base+s*.5,.96);
      }
      if(d>=1.2){
        for(const s of [1,3,5,7]) add((p[s]+1)%4,base+s*.5+.25,1.17);
      }
      continue;
    }
    const p=dense[bar%2];
    for(let s=0;s<16;s++){
      if((s===5||s===13)&&bar===14) continue;
      add(p[s],base+s*.25,s%2===0?.82:.96);
    }
    if(d>=1.3){
      for(const s of [3,7,11,15]) add((p[s]+2)%4,base+s*.25,1.27);
    }
  }
  const selected=pool.filter((note,index)=>{
    if(note.priority<=d) return true;
    if(d<.8 && note.priority<=.82) return index%3!==1;
    return false;
  });
  selected.sort((a,b)=>a.beat-b.beat||a.lane-b.lane);
  return selected.map((n,i)=>Object.freeze({id:`n${i}`,lane:n.lane,beat:n.beat,kind:n.kind}));
}

function generateChart(options={}){
  const bpm=clamp(Math.round(Number(options.bpm)||132),BPM_MIN,BPM_MAX);
  const density=clamp(Number(options.density)||1,DENSITY_MIN,DENSITY_MAX);
  const beatSeconds=60/bpm;
  const beatNotes=buildBeatChart(density);
  const notes=beatNotes.map(n=>Object.freeze({...n,time:n.beat*beatSeconds}));
  const last=notes.at(-1)?.time||0;
  return Object.freeze({
    title:'Pulse Grid / First Signal',bpm,density,beatSeconds,
    introBeats:INTRO_BEATS,playBars:PLAY_BARS,lanes:LANES,
    totalBeats:INTRO_BEATS+PLAY_BARS*4,
    duration:last+Math.max(1.25,beatSeconds*4.5),
    notes:Object.freeze(notes)
  });
}
function windowsFor(mode='standard'){
  return WINDOWS[mode]||WINDOWS.standard;
}
function classify(deltaSeconds,modeOrWindows='standard'){
  const w=typeof modeOrWindows==='string'?windowsFor(modeOrWindows):modeOrWindows||WINDOWS.standard;
  const value=Math.abs(Number(deltaSeconds)||0);
  if(value<=w.perfect)return'perfect';
  if(value<=w.great)return'great';
  if(value<=w.good)return'good';
  return'miss';
}
function accuracy(counts){
  const total=(counts.perfect||0)+(counts.great||0)+(counts.good||0)+(counts.miss||0);
  if(!total)return 100;
  const weighted=(counts.perfect||0)*WEIGHTS.perfect+(counts.great||0)*WEIGHTS.great+(counts.good||0)*WEIGHTS.good;
  return weighted/total*100;
}

globalThis.HJRhythmChartV30=Object.freeze({
  build:'RHYTHM30-CHART-20260916',LANES,INTRO_BEATS,PLAY_BARS,BPM_MIN,BPM_MAX,DENSITY_MIN,DENSITY_MAX,WINDOWS,WEIGHTS,
  generateChart,windowsFor,classify,accuracy
});
})();
