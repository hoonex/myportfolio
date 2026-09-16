/* Portfolio v18 — single human-authored content owner. Repository facts are overlaid from portfolio-snapshots.json. */
(()=>{
'use strict';
const project=(value)=>Object.freeze(value);
const PROJECTS={
  adofai:project({
    snapshotKey:'adofai',href:'#/project/adofai',kicker:'Android compatibility / active',title:'ADOFAI Companion Editor',
    desc:'공식 Play 앱을 수정하지 않고 .adofai/ZIP 번들을 열고 편집·보존한 뒤, loopback/HTTPS 진단으로 공식 3.3.1의 외부 입력 경계를 검증하는 non-root companion.',
    meta:'Android · SAF · ZIP bundles · diagnostics',
    deck:'공식 ADOFAI 설치를 그대로 둔 채 사용자 제작 차트와 ZIP 레벨 번들을 편집하고, 외부 handoff가 실제로 소비되는지 별도 진단하는 Android companion.',
    intro:'목표는 proprietary APK를 고쳐 배포하는 것이 아니라, 사용자 제작 콘텐츠를 손실 없이 다루고 unmodified official game과 연결 가능한 경계를 증거 기반으로 확인하는 것입니다.',
    facts:[
      ['Bundle-centered editing','로컬 .adofai, .zip/.adozip, 직접 ZIP URL을 열며 차트 하나가 아니라 오디오·이미지·장식 파일을 포함한 전체 디렉터리 계층을 authoritative bundle로 유지합니다.'],
      ['Loss-preserving editor','Chart / Settings / Events / Raw 편집을 제공하고, 알 수 없는 root field와 event payload는 명시적으로 바꾸지 않는 한 보존합니다. BOM·trailing comma·raw control character 호환 처리도 포함합니다.'],
      ['Exact official target','handoff 전 설치된 대상이 com.fizzd.connectedworlds 3.3.1 / versionCode 300382인지 확인하고 exact UnityPlayerActivity를 명시적으로 실행합니다.'],
      ['Consumption diagnostics','localhost ZIP publisher가 HEAD/GET 횟수와 실제 body bytes를 기록해 “앱이 열렸다”와 “ZIP이 소비됐다”를 구분합니다. 원본 HTTPS URL만 보내는 격리 진단도 따로 둡니다.'],
      ['Independent Android build','JDK 17 / Android 35 / Gradle 8.9로 별도 Companion APK를 빌드하며 공식 APK나 game asset은 저장소에 포함하지 않습니다.']
    ],
    decisions:[
      ['Official APK stays untouched','root, Magisk/Zygisk, APK patch/resign, license bypass를 canonical product path에서 제외했습니다.'],
      ['Bundle, not one JSON','상대 경로로 연결된 sibling asset이 깨지지 않도록 레벨의 전체 hierarchy를 편집 단위로 봅니다.'],
      ['Launch ≠ consumed','정상적으로 메인 메뉴가 열리는 것만으로 preview 성공이라 부르지 않고 GET/HEAD와 실제 게임 행동을 분리해 기록합니다.'],
      ['Isolate ambiguous boundaries','localhost cleartext 문제와 게임의 URL-entry 지원 여부를 구분하기 위해 원본 HTTPS diagnostic을 별도 경로로 유지합니다.']
    ],
    boundaries:[
      'unmodified official Android 3.3.1 Activity가 외부 ZIP URL을 실제 custom-level loader로 연결하는 최종 경계는 물리 기기에서 아직 별도 검증이 필요합니다.',
      '저장소는 proprietary ADOFAI APK, native library, game asset을 포함하거나 재배포하지 않습니다.',
      'Companion APK build 성공은 공식 게임이 handoff를 소비했다는 증거가 아닙니다.',
      '원본 HTTPS diagnostic은 remote source bundle을 재사용하므로 저장되지 않은 로컬 편집 내용은 포함하지 않습니다.'
    ],
    links:[['Repository / active branch','https://github.com/hoonex/adofai/tree/fix/v240-custom-bugfix'],['Current README','https://github.com/hoonex/adofai/blob/fix/v240-custom-bugfix/README.md']]
  }),
  aeroforge:project({
    snapshotKey:'aeroforge',href:'#/project/aeroforge',kicker:'Native simulation / active',title:'AeroForge',
    desc:'Bevy + egui 3D 공력 워크벤치. D3Q19 preview와 SU2 Accurate를 분리하고, TetGen mesh evidence를 늘리면서도 검증되지 않은 fidelity label은 올리지 않습니다.',
    meta:'Rust · Bevy · WGSL · SU2 · TetGen',
    deck:'빠른 3D 공력 미리보기와 SU2 기반 Accurate workflow를 한 앱 안에 두되, 둘을 같은 정확도로 보이지 않게 설계한 네이티브 공기역학 워크벤치.',
    intro:'현재 작업은 “CFD처럼 보이는 화면”보다 geometry → mesh → solver로 넘어가는 각 단계가 무엇을 실제로 보장하는지 더 강하게 증명하는 쪽으로 진행되고 있습니다.',
    facts:[
      ['Viewport-first editor','Box / Sphere / Cylinder, picking, move/rotate/scale gizmo와 OBJ / STL / static glTF / GLB triangle-surface import를 갖춘 네이티브 편집기입니다.'],
      ['Preview solver','독립 D3Q19 BGK CPU reference kernel과 실험적 WGSL GPU compute 경로를 두고 CPU/GPU parity smoke와 device-limit 검사를 분리합니다.'],
      ['Accurate workflow','SU2 8.5.0 adapter가 configuration, SI coefficient frame, process execution, convergence/history, aggregate/per-body force·moment, cancellation, provenance를 소유합니다.'],
      ['TetGen evidence expansion','external TetGen 경로는 모든 tetrahedron의 6개 internal dihedral, 모든 unique face orthogonality, 모든 interior face volume-ratio/skewness와 source↔output body facet 1:1 correspondence까지 기록합니다.'],
      ['Limited Windows alpha','CI가 exact source head를 release executable로 만들고 최소 3 rendered frame startup smoke를 통과한 경우 임시 Windows artifact를 게시합니다.']
    ],
    decisions:[
      ['Preview ≠ Accurate','responsive D3Q19을 validated high-fidelity CFD처럼 포장하지 않고 SU2 workflow와 의미를 명확히 분리합니다.'],
      ['Evidence before fidelity','더 많은 mesh metric이 생겨도 그것만으로 body-fitted나 engineering-quality로 승격하지 않습니다.'],
      ['Fail closed on labels','현재 external TetGen 결과는 unclassified_audited_volume이며 body_fitted_status / engineering_quality_status는 not_established를 유지합니다.'],
      ['Trace exact builds','Windows artifact에 source commit과 CI validation identity를 남겨 어떤 코드가 검증됐는지 다시 추적할 수 있게 합니다.']
    ],
    boundaries:[
      'D3Q19 경로는 interactive preview solver이며 validated high-fidelity CFD 대체재가 아닙니다.',
      'built-in Accurate mesh는 staircase / voxel-derived이며 body-fitted가 아닙니다.',
      'external TetGen의 현재 evidence도 CAD surface identity, boundary-layer mesh, solver-specific engineering quality나 engineering aerodynamic accuracy를 입증하지 않습니다.',
      'CI startup smoke는 모든 실제 GPU/driver/display 환경과 graceful GPU teardown을 보장하지 않습니다.'
    ],
    links:[['Repository / active branch','https://github.com/hoonex/developer/tree/feat/aeroforge-foundation'],['Current README','https://github.com/hoonex/developer/blob/feat/aeroforge-foundation/README_KR.md'],['Validation notes','https://github.com/hoonex/developer/blob/feat/aeroforge-foundation/docs/VALIDATION.md']]
  }),
  sloar:project({
    snapshotKey:'sloar',href:'#/project/sloar',kicker:'Agent engineering / stable',title:'Sloar Chat Coder',
    desc:'채팅 코딩에서 저장소·CI·권한·배포 상태가 바뀌어도 작업 근거를 잃지 않도록 만든 repository engineering protocol. 현재 stable 0.10.3.',
    meta:'Agent Skill · GitHub · CI · evidence',
    deck:'대화는 이어져 보여도 repository, branch, CI, permission, runtime은 바뀔 수 있다는 전제에서 만든 repository engineering protocol.',
    intro:'핵심은 AI가 더 자신 있게 말하는 것이 아니라, 현재 source identity를 다시 확인하고 수집한 evidence보다 넓게 완료를 주장하지 않게 만드는 것입니다.',
    facts:[
      ['Reasoning kernel','OBSERVE → MODEL → ACT → PROVE → RECONCILE를 기본 루프로 사용하고 continuity/publication 위험이 있을 때만 더 상세한 state machine을 펼칩니다.'],
      ['Repository continuity','conversation memory보다 durable repository truth를 우선하고 commit / tree / observable working state를 기준으로 작업을 이어갑니다.'],
      ['Evidence independence','0.10.3은 구현과 검증이 같은 잘못된 전제를 공유할 수 있는 경우 independent falsification과 critical-assumption grounding을 명시적으로 다룹니다.'],
      ['Failure discipline','동일 입력의 동일 실패를 진행으로 취급하지 않고 failure fingerprint와 layer를 먼저 구분해 다음 전략을 바꿉니다.'],
      ['Architecture + design','낯선 웹 저장소에서는 architecture capsule로 owner path를 좁히고, 별도 design guidance로 responsive/accessibility/structural integrity를 검토합니다.']
    ],
    decisions:[
      ['State over memory','대화 맥락은 참고 자료이고 repository state가 authoritative source입니다.'],
      ['Owner before workaround','duplicate state, specificity escalation, 별도 renderer 같은 우회로를 쌓기 전에 semantic owner를 찾습니다.'],
      ['No evidence inflation','source write, test, deployment, rendered UI, real-device behavior를 서로 다른 claim으로 유지합니다.'],
      ['Revalidate before publish','작업 중 branch가 움직일 수 있으므로 publication 직전 mutable ref를 다시 확인합니다.']
    ],
    boundaries:[
      'Sloar 자체가 GitHub permission이나 runtime을 만들어 주지는 않습니다. 현재 세션에 실제 노출된 capability만 사용할 수 있습니다.',
      '저장된 source는 test pass가 아니며 green build도 rendered/real-device success가 아닙니다.',
      'local lock/checkpoint는 GitHub 전체를 잠그지 않으므로 concurrent remote work는 별도 reconciliation이 필요합니다.',
      'canonical Sloar 업데이트가 다른 저장소의 vendored copy를 자동 갱신하지는 않습니다.'
    ],
    links:[['Repository','https://github.com/hoonex/sloar-chat-coder'],['한국어 가이드','https://github.com/hoonex/sloar-chat-coder/blob/main/README.ko.md'],['Skill contract','https://github.com/hoonex/sloar-chat-coder/blob/main/.agents/skills/sloar-chat-coder/SKILL.md']]
  }),
  'liquid-piano':project({href:'#/lab/piano',kicker:'WebGL instrument / live',title:'Liquid Piano',desc:'idle surface를 cache하고 눌린 건반에만 실제 LiquidGlass deformation/refraction을 적용하는 WebGL2 피아노. Web Audio, multitouch, glissando와 고해상도 모바일 profile을 함께 유지합니다.',meta:'WebGL2 · Web Audio · multitouch'}),
  'daily-tech':project({
    snapshotKey:'daily-tech',href:'#/project/daily-tech',kicker:'Editorial automation / active',title:'Daily Tech Magazine',desc:'매일 기술 브리프를 structured JSON으로 보존하고 GitHub Actions가 4:5 에디토리얼 카드로 재현 가능하게 렌더하는 자동화 파이프라인.',meta:'Node · GitHub Actions · publishing',
    deck:'조사·편집 판단과 visual rendering을 분리해, 완성된 issue JSON에서 매일 같은 규칙으로 1080×1350 기술 뉴스 캐러셀을 생성하는 pipeline.',
    intro:'최근 작업까지 자동으로 render commit이 쌓이는 프로젝트라 고정 SHA를 사람이 수정하는 대신 이 포트폴리오의 snapshot automation이 tracked main ref를 따라갑니다.',
    facts:[['Canonical issue data','content/latest.json이 issue의 story, TOP selection, facts, analysis, outlook와 source URL을 구조화해 소유합니다.'],['Deterministic rendering','repository workflow가 issue data를 검증하고 4:5 editorial JPEG carousel을 재현 가능하게 렌더합니다.'],['Research separated','뉴스 조사/선정은 upstream scheduled brief에서 끝내고 renderer는 별도 AI pass 없이 이미 정리된 data를 시각화합니다.'],['Optional publishing','Instagram publishing은 명시적인 account/token 설정이 있을 때만 opt-in으로 실행되며 render success와 publish approval을 구분합니다.']],
    decisions:[['Data before pixels','JPEG보다 structured issue data를 authoritative source로 둬 layout 변경 후에도 원문과 source가 남습니다.'],['Renderer ≠ researcher','렌더러가 뉴스 판단을 다시 추측하지 않게 research owner와 visual owner를 분리합니다.'],['Publish stays opt-in','successful render를 자동으로 외부 SNS publish 승인으로 확대하지 않습니다.']],
    boundaries:['renderer 성공은 기사 사실성을 독립적으로 재검증했다는 뜻이 아닙니다.','SNS publishing은 credential/account configuration에 의존하며 기본 동작의 필수 조건이 아닙니다.'],
    links:[['Repository','https://github.com/hoonex/daily-tech-magazine'],['Current issue JSON','https://github.com/hoonex/daily-tech-magazine/blob/main/content/latest.json']]
  }),
  'esp32-car':project({
    snapshotKey:'esp32-car',href:'#/project/esp32-car',kicker:'Embedded control / active',title:'ESP32 RC Controller',desc:'ESP32-CAM 2WD 차량을 Classic Bluetooth SPP와 Wi-Fi로 제어하고 camera, OpenCV tracking, device setup과 OTA 경로를 한 Android 앱에 정리한 controller.',meta:'Android · ESP32-CAM · OpenCV',
    deck:'실제 transport ownership을 기준으로 Classic Bluetooth SPP와 Wi-Fi control, camera, tracking, firmware path를 분리한 ESP32-CAM Android controller.',intro:'처음 기능을 한 화면에 쌓기보다 drive/camera/device/firmware의 owner를 나누고, 실제 hardware protocol과 UI state가 같은 의미를 갖도록 정리했습니다.',
    facts:[['Drive workspace','hold-to-drive D-pad, speed, trim, light, emergency stop과 transport selection을 직접 조작 흐름에 맞게 제공합니다.'],['Transport discipline','Bluetooth는 Classic SPP를 명시적으로 사용하고 write serialization/reconnect state를 관리하며 Wi-Fi control은 stale request backlog를 줄입니다.'],['Camera + tracking','ESP32-CAM stream과 OpenCV auto-tracking을 manual drive state와 분리해 유지합니다.'],['Firmware ownership','firmware source는 Android runtime UI가 아니라 repository의 /firmware에서 관리하고 known-good recovery 경로를 별도로 구분합니다.']],
    decisions:[['Correct transport first','실제 장치가 쓰는 Classic Bluetooth SPP를 BLE처럼 추상화하지 않습니다.'],['Hold means drive','RC 방향 입력을 toggle보다 press-and-hold direct-control semantics로 맞춥니다.'],['App ≠ firmware editor','Android app과 microcontroller firmware source ownership을 분리합니다.']],
    boundaries:['물리 하드웨어에서 확인된 first-install/recovery와 CI packaging은 같은 증거가 아닙니다.','camera/network latency와 control feel은 실제 ESP32-CAM, Wi-Fi와 Android device 환경에 영향을 받습니다.'],
    links:[['Repository','https://github.com/hoonex/esp32-car'],['Firmware','https://github.com/hoonex/esp32-car/tree/main/firmware']]
  }),
  nightshift:project({
    snapshotKey:'nightshift',href:'#/project/nightshift',kicker:'Game prototype / active',title:'Nightshift',desc:'서버 없이 먼저 완결되는 Android 1인칭 호러 코어와, 같은 authoritative simulation을 공유하는 선택적 1–4인 multiplayer path.',meta:'Android · OpenGL ES · Java server',
    deck:'solo loop를 product default로 두고 같은 simulation rule 위에 experimental authority-server multiplayer를 얹은 Android first-person horror prototype.',intro:'networking demo가 아니라 APK 자체에서 게임 loop가 먼저 성립하도록 방향을 잡았습니다. 시설 탐색, fuse/keycard, breaker, hunter/blackout, extraction이 한 흐름으로 연결됩니다.',
    facts:[['Standalone core','BEGIN SHIFT에서 server/room code 없이 이동, objective, hunter, blackout, extraction이 포함된 solo loop가 바로 시작됩니다.'],['Game-feel pass','industrial facility geometry, hunter silhouette, flashlight/fog/flicker, sprint FOV, head bob, camera shake와 HUD feedback을 추가했습니다.'],['Runtime feedback','procedural ambience/footstep/heartbeat/event sound와 haptics를 Android client runtime에서 생성합니다.'],['Shared simulation','solo와 optional multiplayer가 같은 authoritative GameSimulation과 protocol/prediction/interpolation rule을 공유합니다.']],
    decisions:[['Solo before networking','첫 화면에서 server dependency를 요구하지 않고 독립 실행 가능한 game loop를 기본으로 둡니다.'],['One rules owner','solo/multiplayer에서 gameplay rule을 복제하지 않고 같은 simulation owner를 사용합니다.'],['Evidence stays scoped','APK CI/build 성공을 실제 폰의 rendering/touch/audio/frame pacing/thermal evidence로 확대하지 않습니다.']],
    boundaries:['multiplayer는 현재 optional experimental 1–4 player authority-server mode입니다.','real-device rendering, touch feel, audio output, frame pacing, thermal과 battery는 별도 하드웨어 검증이 필요합니다.'],
    links:[['Repository','https://github.com/hoonex/solarnet'],['README','https://github.com/hoonex/solarnet/blob/main/README.md']]
  }),
  vision:project({href:'#/lab/vision',kicker:'Computer vision / live',title:'Vision Lab',desc:'MediaPipe hand/face tracking과 dual-hand pinch를 browser interaction input으로 연결한 실험 공간.',meta:'MediaPipe · Canvas · direct manipulation'}),
  'glass-lab':project({href:'#/lab',kicker:'Material interaction / live',title:'Glass / Jelly Lab',desc:'CSS blur에서 WebGL refraction, drag interaction과 jelly deformation까지 이어지는 material interaction 실험.',meta:'WebGL · shader · interaction'})
};

globalThis.HJPortfolioV18Content=Object.freeze({
  build:'PORTFOLIO18-LATEST-20260916',
  chrome:{brand:'Systems + software',footer:'Android · simulation · agents · interaction, 2026'},
  home:{
    eyebrow:'HJ / systems + software / 2026',
    title:'프로토타입을 <span class="serifish">끝까지.</span>',
    intro:'Android tooling, native simulation, agent engineering, WebGL interaction을 직접 만들고 실제 동작과 검증 경계를 함께 다룹니다.',
    note:'완성 화면만 보여주기보다 어떤 source가 현재이고, 어디까지 자동 검증됐으며, 무엇이 아직 실제 기기에서 미확인인지 같이 남깁니다.',
    principle:'빨리 만든 기능보다 어디까지 실제로 검증됐는지가 더 중요하다. source, runtime, 배포, 실제 기기에서의 행동을 같은 사실로 뭉개지 않는다.',
    primaryHeading:'Current work',primaryCount:'04 current / live',primaryIntro:'지금 가장 많이 움직이는 작업. 저장소 기반 프로젝트는 현재 tracked ref의 commit snapshot을 자동 동기화합니다.',
    secondaryHeading:'More builds',secondaryCount:'05 current / live',secondaryIntro:'현재 유지 중이거나 이 사이트에서 직접 실행할 수 있는 추가 작업입니다.'
  },
  common:{back:'← Current work',snapshot:'Current snapshot',built:'현재 구현된 것',decisions:'핵심 설계 결정',boundary:'현재 범위와 한계',source:'Source / docs',scope:'설명은 확인된 구현만 수동으로 관리하고, 저장소 HEAD·날짜 같은 사실값만 자동 동기화합니다. 계획 기능을 현재 상태처럼 표시하지 않습니다.'},
  primary:['adofai','aeroforge','sloar','liquid-piano'],
  secondary:['daily-tech','esp32-car','nightshift','vision','glass-lab'],
  projects:PROJECTS
});
})();
