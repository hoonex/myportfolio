#!/usr/bin/env python3
from pathlib import Path
import json
import re
import subprocess

ROOT = Path('site')
MANIFEST = ROOT / 'runtime-manifest.json'

def fail(message: str) -> None:
    raise SystemExit(message)

def unique_assets(core, routes, key):
    ordered = []
    owners = {}
    for owner, assets in [('core', core.get(key, []))] + [(f"route:{route['id']}", route.get(key, [])) for route in routes]:
        for rel in assets:
            if rel in owners:
                fail(f'duplicate runtime asset {rel}: {owners[rel]} and {owner}')
            owners[rel] = owner
            ordered.append(rel)
    return ordered

manifest = json.loads(MANIFEST.read_text())
core = manifest.get('core') or fail('runtime manifest missing core')
routes = manifest.get('routes') or []
budgets = manifest.get('budgets') or fail('runtime manifest missing budgets')
route_ids = set()
for route in routes:
    route_id = route.get('id')
    if not route_id or route_id in route_ids:
        fail(f'invalid or duplicate route id: {route_id}')
    route_ids.add(route_id)
    seen_paths = set()
    for path in route.get('paths', []):
        if not isinstance(path, str) or not path.startswith('/'):
            fail(f'invalid route path for {route_id}: {path!r}')
        if path in seen_paths:
            fail(f'duplicate path inside route group {route_id}: {path}')
        seen_paths.add(path)

html = (ROOT / 'index.html').read_text()
html_styles = re.findall(r'<link[^>]+href="\./([^"?#]+\.css)', html)
html_scripts = re.findall(r'<script\s+src="\./([^"?#]+\.js)(?:[?#][^"]*)?"', html)
if html_styles != core.get('styles', []): fail(f'core style order drift: html={html_styles} manifest={core.get("styles", [])}')
if html_scripts != core.get('scripts', []): fail(f'core script order drift: html={html_scripts} manifest={core.get("scripts", [])}')

all_styles = unique_assets(core, routes, 'styles')
all_scripts = unique_assets(core, routes, 'scripts')
for rel in all_styles + all_scripts:
    path = ROOT / rel
    if not path.is_file(): fail(f'missing runtime asset: {rel}')
for rel in all_scripts:
    subprocess.run(['node', '--check', str(ROOT / rel)], check=True)

core_js = sum((ROOT / rel).stat().st_size for rel in core.get('scripts', []))
total_js = sum((ROOT / rel).stat().st_size for rel in all_scripts)
core_css = sum((ROOT / rel).stat().st_size for rel in core.get('styles', []))
total_css = sum((ROOT / rel).stat().st_size for rel in all_styles)
metrics = {'core_js': core_js, 'total_js': total_js, 'core_css': core_css, 'total_css': total_css}
print('runtime payload: ' + ' '.join(f'{key}={value}' for key, value in metrics.items()))
for key, value in metrics.items():
    limit = budgets.get(key)
    if not isinstance(limit, int): fail(f'missing integer budget: {key}')
    if value > limit: fail(f'{key} budget exceeded: {value} > {limit}')

required_core = {'journal-editorial-core.js','journal-runtime.js','journal-spatial-index.js','journal-v6-studio.js','journal-route-loader.js'}
missing_core = required_core.difference(core.get('scripts', []))
if missing_core: fail(f'missing required core scripts: {sorted(missing_core)}')
for forbidden in ['journal-v2.js','journal-v10-editorial-naturalize.js','journal-v11-vision.js','journal-v12-vision-privacy.js']:
    if forbidden in core.get('scripts', []): fail(f'route-only runtime leaked back into core: {forbidden}')

editorial_core = (ROOT / 'journal-editorial-core.js').read_text()
for phrase in ['手触りのある素材','WebGL屈折 · ドラッグ変形','状態復元 · 障害注入','この記事の構成','読書中']:
    if phrase not in editorial_core: fail(f'missing authored core locale copy: {phrase}')
try:
    ja_core = editorial_core.split("    ja: {", 1)[1].split("\n  };", 1)[0]
except IndexError:
    fail('could not isolate Japanese editorial-core copy')
for debt in ['WebGL 屈折 · jelly drag','state recovery · failure injection','spring · velocity handoff']:
    if debt in ja_core: fail(f'translationese leaked into Japanese editorial core: {debt}')

