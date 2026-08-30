/* Journal v10: locale-native editorial voice for the original essays and technical UI. */
(() => {
  const EDITIONS = {
    ko: {
      home: { writing:'저널 / 실험', principle:'작업 원칙' },
      glass: {
        category:'재질 / 광학',
        title:'Liquid Glass는 단순한 블러가 아니다.',
        deck:'유리처럼 보이게 만드는 핵심은 blur 수치가 아니라 위계, 배경과의 관계, 경계의 빛, 입력에 대한 반응, 그리고 실제 굴절과 시각적 착시를 구분하는 태도다.',
        lede:'웹에서 유리 효과는 너무 쉽게 blur 한 줄로 요약된다. 하지만 인터페이스가 재질처럼 느껴지려면 “얼마나 흐린가”보다 왜 이 표면이 떠 있는지, 뒤의 정보가 얼마나 남아야 하는지, 손가락과 포인터에 어떤 속도로 반응하는지가 먼저 정리되어야 한다.'
      },
      sloar: {
        category:'도구 / 시스템',
        title:'Sloar를 만들며 배운 것은 “기억”보다 “상태”였다.',
        deck:'채팅은 이어져도 저장소와 실행 환경은 계속 바뀐다. Sloar는 대화의 기억을 믿는 대신 현재 저장소 상태를 다시 식별하고, 확인한 증거만큼만 완료를 말하게 만드는 작업 규칙이다.',
        lede:'채팅 기반 개발에서 가장 위험한 순간은 대화가 자연스럽게 이어진다는 이유로 개발 환경도 그대로라고 믿을 때다. 브랜치가 움직이고, 샌드박스가 사라지고, 권한과 CI 상태가 달라질 수 있다. 그래서 Sloar는 기억을 복원하는 기술보다 현재 상태를 다시 증명하는 절차에 더 많은 비중을 둔다.'
      },
      motion: {
        category:'인터랙션',
        title:'좋은 모션은 애니메이션보다 입력의 연속성에 가깝다.',
        deck:'눌렀을 때 즉시 반응하고, 드래그 중에는 손을 따라가며, 놓는 순간에는 속도를 이어받아야 한다. 모션의 목적은 장식이 아니라 사용자의 의도를 끊지 않는 것이다.',
        lede:'유려한 인터페이스와 “애니메이션이 많은 화면”은 다르다. 사용자가 다시 잡았을 때 현재 보이는 위치에서 이어지고, 빠르게 던졌다면 그 속도가 다음 움직임에 남아 있으며, 경계에 닿았을 때 저항이 생겨야 한다. 이 연속성이 맞으면 모션 자체는 오히려 덜 눈에 띈다.'
      },
      spatialLab: {
        desc:'이 장면은 렌더러 데모가 아니라 공간 관계를 확인하기 위한 블록아웃입니다. 드래그하거나 방향키로 시점을 돌리고, 원근감과 카메라 깊이를 바꾸면서 형태가 어떻게 달라지는지 확인해 보세요.',
        note:'CSS 3D 블록아웃 · 인터랙션과 공간 위계 검증용'
      }
    },
    en: {
      home: { writing:'Journal / experiments', principle:'Working principle' },
      glass: {
        category:'Material / optics',
        title:'Liquid Glass is a hierarchy problem before it is a blur effect.',
        deck:'The convincing part is not the blur radius. It is the relationship between surface, background, edge light, input, and the point where an illusion must give way to real refraction.',
        lede:'Blur is easy to demo and easy to over-credit. A glass surface becomes useful only when it preserves the right amount of context, separates the right layer, and responds to input like one coherent material. The optical effect is one part of that system, not the definition of it.'
      },
      sloar: {
        category:'Tool / system',
        title:'Sloar is an argument for state over memory.',
        deck:'A chat can remain continuous while the repository, sandbox, permissions, and CI move underneath it. Sloar re-identifies the working state first and limits every completion claim to evidence collected for that exact state.',
        lede:'The dangerous part of chat-based development is not forgetting a sentence; it is mistaking conversational continuity for engineering continuity. Sloar treats the repository as mutable external state that must be resolved again before a meaningful edit, verification, or publication claim.'
      },
      motion: {
        category:'Interaction',
        title:'Good motion preserves intent instead of displaying animation.',
        deck:'Contact should respond immediately, dragging should stay attached to the pointer, and release should carry velocity forward. Motion earns its place when it keeps the user’s intent continuous.',
        lede:'A fluid interface is not one with more animation. It is one that can be interrupted without jumping, can inherit velocity without feeling canned, and can answer a boundary with resistance instead of an unrelated flourish. When continuity is right, the animation itself becomes less conspicuous.'
      },
      spatialLab: {
        desc:'This blockout is a spatial diagnostic, not a renderer showcase. Orbit it with the pointer or arrow keys, then change perspective and camera depth to expose relationships that only worked from one view.',
        note:'CSS 3D blockout · interaction and spatial-hierarchy study'
      }
    },
    ja: {
      home: { writing:'記録 / 実験', principle:'制作原則' },
      glass: {
        category:'素材 / 光学',
        title:'ガラスらしさは、ぼかしだけでは作れない。',
        deck:'重要なのはぼかし量ではなく、情報の階層、背景との距離、縁の光、入力への反応、そして「見せ方」と本当の屈折を区別することだ。',
        lede:'Webのガラス表現は、backdrop-filterのぼかしだけで説明されがちだ。しかし素材として成立させるには、背後の情報をどこまで残すのか、どの面を前に出すのか、触れた瞬間にどう反応するのかまで一つのルールとして設計する必要がある。'
      },
      sloar: {
        category:'開発プロトコル',
        title:'Sloarを作って分かったのは、記憶より「現在の状態」が重要だということ。',
        deck:'会話が続いていても、リポジトリ、実行環境、権限、CIは変わり続ける。Sloarは過去の会話を正解扱いせず、今の状態を確認し直してから作業を進めるための手順だ。',
        lede:'チャットで開発していると、会話が自然につながるほど「環境も前と同じだ」と思いやすい。実際にはブランチが進み、サンドボックスが消え、権限やCIの条件も変わる。Sloarでは、記憶をうまく補うことより、作業対象をその都度確認し直すことを優先する。',
        headings:[
          '会話履歴をリポジトリの代わりにしない。',
          '状態遷移は、あえて単純にする。',
          '同じ失敗をそのまま繰り返さない。',
          'Gitとホスティング側の障害を分けて考える。',
          '必要十分な権限だけを使う。',
          '確認できた事実以上のことを言わない。',
          'プロトコルにも読みやすい画面が必要だ。',
          'Sloarが決めないことを、先に決めておく。'
        ]
      },
      motion: {
        category:'インタラクション',
        title:'良いモーションは、演出よりも操作の連続性を守る。',
        deck:'押した瞬間に反応し、ドラッグ中は指やポインターから離れず、放した後は速度を引き継ぐ。モーションの役割は目立つことではなく、操作意図を途中で切らないことだ。',
        lede:'滑らかなUIと、アニメーションの多いUIは同じではない。途中でつかみ直しても現在位置から続き、速く払えばその勢いが残り、端では抵抗が返ってくる。こうした連続性が整うと、モーション自体はむしろ意識されにくくなる。',
        headings:[
          '反応はクリック完了ではなく、触れた瞬間から始める。',
          'ドラッグ中は入力と1対1で動かす。',
          '途中でつかみ直しても、現在位置から続ける。',
          '位置だけでなく、速度も状態として扱う。',
          '放した先を予測して、自然な着地点を選ぶ。',
          '境界では止めるより、抵抗を返す。',
          'バウンスは理由がある時だけ使う。',
          '良いモーションは、会話のように割り込める。'
        ]
      },
      spatialLab: {
        desc:'これはレンダラーの見本ではなく、空間関係を確かめるためのブロックアウトです。ドラッグまたは矢印キーで視点を回し、遠近感とカメラの奥行きを変えながら、配置の見え方がどう変化するか確認できます。',
        note:'CSS 3Dブロックアウト · 操作感と空間の階層を確認する実験'
      }
    }
  };

  const JA_TERMS = [
    [/\bChat history\b/gi,'会話履歴'], [/\bChat\b/g,'チャット'], [/\bcoding agent\b/gi,'コーディングエージェント'],
    [/\bAgent workflow\b/gi,'エージェントの作業フロー'], [/\bworkflow file\b/gi,'ワークフローファイル'], [/\bworkflow\b/gi,'ワークフロー'],
    [/\brepository\b/gi,'リポジトリ'], [/\bremote branch\b/gi,'リモートブランチ'], [/\bbranch\b/gi,'ブランチ'],
    [/\bworking-tree change\b/gi,'作業ツリーの変更'], [/\bworking tree\b/gi,'作業ツリー'], [/\bworking-tree\b/gi,'作業ツリー'], [/\bworktree\b/gi,'作業ツリー'],
    [/\bengineering state\b/gi,'開発状態'], [/\bdurable state\b/gi,'永続的な状態'], [/\bdurable truth\b/gi,'永続的な事実'], [/\bsource of truth\b/gi,'信頼できる基準'],
    [/\bsource identity\b/gi,'作業対象の識別'], [/\bstate machine\b/gi,'状態遷移'], [/\bworking state\b/gi,'作業状態'], [/\bstate\b/gi,'状態'],
    [/\bmemory\b/gi,'記憶'], [/\bevidence\b/gi,'検証結果'], [/\bverification\b/gi,'検証'], [/\bcompletion report\b/gi,'完了報告'],
    [/\bexit condition\b/gi,'完了条件'], [/\btask\b/gi,'作業'], [/\boperation\b/gi,'操作'], [/\binputs\b/gi,'入力'], [/\binput\b/gi,'入力'],
    [/\bretry\b/gi,'再試行'], [/\bfailing phase\b/gi,'失敗した段階'], [/\bstatus code\b/gi,'ステータスコード'], [/\bnormalized error\b/gi,'正規化したエラー'],
    [/\bfailure fingerprint\b/gi,'失敗の指紋'], [/\bfailure domain\b/gi,'障害領域'], [/\bforge API\b/gi,'ホスティング側API'], [/\bforge\b/gi,'ホスティング側'],
    [/\bhosted API\b/gi,'ホスト側API'], [/\blocal build\b/gi,'ローカルビルド'], [/\blocal execution\b/gi,'ローカル実行'], [/\bdeployment\b/gi,'デプロイ'],
    [/\bpermission\b/gi,'権限'], [/\bpolicy\b/gi,'ポリシー'], [/\bprotocol\b/gi,'プロトコル'], [/\btool\b/gi,'ツール'], [/\bsandbox\b/gi,'サンドボックス'],
    [/\bcommit\b/gi,'コミット'], [/\btree\b/gi,'ツリー'], [/\bmain\b/g,'main'],
    [/\bInteraction\b/g,'インタラクション'], [/\binteraction\b/gi,'インタラクション'], [/\bconversation\b/gi,'会話'], [/\bsystem\b/gi,'システム'], [/\buser\b/gi,'ユーザー'],
    [/\bgesture\b/gi,'ジェスチャー'], [/\benergy\b/gi,'勢い'], [/\bboundary\b/gi,'境界'], [/\bresistance\b/gi,'抵抗'], [/\bcontinuity\b/gi,'連続性'],
    [/\banimation\b/gi,'アニメーション'], [/\bmotion\b/gi,'モーション'], [/\bresponse\b/gi,'反応'], [/\bpressed scale\b/gi,'押下時のスケール'],
    [/\btransition\b/gi,'トランジション'], [/\bshadow\b/gi,'影'], [/\bspring\b/gi,'スプリング'], [/\brelease velocity\b/gi,'リリース時の速度'],
    [/\bvelocity handoff\b/gi,'速度の引き継ぎ'], [/\bpointer\b/gi,'ポインター'], [/\bframe drop\b/gi,'フレーム落ち'], [/\bmobile GPU\b/gi,'モバイルGPU'],
    [/\bPerspective\b/g,'遠近感'], [/\bCamera Z\b/g,'カメラの奥行き'],
    [/\bscene\b/gi,'シーン'], [/\blayer\b/gi,'レイヤー'], [/\bpanel\b/gi,'パネル'], [/\bmaterialize\b/gi,'実体化'], [/\binterruptibility\b/gi,'途中でつかみ直せること']
  ];

  const language = () => {
    const value = document.documentElement.lang || 'ko';
    return value.startsWith('ja') ? 'ja' : value.startsWith('en') ? 'en' : 'ko';
  };
  const route = () => (location.hash.slice(1) || '/').split('?')[0];

  function naturalizeJapaneseText(root) {
    if (language() !== 'ja' || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (!parent || parent.closest('code,pre,textarea,a,.refraction-architecture')) continue;
      nodes.push(walker.currentNode);
    }
    nodes.forEach(node => {
      let value = node.nodeValue || '';
      JA_TERMS.forEach(([pattern,replacement]) => { value = value.replace(pattern,replacement); });
      value = value
        .replace(/([一-龯々ぁ-ゖァ-ヺA-Za-z0-9_)])\s+([はがをにへとでのもやか])(?=[^A-Za-z]|$)/g, '$1$2')
        .replace(/\s+([、。！？）」』】])/g, '$1')
        .replace(/([（「『【])\s+/g, '$1');
      const previous = node.previousSibling;
      if (previous && (previous.nodeType === Node.ELEMENT_NODE || /\S/.test(previous.nodeValue || ''))) {
        value = value.replace(/^\s+([はがをにへとでのもやか、。！？）」』】])/, '$1');
      }
      node.nodeValue = value;
    });
  }

  function applyHome() {
    const home = document.querySelector('.home-page');
    if (!home) return;
    const copy = EDITIONS[language()].home;
    const heading = home.querySelector('#writing-title');
    const principle = home.querySelector('.manifesto-label');
    if (heading) heading.textContent = copy.writing;
    if (principle) principle.textContent = copy.principle;

    ['glass','sloar','motion'].forEach(slug => {
      const edition = EDITIONS[language()][slug];
      const card = home.querySelector(`[data-post="${slug}"]`);
      if (!card || !edition) return;
      const meta = card.querySelector('.post-card-top span:first-child');
      const title = card.querySelector('h3');
      const deck = card.querySelector('p');
      if (meta) meta.textContent = `${slug === 'glass' ? '01' : slug === 'sloar' ? '02' : '03'} / ${edition.category}`;
      if (title) title.textContent = edition.title;
      if (deck) deck.textContent = edition.deck;
    });
  }

  function applyArticle() {
    const slug = route().match(/^\/post\/(glass|sloar|motion)$/)?.[1];
    if (!slug) return;
    const article = document.querySelector('.article');
    const edition = EDITIONS[language()][slug];
    if (!article || !edition) return;

    const kicker = article.querySelector('.article-kicker span:nth-child(3)');
    const title = article.querySelector(':scope > h1');
    const deck = article.querySelector(':scope > .article-deck');
    const lede = article.querySelector('.article-body > .lede');
    if (kicker) kicker.textContent = edition.category;
    if (title) title.textContent = edition.title;
    if (deck) deck.textContent = edition.deck;
    if (lede) lede.textContent = edition.lede;

    if (Array.isArray(edition.headings)) {
      article.querySelectorAll('.article-body > .essay-section > h2').forEach((node,index) => {
        if (edition.headings[index]) node.textContent = edition.headings[index];
      });
    }
    naturalizeJapaneseText(article.querySelector('.article-body'));
    article.dataset.editorialNaturalized = 'v10';

    if (language() === 'ja') {
      article.querySelectorAll('[data-run-code]').forEach(node => { node.textContent = '実行'; });
      article.querySelectorAll('[data-reset-code]').forEach(node => { node.textContent = '初期化'; });
      article.querySelectorAll('[data-copy-code]').forEach(node => { node.textContent = 'CSSをコピー'; });
      article.querySelectorAll('.sources > span').forEach(node => { node.textContent = '参考資料'; });
    }
  }

  function applySpatialArticle() {
    if (route() !== '/post/spatial') return;
    const article = document.querySelector('[data-spatial-article]');
    if (!article) return;
    naturalizeJapaneseText(article.querySelector('.article-body'));
    const copy = EDITIONS[language()].spatialLab;
    const desc = article.querySelector('[data-spatial-lab] .live-lab-heading > p');
    const note = article.querySelector('[data-spatial-lab] .live-lab-note');
    if (desc) desc.textContent = copy.desc;
    if (note) note.textContent = copy.note;
  }

  let raf = 0;
  function schedule() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        applyHome();
        applyArticle();
        applySpatialArticle();
      });
    });
  }

  document.addEventListener('hj:rendered', schedule);
  queueMicrotask(schedule);
})();
