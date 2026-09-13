from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old, new, 1)


def replace_n(text, old, new, count, label):
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f'{label}: expected {count} matches, found {actual}')
    return text.replace(old, new)

# --- Editorial/content owner -------------------------------------------------
p = Path('journal-editorial-core.js')
s = p.read_text()

s = replace_n(
    s,
    "eyebrow:'Selected experiments / 2026'",
    "eyebrow:'Design + engineering / 2026'",
    3,
    'home eyebrow'
)
s = replace_n(
    s,
    "tagline:'Interface experiments, 2026'",
    "tagline:'Interactive systems · tools · experiments, 2026'",
    3,
    'footer tagline'
)

hero_notes = {
    "heroNote:'일반적인 포트폴리오보다 작업 노트에 가깝습니다. 코드와 실패한 가정, 실험 가능한 프로토타입을 숨기지 않습니다.'":
        "heroNote:'작동하는 프로토타입, 저장소, 실패한 가정까지 함께 남깁니다. 결과물만 잘라 보여주기보다 어떻게 만들었는지까지 공개합니다.'",
    "heroNote:'Closer to a working notebook than a conventional portfolio. Code, failed assumptions, and prototypes stay visible.'":
        "heroNote:'Working prototypes, repositories, and failed assumptions stay visible. The process is part of the portfolio, not something hidden behind the final screenshot.'",
    "heroNote:'一般的なポートフォリオというより、制作ノートに近い場所です。コード、うまくいかなかった仮説、実際に触れるプロトタイプもそのまま見せます。'":
        "heroNote:'動くプロトタイプ、リポジトリ、失敗した仮説まで残します。完成画面だけではなく、どう作ったかもポートフォリオの一部として公開します。'",
}
for old, new in hero_notes.items():
    s = replace_once(s, old, new, 'hero note')

manifestos = {
    "manifesto:'Polish는 장식이 아니라 시각적 위계, 입력, 모션, 시스템 동작이 서로 모순되지 않는 상태다.'":
        "manifesto:'스크린샷에서만 그럴듯하면 아직 끝난 게 아니다. 입력, 실패 상태, 성능, 배포까지 같은 설계를 유지해야 한다.'",
    "manifesto:'Polish is not decoration. It is the point where visual hierarchy, input, motion, and system behavior stop contradicting one another.'":
        "manifesto:'If it only looks right in a screenshot, it is not finished. Input, failure states, performance, and deployment still have to tell the same story.'",
    "manifesto:'完成度は装飾の量ではない。視覚階層、入力、モーション、システムの振る舞いが矛盾なくつながっている状態を指す。'":
        "manifesto:'スクリーンショットだけで成立するなら、まだ完成ではない。入力、失敗状態、性能、デプロイまで同じ設計思想でつながる必要がある。'",
}
for old, new in manifestos.items():
    s = replace_once(s, old, new, 'manifesto')

needle = "  const t = () => COPY[lang];\n"
if needle not in s:
    raise SystemExit('translation helper owner not found')

