/* Journal v3: real WebGL refraction layer for Glass Lab. Loaded after journal-v2.js. */
(() => {
  const COPY = {
    ko: {
      title: 'Refraction Lab.',
      intro: '이번 실험은 blur 중심의 glassmorphism이 아니라 실제 픽셀 왜곡을 만든다. 배경 DOM을 캔버스로 캡처하고 WebGL fragment shader에서 굴절, 색수차, Fresnel 반사, specular highlight, bevel depth를 계산한다.',
      badge: 'WEBGL / REAL REFRACTION',
      fallback: 'WebGL 렌더러를 불러오지 못해 CSS fallback으로 표시 중',
      loading: 'WebGL 렌더러 초기화 중…',
      active: 'REFRACTION ACTIVE',
      drag: '유리 패널을 직접 드래그해 보세요. 글자와 격자선이 렌즈 가장자리에서 휘어지는 게 보여야 정상입니다.',
      controls: 'Optical controls',
      reset: 'Reset',
      source: 'Renderer',
      note1t: '굴절이 핵심',
      note1: '배경 텍스처의 샘플 좌표 자체를 이동시키기 때문에 글자와 선이 실제로 밀리고 휜다. blur는 별도 옵션일 뿐이다.',
      note2t: '가장자리가 더 많이 휜다',
      note2: '렌즈의 SDF/곡률에서 얻은 법선과 bevel depth를 이용해 중앙보다 가장자리의 displacement를 크게 만든다.',
      note3t: '색수차와 반사',
      note3: 'RGB 채널의 샘플 오프셋을 미세하게 분리하고 Fresnel/specular 항을 더해 두께와 광학적 경계를 만든다.',
      note4t: '왜 CSS만으로 안 했나',
      note4: 'backdrop-filter의 blur·saturate는 픽셀을 흐리거나 색만 바꿀 뿐 좌표를 휘지 못한다. SVG displacement를 backdrop에 거는 방식도 브라우저 호환성이 아직 불안정하다.',
      articleTitle: '구현 정정: 이 사이트의 “진짜” Liquid Glass 경로',
      articleBody: '위의 CSS playground는 fallback 재질을 실험하기 위한 것이다. 실제 굴절은 Glass Lab에서 WebGL 렌더러로 처리한다. 페이지 뒤의 장면을 캔버스 텍스처로 만든 뒤 fragment shader가 픽셀 샘플 위치를 이동시키므로, 텍스트와 격자가 렌즈 경계에서 실제로 휜다.',
      articleCta: '실제 굴절 실험 열기',
      fps: 'FPS',
      config: '현재 shader 설정'
    },
    en: {
      title: 'Refraction Lab.',
      intro: 'This experiment is not blur-first glassmorphism. It produces real pixel displacement by capturing the DOM into a canvas and running refraction, chromatic aberration, Fresnel reflection, specular lighting, and bevel depth in a WebGL fragment shader.',
      badge: 'WEBGL / REAL REFRACTION',
      fallback: 'WebGL renderer unavailable — showing CSS fallback',
      loading: 'Initializing WebGL renderer…',
      active: 'REFRACTION ACTIVE',
      drag: 'Drag the glass panel. Text and grid lines should visibly bend around the lens edge.',
      controls: 'Optical controls',
      reset: 'Reset',
      source: 'Renderer',
      note1t: 'Refraction is the core',
      note1: 'The shader moves background texture sample coordinates, so text and lines physically shift and bend. Blur is only a separate option.',
      note2t: 'The rim bends more',
      note2: 'Surface normals derived from the lens shape and bevel depth produce stronger displacement near the boundary than in the center.',
      note3t: 'Chromatic aberration and reflection',
      note3: 'Small per-channel sampling offsets plus Fresnel and specular terms create thickness and an optical boundary.',
      note4t: 'Why not CSS only?',
      note4: 'Backdrop blur and saturation change softness and color, not pixel coordinates. SVG displacement on the backdrop is still not interoperable enough across browsers.',
      articleTitle: 'Implementation correction: the real Liquid Glass path on this site',
      articleBody: 'The CSS playground above is for fallback material styling. Actual refraction lives in Glass Lab and uses a WebGL renderer. The page scene is rasterized into a texture and a fragment shader offsets texture sampling, so text and grids genuinely bend at the lens boundary.',
      articleCta: 'Open the real refraction lab',
      fps: 'FPS',
      config: 'Current shader config'
    },
    ja: {
      title: 'Refraction Lab.',
      intro: 'これは blur 中心の glassmorphism ではありません。DOM を Canvas にキャプチャし、WebGL の fragment shader で屈折、色収差、Fresnel 反射、specular、bevel depth を計算して、実際のピクセル変位を作ります。',
      badge: 'WEBGL / REAL REFRACTION',
      fallback: 'WebGL renderer を読み込めないため CSS fallback を表示中',
      loading: 'WebGL renderer を初期化中…',
      active: 'REFRACTION ACTIVE',
      drag: 'ガラスパネルをドラッグしてください。文字とグリッド線がレンズの縁で実際に曲がれば正常です。',
      controls: 'Optical controls',
      reset: 'Reset',
      source: 'Renderer',
      note1t: '中心は屈折',
      note1: '背景 texture の sample 座標そのものを動かすため、文字や線が本当にずれて曲がります。blur は別のオプションです。',
      note2t: '縁ほど強く曲げる',
      note2: 'レンズ形状と bevel depth から得た法線により、中心より境界付近で displacement を大きくします。',
      note3t: '色収差と反射',
      note3: 'RGB channel の sample offset を少し分離し、Fresnel と specular を加えて厚みと光学的な境界を作ります。',
      note4t: 'なぜ CSS だけではないか',
      note4: 'backdrop blur / saturation は柔らかさや色を変えるだけで、pixel 座標を曲げません。backdrop への SVG displacement も browser 間の互換性がまだ不十分です。',
      articleTitle: '実装訂正：このサイトで本当に使う Liquid Glass',
      articleBody: '上の CSS playground は fallback の素材感を試すためのものです。本当の屈折は Glass Lab で WebGL renderer を使います。ページ背景を texture 化し、fragment shader が sample 座標をずらすため、文字と grid がレンズ境界で実際に曲がります。',
      articleCta: '本物の屈折 Lab を開く',
      fps: 'FPS',
      config: '現在の shader 設定'
    }
  };

  const DEFAULTS = {
    refraction: 0.95,
    blurAmount: 0.04,
    chromAberration: 0.065,
    specular: 0.55,
    fresnel: 1.15,
    edgeHighlight: 0.09,
    zRadius: 46,
    cornerRadius: 52,
    saturation: 0.10,
    brightness: 0.02,
    width: 280,
    height: 176
  };

  let liquidInstance = null;
  let fpsTimer = null;
  let modulePromise = null;

  const language = () => {
    const l = document.documentElement.lang || 'ko';
    return l.startsWith('ja') ? 'ja' : l.startsWith('en') ? 'en' : 'ko';
  };
  const t = () => COPY[language()];

  function slider(id, label, min, max, step, value, suffix='') {
    return `<label class="ref-control">
      <span>${label}</span>
      <input id="ref-${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}">
      <output data-ref-value="${id}">${value}${suffix}</output>
    </label>`;
  }

  function currentConfig() {
    const n = id => Number(document.querySelector(`#ref-${id}`)?.value ?? DEFAULTS[id]);
    return {
      floating: true,
      button: false,
      bevelMode: 0,
      refraction: n('refraction'),
      blurAmount: n('blurAmount'),
      chromAberration: n('chromAberration'),
      specular: n('specular'),
      fresnel: n('fresnel'),
      edgeHighlight: n('edgeHighlight'),
      zRadius: n('zRadius'),
      cornerRadius: n('cornerRadius'),
      saturation: n('saturation'),
      brightness: n('brightness')
    };
  }

  function configSnippet() {
    const c = currentConfig();
    return `element.dataset.config = JSON.stringify({
  floating: true,
  refraction: ${c.refraction.toFixed(2)},
  blurAmount: ${c.blurAmount.toFixed(2)},
  chromAberration: ${c.chromAberration.toFixed(3)},
  specular: ${c.specular.toFixed(2)},
  fresnel: ${c.fresnel.toFixed(2)},
  edgeHighlight: ${c.edgeHighlight.toFixed(2)},
  zRadius: ${Math.round(c.zRadius)},
  cornerRadius: ${Math.round(c.cornerRadius)},
  saturation: ${c.saturation.toFixed(2)},
  brightness: ${c.brightness.toFixed(2)}
});`;
  }

  function destroyLiquid() {
    if (fpsTimer) {
      clearInterval(fpsTimer);
      fpsTimer = null;
    }
    if (liquidInstance) {
      try { liquidInstance.destroy(); } catch {}
      liquidInstance = null;
    }
  }

  async function liquidModule() {
    if (!modulePromise) {
      modulePromise = import('https://cdn.jsdelivr.net/npm/@ybouane/liquidglass@1.0.3/dist/index.js');
    }
    return modulePromise;
  }

  labTemplate = function() {
    const c = t();
    return `<div class="page lab refraction-page">
      <section class="lab-header refraction-header">
        <div>
          <span class="refraction-badge">${c.badge}</span>
          <h1>${c.title}</h1>
        </div>
        <p>${c.intro}</p>
      </section>

      <section class="refraction-shell">
        <div class="refraction-root" id="refractionRoot">
          <div class="refraction-backdrop" aria-hidden="true">
            <span class="ref-orb ref-orb-a"></span>
            <span class="ref-orb ref-orb-b"></span>
            <span class="ref-orb ref-orb-c"></span>
            <div class="ref-grid"></div>
            <div class="ref-copy">
              <span class="ref-kicker">PIXEL COORDINATES / OPTICAL FIELD</span>
              <strong>REFRACT<br>THE SCENE</strong>
              <p>0123456789 · ABCDEFGHIJKLMNOPQRSTUVWXYZ · 屈折 · REFRACTION · 왜곡</p>
            </div>
            <div class="ref-ruler">
              ${Array.from({length: 18}, (_,i)=>`<i style="--i:${i}"></i>`).join('')}
            </div>
          </div>

          <div class="real-liquid-glass" id="realLiquidGlass" aria-label="Draggable WebGL refractive glass">
            <div class="glass-content">
              <span>DRAG</span>
              <strong>LIQUID</strong>
              <small>WebGL refraction</small>
            </div>
          </div>
        </div>

        <aside class="refraction-controls glass">
          <div class="ref-controls-head">
            <div><strong>${c.controls}</strong><span id="refStatus">${c.loading}</span></div>
            <button id="refReset" type="button">${c.reset}</button>
          </div>
          ${slider('refraction','Refraction',0.15,1.6,0.01,DEFAULTS.refraction)}
          ${slider('blurAmount','Blur',0,0.45,0.01,DEFAULTS.blurAmount)}
          ${slider('chromAberration','Chromatic',0,0.18,0.005,DEFAULTS.chromAberration)}
          ${slider('specular','Specular',0,1.2,0.02,DEFAULTS.specular)}
          ${slider('fresnel','Fresnel',0,2.2,0.05,DEFAULTS.fresnel)}
          ${slider('edgeHighlight','Edge light',0,0.24,0.01,DEFAULTS.edgeHighlight)}
          ${slider('zRadius','Bevel depth',8,90,1,DEFAULTS.zRadius,'px')}
          ${slider('cornerRadius','Corner',12,80,1,DEFAULTS.cornerRadius,'px')}
          ${slider('saturation','Saturation',-0.5,0.8,0.02,DEFAULTS.saturation)}
          ${slider('brightness','Brightness',-0.25,0.25,0.01,DEFAULTS.brightness)}
          ${slider('width','Width',190,390,2,DEFAULTS.width,'px')}
          ${slider('height','Height',120,250,2,DEFAULTS.height,'px')}

          <div class="refraction-runtime">
            <span>${c.source}</span>
            <a href="https://github.com/ybouane/liquidglass" target="_blank" rel="noreferrer">@ybouane/liquidglass ↗</a>
            <span class="ref-fps">${c.fps}: <b id="refFps">--</b></span>
          </div>

          <div class="ref-config">
            <span>${c.config}</span>
            <pre id="refConfigOutput"></pre>
          </div>
        </aside>
      </section>

      <p class="refraction-drag-note">${c.drag}</p>

      <section class="refraction-explainer">
        <article><span>01</span><h2>${c.note1t}</h2><p>${c.note1}</p></article>
        <article><span>02</span><h2>${c.note2t}</h2><p>${c.note2}</p></article>
        <article><span>03</span><h2>${c.note3t}</h2><p>${c.note3}</p></article>
        <article><span>04</span><h2>${c.note4t}</h2><p>${c.note4}</p></article>
      </section>

      ${commentsTemplate('lab')}
    </div>`;
  };

  function updateOutputs() {
    Object.keys(DEFAULTS).forEach(id => {
      const input = document.querySelector(`#ref-${id}`);
      const output = document.querySelector(`[data-ref-value="${id}"]`);
      if (!input || !output) return;
      const suffix = ['zRadius','cornerRadius','width','height'].includes(id) ? 'px' : '';
      output.textContent = `${input.value}${suffix}`;
    });
    const pre = document.querySelector('#refConfigOutput');
    if (pre) pre.textContent = configSnippet();
  }

  function applyConfig() {
    const glass = document.querySelector('#realLiquidGlass');
    if (!glass) return;
    const width = Number(document.querySelector('#ref-width')?.value || DEFAULTS.width);
    const height = Number(document.querySelector('#ref-height')?.value || DEFAULTS.height);
    glass.style.width = `${width}px`;
    glass.style.height = `${height}px`;
    glass.dataset.config = JSON.stringify(currentConfig());
    updateOutputs();
    try { liquidInstance?.markChanged(); } catch {}
  }

  async function bootLiquid() {
    destroyLiquid();
    const root = document.querySelector('#refractionRoot');
    const glass = document.querySelector('#realLiquidGlass');
    const status = document.querySelector('#refStatus');
    if (!root || !glass) return;

    glass.dataset.config = JSON.stringify(currentConfig());
    try {
      const { LiquidGlass } = await liquidModule();
      if (!document.contains(root) || !document.contains(glass)) return;
      liquidInstance = await LiquidGlass.init({
        root,
        glassElements: [glass],
        defaults: {
          refraction: DEFAULTS.refraction,
          cornerRadius: DEFAULTS.cornerRadius,
          zRadius: DEFAULTS.zRadius
        }
      });
      if (status) status.textContent = t().active;
      root.classList.add('is-webgl-active');
      fpsTimer = setInterval(() => {
        const target = document.querySelector('#refFps');
        if (target && liquidInstance) target.textContent = String(Math.round(liquidInstance.fps || 0));
      }, 1000);
    } catch (error) {
      console.error('[Liquid Glass] WebGL init failed', error);
      root.classList.add('is-refraction-fallback');
      if (status) status.textContent = t().fallback;
    }
  }

  const previousInitLab = initLab;
  initLab = function() {
    // Do not run the old blur-only Glass Lab when this v3 lab is present.
    if (!document.querySelector('#refractionRoot')) {
      previousInitLab();
      return;
    }
    destroyLiquid();
    document.querySelectorAll('.refraction-controls input[type="range"]').forEach(input => {
      input.addEventListener('input', applyConfig);
    });
    document.querySelector('#refReset')?.addEventListener('click', () => {
      Object.entries(DEFAULTS).forEach(([id,value]) => {
        const input = document.querySelector(`#ref-${id}`);
        if (input) input.value = value;
      });
      const glass = document.querySelector('#realLiquidGlass');
      if (glass) {
        glass.style.left = '';
        glass.style.top = '';
        glass.style.transform = '';
      }
      applyConfig();
    });
    updateOutputs();
    applyConfig();
    bootLiquid();
  };

  function patchGlassArticle() {
    if (!location.hash.startsWith('#/post/glass')) return;
    const body = document.querySelector('.article-body');
    if (!body || body.querySelector('.refraction-correction')) return;
    const c = t();
    const section = document.createElement('section');
    section.className = 'essay-section refraction-correction';
    section.innerHTML = `<span class="essay-index">WEBGL</span>
      <h2>${c.articleTitle}</h2>
      <p>${c.articleBody}</p>
      <div class="refraction-architecture">
        <span>DOM scene</span><i>→</i><span>Canvas capture</span><i>→</i><span>WebGL texture</span><i>→</i><span>Fragment shader</span><i>→</i><span>Refracted pixels</span>
      </div>
      <p><a class="refraction-cta" href="#/lab">${c.articleCta} →</a></p>
      <div class="sources">
        <span>Implementation references</span>
        <a href="https://github.com/ybouane/liquidglass" target="_blank" rel="noreferrer">LiquidGlass / WebGL ↗</a>
        <a href="https://github.com/w3c/svgwg/issues/1142" target="_blank" rel="noreferrer">W3C backdrop displacement discussion ↗</a>
      </div>`;
    body.append(section);

    const playground = document.querySelector('[data-playground="glass"]');
    if (playground && !playground.previousElementSibling?.classList.contains('css-fallback-note')) {
      const note = document.createElement('p');
      note.className = 'css-fallback-note';
      note.textContent = language() === 'ko'
        ? '아래 CSS playground는 fallback 재질 테스트용입니다. 배경 픽셀을 실제로 휘는 실험은 위 WebGL 경로와 Glass Lab에서 동작합니다.'
        : language() === 'ja'
        ? '下の CSS playground は fallback 素材のテスト用です。背景 pixel を実際に曲げる処理は WebGL 経路と Glass Lab で動作します。'
        : 'The CSS playground below is a fallback material test. Real backdrop displacement runs through the WebGL path and Glass Lab.';
      playground.before(note);
    }
  }

  const previousInitComments = initComments;
  initComments = function() {
    previousInitComments();
    patchGlassArticle();
  };

  window.addEventListener('hashchange', () => {
    if (!location.hash.startsWith('#/lab')) destroyLiquid();
  });

  // v2 may already have rendered the old lab before this layer loaded.
  if (location.hash.startsWith('#/lab') || location.hash.startsWith('#/post/glass')) {
    render();
  }
})();
