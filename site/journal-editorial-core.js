/* Lightweight multilingual editorial shell. Full v2 article/Lab content is route-loaded. */
(() => {
  const COPY = {
    ko: {
      index:'Index', lab:'Glass Lab', tagline:'Interface experiments, 2026', theme:'테마 전환', home:'홈',
      eyebrow:'Selected experiments / 2026', heroHtml:'인터페이스를 화면이 아니라 <span class="serifish">물성</span>으로 생각합니다.',
      heroIntro:'재질, 모션, 도구를 직접 만들고 부수며 기록하는 디자인 저널. 완성된 결과보다 왜 그렇게 동작해야 하는지를 보여주는 곳입니다.',
      heroNote:'일반적인 포트폴리오보다 작업 노트에 가깝습니다. 코드와 실패한 가정, 실험 가능한 프로토타입을 숨기지 않습니다.',
      writing:'저널 / 실험', notes:'03 notes', principle:'작업 원칙',
      manifesto:'Polish는 장식이 아니라 시각적 위계, 입력, 모션, 시스템 동작이 서로 모순되지 않는 상태다.',
      read:'읽기', back:'← Index', loading:'본문과 실험을 불러오는 중입니다.', labLoading:'Glass Lab의 광학 실험을 불러오는 중입니다.',
      contents:'이 글의 구성', progress:'읽는 중', previews:{glass:'WebGL 굴절 · 젤리 드래그',sloar:'상태 복구 · 실패 주입',motion:'스프링 · 속도 전달'},
      posts:{
        glass:{number:'01',category:'재질 / 광학',date:'Aug 2026',reading:'약 13분',title:'Liquid Glass는 단순한 블러가 아니다.',deck:'유리처럼 보이게 만드는 핵심은 blur 수치가 아니라 위계, 배경과의 관계, 경계의 빛, 입력에 대한 반응, 그리고 실제 굴절과 시각적 착시를 구분하는 태도다.'},
        sloar:{number:'02',category:'도구 / 시스템',date:'Aug 2026',reading:'약 12분',title:'Sloar를 만들며 배운 것은 “기억”보다 “상태”였다.',deck:'채팅은 이어져도 저장소와 실행 환경은 계속 바뀐다. Sloar는 대화의 기억을 믿는 대신 현재 저장소 상태를 다시 식별하고, 확인한 증거만큼만 완료를 말하게 만드는 작업 규칙이다.'},
        motion:{number:'03',category:'인터랙션',date:'Aug 2026',reading:'약 11분',title:'좋은 모션은 애니메이션보다 입력의 연속성에 가깝다.',deck:'눌렀을 때 즉시 반응하고, 드래그 중에는 손을 따라가며, 놓는 순간에는 속도를 이어받아야 한다. 모션의 목적은 장식이 아니라 사용자의 의도를 끊지 않는 것이다.'}
      }
    },
    en: {
      index:'Index', lab:'Glass Lab', tagline:'Interface experiments, 2026', theme:'Toggle theme', home:'Home',
      eyebrow:'Selected experiments / 2026', heroHtml:'I treat interfaces as <span class="serifish">materials,</span> not screens.',
      heroIntro:'A design journal about materials, motion, and tools built by taking them apart. The goal is to show why something should behave a certain way, not only how the final surface looks.',
      heroNote:'Closer to a working notebook than a conventional portfolio. Code, failed assumptions, and prototypes stay visible.',
      writing:'Journal / experiments', notes:'03 notes', principle:'Working principle',
      manifesto:'Polish is not decoration. It is the point where visual hierarchy, input, motion, and system behavior stop contradicting one another.',
      read:'read', back:'← Index', loading:'Loading the full article and interactive experiment.', labLoading:'Loading the optical Glass Lab.',
      contents:'On this page', progress:'READING', previews:{glass:'WebGL refraction · jelly drag',sloar:'state recovery · failure injection',motion:'springs · velocity handoff'},
      posts:{
        glass:{number:'01',category:'Material / optics',date:'Aug 2026',reading:'13 min',title:'Liquid Glass is a hierarchy problem before it is a blur effect.',deck:'The convincing part is not the blur radius. It is the relationship between surface, background, edge light, input, and the point where an illusion must give way to real refraction.'},
        sloar:{number:'02',category:'Tool / system',date:'Aug 2026',reading:'12 min',title:'Sloar is an argument for state over memory.',deck:'A chat can remain continuous while the repository, sandbox, permissions, and CI move underneath it. Sloar re-identifies the working state first and limits every completion claim to evidence collected for that exact state.'},
        motion:{number:'03',category:'Interaction',date:'Aug 2026',reading:'11 min',title:'Good motion preserves intent instead of displaying animation.',deck:'Contact should respond immediately, dragging should stay attached to the pointer, and release should carry velocity forward. Motion earns its place when it keeps the user’s intent continuous.'}
      }
    },
    ja: {
      index:'Index', lab:'Glass Lab', tagline:'Interface experiments, 2026', theme:'テーマ切替', home:'ホーム',
      eyebrow:'Selected experiments / 2026', heroHtml:'インターフェースを「画面」ではなく、<span class="serifish">手触りのある素材</span>として考える。',
      heroIntro:'素材、モーション、ツールを自分で作り、壊しながら記録するデザインジャーナル。完成した見た目だけではなく、なぜその振る舞いにするのかまで残します。',
      heroNote:'一般的なポートフォリオというより、制作ノートに近い場所です。コード、うまくいかなかった仮説、実際に触れるプロトタイプもそのまま見せます。',
      writing:'記録 / 実験', notes:'03本', principle:'制作原則',
      manifesto:'完成度は装飾の量ではない。視覚階層、入力、モーション、システムの振る舞いが矛盾なくつながっている状態を指す。',
      read:'読む', back:'← Index', loading:'本文と操作できる実験を読み込んでいます。', labLoading:'Glass Labの光学実験を読み込んでいます。',
      contents:'この記事の構成', progress:'読書中', previews:{glass:'WebGL屈折 · ドラッグ変形',sloar:'状態復元 · 障害注入',motion:'スプリング · 速度の引き継ぎ'},
      posts:{
        glass:{number:'01',category:'素材 / 光学',date:'2026年8月',reading:'約13分',title:'ガラスらしさは、ぼかしだけでは作れない。',deck:'重要なのはぼかし量ではなく、情報の階層、背景との距離、縁の光、入力への反応、そして「見せ方」と本当の屈折を区別することだ。'},
        sloar:{number:'02',category:'開発プロトコル',date:'2026年8月',reading:'約12分',title:'Sloarを作って分かったのは、記憶より「現在の状態」が重要だということ。',deck:'会話が続いていても、リポジトリ、実行環境、権限、CIは変わり続ける。Sloarは過去の会話を正解扱いせず、今の状態を確認し直してから作業を進めるための手順だ。'},
        motion:{number:'03',category:'インタラクション',date:'2026年8月',reading:'約11分',title:'良いモーションは、演出よりも操作の連続性を守る。',deck:'押した瞬間に反応し、ドラッグ中は指やポインターから離れず、放した後は速度を引き継ぐ。モーションの役割は目立つことではなく、操作意図を途中で切らないことだ。'}
      }
    }
  };

  const fullEditorialRoutes = new Set(['/lab','/post/glass','/post/sloar','/post/motion']);
  const currentRoute = () => (location.hash.slice(1) || '/').split('?')[0];
  let lang = storage.getItem('hj-lang') || (/^ja/i.test(navigator.language) ? 'ja' : /^ko/i.test(navigator.language) ? 'ko' : 'en');
  if (!COPY[lang]) lang = 'en';
  const t = () => COPY[lang];

  function setPostMetadata() {
    Object.entries(t().posts).forEach(([slug, meta]) => {
      if (!posts[slug]) return;
      Object.assign(posts[slug], { ...meta, visual: slug });
    });
  }

  homeTemplate = function() {
    return `<div class="page home-page"><section class="hero"><div class="eyebrow">${t().eyebrow}</div><h1>${t().heroHtml}</h1><div class="hero-meta"><p class="hero-intro">${t().heroIntro}</p><div class="hero-note">${t().heroNote}</div></div></section><section aria-labelledby="writing-title"><div class="section-head"><h2 id="writing-title">${t().writing}</h2><span>${t().notes}</span></div><div class="post-grid">${['glass','sloar','motion'].map((slug,i)=>{const post=posts[slug];return `<a class="post-card" href="#/post/${slug}" data-post="${slug}">${i<2?`<span class="card-orb ${i===0?'blue':'orange'}" aria-hidden="true"></span>`:''}<div class="post-card-top"><span>${post.number} / ${post.category}</span><span>${post.date}</span></div><div><h3>${post.title}</h3><p>${post.deck}</p><span class="reading-time">${post.reading} · ${t().read}</span></div><span class="post-card-arrow" aria-hidden="true">↗</span></a>`;}).join('')}</div></section><section class="manifesto"><div class="manifesto-label">${t().principle}</div><p class="manifesto-copy">${t().manifesto}</p></section></div>`;
  };

  articleTemplate = function(post) {
    return `<div class="page article-page" data-editorial-shell="${post.slug}"><article class="article"><a class="article-back" href="#/">${t().back}</a><div class="article-kicker"><span>${post.number}</span><span class="dot"></span><span>${post.category}</span><span class="dot"></span><span>${post.date}</span></div><h1>${post.title}</h1><p class="article-deck">${post.deck}</p><span class="reading-time">${post.reading} · ${t().read}</span>${articleVisual(post.visual)}<div class="article-body"><p class="lede" role="status" aria-live="polite">${t().loading}</p></div></article></div>`;
  };

  labTemplate = function() {
    return `<div class="page lab" data-editorial-shell="lab"><section class="lab-header"><h1>Glass<br>Lab.</h1><p role="status" aria-live="polite">${t().labLoading}</p></section></div>`;
  };

  function updateChrome() {
    document.documentElement.lang = lang;
    document.querySelector('[data-nav="home"]')?.replaceChildren(t().index);
    document.querySelector('[data-nav="lab"]')?.replaceChildren(t().lab);
    document.querySelector('#themeToggle')?.setAttribute('aria-label', t().theme);
    document.querySelector('.brand')?.setAttribute('aria-label', t().home);
    document.querySelectorAll('#langSwitch [data-lang]').forEach(button => button.classList.toggle('active', button.dataset.lang === lang));
    const footer = document.querySelector('.site-footer .muted');
    if (footer) footer.textContent = t().tagline;
    const footerLab = [...document.querySelectorAll('.site-footer a')].find(anchor => anchor.getAttribute('href') === '#/lab');
    if (footerLab) footerLab.textContent = t().lab;
  }

  function removeCoreSwitch() {
    document.querySelector('#langSwitch[data-owner="editorial-core"]')?.remove();
  }

  function injectCoreSwitch() {
    if (document.querySelector('#langSwitch')) return;
    const links = document.querySelector('.topbar-links');
    const theme = document.querySelector('#themeToggle');
    if (!links || !theme) return;
    const wrap = document.createElement('div');
    wrap.className = 'lang-switch';
    wrap.id = 'langSwitch';
    wrap.dataset.owner = 'editorial-core';
    wrap.setAttribute('aria-label', 'Language');
    wrap.innerHTML = '<button type="button" data-lang="ko">KO</button><button type="button" data-lang="en">EN</button><button type="button" data-lang="ja">JP</button>';
    links.insertBefore(wrap, theme);
    wrap.addEventListener('click', event => {
      const button = event.target.closest('[data-lang]');
      if (!button || !COPY[button.dataset.lang]) return;
      lang = button.dataset.lang;
      storage.setItem('hj-lang', lang);
      setPostMetadata();
      updateChrome();
      if (currentRoute() === '/post/spatial') window.HJRuntime?.schedule?.();
      else render();
    });
  }


  const documentLanguage = () => {
    const value = document.documentElement.lang || lang;
    return value.startsWith('ja') ? 'ja' : value.startsWith('en') ? 'en' : 'ko';
  };

  let localeRaf = 0;
  function applyLocaleChrome() {
    const copy = COPY[documentLanguage()];
    Object.entries(copy.previews).forEach(([slug, text]) => {
      document.querySelectorAll(`.post-card--${slug} .studio-preview-label span, .post-card--${slug} .studio-card-cta > span`).forEach(node => { node.textContent = text; });
    });
    document.querySelectorAll('.article-rail-v6').forEach(rail => {
      rail.setAttribute('aria-label', copy.contents);
      const head = rail.querySelector('.article-rail-head span');
      if (head) head.textContent = copy.contents;
    });
    document.querySelectorAll('.reading-progress-v6 span').forEach(node => { node.textContent = copy.progress; });
  }

  function scheduleLocaleChrome() {
    cancelAnimationFrame(localeRaf);
    localeRaf = requestAnimationFrame(() => {
      localeRaf = requestAnimationFrame(applyLocaleChrome);
    });
  }

  function syncSwitchOwnership() {
    if (fullEditorialRoutes.has(currentRoute())) removeCoreSwitch();
    else injectCoreSwitch();
    updateChrome();
  }

  setPostMetadata();
  syncSwitchOwnership();
  render();
  document.addEventListener('hj:rendered', scheduleLocaleChrome);
  queueMicrotask(scheduleLocaleChrome);
  addEventListener('hashchange', () => queueMicrotask(syncSwitchOwnership));
})();