build_copy = r'''  const t = () => COPY[lang];

  const BUILD_COPY = {
    ko: {
      heading: 'Selected builds', count: '04 active / live',
      intro: '글보다 먼저, 지금 실제로 만들고 있는 것들. 장식용 케이스 스터디가 아니라 직접 실행하거나 저장소에서 확인할 수 있는 작업만 올립니다.',
      items: [
        { kicker:'Native simulation / active', title:'AeroForge', desc:'Bevy + egui 기반 3D 공력 워크벤치. 빠른 D3Q19 preview와 SU2 Accurate 경로를 분리하고, 메시와 수치 결과의 검증 범위를 명시적으로 기록합니다.', meta:'Rust · Bevy · egui · SU2', href:'https://github.com/hoonex/developer/tree/feat/aeroforge-foundation' },
        { kicker:'Browser vision / live', title:'Vision Lab', desc:'MediaPipe 손·얼굴 추적과 양손 핀치로 Orbit, Threads, Bloom, Sculpt를 직접 조작하는 브라우저 인터랙티브 아트.', meta:'MediaPipe · Canvas · dual-hand', href:'#/lab/vision' },
        { kicker:'Agent tooling / active', title:'Sloar Chat Coder', desc:'채팅 코딩에서 저장소·CI·배포 상태가 바뀌어도 근거를 잃지 않도록 만든 repository continuity protocol.', meta:'Python · GitHub · CI', href:'https://github.com/hoonex/sloar-chat-coder' },
        { kicker:'Material interaction / live', title:'Liquid / Jelly Lab', desc:'CSS blur 데모에서 멈추지 않고 WebGL 굴절, 직접 조작, jelly deformation과 물리 반응을 반복해서 검증하는 인터페이스 랩.', meta:'WebGL · shader · direct manipulation', href:'#/lab' }
      ]
    },
    en: {
      heading: 'Selected builds', count: '04 active / live',
      intro: 'The things I am actually building now. No decorative case studies: every item is runnable here or inspectable in a repository.',
      items: [
        { kicker:'Native simulation / active', title:'AeroForge', desc:'A native Bevy + egui aerodynamics workbench with a fast D3Q19 preview path and a separate SU2 Accurate workflow with explicit evidence boundaries.', meta:'Rust · Bevy · egui · SU2', href:'https://github.com/hoonex/developer/tree/feat/aeroforge-foundation' },
        { kicker:'Browser vision / live', title:'Vision Lab', desc:'A browser interaction study using MediaPipe face and hand tracking, simultaneous two-hand pinch, and four direct-manipulation art modes.', meta:'MediaPipe · Canvas · dual-hand', href:'#/lab/vision' },
        { kicker:'Agent tooling / active', title:'Sloar Chat Coder', desc:'A repository-continuity protocol for chat coding that keeps repository, CI, deployment, and evidence state explicit as the environment changes.', meta:'Python · GitHub · CI', href:'https://github.com/hoonex/sloar-chat-coder' },
        { kicker:'Material interaction / live', title:'Liquid / Jelly Lab', desc:'Material experiments that move past CSS blur into WebGL refraction, direct manipulation, jelly deformation, and physical response.', meta:'WebGL · shader · direct manipulation', href:'#/lab' }
      ]
    },
    ja: {
      heading: 'Selected builds', count: '04 active / live',
      intro: '今、実際に作っているもの。飾りのケーススタディではなく、ここで動かすかリポジトリで確認できる作業だけを並べています。',
      items: [
        { kicker:'Native simulation / active', title:'AeroForge', desc:'Bevy + egui のネイティブ3D空力ワークベンチ。高速なD3Q19 previewとSU2 Accurate経路を分離し、メッシュと数値結果の証拠範囲を明示します。', meta:'Rust · Bevy · egui · SU2', href:'https://github.com/hoonex/developer/tree/feat/aeroforge-foundation' },
        { kicker:'Browser vision / live', title:'Vision Lab', desc:'MediaPipeの顔・手トラッキングと両手同時pinchで、Orbit / Threads / Bloom / Sculptを直接操作するブラウザ実験。', meta:'MediaPipe · Canvas · dual-hand', href:'#/lab/vision' },
        { kicker:'Agent tooling / active', title:'Sloar Chat Coder', desc:'チャットコーディング中にrepository、CI、deploymentの状態が変わっても根拠を失わないためのrepository continuity protocol。', meta:'Python · GitHub · CI', href:'https://github.com/hoonex/sloar-chat-coder' },
        { kicker:'Material interaction / live', title:'Liquid / Jelly Lab', desc:'CSS blurだけで終わらず、WebGL屈折、direct manipulation、jelly deformationと物理反応を検証するインターフェースラボ。', meta:'WebGL · shader · direct manipulation', href:'#/lab' }
      ]
    }
  };
  const builds = () => BUILD_COPY[lang] || BUILD_COPY.en;
'''
s = s.replace(needle, build_copy, 1)

