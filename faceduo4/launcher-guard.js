(()=>{
'use strict';
let chosen=false;
const gid=id=>document.getElementById(id);
function isSessionRoute(){
  const q=new URLSearchParams(location.search);
  return !!q.get('join') || /^#owner=/.test(location.hash) || /^#join=/.test(location.hash);
}
function bind(){
  gid('modeFace')?.addEventListener('click',()=>{chosen=true},{capture:true});
  gid('modeGaze')?.addEventListener('click',()=>{chosen=true},{capture:true});
  gid('faceBack')?.addEventListener('click',()=>{chosen=false},{capture:true});
  if(isSessionRoute())return;
  const enforce=()=>{
    if(chosen)return;
    try{
      if(typeof mode!=='undefined'&&mode!=='new')return;
      if(typeof show==='function'&&gid('launcher'))show('launcher');
    }catch{}
  };
  requestAnimationFrame(()=>requestAnimationFrame(enforce));
  setTimeout(enforce,120);
  setTimeout(enforce,500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();