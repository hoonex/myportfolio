/* Liquid Piano v28 focused keyboard adapter. */
(()=>{
'use strict';
function bindKeyboard({root,state}){
  const down=new Set();
  const keydown=e=>{if(e.repeat||e.target?.matches?.('input,textarea,select'))return;if(e.code==='Space'){e.preventDefault();if(!down.has('Space')){down.add('Space');state.audio.ensure();state.setSustain(true)}return}if(e.code==='KeyZ'){e.preventDefault();const n=Number(root.querySelector('[data-lp-octave]')?.textContent||0);state.setOctave(n-1);return}if(e.code==='KeyX'){e.preventDefault();const n=Number(root.querySelector('[data-lp-octave]')?.textContent||0);state.setOctave(n+1);return}const i=state.KEY_CODES.indexOf(e.code);if(i<0||down.has(e.code))return;e.preventDefault();down.add(e.code);state.sourceDown(`k:${e.code}`,state.KEY_MIDIS[i],.84,null)};
  const keyup=e=>{if(e.code==='Space'){down.delete('Space');state.setSustain(false);return}const i=state.KEY_CODES.indexOf(e.code);if(i<0)return;down.delete(e.code);state.sourceUp(`k:${e.code}`)};
  root.addEventListener('keydown',keydown);root.addEventListener('keyup',keyup);
  return()=>{for(const code of down){if(code==='Space')state.setSustain(false);else state.sourceUp(`k:${code}`)}down.clear();root.removeEventListener('keydown',keydown);root.removeEventListener('keyup',keyup)};
}
globalThis.HJPianoKeyboardV28={bindKeyboard};
})();
