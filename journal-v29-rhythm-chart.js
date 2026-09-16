/* Pulse Grid v29 — deterministic chart and judgement model. */
(()=>{
'use strict';
const BPM=132;
const BEAT_SECONDS=60/BPM;
const INTRO_BEATS=4;
const PLAY_BARS=16;
const LANES=4;
const WINDOWS=Object.freeze({perfect:.045,great:.090,good:.135,miss:.180});
const WEIGHTS=Object.freeze({perfect:1,great:.82,good:.5,miss:0});

function pushNote(notes,lane,beat,kind='tap'){
  notes.push({id:`n${notes.length}`,lane,beat,time:beat*BEAT_SECONDS,kind});
}
function generateChart(){
  const notes=[];
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
      const pattern=easy[bar%easy.length];
      for(let step=0;step<4;step++) pushNote(notes,pattern[step],base+step);
      continue;
    }
    if(bar<10){
      const pattern=flow[(bar-2)%flow.length];
      for(let step=0;step<8;step++){
        pushNote(notes,pattern[step],base+step*.5);
        if(bar>=6 && (step===3 || step===7)) pushNote(notes,3-pattern[step],base+step*.5);
      }
      continue;
    }
    if(bar<14){
      const pattern=flow[(bar+1)%flow.length];
      for(let step=0;step<8;step++){
        if(step===5 && bar%2===0) continue;
        pushNote(notes,pattern[step],base+step*.5);
        if(step===2 || step===6) pushNote(notes,(pattern[step]+2)%4,base+step*.5);
      }
      continue;
    }
    const pattern=dense[bar%2];
    for(let step=0;step<16;step++){
      if((step===5 || step===13) && bar===14) continue;
      pushNote(notes,pattern[step],base+step*.25);
    }
  }
  notes.sort((a,b)=>a.time-b.time||a.lane-b.lane);
  const last=notes.at(-1)?.time||0;
  return Object.freeze({
    title:'Pulse Grid / First Signal',
    bpm:BPM,
    beatSeconds:BEAT_SECONDS,
    introBeats:INTRO_BEATS,
    playBars:PLAY_BARS,
    lanes:LANES,
    totalBeats:INTRO_BEATS+PLAY_BARS*4,
    duration:last+2.2,
    notes:Object.freeze(notes.map(Object.freeze))
  });
}
function classify(deltaSeconds){
  const value=Math.abs(Number(deltaSeconds)||0);
  if(value<=WINDOWS.perfect) return 'perfect';
  if(value<=WINDOWS.great) return 'great';
  if(value<=WINDOWS.good) return 'good';
  return 'miss';
}
function accuracy(counts){
  const total=(counts.perfect||0)+(counts.great||0)+(counts.good||0)+(counts.miss||0);
  if(!total) return 100;
  const weighted=(counts.perfect||0)*WEIGHTS.perfect+(counts.great||0)*WEIGHTS.great+(counts.good||0)*WEIGHTS.good;
  return weighted/total*100;
}

globalThis.HJRhythmChartV29=Object.freeze({
  build:'RHYTHM29-CHART-20260916',BPM,BEAT_SECONDS,INTRO_BEATS,PLAY_BARS,LANES,WINDOWS,WEIGHTS,
  generateChart,classify,accuracy
});
})();
