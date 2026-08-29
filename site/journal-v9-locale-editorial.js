/* Journal v9: authored locale polish for technical UI and Refraction Lab copy. */
(() => {
  const COPY = {
    ko: {
      intro: '이 실험은 흐림 효과를 유리처럼 꾸미는 데서 멈추지 않는다. 페이지 장면을 텍스처로 만든 뒤 WebGL 셰이더가 샘플 좌표를 직접 이동시켜 글자와 격자의 위치를 휘게 한다. 색수차와 bevel depth는 굴절의 경계를 읽기 쉽게 보조하고, blur는 필요할 때만 더하는 별도 변수다.',
      drag: '유리 패널을 글자와 격자 위로 끌어 보세요. 중앙보다 가장자리에서 배경의 위치가 더 크게 어긋나고 휘어져야 한다.',
      controls: '광학 파라미터', reset: '초기화', config: '현재 셰이더 설정',
      notes: [
        ['굴절은 픽셀 위치를 바꾼다', 'blur는 주변 픽셀을 섞지만 굴절은 어디에서 픽셀을 가져올지 자체를 바꾼다. 그래서 글자와 선의 윤곽이 실제로 이동하는지가 이 실험의 핵심 판별 기준이다.'],
        ['경계에서 변위를 키운다', '렌즈 형태에서 얻은 법선과 bevel 깊이를 이용해 중앙은 비교적 안정적으로 두고, 가장자리로 갈수록 샘플 오프셋을 크게 만든다. 두께감은 이 차이에서 생긴다.'],
        ['색수차는 보조 신호다', 'RGB 채널을 아주 조금 다른 위치에서 샘플링하면 광학적 경계가 더 분명해진다. 강하게 쓰면 효과가 먼저 보이므로 굴절을 설명할 만큼만 남기는 편이 낫다.'],
        ['CSS와 WebGL의 역할을 나눈다', 'CSS backdrop-filter는 투명 재질과 fallback에 유용하지만 임의의 배경 좌표를 안정적으로 휘지는 못한다. 이 페이지는 재질 표현은 CSS, 실제 픽셀 변위는 WebGL로 역할을 분리한다.']
      ],
      articleTitle: '이 사이트에서 CSS 유리와 WebGL 굴절을 분리한 이유',
      articleBody: 'CSS playground는 투명도·테두리·blur 같은 재질 단서를 빠르게 비교하기 위한 공간이다. 실제 굴절은 별도 WebGL 경로가 담당한다. 두 방식을 같은 이름으로 뭉개지 않고, 각각 무엇을 실제로 계산하는지 화면에서 확인할 수 있게 분리했다.',
      articleCta: '실제 굴절 실험 열기',
      fallbackNote: '아래 CSS 플레이그라운드는 투명도, 경계, 흐림 같은 재질 단서를 비교하기 위한 공간입니다. 배경 픽셀을 실제로 휘는 처리는 위의 WebGL 경로와 Glass Lab에서 확인할 수 있습니다.',
      sourcesLabel: '구현 참고자료',
      architecture: ['DOM 장면', 'Canvas 캡처', 'WebGL 텍스처', 'Fragment shader', '굴절 결과']
    },
    en: {
      intro: 'This lab separates refraction from blur. The page is rasterized into a texture, then a WebGL shader changes where background pixels are sampled. Chromatic aberration and bevel depth help describe the optical boundary; blur remains an independent styling parameter rather than the effect itself.',
      drag: 'Drag the panel across the type and grid. Displacement should stay subtle near the center and become easier to read toward the lens boundary.',
      controls: 'Optical parameters', reset: 'Reset', config: 'Current shader configuration',
      notes: [
        ['Refraction changes sampling position', 'Blur mixes neighboring pixels. Refraction changes which pixel is sampled in the first place. The useful test is whether letterforms and grid lines actually move, not whether the background merely becomes softer.'],
        ['Displacement grows toward the rim', 'Normals derived from the lens shape and bevel depth keep the center comparatively stable while increasing the sample offset near the boundary. That gradient is what makes thickness legible.'],
        ['Chromatic aberration is supporting evidence', 'Slightly different sample positions for the RGB channels can clarify the optical edge. Push it too far and the artifact becomes the subject, so it should support refraction rather than advertise itself.'],
        ['CSS and WebGL have different jobs', 'Backdrop filters are useful for translucent material styling and graceful fallback, but they do not provide general background-coordinate warping. This site keeps material styling in CSS and true pixel displacement in WebGL.']
      ],
      articleTitle: 'Why this site separates CSS glass from WebGL refraction',
      articleBody: 'The CSS playground is for comparing material cues such as opacity, borders, and blur. Actual refraction follows a separate WebGL path. Keeping the two explicit makes it possible to inspect what each layer really computes instead of calling every translucent surface “Liquid Glass.”',
      articleCta: 'Open the refraction lab',
      fallbackNote: 'The CSS playground below isolates material cues such as opacity, edge treatment, and blur. Actual background displacement runs through the WebGL path above and in Glass Lab.',
      sourcesLabel: 'Implementation references',
      architecture: ['DOM scene', 'Canvas capture', 'WebGL texture', 'Fragment shader', 'Refracted pixels']
    },
    ja: {
      intro: 'この実験では、ぼかしと屈折を同じものとして扱いません。ページの表示内容をテクスチャ化し、WebGLのシェーダーで背景を参照する位置そのものをずらします。色収差とベベルの深さは光学的な境界を読み取りやすくする補助要素で、ぼかしは必要に応じて加える独立したパラメータです。',
      drag: 'ガラスパネルを文字とグリッドの上へ動かしてください。中央付近では変化を抑え、レンズの縁に近づくほど背景のずれが分かりやすくなるように設計しています。',
      controls: '光学パラメータ', reset: '初期値に戻す', config: '現在のシェーダー設定',
      notes: [
        ['屈折は参照位置を変える', 'ぼかしは周囲のピクセルを混ぜますが、屈折は背景のどの位置を参照するかを変えます。文字やグリッドの輪郭が実際に移動して見えるかどうかが、この実験で確認したいポイントです。'],
        ['縁に近いほど変位を大きくする', 'レンズ形状から求めた法線とベベルの深さを使い、中央は比較的安定させたまま、境界付近のサンプリング位置を大きくずらします。この差がガラスの厚みとして知覚されます。'],
        ['色収差は主役にしない', 'RGB各チャンネルの参照位置をわずかに分けると、光学的な境界が読み取りやすくなります。ただし強すぎると色ずれ自体が目立つため、屈折を補助する範囲に抑えます。'],
        ['CSSとWebGLの役割を分ける', 'backdrop-filterは半透明の質感やフォールバックには有効ですが、背景の座標を自由に変形する用途には向きません。このサイトでは質感の調整をCSS、実際のピクセル変位をWebGLに分担させています。']
      ],
      articleTitle: 'CSSのガラス表現とWebGLの屈折を分けている理由',
      articleBody: 'CSSのプレイグラウンドでは、透明度、境界線、ぼかしなどの「素材らしさ」を比較します。一方、本当の屈折はWebGLの別経路で処理します。二つを同じ言葉で曖昧にせず、画面上でそれぞれの役割を確認できる構成にしています。',
      articleCta: '屈折ラボを開く',
      fallbackNote: '下のCSSプレイグラウンドは、透明度、境界、ぼかしといった素材表現を比較するためのものです。背景そのものを変位させる処理は、上のWebGL経路とGlass Labで確認できます。',
      sourcesLabel: '参考資料',
      architecture: ['DOMシーン', 'Canvasキャプチャ', 'WebGLテクスチャ', 'フラグメントシェーダー', '屈折後のピクセル']
    }
  };

  const CONTROL_LABELS = {
    ko: { refraction:'굴절', blurAmount:'Blur', chromAberration:'색수차', specular:'Specular', fresnel:'Fresnel', edgeHighlight:'경계광', zRadius:'Bevel 깊이', cornerRadius:'모서리', saturation:'채도', brightness:'밝기', width:'너비', height:'높이' },
    en: { refraction:'Refraction', blurAmount:'Blur', chromAberration:'Chromatic', specular:'Specular', fresnel:'Fresnel', edgeHighlight:'Edge light', zRadius:'Bevel depth', cornerRadius:'Corner', saturation:'Saturation', brightness:'Brightness', width:'Width', height:'Height' },
    ja: { refraction:'屈折', blurAmount:'ぼかし', chromAberration:'色収差', specular:'鏡面反射', fresnel:'Fresnel', edgeHighlight:'縁の光', zRadius:'ベベル深度', cornerRadius:'角丸', saturation:'彩度', brightness:'明るさ', width:'幅', height:'高さ' }
  };

  const language = () => {
    const value = document.documentElement.lang || 'ko';
    return value.startsWith('ja') ? 'ja' : value.startsWith('en') ? 'en' : 'ko';
  };

  function applyRefractionEdition() {
    const root = document.querySelector('.refraction-page');
    if (!root) return;
    const lang = language();
    const copy = COPY[lang];
    const intro = root.querySelector('.refraction-header > p'); if (intro) intro.textContent = copy.intro;
    const drag = root.querySelector('.refraction-drag-note'); if (drag) drag.textContent = copy.drag;
    const controlsTitle = root.querySelector('.ref-controls-head strong'); if (controlsTitle) controlsTitle.textContent = copy.controls;
    const reset = root.querySelector('#refReset'); if (reset) reset.textContent = copy.reset;
    const config = root.querySelector('.ref-config > span'); if (config) config.textContent = copy.config;
    Object.entries(CONTROL_LABELS[lang]).forEach(([id,label]) => {
      const input = root.querySelector(`#ref-${id}`); const row = input?.closest('.ref-control'); const node = row?.querySelector(':scope > span');
      if (node) node.textContent = label;
    });
    root.querySelectorAll('.refraction-explainer > article').forEach((article,index) => {
      const [title,body] = copy.notes[index] || []; if (!title) return;
      const heading = article.querySelector('h2'); const paragraph = article.querySelector('p');
      if (heading) heading.textContent = title; if (paragraph) paragraph.textContent = body;
    });
  }

  function applyGlassArticleEdition() {
    const correction = document.querySelector('.refraction-correction');
    if (!correction) return;
    const copy = COPY[language()];
    const heading = correction.querySelector('h2'); const paragraph = correction.querySelector(':scope > p');
    if (heading) heading.textContent = copy.articleTitle;
    if (paragraph) paragraph.textContent = copy.articleBody;
    correction.querySelectorAll('.refraction-architecture span').forEach((node,index) => { if (copy.architecture[index]) node.textContent = copy.architecture[index]; });
    const cta = correction.querySelector('.refraction-cta'); if (cta) cta.textContent = `${copy.articleCta} →`;
    const sourceLabel = correction.querySelector('.sources > span'); if (sourceLabel) sourceLabel.textContent = copy.sourcesLabel;
    const fallback = document.querySelector('.css-fallback-note'); if (fallback) fallback.textContent = copy.fallbackNote;
  }

  let raf = 0;
  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        applyRefractionEdition();
        applyGlassArticleEdition();
      });
    });
  }

  document.addEventListener('hj:rendered', schedule);
  queueMicrotask(schedule);
})();