v2 = (ROOT / 'journal-v2.js').read_text()
canonical_v2_metadata = {
    'glass': {
        'ko': ('재질 / 광학', 'Liquid Glass는 단순한 블러가 아니다.'),
        'en': ('Material / optics', 'Liquid Glass is a hierarchy problem before it is a blur effect.'),
        'ja': ('素材 / 光学', 'ガラスらしさは、ぼかしだけでは作れない。'),
    },
    'sloar': {
        'ko': ('도구 / 시스템', 'Sloar를 만들며 배운 것은 “기억”보다 “상태”였다.'),
        'en': ('Tool / system', 'Sloar is an argument for state over memory.'),
        'ja': ('開発プロトコル', 'Sloarを作って分かったのは、記憶より「現在の状態」が重要だということ。'),
    },
    'motion': {
        'ko': ('인터랙션', '좋은 모션은 애니메이션보다 입력의 연속성에 가깝다.'),
        'en': ('Interaction', 'Good motion preserves intent instead of displaying animation.'),
        'ja': ('インタラクション', '良いモーションは、演出よりも操作の連続性を守る。'),
    },
}
for slug, languages in canonical_v2_metadata.items():
    block_match = re.search(rf'^    {slug}:\s*\{{(?P<body>[\s\S]*?)(?=^    (?:glass|sloar|motion):\s*\{{|^  const presets = \{{)', v2, re.M)
    if not block_match:
        fail(f'could not isolate v2 article metadata for {slug}')
    block = block_match.group('body')
    for lang, (category, title) in languages.items():
        metadata = re.search(rf"^      {lang}:\{{category:'([^']*)'[^\n]*title:'([^']*)'[^\n]*deck:'([^']*)'[^\n]*lede:'([^']*)'\}},$", block, re.M)
        if not metadata:
            fail(f'missing v2 metadata line for {slug}/{lang}')
        actual_category, actual_title, deck, lede = metadata.groups()
        if actual_category != category or actual_title != title:
            fail(f'v2 metadata drift for {slug}/{lang}: category={actual_category!r} title={actual_title!r}')
        if len(deck.strip()) < 30 or len(lede.strip()) < 50:
            fail(f'v2 authored metadata became too thin for {slug}/{lang}')
for legacy in [
    "title:'Liquid Glass는 frosted glass가 아니다.'",
    "title:'Liquid Glass is not frosted glass.'",
    "title:'Liquid Glass は frosted glass ではない。'",
    "title:'Sloar Chat Coder를 설계하며 배운 것.'",
    "title:'What I learned designing Sloar Chat Coder.'",
    "title:'Sloar Chat Coder を設計して学んだこと。'",
    "title:'모션은 손 아래에서 시작해야 한다.'",
    "title:'Motion should begin under your hand.'",
    "title:'モーションは手の下から始まるべきだ。'",
]:
    if legacy in v2: fail(f'legacy article metadata source reintroduced: {legacy}')

required_lazy = {
    'editorial-full':['journal-v2.js'],
    'glass':['journal-v3-refraction.js','journal-v4-jelly.js','journal-v9-locale-editorial.js'],
    'article-labs':['journal-v5-experiments.js'],
    'spatial':['journal-v8-spatial.js'],
    'vision':['journal-v11-vision.js','journal-v12-vision-privacy.js'],
    'article-polish':['journal-v10-editorial-naturalize.js'],
}
expected_route_order = ['editorial-full','glass','article-labs','spatial','vision','article-polish']
actual_route_order = [route['id'] for route in routes]
if actual_route_order != expected_route_order: fail(f'route load order drift: {actual_route_order} != {expected_route_order}')
by_id = {route['id']: route for route in routes}
for route_id, scripts in required_lazy.items():
    if by_id.get(route_id, {}).get('scripts') != scripts:
        fail(f'lazy route contract drift for {route_id}: {by_id.get(route_id, {}).get("scripts")} != {scripts}')
if by_id.get('vision', {}).get('styles') != ['journal-v11-vision.css']:
    fail(f'vision style contract drift: {by_id.get("vision", {}).get("styles")}')
expected_paths = {'editorial-full':['/lab','/post/glass','/post/sloar','/post/motion'],'article-polish':['/post/glass','/post/sloar','/post/motion','/post/spatial'],'vision':['/lab/vision']}
for route_id, paths in expected_paths.items():
    if by_id.get(route_id, {}).get('paths') != paths:
        fail(f'composable route contract drift for {route_id}: {by_id.get(route_id, {}).get("paths")} != {paths}')

loader = (ROOT / 'journal-route-loader.js').read_text()
for token in ['function loadStyle', '(group.paths || []).includes(current)', 'group.styles || []', 'HJRuntime?.schedule']:
    if token not in loader: fail(f'route-loader contract missing: {token}')
if 'current.startsWith(`${path}/`)' in loader:
    fail('prefix route matching reintroduced; /lab/vision must not inherit /lab assets')

vision = (ROOT / 'journal-v11-vision.js').read_text()
for token in ["V='1.0.1'",'GestureRecognizer','FaceLandmarker','recognizeForVideo','detectForVideo','worldLandmarks','faceLandmarks','faceBlendshapes','facialTransformationMatrixes','getUserMedia','injectDiagnosticFrame',"CV='https://docs.opencv.org/5.0.0/opencv.js'",'C.Canny']:
    if token not in vision: fail(f'vision runtime contract missing: {token}')
if 'frozen gesture command' not in vision: fail('vision freeze/resume command channel contract missing')
for forbidden in ['setInterval(() => injectDiagnosticFrame','queueMicrotask(injectDiagnosticFrame','requestAnimationFrame(injectDiagnosticFrame']:
    if forbidden in vision: fail('diagnostic geometry must never auto-run as camera output')

v10 = (ROOT / 'journal-v10-editorial-naturalize.js').read_text()
if "article.dataset.editorialNaturalized = 'v10';" not in v10:
    fail('v10 article naturalization lifecycle marker missing')

privacy = (ROOT / 'journal-v12-vision-privacy.js').read_text()
for phrase in [
    '성능·사용량 측정 정보가 Google에 전송될 수 있습니다.',
    'MediaPipe API performance or usage metrics may be sent to Google.',
    '測定情報がGoogleへ送信される場合があります。',
    "route() !== '/lab/vision'"
]:
    if phrase not in privacy: fail(f'vision privacy disclosure contract missing: {phrase}')

print('canonical composable route runtime manifest validated')