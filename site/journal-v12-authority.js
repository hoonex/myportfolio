/* v12: canonical user-facing editorial metadata authority. */
(() => {
  const EDITIONS = {
    ko: {
      glass: {
        category: '재질 / 광학',
        title: 'Liquid Glass는 단순한 블러가 아니다.',
        deck: '유리처럼 보이게 만드는 핵심은 blur 수치가 아니라 위계, 배경과의 관계, 경계의 빛, 입력에 대한 반응, 그리고 실제 굴절과 시각적 착시를 구분하는 태도다.',
        lede: '웹에서 유리 효과는 너무 쉽게 blur 한 줄로 요약된다. 하지만 인터페이스가 재질처럼 느껴지려면 “얼마나 흐린가”보다 왜 이 표면이 떠 있는지, 뒤의 정보가 얼마나 남아야 하는지, 손가락과 포인터에 어떤 속도로 반응하는지가 먼저 정리되어야 한다.'
      },
      sloar: {
        category: '도구 / 시스템',
        title: 'Sloar를 만들며 배운 것은 “기억”보다 “상태”였다.',
        deck: '채팅은 이어져도 저장소와 실행 환경은 계속 바뀐다. Sloar는 대화의 기억을 믿는 대신 현재 저장소 상태를 다시 식별하고, 확인한 증거만큼만 완료를 말하게 만드는 작업 규칙이다.',
        lede: '채팅 기반 개발에서 가장 위험한 순간은 대화가 자연스럽게 이어진다는 이유로 개발 환경도 그대로라고 믿을 때다. 브랜치가 움직이고, 샌드박스가 사라지고, 권한과 CI 상태가 달라질 수 있다. 그래서 Sloar는 기억을 복원하는 기술보다 현재 상태를 다시 증명하는 절차에 더 많은 비중을 둔다.'
      },
      motion: {
        category: '인터랙션',
        title: '좋은 모션은 애니메이션보다 입력의 연속성에 가깝다.',
        deck: '눌렀을 때 즉시 반응하고, 드래그 중에는 손을 따라가며, 놓는 순간에는 속도를 이어받아야 한다. 모션의 목적은 장식이 아니라 사용자의 의도를 끊지 않는 것이다.',
        lede: '유려한 인터페이스와 “애니메이션이 많은 화면”은 다르다. 사용자가 다시 잡았을 때 현재 보이는 위치에서 이어지고, 빠르게 던졌다면 그 속도가 다음 움직임에 남아 있으며, 경계에 닿았을 때 저항이 생겨야 한다. 이 연속성이 맞으면 모션 자체는 오히려 덜 눈에 띈다.'
      }
    },
    en: {
      glass: {
        category: 'Material / optics',
        title: 'Liquid Glass is a hierarchy problem before it is a blur effect.',
        deck: 'The convincing part is not the blur radius. It is the relationship between surface, background, edge light, input, and the point where an illusion must give way to real refraction.',
        lede: 'Blur is easy to demo and easy to over-credit. A glass surface becomes useful only when it preserves the right amount of context, separates the right layer, and responds to input like one coherent material. The optical effect is one part of that system, not the definition of it.'
      },
      sloar: {
        category: 'Tool / system',
        title: 'Sloar is an argument for state over memory.',
        deck: 'A chat can remain continuous while the repository, sandbox, permissions, and CI move underneath it. Sloar re-identifies the working state first and limits every completion claim to evidence collected for that exact state.',
        lede: 'The dangerous part of chat-based development is not forgetting a sentence; it is mistaking conversational continuity for engineering continuity. Sloar treats the repository as mutable external state that must be resolved again before a meaningful edit, verification, or publication claim.'
      },
      motion: {
        category: 'Interaction',
        title: 'Good motion preserves intent instead of displaying animation.',
        deck: 'Contact should respond immediately, dragging should stay attached to the pointer, and release should carry velocity forward. Motion earns its place when it keeps the user’s intent continuous.',
        lede: 'A fluid interface is not one with more animation. It is one that can be interrupted without jumping, can inherit velocity without feeling canned, and can answer a boundary with resistance instead of an unrelated flourish. When continuity is right, the animation itself becomes less conspicuous.'
      }
    },
    ja: {
      glass: {
        category: '素材 / 光学',
        title: 'ガラスらしさは、ぼかしだけでは作れない。',
        deck: '重要なのはぼかし量ではなく、情報の階層、背景との距離、縁の光、入力への反応、そして「見せ方」と本当の屈折を区別することだ。',
        lede: 'Webのガラス表現は、backdrop-filterのぼかしだけで説明されがちだ。しかし素材として成立させるには、背後の情報をどこまで残すのか、どの面を前に出すのか、触れた瞬間にどう反応するのかまで一つのルールとして設計する必要がある。'
      },
      sloar: {
        category: '開発プロトコル',
        title: 'Sloarを作って分かったのは、記憶より「現在の状態」が重要だということ。',
        deck: '会話が続いていても、リポジトリ、実行環境、権限、CIは変わり続ける。Sloarは過去の会話を正解扱いせず、今の状態を確認し直してから作業を進めるための手順だ。',
        lede: 'チャットで開発していると、会話が自然につながるほど「環境も前と同じだ」と思いやすい。実際にはブランチが進み、サンドボックスが消え、権限やCIの条件も変わる。Sloarでは、記憶をうまく補うことより、作業対象をその都度確認し直すことを優先する。'
      },
      motion: {
        category: 'インタラクション',
        title: '良いモーションは、演出よりも操作の連続性を守る。',
        deck: '押した瞬間に反応し、ドラッグ中は指やポインターから離れず、放した後は速度を引き継ぐ。モーションの役割は目立つことではなく、操作意図を途中で切らないことだ。',
        lede: '滑らかなUIと、アニメーションの多いUIは同じではない。途中でつかみ直しても現在位置から続き、速く払えばその勢いが残り、端では抵抗が返ってくる。こうした連続性が整うと、モーション自体はむしろ意識されにくくなる。'
      }
    }
  };

  const route = () => (location.hash.slice(1) || '/').split('?')[0];
  const language = () => {
    const value = document.documentElement.lang || 'ko';
    return value.startsWith('ja') ? 'ja' : value.startsWith('en') ? 'en' : 'ko';
  };

  let editorialInstalled = false;

  function syncPostMetadata() {
    if (typeof posts !== 'object' || !posts) return;
    const edition = EDITIONS[language()];
    for (const [slug, copy] of Object.entries(edition)) {
      if (!posts[slug]) continue;
      Object.assign(posts[slug], {
        category: copy.category,
        title: copy.title,
        deck: copy.deck
      });
    }
  }

  function currentArticleCopy() {
    const slug = route().match(/^\/post\/(glass|sloar|motion)$/)?.[1];
    if (!slug) return null;
    const copy = EDITIONS[language()]?.[slug];
    return copy ? { slug, copy } : null;
  }

  function applyCanonicalArticleDOM() {
    const current = currentArticleCopy();
    if (!current) return;
    const article = document.querySelector('.article');
    if (!article) return;
    const { copy } = current;
    const kicker = article.querySelectorAll('.article-kicker > span');
    const title = article.querySelector(':scope > h1');
    const deck = article.querySelector(':scope > .article-deck');
    const lede = article.querySelector('.article-body > .lede');
    if (kicker[2] && kicker[2].textContent !== copy.category) kicker[2].textContent = copy.category;
    if (title && title.textContent !== copy.title) title.textContent = copy.title;
    if (deck && deck.textContent !== copy.deck) deck.textContent = copy.deck;
    if (lede && lede.textContent !== copy.lede) lede.textContent = copy.lede;
  }

  function canonicalizeArticleHTML(html, slug) {
    const copy = EDITIONS[language()]?.[slug];
    if (!copy) return html;
    const template = document.createElement('template');
    template.innerHTML = html;
    const article = template.content.querySelector('.article');
    if (!article) return html;
    const kicker = article.querySelectorAll('.article-kicker > span');
    if (kicker[2]) kicker[2].textContent = copy.category;
    const title = article.querySelector(':scope > h1');
    const deck = article.querySelector(':scope > .article-deck');
    const lede = article.querySelector('.article-body > .lede');
    if (title) title.textContent = copy.title;
    if (deck) deck.textContent = copy.deck;
    if (lede) lede.textContent = copy.lede;
    return template.innerHTML;
  }

  function installEditorialAuthority() {
    if (editorialInstalled) return false;
    if (typeof articleTemplate !== 'function' || typeof homeTemplate !== 'function' || typeof render !== 'function' || typeof posts !== 'object') return false;
    const previousArticleTemplate = articleTemplate;
    const previousHomeTemplate = homeTemplate;
    const previousRender = render;

    articleTemplate = function(post) {
      syncPostMetadata();
      return canonicalizeArticleHTML(previousArticleTemplate(post), post?.slug);
    };
    homeTemplate = function() {
      syncPostMetadata();
      return previousHomeTemplate();
    };
    render = function() {
      syncPostMetadata();
      previousRender();
      applyCanonicalArticleDOM();
    };

    editorialInstalled = true;
    document.documentElement.dataset.editorialAuthority = 'v12';
    syncPostMetadata();
    return true;
  }

  function reconcile({ rerender = false } = {}) {
    const installedNow = installEditorialAuthority();
    applyCanonicalArticleDOM();
    if ((installedNow || rerender) && editorialInstalled && /^\/post\/(glass|sloar|motion)$/.test(route()) && typeof render === 'function') {
      render();
    }
  }

  document.addEventListener('hj:rendered', () => reconcile());
  addEventListener('hashchange', () => queueMicrotask(() => reconcile()));
  const observer = new MutationObserver(() => reconcile());
  observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['lang'] });
  queueMicrotask(() => reconcile({ rerender: true }));
})();
