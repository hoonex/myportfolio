from pathlib import Path
p=Path('journal-v15-liquid-piano.js')
s=p.read_text()
old="const PRESETS={\n  glass:{label:'Glass',partials:[[1,'triangle',1],[2,'sine',.16]],attack:.006,decay:.34,sustain:.40,release:.26,brightness:6100,resonance:1.8,space:.18,detune:3,stereo:.5},"
new="const PRESETS={\n  grand:{label:'Grand',partials:[[1,'triangle',1],[2,'sine',.12]],attack:.004,decay:.44,sustain:.48,release:.52,brightness:7000,resonance:1.1,space:.16,detune:0,stereo:.42},\n  glass:{label:'Glass',partials:[[1,'triangle',1],[2,'sine',.16]],attack:.006,decay:.34,sustain:.40,release:.26,brightness:6100,resonance:1.8,space:.18,detune:3,stereo:.5},"
assert old in s
s=s.replace(old,new,1)
old="let settings=loadSettings(),root=null,audio=null,preset='glass',octave=0,sustainPedal=false,volume=.72,sampleBank={raw:new Map(),buffers:new Map(),fetching:new Map(),decoding:new Map()};"
new="let settings=loadSettings(),root=null,audio=null,preset='grand',octave=0,sustainPedal=false,volume=.72,sampleBank={raw:new Map(),buffers:new Map(),fetching:new Map(),decoding:new Map()};"
assert old in s
s=s.replace(old,new,1)
old="if(!ensureAudio()||!audio)return;stealVoice();const anchor=nearestSample(midi),sample=sampleBank.buffers.get(anchor.midi),c=audio.ctx"
new="if(!ensureAudio()||!audio)return;stealVoice();const anchor=nearestSample(midi),sample=preset==='grand'?sampleBank.buffers.get(anchor.midi):null,c=audio.ctx"
assert old in s
s=s.replace(old,new,1)
old="  decodeSample(anchor);\n  const base=PRESETS[preset]"
new="  if(preset==='grand')decodeSample(anchor);\n  const base=PRESETS[preset]"
assert old in s
s=s.replace(old,new,1)
p.write_text(s)