start = s.index('  homeTemplate = function() {')
end = s.index('\n\n  articleTemplate = function(post) {', start)
new_home = r'''  function selectedBuildsTemplate() {
    const copy = builds();
    return `<section class="selected-builds" aria-labelledby="builds-title"><div class="section-head section-head--builds"><h2 id="builds-title">${copy.heading}</h2><span>${copy.count}</span></div><p class="builds-intro">${copy.intro}</p><div class="build-list">${copy.items.map((item,index)=>{const external=/^https?:/i.test(item.href);return `<a class="build-row" href="${item.href}" ${external?'target="_blank" rel="noreferrer"':''}><span class="build-index">${String(index+1).padStart(2,'0')}</span><span class="build-main"><span class="build-kicker">${item.kicker}</span><strong>${item.title}</strong><span class="build-description">${item.desc}</span></span><span class="build-meta">${item.meta}</span><span class="build-arrow" aria-hidden="true">↗</span></a>`;}).join('')}</div></section>`;
  }

  homeTemplate = function() {
    return `<div class="page home-page"><section class="hero"><div class="eyebrow">${t().eyebrow}</div><h1>${t().heroHtml}</h1><div class="hero-meta"><p class="hero-intro">${t().heroIntro}</p><div class="hero-note">${t().heroNote}</div></div></section>${selectedBuildsTemplate()}<section aria-labelledby="writing-title"><div class="section-head"><h2 id="writing-title">${t().writing}</h2><span>${t().notes}</span></div><div class="post-grid">${['glass','sloar','motion'].map((slug,i)=>{const post=posts[slug];return `<a class="post-card" href="#/post/${slug}" data-post="${slug}">${i<2?`<span class="card-orb ${i===0?'blue':'orange'}" aria-hidden="true"></span>`:''}<div class="post-card-top"><span>${post.number} / ${post.category}</span><span>${post.date}</span></div><div><h3>${post.title}</h3><p>${post.deck}</p><span class="reading-time">${post.reading} · ${t().read}</span></div><span class="post-card-arrow" aria-hidden="true">↗</span></a>`;}).join('')}</div></section><section class="manifesto"><div class="manifesto-label">${t().principle}</div><p class="manifesto-copy">${t().manifesto}</p></section></div>`;
  };'''
s = s[:start] + new_home + s[end:]
p.write_text(s)

