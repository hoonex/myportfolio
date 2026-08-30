/* v12: precise Vision Lab disclosure for on-device frames, external assets, and possible Google API usage metrics. */
(() => {
  const COPY = {
    ko: '카메라 프레임은 이 브라우저에서 MediaPipe로 처리됩니다. 모델과 런타임 파일은 외부에서 내려받으며, MediaPipe API의 성능·사용량 측정 정보가 Google에 전송될 수 있습니다.',
    en: 'Camera frames are processed by MediaPipe in this browser. Model and runtime files are downloaded externally, and MediaPipe API performance or usage metrics may be sent to Google.',
    ja: 'カメラ映像はこのブラウザ内でMediaPipeが処理します。モデルとランタイムは外部から取得され、MediaPipe APIの性能・利用状況に関する測定情報がGoogleへ送信される場合があります。'
  };
  const route = () => (location.hash.slice(1) || '/').split('?')[0];
  const language = () => {
    const value = document.documentElement.lang || 'ko';
    return value.startsWith('ja') ? 'ja' : value.startsWith('en') ? 'en' : 'ko';
  };
  function apply() {
    if (route() !== '/lab/vision') return;
    const node = document.querySelector('[data-vision-lab] .vision-header-copy-v11 > small');
    const copy = COPY[language()];
    if (node && node.textContent !== copy) node.textContent = copy;
  }
  document.addEventListener('hj:rendered', apply);
  addEventListener('hashchange', () => queueMicrotask(apply));
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['lang'] });
  queueMicrotask(apply);
})();