/* Lightweight Spatial index card; the full Spatial article runtime is route-loaded. */
(() => {
  const COPY = {
    ko: {
      count: '04 notes', category: 'Spatial / 3D', date: 'Aug 2026',
      title: '3D는 모델링보다 좌표계에서 시작된다.',
      deck: '카메라, 스케일, 충돌, 절차적 생성, 프레임 예산을 하나의 공간 시스템으로 설계하는 기록.',
      meta: 'camera · world scale · blockout', open: '3D 노트 열기'
    },
    en: {
      count: '04 notes', category: 'Spatial / 3D', date: 'Aug 2026',
      title: '3D starts with a world model, not a mesh.',
      deck: 'Notes on camera policy, scale, collision, procedural structure, and frame-time budgets.',
      meta: 'camera · world scale · blockout', open: 'Open 3D note'
    },
    ja: {
      count: '04本', category: 'Spatial / 3D', date: '2026年8月',
      title: '3Dはモデリングより先に、世界の基準を決める。',
      deck: 'カメラ、スケール、コリジョン、プロシージャル生成、フレーム時間を一つの空間設計として考える。',
      meta: 'カメラ · スケール · ブロックアウト', open: '3Dノートを開く'
    }
  };

  const language = () => {
    const value = document.documentElement.lang || 'ko';
    return value.startsWith('ja') ? 'ja' : value.startsWith('en') ? 'en' : 'ko';
  };
  const route = () => window.HJRuntime?.route?.() || (location.hash.slice(1) || '/').split('?')[0];
  const cube = extra => `<div class="spatial-cube-v8 ${extra}" aria-hidden="true"><i class="face front"></i><i class="face back"></i><i class="face left"></i><i class="face right"></i><i class="face top"></i><i class="face bottom"></i></div>`;
  const world = () => `<div class="spatial-world-v8"><div class="spatial-floor-v8"></div>${cube('cube-a')}${cube('cube-b')}${cube('cube-c')}<div class="spatial-axis-v8" aria-hidden="true"><i class="axis-x"></i><i class="axis-y"></i><i class="axis-z"></i></div></div>`;

  function enhance() {
    if (route() !== '/') return;
    const home = document.querySelector('.home-page');
    const grid = home?.querySelector('.post-grid');
    if (!home || !grid) return;

    let card = grid.querySelector('[data-spatial-card-v8]');
    if (!card) {
      card = document.createElement('a');
      card.className = 'post-card post-card--spatial-v8';
      card.dataset.spatialCardV8 = 'true';
      card.href = '#/post/spatial';
      grid.append(card);
    }

    const copy = COPY[language()];
    card.innerHTML = `<div class="spatial-card-preview-v8" aria-hidden="true"><div class="spatial-mini-world-v8">${world()}</div><span>3D / SYSTEMS</span></div><div class="post-card-top"><span>04 / ${copy.category}</span><span>${copy.date}</span></div><div class="spatial-card-copy-v8"><h3>${copy.title}</h3><p>${copy.deck}</p></div><span class="spatial-card-cta-v8"><span>${copy.meta}</span><b>${copy.open} ↗</b></span>`;
    const count = home.querySelector('.section-head > span');
    if (count) count.textContent = copy.count;
  }

  document.addEventListener('hj:rendered', enhance);
  queueMicrotask(enhance);
})();