# --- Base visual system owner ------------------------------------------------
p = Path('styles.css')
s = p.read_text()
s = replace_once(s, '--radius-xl: 34px;', '--radius-xl: 22px;', 'radius xl')
s = replace_once(s, '--radius-lg: 24px;', '--radius-lg: 18px;', 'radius lg')
s = replace_once(s, '--radius-md: 18px;', '--radius-md: 14px;', 'radius md')
s = replace_once(s, '--glass-fill: rgba(255,255,255,.46);', '--glass-fill: rgba(248,248,246,.78);', 'light glass fill')
s = replace_once(s, '--glass-shadow: 0 16px 50px rgba(20,24,34,.10), inset 0 1px 0 rgba(255,255,255,.52);', '--glass-shadow: 0 8px 28px rgba(20,24,34,.07), inset 0 1px 0 rgba(255,255,255,.58);', 'light glass shadow')
s = replace_once(s, '--glass-fill: rgba(24,26,31,.47);', '--glass-fill: rgba(19,20,23,.80);', 'dark glass fill')
s = replace_once(s, '--glass-shadow: 0 16px 50px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.12);', '--glass-shadow: 0 8px 28px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.10);', 'dark glass shadow')
s = replace_once(s, '.ambient-grid {\n  position: absolute; inset: 0;\n  background-image: linear-gradient(var(--soft-line) 1px, transparent 1px), linear-gradient(90deg, var(--soft-line) 1px, transparent 1px);\n  background-size: 72px 72px;\n  mask-image: linear-gradient(to bottom, rgba(0,0,0,.42), transparent 78%);\n  opacity: .42;\n}', '.ambient-grid {\n  position: absolute; inset: 0;\n  background-image: linear-gradient(var(--soft-line) 1px, transparent 1px), linear-gradient(90deg, var(--soft-line) 1px, transparent 1px);\n  background-size: 96px 96px;\n  mask-image: linear-gradient(to bottom, rgba(0,0,0,.28), transparent 68%);\n  opacity: .18;\n}', 'ambient grid')
s = replace_once(s, '.ambient-orb { position:absolute; border-radius:50%; filter: blur(5px); opacity:.75; transform: translateZ(0); }', '.ambient-orb { display:none; }', 'ambient orbs')
s = replace_once(s, '  border-radius: 999px;\n  display:flex; align-items:center; justify-content:space-between;', '  border-radius: 18px;\n  display:flex; align-items:center; justify-content:space-between;', 'topbar radius')
s = replace_once(s, '.topbar-links a { font-size:.82rem; color:var(--muted); padding:10px 12px; border-radius:999px; transition: background .2s ease, color .2s ease, transform .12s ease; }', '.topbar-links a { font-size:.82rem; color:var(--muted); padding:9px 11px; border-radius:10px; transition: background .16s ease, color .16s ease, transform .12s ease; }', 'nav pills')
s = replace_once(s, '.hero h1 .serifish { font-family: ui-serif, Georgia, serif; font-weight:400; font-style:italic; letter-spacing:-.065em; }', '.hero h1 .serifish { font-family:inherit; font-weight:430; font-style:normal; letter-spacing:inherit; color:var(--muted); }', 'hero emphasis')
s = replace_once(s, '.post-card:hover { transform:translateY(-5px); border-color:rgba(127,127,127,.25); box-shadow:0 18px 40px rgba(0,0,0,.08); }', '.post-card:hover { transform:none; border-color:rgba(127,127,127,.28); background:rgba(127,127,127,.045); box-shadow:none; }', 'card hover')
s = replace_once(s, '.post-card-arrow { position:absolute; right:25px; bottom:24px; width:46px; height:46px; border-radius:50%; display:grid; place-items:center; border:1px solid var(--line); font-size:1.2rem; transition:transform .35s var(--spring), background .25s ease; }', '.post-card-arrow { position:absolute; right:25px; bottom:24px; width:42px; height:42px; border-radius:12px; display:grid; place-items:center; border:1px solid var(--line); font-size:1.05rem; transition:transform .24s var(--spring), background .18s ease; }', 'card arrow')
s = replace_once(s, '.card-orb { position:absolute; width:240px; height:240px; border-radius:50%; right:-70px; top:-70px; z-index:-1; filter:blur(1px); opacity:.85; }', '.card-orb { display:none; }', 'decorative card orbs')
s = replace_once(s, '.manifesto-copy em { font-family:ui-serif, Georgia, serif; font-weight:400; }', '.manifesto-copy em { font-family:inherit; font-weight:500; font-style:normal; }', 'manifesto serif')

if '/* Portfolio v15 — content-first home */' in s:
    raise SystemExit('portfolio v15 styles already present')
s += r'''

/* Portfolio v15 — content-first home */
.selected-builds{margin:0 0 124px}
.section-head--builds{margin-bottom:0}
.builds-intro{max-width:720px;margin:18px 0 34px;color:var(--muted);font-size:clamp(.98rem,1.5vw,1.12rem);line-height:1.62;letter-spacing:-.015em}
.build-list{border-top:1px solid var(--line)}
.build-row{display:grid;grid-template-columns:44px minmax(0,1fr) minmax(180px,.42fr) 32px;gap:20px;align-items:start;padding:24px 2px;border-bottom:1px solid var(--line);transition:background .16s ease,padding .2s var(--spring)}
.build-row:hover{background:rgba(127,127,127,.035);padding-left:10px;padding-right:10px}
.build-index,.build-kicker,.build-meta{font:650 .66rem/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.055em;color:var(--muted)}
.build-index{padding-top:3px}
.build-main{display:grid;gap:7px;min-width:0}
.build-main strong{font-size:clamp(1.5rem,2.8vw,2.55rem);line-height:1;letter-spacing:-.045em;font-weight:640}
.build-description{max-width:690px;color:var(--muted);font-size:.9rem;line-height:1.58}
.build-meta{justify-self:end;max-width:210px;text-align:right;padding-top:4px}
.build-arrow{justify-self:end;font-size:1rem;padding-top:1px;transition:transform .18s ease}
.build-row:hover .build-arrow{transform:translate(2px,-2px)}
.home-page .hero{min-height:80svh}
.home-page .hero h1{max-width:1060px}
.home-page .manifesto{margin-top:104px}

@media(max-width:760px){
  .selected-builds{margin-bottom:88px}
  .build-row{grid-template-columns:32px minmax(0,1fr) 24px;gap:12px;padding:20px 0}
  .build-meta{grid-column:2;justify-self:start;text-align:left;max-width:none;padding-top:4px}
  .build-arrow{grid-column:3;grid-row:1/span 2}
  .build-description{font-size:.86rem}
}
@media(max-width:520px){
  .builds-intro{margin-bottom:24px}
  .build-row{grid-template-columns:26px minmax(0,1fr) 22px}
  .build-main strong{font-size:1.5rem}
}
'''
p.write_text(s)

