/* Portfolio v16 — internal project case studies for active builds. */
(()=>{
  const app=document.querySelector('#app');
  if(!app)return;

  const COPY={
    ko:{
      common:{back:'← Selected builds',snapshot:'Current snapshot',built:'현재 구현된 것',decisions:'핵심 설계 결정',boundary:'현재 범위와 한계',source:'Source / docs',scope:'이 페이지는 현재 확인된 구현만 기록합니다. 계획이나 예정 기능은 넣지 않고, 실제 프로젝트가 바뀌면 확인 후 갱신합니다.'},
      aeroforge:{
        kicker:'01 / Native simulation workbench',title:'AeroForge',
        deck:'빠른 3D 공력 미리보기와 SU2 기반 Accurate 실행을 한 앱 안에 두되, 둘을 같은 정확도로 보이지 않게 분리한 네이티브 공기역학 워크벤치.',
        snapshot:'Sep 2026 · source 851a82f',meta:'Rust · Bevy · egui · WGSL · SU2 · TetGen',
        intro:'처음부터 “CFD처럼 보이는 화면”을 만드는 것보다, 편집기·미리보기·정확 계산 경로가 서로 무엇을 보장하는지 구분하는 데 초점을 맞췄습니다.',
        facts:[
          ['Viewport-first editor','Box / Sphere / Cylinder 생성, 피킹, 이동·회전·크기 조절 기즈모가 있는 네이티브 3D 편집기. OBJ / STL / static glTF / GLB 삼각형 표면도 가져올 수 있습니다.'],
          ['Fast preview','독립적인 D3Q19 BGK CPU reference kernel과 실험적 WGSL GPU compute 경로가 있습니다. GPU 경로는 CPU/GPU parity smoke와 device-limit 검사를 함께 둡니다.'],
          ['Accurate workflow','SU2 8.5.0 adapter가 configuration 생성, 프로세스 실행, convergence/history 진단, aggregate/per-body force·moment 수집, 취소와 provenance 저장까지 담당합니다.'],
          ['Meshing paths','내장 경로는 deterministic Cartesian staircase tetrahedral reference mesh이고, 선택적으로 외부 TetGen을 사용해 source/output facet correspondence와 tetrahedral quality evidence를 기록합니다.'],
          ['Windows alpha','CI가 정확한 source head로 Windows 실행 파일을 만들고 최소 3개 rendered frame의 startup smoke를 통과한 경우 임시 alpha artifact를 게시합니다.']
        ],
        decisions:[
          ['Preview ≠ Accurate','빠르게 반응하는 D3Q19 preview를 정량 CFD처럼 포장하지 않고, SU2 Accurate 경로와 UI·데이터 의미를 분리했습니다.'],
          ['Evidence before labels','메시가 생성됐다는 이유만으로 body-fitted나 engineering quality라고 부르지 않습니다. 확인된 근거만 fidelity state에 반영합니다.'],
          ['Build provenance','Windows artifact 안에 BUILD_COMMIT, CI validation commit, SHA-256을 함께 남겨 어떤 소스로 만들어졌는지 추적 가능하게 했습니다.']
        ],
        boundaries:[
          '네이티브 D3Q19 경로는 interactive preview solver이며 검증된 high-fidelity CFD 대체재가 아닙니다.',
          '내장 Accurate mesh는 staircase / voxel-derived이고 body-fitted가 아닙니다.',
          '외부 TetGen 경로도 현재 body_fitted_status와 engineering_quality_status를 established로 올리지 않습니다.',
          'SU2와 TetGen은 Windows alpha에 포함되지 않으며 별도 설치가 필요합니다.'
        ],
        links:[
          ['Repository','https://github.com/hoonex/developer/tree/feat/aeroforge-foundation'],
          ['Current README','https://github.com/hoonex/developer/blob/feat/aeroforge-foundation/README_KR.md'],
          ['Validation notes','https://github.com/hoonex/developer/blob/feat/aeroforge-foundation/docs/VALIDATION.md']
        ]
      },
      sloar:{
        kicker:'02 / Agent engineering protocol',title:'Sloar Chat Coder',
        deck:'채팅이 이어져 보여도 저장소·브랜치·CI·권한·실행 환경은 바뀔 수 있다는 전제에서 만든 repository engineering protocol.',
        snapshot:'Stable 0.10.3 · source d17208c',meta:'Agent Skill · GitHub · CI · Python helpers · design guidance',
        intro:'목표는 AI가 더 자신 있게 말하게 만드는 것이 아니라, 현재 저장소 상태를 다시 확인하고 실제로 수집한 증거보다 넓게 완료를 주장하지 않게 만드는 것입니다.',
        facts:[
          ['Reasoning kernel','OBSERVE → MODEL → ACT → PROVE → RECONCILE의 짧은 루프를 기본으로 두고, continuity나 publication 위험이 클 때만 더 자세한 state machine을 펼칩니다.'],
          ['Repository continuity','대화 기억보다 durable repository truth를 우선하고, commit / tree / working state처럼 실제로 확인 가능한 상태를 기준으로 작업을 이어갑니다.'],
          ['Failure discipline','같은 입력으로 같은 실패가 반복되면 재시도를 진행으로 취급하지 않습니다. 실패 layer와 fingerprint를 먼저 구분하고 다음 전략을 바꿉니다.'],
          ['Evidence closure','파일을 저장한 것, 테스트가 통과한 것, 배포가 된 것, 실제 기기에서 동작하는 것을 서로 다른 claim으로 취급합니다. 증거가 커버하는 범위만 완료라고 말합니다.'],
          ['Web architecture + design','낯선 웹 저장소에서는 architecture capsule로 topology를 좁힌 뒤 semantic owner를 확인하고, web-design guidance로 구조·반응형·접근성·anti-AI-slop을 별도 검토합니다.'],
          ['Chat + GitHub path','GitHub connector가 제공되는 채팅에서는 Codex CLI나 API key 없이도 exact repository read/write를 사용할 수 있고, 실행 환경이 없으면 테스트 미실행 상태를 그대로 남깁니다.']
        ],
        decisions:[
          ['State over memory','채팅 맥락은 참고 자료이고 저장소 상태가 authoritative source라는 원칙을 가장 위에 둡니다.'],
          ['Owner before workaround','증상을 가리는 CSS specificity, duplicate state, 별도 renderer를 추가하기 전에 실제 semantic owner를 찾습니다.'],
          ['No evidence inflation','green build를 visual success로, source patch를 deployment success로 확장해서 말하지 않습니다.'],
          ['Revalidate before publish','작업 중 다른 actor가 branch를 움직일 수 있으므로 publication 직전 mutable remote ref를 다시 확인합니다.']
        ],
        boundaries:[
          'Sloar 자체가 GitHub 권한이나 실행 환경을 만들어 주는 것은 아닙니다. 현재 세션에 노출된 capability만 사용할 수 있습니다.',
          '코드가 저장됐다는 사실은 테스트 통과가 아닙니다. runtime이나 CI가 없으면 해당 검증은 미확인으로 남습니다.',
          '로컬 lock이나 checkpoint가 GitHub 전체를 잠그지는 않으므로 동시 작업은 remote ref 재검증이 필요합니다.',
          'canonical Sloar가 업데이트돼도 다른 저장소에 복사된 vendored copy가 자동으로 갱신되지는 않습니다.'
        ],
        links:[
          ['Repository','https://github.com/hoonex/sloar-chat-coder'],
          ['한국어 가이드','https://github.com/hoonex/sloar-chat-coder/blob/main/README.ko.md'],
          ['Skill contract','https://github.com/hoonex/sloar-chat-coder/blob/main/.agents/skills/sloar-chat-coder/SKILL.md']
        ]
      }
    },
    en:{
      common:{back:'← Selected builds',snapshot:'Current snapshot',built:'What exists now',decisions:'Key design decisions',boundary:'Current scope and limits',source:'Source / docs',scope:'This page records verified current implementation only. Planned features are intentionally omitted and the snapshot is updated after the project changes are checked.'},
      aeroforge:{kicker:'01 / Native simulation workbench',title:'AeroForge',deck:'A native aerodynamics workbench that keeps a fast interactive 3D preview and an SU2-backed Accurate workflow in one app without pretending they provide the same fidelity.',snapshot:'Sep 2026 · source 851a82f',meta:'Rust · Bevy · egui · WGSL · SU2 · TetGen',intro:'The project is built around separating what the editor, preview solver, accurate path, and mesh evidence can actually claim instead of making a screen that merely looks like CFD.',facts:[['Viewport-first editor','Native 3D editing with Box / Sphere / Cylinder primitives, picking, move/rotate/scale gizmos, plus OBJ / STL / static glTF / GLB triangle-surface import.'],['Fast preview','An independent D3Q19 BGK CPU reference kernel and an experimental native WGSL GPU compute path with CPU/GPU parity smokes and explicit device-limit checks.'],['Accurate workflow','A pinned SU2 8.5.0 adapter owns config generation, process execution, convergence/history diagnostics, aggregate/per-body force and moment ingestion, cancellation, and provenance.'],['Meshing paths','A deterministic Cartesian staircase tetrahedral reference path is built in; optional external TetGen adds source/output facet correspondence and tetrahedral evidence.'],['Windows alpha','CI can publish a temporary Windows alpha built from the exact source head after a bounded three-frame startup/render smoke.']],decisions:[['Preview ≠ Accurate','The responsive D3Q19 path is presented as preview, while SU2 Accurate is kept as a separate workflow with different semantics.'],['Evidence before labels','A generated mesh is not promoted to body-fitted or engineering-quality without evidence that establishes those claims.'],['Build provenance','Windows artifacts carry the source commit, CI validation commit, and SHA-256 so the build can be traced back to exact source.']],boundaries:['The native D3Q19 path is an interactive preview solver, not a validated high-fidelity CFD replacement.','The built-in Accurate mesh is staircase / voxel-derived and is not body-fitted.','The external TetGen path still does not establish body_fitted_status or engineering_quality_status.','SU2 and TetGen are separately installed dependencies and are not bundled in the Windows alpha.'],links:[['Repository','https://github.com/hoonex/developer/tree/feat/aeroforge-foundation'],['Current README','https://github.com/hoonex/developer/blob/feat/aeroforge-foundation/README.md'],['Validation notes','https://github.com/hoonex/developer/blob/feat/aeroforge-foundation/docs/VALIDATION.md']]},
      sloar:{kicker:'02 / Agent engineering protocol',title:'Sloar Chat Coder',deck:'A repository-engineering protocol built around the fact that a chat can look continuous while branches, CI, permissions, tools, and execution environments move underneath it.',snapshot:'Stable 0.10.3 · source d17208c',meta:'Agent Skill · GitHub · CI · Python helpers · design guidance',intro:'The goal is not to make an AI sound more confident. It is to re-identify the current repository state and keep every completion claim inside the evidence actually collected.',facts:[['Reasoning kernel','OBSERVE → MODEL → ACT → PROVE → RECONCILE is the compact default; the larger state machine expands only when continuity or publication risk makes it useful.'],['Repository continuity','Durable repository truth outranks reconstructed conversation memory, so work resumes from observable repository identity rather than assumed context.'],['Failure discipline','Repeated identical failure with identical inputs is not treated as progress. The failure layer and fingerprint are diagnosed before strategy changes.'],['Evidence closure','Saved source, passing tests, successful deployment, and real-device behavior remain separate claims with separate evidence boundaries.'],['Web architecture + design','An architecture capsule narrows unfamiliar web repositories before semantic owners are read, while web design guidance separately checks structure, responsive behavior, accessibility, and anti-AI-slop.'],['Chat + GitHub path','With a GitHub connector, exact repository reads and writes can happen without Codex CLI or an API key; unavailable runtime verification stays explicitly unverified.']],decisions:[['State over memory','Conversation context is useful, but repository state remains authoritative.'],['Owner before workaround','The semantic owner is found before adding specificity, mirrored state, another renderer, or a downstream synchronizer.'],['No evidence inflation','A green build is not upgraded into a visual claim, and a source patch is not upgraded into a deployment claim.'],['Revalidate before publish','Mutable remote refs are resolved again before publication because another actor may have moved them during the task.']],boundaries:['Sloar does not grant GitHub permissions or create an execution environment; it can only use capabilities exposed to the current session.','Saved code is not a test pass. Without a runtime or applicable CI, that verification remains unknown.','Local locks and checkpoints do not lock GitHub, so concurrent remote work still requires ref revalidation.','Updating canonical Sloar does not automatically update vendored copies in other repositories.'],links:[['Repository','https://github.com/hoonex/sloar-chat-coder'],['User guide','https://github.com/hoonex/sloar-chat-coder/blob/main/docs/USER_GUIDE.md'],['Skill contract','https://github.com/hoonex/sloar-chat-coder/blob/main/.agents/skills/sloar-chat-coder/SKILL.md']]}
    },
    ja:{
      common:{back:'← Selected builds',snapshot:'Current snapshot',built:'現在実装されているもの',decisions:'主な設計判断',boundary:'現在の範囲と限界',source:'Source / docs',scope:'このページには確認済みの現在の実装だけを記録します。予定機能は含めず、プロジェクト変更を確認した後に更新します。'},
      aeroforge:{kicker:'01 / Native simulation workbench',title:'AeroForge',deck:'高速な3DプレビューとSU2ベースのAccurate workflowを同じアプリに置きながら、同じ精度に見せないネイティブ空力ワークベンチ。',snapshot:'Sep 2026 · source 851a82f',meta:'Rust · Bevy · egui · WGSL · SU2 · TetGen',intro:'CFDらしい画面を作ることより、editor / preview / Accurate / mesh evidenceがそれぞれ何を保証できるかを分離することを優先しています。',facts:[['Viewport-first editor','Box / Sphere / Cylinder、picking、move/rotate/scale gizmoを備え、OBJ / STL / static glTF / GLBのtriangle surfaceも読み込めます。'],['Fast preview','独立したD3Q19 BGK CPU reference kernelと、CPU/GPU parity smoke・device-limit checkを持つ実験的WGSL GPU compute path。'],['Accurate workflow','SU2 8.5.0 adapterがconfig生成、process実行、convergence/history、force/moment、cancellation、provenanceを担当します。'],['Meshing paths','内蔵Cartesian staircase tetrahedral reference pathと、source/output facet correspondenceなどを記録するoptional external TetGen path。'],['Windows alpha','正確なsource headからbuildし、限定的な3-frame startup/render smokeを通過したWindows alpha artifactをCIが生成できます。']],decisions:[['Preview ≠ Accurate','D3Q19はpreviewとして扱い、SU2 Accurateとはworkflowと意味を分けています。'],['Evidence before labels','mesh生成だけでbody-fittedやengineering-qualityに昇格させません。'],['Build provenance','artifactにsource commit、CI validation commit、SHA-256を残します。']],boundaries:['D3Q19 pathはinteractive preview solverであり、validated high-fidelity CFDの代替ではありません。','内蔵Accurate meshはstaircase / voxel-derivedでbody-fittedではありません。','external TetGenでもbody_fitted_status / engineering_quality_statusは未確立です。','SU2とTetGenは別途インストールが必要です。'],links:[['Repository','https://github.com/hoonex/developer/tree/feat/aeroforge-foundation'],['Current README','https://github.com/hoonex/developer/blob/feat/aeroforge-foundation/README.md'],['Validation notes','https://github.com/hoonex/developer/blob/feat/aeroforge-foundation/docs/VALIDATION.md']]},
      sloar:{kicker:'02 / Agent engineering protocol',title:'Sloar Chat Coder',deck:'会話は続いて見えてもrepository、branch、CI、permission、runtimeは変わり得るという前提で作ったrepository engineering protocol。',snapshot:'Stable 0.10.3 · source d17208c',meta:'Agent Skill · GitHub · CI · Python helpers · design guidance',intro:'AIを自信満々に見せるのではなく、現在のrepository stateを再確認し、収集したevidenceより広い完了claimをしないことが目的です。',facts:[['Reasoning kernel','OBSERVE → MODEL → ACT → PROVE → RECONCILEを基本にし、必要な時だけ詳細なstate machineを展開します。'],['Repository continuity','会話記憶よりdurable repository truthを優先します。'],['Failure discipline','同じ入力・同じ失敗の繰り返しを進捗として扱いません。'],['Evidence closure','source保存、test、deployment、real-device behaviorを別々のclaimとして扱います。'],['Web architecture + design','architecture capsuleで探索範囲を絞り、design guidanceで構造・responsive・accessibility・anti-AI-slopを別途確認します。'],['Chat + GitHub path','GitHub connectorがあればCodex CLIやAPI keyなしでもexact repository read/writeが可能で、runtimeがなければtestは未確認のまま残します。']],decisions:[['State over memory','会話contextではなくrepository stateをauthoritative sourceにします。'],['Owner before workaround','workaroundを積む前にsemantic ownerを探します。'],['No evidence inflation','build successをvisual successやdeployment successに拡張しません。'],['Revalidate before publish','publish前にmutable remote refを再確認します。']],boundaries:['Sloar自体がGitHub権限やruntimeを作るわけではありません。','保存されたcodeはtest passではありません。','local lockはGitHub全体をlockしません。','canonical更新はvendored copyを自動更新しません。'],links:[['Repository','https://github.com/hoonex/sloar-chat-coder'],['User guide','https://github.com/hoonex/sloar-chat-coder/blob/main/docs/USER_GUIDE.md'],['Skill contract','https://github.com/hoonex/sloar-chat-coder/blob/main/.agents/skills/sloar-chat-coder/SKILL.md']]}
    }
  };

  const route=()=>((location.hash.slice(1)||'/').split('?')[0]);
  const language=()=>{const v=document.documentElement.lang||'ko';return v.startsWith('ja')?'ja':v.startsWith('en')?'en':'ko'};
  const slug=()=>route().startsWith('/project/')?route().split('/')[2]:'';

  function aeroVisual(){return `<div class="project-system-v16 aero-system-v16" aria-label="AeroForge current system map"><div class="system-top-v16"><span>AEROFORGE / CURRENT BUILD</span><b>851a82f</b></div><div class="aero-workbench-v16"><div class="aero-panel-v16"><b>SCENE</b><span>Wind source</span><span>Body 01</span><span>Body 02</span><i></i><b>MODE</b><span>Preview</span><span>Accurate</span></div><div class="aero-viewport-v16"><div class="aero-grid-v16"></div><div class="aero-body-v16 aero-body-a-v16"></div><div class="aero-body-v16 aero-body-b-v16"></div><div class="aero-stream-v16"><i></i><i></i><i></i><i></i><i></i></div><span>VIEWPORT / D3Q19 PREVIEW</span></div><div class="aero-panel-v16 aero-inspector-v16"><b>INSPECTOR</b><span>Transform</span><span>Flow</span><span>Scale</span><i></i><b>ACCURATE</b><span>Prepare</span><span>Run</span><span>Results</span></div></div><div class="system-foot-v16"><span>interactive preview</span><i></i><span>separate evidence boundary</span><i></i><span>SU2 Accurate</span></div></div>`}
  function sloarVisual(){return `<div class="project-system-v16 sloar-system-v16" aria-label="Sloar reasoning and evidence map"><div class="system-top-v16"><span>SLOAR / STABLE 0.10.3</span><b>d17208c</b></div><div class="sloar-kernel-v16">${['OBSERVE','MODEL','ACT','PROVE','RECONCILE'].map((x,i)=>`<span><i>${String(i+1).padStart(2,'0')}</i>${x}</span>`).join('')}</div><div class="sloar-evidence-v16"><div><span>REPOSITORY</span><b>durable truth</b></div><div><span>OWNER</span><b>before workaround</b></div><div><span>EVIDENCE</span><b>bounds claims</b></div><div><span>PUBLISH</span><b>revalidate ref</b></div></div><div class="system-foot-v16"><span>chat context</span><i></i><span>exact state</span><i></i><span>verified claim</span></div></div>`}

  function factRows(items){return items.map(([title,body],i)=>`<article class="project-fact-v16"><span>${String(i+1).padStart(2,'0')}</span><h3>${title}</h3><p>${body}</p></article>`).join('')}
  function decisionRows(items){return items.map(([title,body])=>`<div class="project-decision-v16"><strong>${title}</strong><p>${body}</p></div>`).join('')}
  function linkRows(items){return items.map(([title,href])=>`<a href="${href}" target="_blank" rel="noreferrer"><span>${title}</span><b>↗</b></a>`).join('')}

  function template(project,common,key){
    return `<div class="page project-page-v16 project-page-v16--${key}" data-project-page-v16="${key}" data-project-lang-v16="${language()}"><article class="project-shell-v16"><a class="project-back-v16" href="#/">${common.back}</a><header class="project-hero-v16"><div class="project-kicker-v16">${project.kicker}</div><h1>${project.title}</h1><p class="project-deck-v16">${project.deck}</p><div class="project-snapshot-v16"><span><b>${common.snapshot}</b>${project.snapshot}</span><span>${project.meta}</span></div></header>${key==='aeroforge'?aeroVisual():sloarVisual()}<p class="project-intro-v16">${project.intro}</p><aside class="project-scope-v16">${common.scope}</aside><section class="project-section-v16" aria-labelledby="project-built-v16"><div class="project-section-head-v16"><span>01</span><h2 id="project-built-v16">${common.built}</h2></div><div class="project-facts-v16">${factRows(project.facts)}</div></section><section class="project-section-v16"><div class="project-section-head-v16"><span>02</span><h2>${common.decisions}</h2></div><div class="project-decisions-v16">${decisionRows(project.decisions)}</div></section><section class="project-section-v16"><div class="project-section-head-v16"><span>03</span><h2>${common.boundary}</h2></div><ul class="project-boundaries-v16">${project.boundaries.map(x=>`<li>${x}</li>`).join('')}</ul></section><section class="project-section-v16 project-links-section-v16"><div class="project-section-head-v16"><span>04</span><h2>${common.source}</h2></div><div class="project-links-v16">${linkRows(project.links)}</div></section></article></div>`;
  }

  let lastRoute='';
  function mount(){
    const key=slug();
    if(!key||!['aeroforge','sloar'].includes(key))return;
    const lang=language(),dict=COPY[lang]||COPY.en,project=dict[key];
    document.querySelectorAll('[data-nav]').forEach(n=>{n.classList.remove('active');n.removeAttribute('aria-current')});
    document.title=`${project.title} — HJ`;
    const current=app.querySelector('[data-project-page-v16]');
    if(current?.dataset.projectPageV16===key&&current?.dataset.projectLangV16===lang)return;
    app.innerHTML=template(project,dict.common,key);
    if(lastRoute!==route())window.scrollTo({top:0,behavior:'auto'});
    lastRoute=route();
    app.focus({preventScroll:true});
  }

  let raf=0;
  function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(mount)}
  addEventListener('hashchange',schedule);
  document.addEventListener('hj:rendered',schedule);
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  queueMicrotask(schedule);
})();
