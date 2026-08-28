/* Journal v8: authored KO/EN/JA editorial pass + Spatial / 3D article and lab. */
(() => {
  const app = document.querySelector('#app');
  if (!app) return;

  const COPY = {
    ko: {
      count: '04 notes',
      category: 'Spatial / 3D',
      date: 'Aug 2026',
      reading: '약 12분',
      cardTitle: '3D는 모델링보다 좌표계에서 시작된다.',
      cardDeck: '카메라, 스케일, 충돌, 절차적 생성, 프레임 예산을 하나의 공간 시스템으로 설계하는 기록.',
      cardMeta: 'camera · world scale · blockout',
      open: '3D 노트 열기',
      title: '3D는 멋진 모델보다 일관된 세계가 먼저다.',
      deck: '좋은 3D 장면은 오브젝트 수가 많아서 설득력 있는 것이 아니다. 좌표계와 스케일, 카메라, 이동 규칙, 충돌, 성능 예산이 같은 세계를 설명할 때 비로소 공간이 시스템처럼 느껴진다.',
      lede: '3D 작업을 시작하면 가장 먼저 모델과 텍스처를 떠올리기 쉽다. 하지만 실제 프로토타입에서 더 오래 남는 결정은 1 unit이 무엇인지, 카메라가 어디에 있고, 플레이어가 어떤 경사를 오를 수 있으며, 보이는 geometry와 collision이 어떤 계약으로 연결되는지 같은 기준이다. 이 글은 “예쁜 한 장”보다 계속 확장할 수 있는 3D 세계를 만드는 쪽에 초점을 둔다.',
      back: '← Index',
      labBadge: 'LIVE / SPATIAL BLOCKOUT',
      labTitle: '카메라를 움직이면 설계 오류가 보인다.',
      labDesc: '아래 장면은 렌더러 데모가 아니라 공간 관계를 보는 blockout입니다. 드래그하거나 방향키를 눌러 시점을 바꾸고, perspective와 camera depth를 조절해 보세요.',
      yaw: 'Yaw', pitch: 'Pitch', perspective: 'Perspective', depth: 'Camera Z', reset: '시점 초기화',
      stageLabel: '드래그 또는 방향키로 회전하는 3D blockout',
      rail: '이 글의 구성', progress: '읽는 중', comments: '대화', local: '이 브라우저에 저장',
      studioNote: '각 글은 설명으로 끝내지 않고, 같은 페이지에서 직접 조작해 확인할 수 있게 만들었습니다.',
      translationNote: '세 언어는 문장 단위로 맞춰 번역하지 않습니다. 핵심 논지는 공유하되 한국어는 원인과 판단 근거를 충분히 설명하고, 영어는 주장을 더 압축하며, 일본어는 현업에서 실제로 쓰는 3D·UI 용어를 기준으로 문장 구조를 다시 잡았습니다.'
    },
    en: {
      count: '04 notes',
      category: 'Spatial / 3D',
      date: 'Aug 2026',
      reading: '12 min',
      cardTitle: '3D starts with a world model, not a mesh.',
      cardDeck: 'Notes on camera policy, scale, collision, procedural structure, and frame-time budgets.',
      cardMeta: 'camera · world scale · blockout',
      open: 'Open 3D note',
      title: 'A coherent world matters more than a beautiful mesh.',
      deck: 'A convincing 3D scene is not a contest for object count. Scale, camera behavior, navigation, collision, generation rules, and performance have to describe the same world.',
      lede: 'The durable decisions in a 3D prototype are rarely the first textures or hero assets. They are the rules underneath them: what one world unit means, where the camera sits, which slopes are traversable, what geometry is visual only, and what the frame-time budget can actually support. This note is about building those rules before polishing the screenshot.',
      back: '← Index',
      labBadge: 'LIVE / SPATIAL BLOCKOUT',
      labTitle: 'Move the camera until the assumptions break.',
      labDesc: 'This is a blockout diagnostic, not a renderer showcase. Drag or use the arrow keys to orbit, then change perspective and camera depth to see how quickly spatial relationships change.',
      yaw: 'Yaw', pitch: 'Pitch', perspective: 'Perspective', depth: 'Camera Z', reset: 'Reset camera',
      stageLabel: 'Interactive 3D blockout; drag or use arrow keys to orbit',
      rail: 'In this article', progress: 'READING', comments: 'Conversation', local: 'Saved in this browser',
      studioNote: 'Every entry pairs an argument with something you can actually manipulate on the same page.',
      translationNote: 'The three editions share an argument, not sentence boundaries. English compresses the claims and removes repetition that reads naturally in Korean; Japanese is rewritten around established 3D and interface terminology instead of mirroring English syntax.'
    },
    ja: {
      count: '04本',
      category: 'Spatial / 3D',
      date: '2026年8月',
      reading: '約12分',
      cardTitle: '3Dはモデリングより先に、世界の基準を決める。',
      cardDeck: 'カメラ、スケール、コリジョン、プロシージャル生成、フレーム時間を一つの空間設計として考える。',
      cardMeta: 'camera · world scale · blockout',
      open: '3Dノートを開く',
      title: '美しいメッシュより、矛盾しない世界を先につくる。',
      deck: '3Dの説得力はオブジェクト数では決まらない。スケール、カメラ、移動、コリジョン、生成ルール、負荷の設計が同じ世界を説明していることの方が重要だ。',
      lede: '3D制作では、最初にモデルやテクスチャへ手を伸ばしたくなる。けれど、プロトタイプの最後まで効き続けるのは別の判断だ。1 unitを何メートルとして扱うのか、カメラの高さと画角をどうするのか、どの勾配まで歩けるのか、見た目のメッシュとコリジョンをどう分けるのか。このノートでは完成画よりも、後から拡張しても破綻しにくい「世界の基準」を扱う。',
      back: '← Index',
      labBadge: 'LIVE / SPATIAL BLOCKOUT',
      labTitle: 'カメラを動かすと、設計の無理が見えてくる。',
      labDesc: 'これはレンダラーの見本ではなく、空間関係を確認するためのブロックアウトです。ドラッグまたは矢印キーで視点を回し、Perspective と Camera Z を変えて違いを確認できます。',
      yaw: 'Yaw', pitch: 'Pitch', perspective: 'Perspective', depth: 'Camera Z', reset: '視点をリセット',
      stageLabel: 'ドラッグまたは矢印キーで回転できる3Dブロックアウト',
      rail: 'この記事の構成', progress: '進捗', comments: 'コメント', local: 'このブラウザに保存',
      studioNote: '各記事は説明だけで終わらせず、その場で挙動を確かめられる実験と組み合わせています。',
      translationNote: '三言語は文ごとに対応させた翻訳ではありません。論点は共有しつつ、日本語版では「メッシュ」「コリジョン」「LOD」「フレーム時間」など実際の3D制作で定着している語彙を使い、英語の語順をなぞらない文章に組み直しています。'
    }
  };

  const language = () => {
    const value = document.documentElement.lang || 'ko';
    return value.startsWith('ja') ? 'ja' : value.startsWith('en') ? 'en' : 'ko';
  };
  const t = () => COPY[language()];
  const sec = (n, title, body) => `<section class="essay-section spatial-section-v8"><span class="essay-index">${String(n).padStart(2, '0')}</span><h2>${title}</h2>${body}</section>`;

  const BODY = {
    ko: () => [
      sec(1, '좌표계를 먼저 고정한다.', `<p>3D에서 “크기”는 미감이 아니라 시스템 계약이다. 1 unit을 1 m로 볼지, 캐릭터 키를 1.7 unit로 볼지, Y-up인지 Z-up인지가 초기에 흔들리면 카메라, 물리, 애니메이션, 이동 속도, import scale이 전부 서로 다른 기준을 갖게 된다.</p><p>그래서 blockout 단계에서는 건물 디테일보다 기준 물체를 먼저 둔다. 사람 높이, 문 폭, 한 층 높이, 차선 폭, 보도 폭처럼 현실의 감각을 붙잡아 주는 치수가 있으면 큰 장면에서도 스케일이 쉽게 무너지지 않는다. 좌표 원점과 chunk 단위도 같은 이유로 일찍 정해야 한다.</p>`),
      sec(2, '카메라는 렌더링 옵션이 아니라 입력 규칙이다.', `<p>같은 공간도 FOV, 카메라 높이, near clip, 회전 감도에 따라 완전히 다른 게임처럼 느껴진다. 1인칭에서는 몇 cm의 높이 차이가 문과 난간의 인상을 바꾸고, 3인칭에서는 follow distance와 collision avoidance가 이동 경로 자체를 바꾼다.</p><p>카메라를 “마지막에 맞추는 것”으로 두면 레벨이 카메라를 위해 다시 설계되는 일이 생긴다. 반대로 목표 시야각과 이동 감각을 초기에 잠그면 복도 폭, 계단 높이, 엄폐물 크기를 실제 플레이 기준으로 검증할 수 있다.</p>`),
      sec(3, '보이는 geometry와 부딪히는 geometry를 분리한다.', `<p>렌더 mesh는 형태를 설명하고 collision mesh는 이동 규칙을 설명한다. 둘을 항상 동일하게 만들면 작은 장식에 캐릭터가 걸리고, 복잡한 삼각형을 물리 엔진이 불필요하게 검사한다. 반대로 collision을 너무 단순화하면 눈에는 막혀 있는데 통과되거나, 발이 허공에 떠 보인다.</p><p>좋은 기준은 “플레이어가 이해한 형태와 이동 결과가 모순되지 않는가”다. 난간, 계단, 경사, 문턱처럼 상호작용이 많은 곳은 별도의 단순 collider를 설계하고, 장식은 가능한 한 물리 계산에서 빼는 편이 안정적이다.</p>`),
      sec(4, '절차적 도시는 랜덤이 아니라 제약조건으로 만든다.', `<p>도시를 빠르게 채우려고 위치와 크기를 무작위로 뽑으면 처음에는 풍부해 보이지만 금방 방향성이 사라진다. 현실의 도시는 도로 그래프, 필지, 용도, 층수, 일조, 출입구, 랜드마크 같은 제약이 겹친 결과이기 때문이다.</p><p>그래서 procedural generation은 “랜덤 건물 생성기”보다 규칙의 계층으로 보는 편이 낫다. 먼저 도로와 보행 동선을 고정하고, 필지를 나눈 뒤, 건물 유형과 높이를 선택하고, 마지막에 반복을 깨는 변형을 넣는다. 랜덤은 규칙을 대신하는 것이 아니라 규칙 안에서 변주를 만드는 도구다.</p>`),
      sec(5, '현실감은 중간 스케일에서 많이 결정된다.', `<p>초고해상도 텍스처보다 먼저 눈에 들어오는 것은 건물과 도로 사이의 연결이다. 연석 높이, 보도와 차도의 단차, 출입구가 도로를 향하는 방식, 층고, 창문 리듬, 교차로 폭처럼 “오브젝트 하나보다 크고 도시 전체보다 작은” 중간 스케일이 장면의 설득력을 만든다.</p><p>이 레이어가 비어 있으면 고품질 asset을 넣어도 장난감처럼 보이기 쉽다. 반대로 blockout에서도 이 비율이 맞으면 재질이 단순해도 공간을 읽을 수 있다. 디테일 우선순위를 잡을 때 texture resolution보다 silhouette와 연결 관계를 먼저 보는 이유다.</p>`),
      sec(6, '성능은 폴리곤 수 하나로 설명되지 않는다.', `<p>실제 프레임 비용은 draw call, shader 복잡도, overdraw, shadow, texture memory, skinning, physics, visibility 같은 여러 계층에서 생긴다. 폴리곤이 적은데도 투명 효과와 그림자가 많으면 느릴 수 있고, 반대로 인스턴싱과 LOD가 잘 된 장면은 생각보다 많은 geometry를 감당한다.</p><p>그래서 목표는 “몇 polygon 이하”보다 frame time budget으로 잡는 편이 정확하다. GPU와 CPU 시간을 따로 보고, 멀리 있는 건물은 LOD나 impostor로 바꾸며, 보이지 않는 공간은 occlusion과 streaming으로 제외한다. 최적화는 완성 후 청소가 아니라 장면 구조를 정하는 설계 입력이다.</p>`),
      sec(7, 'Blockout을 진단 도구로 쓴다.', `<p>아래 실험은 CSS 3D로 만든 단순한 blockout이다. 실제 게임 renderer를 흉내 내기 위한 것이 아니라, 카메라 각도와 perspective가 공간 인식에 얼마나 큰 영향을 주는지 빠르게 확인하기 위한 장치다.</p><p>장면을 돌려 보면 한 시점에서만 좋아 보이던 배치가 다른 각도에서는 겹치거나, 깊이 차이가 사라지거나, 중심 오브젝트가 과도하게 커 보이는 순간이 나온다. 3D 설계는 정지 화면보다 시점을 바꿔 보는 과정에서 더 많은 오류를 드러낸다.</p>${spatialLabMarkup()}`),
      sec(8, '포트폴리오에는 최종 렌더보다 판단의 흔적을 남긴다.', `<p>3D 결과물은 예쁜 screenshot 한 장으로 정리하기 쉽지만, 그것만으로는 어떤 문제를 해결했는지 보이지 않는다. 초기 blockout, 좌표/스케일 규칙, camera test, collision 단순화, profiling 전후, 실패한 procedural rule을 함께 보여주면 작업의 깊이가 훨씬 분명해진다.</p><p>내가 중요하게 보는 것은 “무엇을 만들었나” 다음에 “어떤 기준으로 선택했고 무엇을 버렸나”가 이어지는 기록이다. 3D는 시각 결과가 강한 만큼, 그 뒤의 engineering decision을 의도적으로 노출해야 단순한 렌더 갤러리에서 벗어날 수 있다.</p><div class="translation-note"><b>언어 편집</b><span>${t().translationNote}</span></div>`)
    ].join(''),
    en: () => [
      sec(1, 'Lock the world before you decorate it.', `<p>Scale is infrastructure. Decide what one unit means, which axis is up, where the origin lives, and how large a human, door, floor, lane, and stair are before a library of assets starts making those decisions for you.</p><p>A reference kit is more useful than an early hero model: a person-height marker, a standard doorway, a vehicle footprint, a curb, and a floor module. Those anchors make imported content easier to reject when it is wrong instead of silently normalizing a broken world.</p>`),
      sec(2, 'A camera is an interaction policy.', `<p>FOV, eye height, follow distance, clipping, and rotation sensitivity change what distances mean to a player. A corridor that looks generous in an editor viewport can feel cramped through a first-person camera; a third-person camera can turn a harmless wall into constant occlusion.</p><p>Treat the camera as an early design constraint. Once its behavior is known, door widths, cover heights, stairs, and turning spaces can be judged in the context that matters: movement, not the modeling viewport.</p>`),
      sec(3, 'Render mesh and play mesh are separate contracts.', `<p>Visual geometry explains shape. Collision geometry explains where movement is allowed. Making them identical creates fragile navigation and unnecessary physics work; separating them carelessly creates the opposite problem, where the picture and the physical result disagree.</p><p>Stairs, rails, thresholds, and slopes deserve intentional colliders because players repeatedly test them. Decorative trim usually does not. The target is not geometric purity but a consistent answer to the player's question: “Can I move through this?”</p>`),
      sec(4, 'Procedural does not mean random.', `<p>Random placement produces variety quickly and structure poorly. Cities read as cities because constraints accumulate: road topology, parcels, access, program, height bands, sight lines, landmarks, and circulation.</p><p>A useful generator therefore behaves like a pipeline of decisions. Build the road graph, derive parcels, assign typologies, establish height and frontage rules, then introduce controlled variation. Randomness works best at the end, where it can break repetition without erasing the logic underneath it.</p>`),
      sec(5, 'Believability lives at the middle scale.', `<p>High-resolution surfaces cannot rescue bad relationships. Curbs, sidewalk offsets, floor heights, entrances, window rhythm, intersections, and the gap between a building and the street often matter more than another texture set.</p><p>This middle scale sits between prop detail and city layout. Get it right in blockout and a grey scene already feels navigable. Skip it and expensive assets can still look like toys placed on a board.</p>`),
      sec(6, 'Frame time is the budget that matters.', `<p>Polygon count is only one cost center. Draw calls, shader complexity, transparency, shadows, texture residency, skinning, physics, and visibility can dominate a frame long before triangle count becomes the headline.</p><p>Budget milliseconds, not folklore. Profile CPU and GPU separately, use LOD and instancing where repetition is real, stream or cull what cannot contribute, and choose expensive materials only where they improve the image enough to justify their frame-time cost. Performance is scene design, not a cleanup pass.</p>`),
      sec(7, 'Use the blockout as a diagnostic.', `<p>The lab below uses CSS 3D on purpose. It is not pretending to be a game renderer; it strips the problem down to camera angle, perspective, overlap, and relative scale.</p><p>Orbit the scene and watch arrangements that looked balanced from one view collapse from another. That is the useful part of a blockout: it gives bad assumptions nowhere to hide.</p>${spatialLabMarkup()}`),
      sec(8, 'Show the reasoning, not just the beauty shot.', `<p>A finished render is evidence of taste, but weak evidence of process. A stronger 3D case study keeps the blockout, scale rules, camera tests, collision simplification, profiling captures, and failed generation rules visible beside the final result.</p><p>The useful story is not only what survived. It is why one path was kept and another was removed. Spatial work becomes much more legible when engineering decisions are treated as part of the design output.</p><div class="translation-note"><b>Editorial editions</b><span>${t().translationNote}</span></div>`)
    ].join(''),
    ja: () => [
      sec(1, '装飾より先に、ワールドの基準を決める。', `<p>3Dではスケールそのものが基盤になる。1 unitを何メートルとして扱うか、上方向の軸をどれにするか、原点をどこに置くか。人、ドア、階高、車線、階段の基準寸法も、アセットを大量に入れる前に揃えておきたい。</p><p>初期段階では主役のモデルより、比較用の基準物の方が役に立つ。身長、標準的なドア、車の大きさ、縁石、1階分の高さが揃っていれば、外部アセットのスケールが間違っていても早い段階で気づける。</p>`),
      sec(2, 'カメラは描画設定ではなく、操作感の設計。', `<p>FOV、目線の高さ、追従距離、クリップ面、回転感度が変わると、同じ空間でも距離の感じ方が変わる。エディタでは広く見えた通路が一人称では狭く感じたり、三人称では壁がカメラを遮って移動そのものが不快になったりする。</p><p>カメラを最後の調整項目にしない。目標とする視点と操作感を先に決めておけば、ドア幅、遮蔽物、階段、方向転換に必要な余白を、実際のプレイ条件で評価できる。</p>`),
      sec(3, '見た目のメッシュとコリジョンは別々に設計する。', `<p>レンダーメッシュは形を伝え、コリジョンは移動可能な範囲を決める。両者を常に同じ形にすると、小さな装飾に引っかかったり、物理計算が必要以上に複雑になったりする。一方で単純化しすぎれば、見た目では塞がっているのに通れてしまう。</p><p>階段、手すり、段差、坂のように何度も触れる場所は、専用のシンプルなコライダーを用意する価値が高い。重要なのは形状を完全に一致させることではなく、見た目から予想した移動結果を裏切らないことだ。</p>`),
      sec(4, 'プロシージャル生成は乱数ではなく、制約の積み重ね。', `<p>位置や高さをランダムに決めるだけでも画面はすぐ埋まる。しかし都市らしさは長続きしない。道路網、区画、用途、入口、建物の高さ、見通し、ランドマークといった条件が互いに影響しているからだ。</p><p>まず道路と歩行動線を決め、区画を作り、建物タイプと高さのルールを当て、最後に反復を崩す変化を加える。乱数は構造の代わりではなく、構造の中に差を作るために使う方が扱いやすい。</p>`),
      sec(5, 'リアリティは中間スケールで決まる。', `<p>高解像度テクスチャより先に効くのは、建物と道路のつながり方だ。縁石の高さ、歩道との段差、入口の向き、階高、窓のリズム、交差点の幅。単体の小物より大きく、都市全体より小さい要素が空間の説得力を支えている。</p><p>この層が整っていれば、グレーのブロックアウトでも場所として読める。逆にここが抜けていると、高品質なアセットを置いてもジオラマのように見えやすい。</p>`),
      sec(6, '見るべきはポリゴン数よりフレーム時間。', `<p>実際の負荷はドローコール、シェーダー、オーバードロー、影、テクスチャメモリ、スキニング、物理、可視判定などに分散している。ポリゴン数だけを減らしても、透明表現や重い影が支配的ならフレーム時間は改善しない。</p><p>目標は「何ポリゴンまで」ではなく、1フレームに使えるミリ秒で考える。CPUとGPUを分けて計測し、遠景にはLODやインポスターを使い、見えない領域はカリングやストリーミングで外す。最適化は完成後の掃除ではなく、シーン構成を決める設計条件だ。</p>`),
      sec(7, 'ブロックアウトを診断装置にする。', `<p>下の実験はCSS 3Dで作った単純なブロックアウトだ。ゲームエンジンのレンダラーを再現する目的ではなく、視点、Perspective、重なり、相対スケールだけを素早く確認するために使う。</p><p>角度を変えると、一方向からは整って見えた配置が急に重なったり、奥行きが読めなくなったりする。静止画では隠れていた問題が、カメラを動かした瞬間に見えるのが3Dの面白いところでもある。</p>${spatialLabMarkup()}`),
      sec(8, 'ポートフォリオには完成画だけでなく、判断の跡を残す。', `<p>3D作品は最終レンダーだけでも見栄えがする。ただ、それだけでは何を設計したのかが伝わりにくい。初期ブロックアウト、スケールの基準、カメラテスト、コリジョンの単純化、プロファイリング結果、失敗した生成ルールまで並べると、制作の深さが見える。</p><p>残すべきなのは成功した案だけではない。なぜ一つを採用し、別の案を捨てたのか。その判断まで見せることで、3Dのページが単なるレンダーギャラリーではなく設計記録になる。</p><div class="translation-note"><b>言語編集</b><span>${t().translationNote}</span></div>`)
    ].join('')
  };

  function cubeMarkup(extra = '') {
    return `<div class="spatial-cube-v8 ${extra}" aria-hidden="true"><i class="face front"></i><i class="face back"></i><i class="face left"></i><i class="face right"></i><i class="face top"></i><i class="face bottom"></i></div>`;
  }

  function worldMarkup() {
    return `<div class="spatial-world-v8" data-spatial-world><div class="spatial-floor-v8"></div>${cubeMarkup('cube-a')}${cubeMarkup('cube-b')}${cubeMarkup('cube-c')}<div class="spatial-axis-v8" aria-hidden="true"><i class="axis-x"></i><i class="axis-y"></i><i class="axis-z"></i></div></div>`;
  }

  function spatialLabMarkup() {
    const c = t();
    return `<section class="article-live-lab spatial-live-lab-v8" data-spatial-lab>
      <div class="live-lab-heading"><div><span class="live-lab-badge">${c.labBadge}</span><h2>${c.labTitle}</h2></div><p>${c.labDesc}</p></div>
      <div class="spatial-lab-grid-v8">
        <div class="spatial-stage-v8" data-spatial-stage tabindex="0" aria-label="${c.stageLabel}" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Home">${worldMarkup()}<span class="spatial-stage-hint-v8">DRAG · ARROWS · HOME</span></div>
        <div class="spatial-controls-v8">
          ${spatialControl('yaw', c.yaw, -70, 70, 1, -28, '°')}
          ${spatialControl('pitch', c.pitch, 32, 72, 1, 58, '°')}
          ${spatialControl('perspective', c.perspective, 520, 1400, 10, 880, 'px')}
          ${spatialControl('depth', c.depth, -110, 60, 5, -10, 'px')}
          <button type="button" class="spatial-reset-v8" data-spatial-reset>${c.reset}</button>
          <div class="spatial-coordinate-readout-v8"><span>WORLD</span><b data-spatial-readout>yaw −28° · pitch 58°</b></div>
        </div>
      </div>
      <p class="live-lab-note">CSS 3D blockout · no WebGL renderer · interaction and spatial hierarchy study</p>
    </section>`;
  }

  function spatialControl(id, label, min, max, step, value, suffix) {
    return `<label class="spatial-control-v8"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-spatial-control="${id}"/><output data-spatial-value="${id}">${value}${suffix}</output></label>`;
  }

  function articleHero() {
    return `<div class="article-hero spatial-hero-v8" aria-hidden="true"><div class="spatial-hero-copy-v8"><span>WORLD / CAMERA / SYSTEM</span><b>03D</b></div><div class="spatial-stage-v8 spatial-stage-v8--hero">${worldMarkup()}</div></div>`;
  }

  function renderSpatial() {
    const route = window.HJRuntime?.route?.() || (location.hash.slice(1) || '/').split('?')[0];
    if (route !== '/post/spatial') return false;
    const lang = language();
    const existing = app.querySelector('[data-spatial-article]');
    if (existing?.dataset.lang === lang) return true;
    const c = t();
    app.innerHTML = `<div class="page article-page article-page--spatial" data-spatial-article data-lang="${lang}"><article class="article"><a class="article-back" href="#/">${c.back}</a><div class="article-kicker"><span>04</span><span class="dot"></span><span>${c.category}</span><span class="dot"></span><span>${c.date}</span></div><h1>${c.title}</h1><p class="article-deck">${c.deck}</p><span class="reading-time">${c.reading} · ${lang === 'ko' ? '읽기' : lang === 'ja' ? '読む' : 'read'}</span>${articleHero()}<div class="article-body"><p class="lede">${c.lede}</p>${BODY[lang]()}</div>${typeof commentsTemplate === 'function' ? commentsTemplate('spatial') : ''}</article></div>`;
    initSpatialLab();
    if (typeof initComments === 'function') initComments();
    app.focus({ preventScroll: true });
    window.HJRuntime?.syncDocumentChrome?.('/post/spatial');
    return true;
  }

  function initSpatialLab() {
    const root = app.querySelector('[data-spatial-lab]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';
    const stage = root.querySelector('[data-spatial-stage]');
    const world = root.querySelector('[data-spatial-world]');
    if (!stage || !world) return;
    const defaults = { yaw: -28, pitch: 58, perspective: 880, depth: -10 };
    const state = { ...defaults };
    const suffix = { yaw: '°', pitch: '°', perspective: 'px', depth: 'px' };
    const controls = Object.fromEntries([...root.querySelectorAll('[data-spatial-control]')].map(input => [input.dataset.spatialControl, input]));

    const apply = () => {
      stage.style.setProperty('--spatial-perspective', `${state.perspective}px`);
      world.style.setProperty('--spatial-yaw', `${state.yaw}deg`);
      world.style.setProperty('--spatial-pitch', `${state.pitch}deg`);
      world.style.setProperty('--spatial-depth', `${state.depth}px`);
      for (const [key, input] of Object.entries(controls)) {
        input.value = String(state[key]);
        const output = root.querySelector(`[data-spatial-value="${key}"]`);
        if (output) output.value = `${state[key]}${suffix[key]}`;
      }
      const readout = root.querySelector('[data-spatial-readout]');
      if (readout) readout.textContent = `yaw ${state.yaw}° · pitch ${state.pitch}°`;
    };

    Object.entries(controls).forEach(([key, input]) => input.addEventListener('input', () => {
      state[key] = Number(input.value);
      apply();
    }));

    let held = false;
    let pointerId = null;
    let lastX = 0;
    let lastY = 0;
    stage.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      held = true;
      pointerId = event.pointerId;
      lastX = event.clientX;
      lastY = event.clientY;
      stage.classList.add('is-held');
      stage.setPointerCapture?.(pointerId);
      stage.focus({ preventScroll: true });
    });
    stage.addEventListener('pointermove', event => {
      if (!held || event.pointerId !== pointerId) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      state.yaw = Math.max(-70, Math.min(70, Math.round((state.yaw + dx * .34) * 10) / 10));
      state.pitch = Math.max(32, Math.min(72, Math.round((state.pitch - dy * .26) * 10) / 10));
      apply();
    });
    const release = event => {
      if (!held || (event.pointerId != null && event.pointerId !== pointerId)) return;
      held = false;
      stage.classList.remove('is-held');
      if (pointerId != null) stage.releasePointerCapture?.(pointerId);
      pointerId = null;
    };
    stage.addEventListener('pointerup', release);
    stage.addEventListener('pointercancel', release);
    stage.addEventListener('keydown', event => {
      const delta = event.shiftKey ? 8 : 3;
      if (event.key === 'ArrowLeft') state.yaw -= delta;
      else if (event.key === 'ArrowRight') state.yaw += delta;
      else if (event.key === 'ArrowUp') state.pitch -= delta;
      else if (event.key === 'ArrowDown') state.pitch += delta;
      else if (event.key === 'Home') Object.assign(state, defaults);
      else return;
      event.preventDefault();
      state.yaw = Math.max(-70, Math.min(70, state.yaw));
      state.pitch = Math.max(32, Math.min(72, state.pitch));
      apply();
    });
    root.querySelector('[data-spatial-reset]')?.addEventListener('click', () => { Object.assign(state, defaults); apply(); });
    apply();
  }

  function ensureSpatialHomeCard() {
    const home = app.querySelector('.home-page');
    const grid = home?.querySelector('.post-grid');
    if (!home || !grid) return;
    const lang = language();
    let card = grid.querySelector('[data-spatial-card-v8]');
    if (!card) {
      card = document.createElement('a');
      card.className = 'post-card post-card--spatial-v8';
      card.dataset.spatialCardV8 = 'true';
      card.href = '#/post/spatial';
      grid.append(card);
    }
    const c = t();
    card.innerHTML = `<div class="spatial-card-preview-v8" aria-hidden="true"><div class="spatial-mini-world-v8">${worldMarkup()}</div><span>3D / SYSTEMS</span></div><div class="post-card-top"><span>04 / ${c.category}</span><span>${c.date}</span></div><div class="spatial-card-copy-v8"><h3>${c.cardTitle}</h3><p>${c.cardDeck}</p></div><span class="spatial-card-cta-v8"><span>${c.cardMeta}</span><b>${c.open} ↗</b></span>`;
    const count = home.querySelector('.section-head > span');
    if (count) count.textContent = c.count;
  }

  const JA_REPLACEMENTS = [
    [/\bscene\b/g, 'シーン'],
    [/\bpanel\b/gi, 'パネル'],
    [/\blayer\b/gi, 'レイヤー'],
    [/\bfade-in\b/gi, 'フェードイン'],
    [/\bmaterialize\b/gi, '実体化'],
    [/\brelease velocity\b/gi, 'リリース速度'],
    [/\binterruptibility\b/gi, '途中でつかみ直せること'],
    [/\bmobile GPU\b/gi, 'モバイルGPU'],
    [/\bframe drop\b/gi, 'フレーム落ち'],
    [/\bchat coding\b/gi, 'チャットでのコーディング'],
    [/\bremote branch\b/gi, 'リモートブランチ'],
    [/\bdurable state\b/gi, '永続的な状態'],
    [/\bsource of truth\b/gi, '信頼できる基準'],
    [/\bworking-tree\b/gi, '作業ツリー'],
    [/\bworking tree\b/gi, '作業ツリー'],
    [/\bfailure domain\b/gi, '障害領域'],
    [/\bproduct code\b/gi, 'プロダクトコード'],
    [/\bhosted API\b/gi, 'ホスト側API'],
    [/\blocal worktree\b/gi, 'ローカル作業ツリー'],
    [/\bvelocity handoff\b/gi, '速度の引き継ぎ'],
    [/\bspring\b/gi, 'スプリング'],
    [/\bsession\b/gi, 'セッション'],
    [/\bpermission\b/gi, '権限'],
    [/\bprotocol\b/gi, 'プロトコル']
  ];

  function polishJapaneseArticleText() {
    if (language() !== 'ja') return;
    const root = app.querySelector('.article-body');
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (!parent || parent.closest('code, pre, textarea, a')) continue;
      nodes.push(walker.currentNode);
    }
    nodes.forEach(node => {
      let value = node.nodeValue || '';
      JA_REPLACEMENTS.forEach(([pattern, replacement]) => { value = value.replace(pattern, replacement); });
      node.nodeValue = value;
    });
  }

  function applyEditorialPass() {
    const lang = language();
    const c = t();
    const route = window.HJRuntime?.route?.() || (location.hash.slice(1) || '/').split('?')[0];

    if (route === '/') ensureSpatialHomeCard();

    const studioNote = app.querySelector('.studio-index-note p');
    if (studioNote) studioNote.textContent = c.studioNote;

    const rail = app.querySelector('.article-rail-v6');
    if (rail) {
      rail.setAttribute('aria-label', c.rail);
      const head = rail.querySelector('.article-rail-head span');
      if (head) head.textContent = c.rail;
    }
    const progress = document.querySelector('.reading-progress-v6 span');
    if (progress) progress.textContent = c.progress;

    app.querySelectorAll('.comments-head h2').forEach(node => { node.textContent = c.comments; });
    app.querySelectorAll('.comments-head > span').forEach(node => { node.textContent = c.local; });
    app.querySelectorAll('.translation-note span').forEach(node => { node.textContent = c.translationNote; });

    const labCopy = app.querySelector('.lab-copy .small');
    if (labCopy) {
      labCopy.textContent = lang === 'ko'
        ? '렌즈를 글자와 구조 위로 움직여 보세요. 뒤의 장면이 계속 읽힐 때 유리의 두께와 굴절 단서가 가장 분명해집니다.'
        : lang === 'ja'
          ? 'レンズを文字や構造の上へ動かしてください。背後のシーンを読み取れる範囲で、ガラスの厚みと屈折の手掛かりが最も分かりやすくなります。'
          : 'Move the lens across type and structure. The material works best while the background remains readable enough to reveal depth and refraction cues.';
    }

    if (route === '/' && app.querySelector('.post-card--glass')) {
      const labels = {
        ko: { glass:'WebGL 굴절 · 젤리 드래그', sloar:'상태 복구 · 실패 주입', motion:'스프링 · 속도 전달' },
        en: { glass:'WebGL refraction · jelly drag', sloar:'state recovery · failure injection', motion:'springs · velocity handoff' },
        ja: { glass:'WebGL屈折 · ドラッグ変形', sloar:'状態復元 · 障害注入', motion:'スプリング · 速度の引き継ぎ' }
      }[lang];
      Object.entries(labels).forEach(([slug, text]) => {
        const node = app.querySelector(`.post-card--${slug} .studio-preview-label span`);
        if (node) node.textContent = text;
      });
    }

    polishJapaneseArticleText();
  }

  let polishRaf = 0;
  function scheduleEditorialPass() {
    cancelAnimationFrame(polishRaf);
    polishRaf = requestAnimationFrame(() => {
      polishRaf = requestAnimationFrame(applyEditorialPass);
    });
  }

  function enhance() {
    const route = window.HJRuntime?.route?.() || (location.hash.slice(1) || '/').split('?')[0];
    if (route === '/post/spatial') renderSpatial();
    else if (route === '/') ensureSpatialHomeCard();
    scheduleEditorialPass();
  }

  document.addEventListener('hj:rendered', enhance);
  queueMicrotask(enhance);
})();
