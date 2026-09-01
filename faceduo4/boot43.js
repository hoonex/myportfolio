(()=>{
  const $id=id=>document.getElementById(id);
  const start=$id('start');
  const diag=$id('diag');
  let fallbackPromise=null;
  const note=s=>{if(diag)diag.textContent='시작 진단 · '+s};
  const loadFallback=()=>{
    if(typeof window.startCamera==='function')return Promise.resolve(true);
    if(fallbackPromise)return fallbackPromise;
    fallbackPromise=new Promise((resolve,reject)=>{
      note('고정밀 스캐너 복구 중…');
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/gh/hoonex/myportfolio@e2e682aea272d7e139741216ff3b898868b3fdae/faceduo4/scan.js';
      s.onload=()=>typeof window.startCamera==='function'?resolve(true):reject(new Error('스캐너 함수가 로드되지 않았습니다.'));
      s.onerror=()=>reject(new Error('복구 스캐너 다운로드 실패'));
      document.head.appendChild(s);
    });
    return fallbackPromise;
  };
  window.addEventListener('error',e=>{if(e?.message)note(e.message)});
  if(start){
    start.onclick=async()=>{
      if(start.disabled)return;
      start.disabled=true;start.textContent='카메라 준비 중…';
      try{
        if(typeof window.startCamera!=='function')await loadFallback();
        if(typeof window.startCamera!=='function')throw new Error('얼굴 스캔 모듈을 시작할 수 없습니다.');
        await window.startCamera();
        note(typeof window.HQ_REQ!=='undefined'?'고정밀 스캐너 실행':'안정 스캐너 실행');
      }catch(e){
        try{window.stopCamera?.()}catch{}
        try{window.show?.('home')}catch{}
        note(e?.message||String(e));
        alert('얼굴 스캔을 시작하지 못했습니다.\n'+(e?.message||String(e)));
      }finally{
        start.disabled=false;start.textContent='얼굴 스캔 시작';
      }
    };
  }
})();