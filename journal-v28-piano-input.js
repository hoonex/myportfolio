/* Liquid Piano v28 pointer/multitouch input adapter. */
(()=>{
'use strict';
function bindPointerInput({root,boardHost,renderer,state}){
  const pointers=new Map(),vel=e=>e.pressure>0?state.clamp(.45+e.pressure*.55,.45,1):.8,pos=e=>({x:e.clientX,y:e.clientY}),board=()=>root.querySelector('[data-lp-board]');
  const down=e=>{const key=e.target.closest('[data-lp-midi]');if(!key)return;e.preventDefault();const id=`p:${e.pointerId}`;pointers.set(e.pointerId,id);state.sourceDown(id,Number(key.dataset.lpMidi),vel(e),pos(e));try{board()?.setPointerCapture(e.pointerId)}catch{}};
  const move=e=>{const id=pointers.get(e.pointerId);if(!id)return;e.preventDefault();const st=state.getSource(id),fallback=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('[data-lp-midi]'),midi=renderer?renderer.hitTest(e.clientX,e.clientY):Number(fallback?.dataset.lpMidi);if(!Number.isFinite(midi))return;if(state.settings.glide&&midi!==st?.base)state.sourceDown(id,midi,vel(e),pos(e));else if(midi===st?.base)state.sourceDown(id,midi,vel(e),pos(e))};
  const end=e=>{const id=pointers.get(e.pointerId);if(!id)return;state.sourceUp(id);pointers.delete(e.pointerId);try{board()?.releasePointerCapture(e.pointerId)}catch{}};
  boardHost.addEventListener('pointerdown',down);boardHost.addEventListener('pointermove',move);boardHost.addEventListener('pointerup',end);boardHost.addEventListener('pointercancel',end);
  return()=>{for(const id of pointers.values())state.sourceUp(id);pointers.clear();boardHost.removeEventListener('pointerdown',down);boardHost.removeEventListener('pointermove',move);boardHost.removeEventListener('pointerup',end);boardHost.removeEventListener('pointercancel',end)};
}
globalThis.HJPianoInputV28={bindPointerInput};
})();