# --- Studio-card owner -------------------------------------------------------
p = Path('journal-v6-studio.css')
s = p.read_text()
s = replace_once(s, '.post-card--studio:hover{transform:translateY(-5px);box-shadow:0 26px 80px rgba(0,0,0,.10)}', '.post-card--studio:hover{transform:none;box-shadow:none}', 'studio hover lift')
s = replace_once(s, 'border-radius:24px;overflow:hidden;background:color-mix(in srgb,var(--bg-elevated) 86%,transparent);pointer-events:none', 'border-radius:14px;overflow:hidden;background:color-mix(in srgb,var(--bg-elevated) 92%,transparent);pointer-events:none', 'studio preview radius')
s = replace_once(s, 'border-radius:20px;background:color-mix(in srgb,var(--bg) 82%,transparent);', 'border-radius:16px;background:color-mix(in srgb,var(--bg) 88%,transparent);', 'article rail material')
p.write_text(s)

# --- Spatial-card owner ------------------------------------------------------
p = Path('journal-v8-spatial.css')
s = p.read_text()
s = replace_once(s, '.post-card--spatial-v8{grid-column:span 12;min-height:390px;position:relative;isolation:isolate;background:linear-gradient(145deg,color-mix(in srgb,var(--bg-elevated) 88%,transparent),color-mix(in srgb,var(--bg) 96%,transparent));overflow:hidden}', '.post-card--spatial-v8{grid-column:span 12;min-height:390px;position:relative;isolation:isolate;background:transparent;overflow:hidden}', 'spatial card surface')
s = replace_once(s, 'border-radius:30px;overflow:hidden;background:color-mix(in srgb,var(--bg-elevated) 82%,transparent);box-shadow:0 24px 80px rgba(0,0,0,.07)', 'border-radius:18px;overflow:hidden;background:color-mix(in srgb,var(--bg-elevated) 90%,transparent);box-shadow:0 10px 32px rgba(0,0,0,.05)', 'spatial lab chrome')
p.write_text(s)

# --- Document/chrome owner ---------------------------------------------------
p = Path('index.html')
s = p.read_text()
s = replace_once(s, '<meta name="description" content="HJ — interface experiments, tools, and notes." />', '<meta name="description" content="HJ — interactive systems, tools, simulations, and interface experiments." />', 'meta description')
s = replace_once(s, '<span class="brand-status">Design journal</span>', '<span class="brand-status">Design + engineering</span>', 'brand status')
s = replace_once(s, '<div class="ambient" aria-hidden="true"><div class="ambient-orb ambient-orb-a"></div><div class="ambient-orb ambient-orb-b"></div><div class="ambient-grid"></div></div>', '<div class="ambient" aria-hidden="true"><div class="ambient-grid"></div></div>', 'ambient markup')
rev = 'SITE39-PORTFOLIO15-20260914-0110'
for asset in ['styles.css','journal-v6-studio.css','journal-v8-spatial.css']:
    s = replace_once(s, f'href="./{asset}"', f'href="./{asset}?v={rev}"', f'cache {asset}')
s = replace_once(s, 'src="./journal-editorial-core.js"', f'src="./journal-editorial-core.js?v={rev}"', 'cache editorial core')
p.write_text(s)

print('portfolio v15 patch applied')
