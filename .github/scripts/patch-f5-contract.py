from pathlib import Path
p=Path('.github/scripts/validate-runtime.py')
s=p.read_text()
old="for forbidden in ['journal-v2.js','journal-v10-editorial-naturalize.js','journal-v11-vision.js','journal-v12-vision-privacy.js']:"
new="for forbidden in ['journal-v2.js','journal-v10-editorial-naturalize.js','journal-v11-vision.js','journal-v12-vision-privacy.js','journal-v12-vision-f5.js']:"
if old not in s: raise SystemExit('forbidden-core contract drift')
s=s.replace(old,new)
old="    'vision':['journal-v11-vision.js','journal-v12-vision-privacy.js'],"
new="    'vision':['journal-v11-vision.js','journal-v12-vision-privacy.js','journal-v12-vision-f5.js'],"
if old not in s: raise SystemExit('vision lazy contract drift')
s=s.replace(old,new)
anchor="privacy = (ROOT / 'journal-v12-vision-privacy.js').read_text()"
insert="f5 = (ROOT / 'journal-v12-vision-f5.js').read_text()\nfor token in [\"REV='F5-20260830-2041'\",'sourceSurface','DrawingUtils','FACE_LANDMARKS_TESSELATION',\"mode:'source-space-single-canvas'\"]:\n    if token not in f5: fail(f'vision F5 source-space contract missing: {token}')\n\n"
if anchor not in s: raise SystemExit('privacy anchor drift')
s=s.replace(anchor,insert+anchor)
p.write_text(s)
Path('.github/scripts/patch-f5-contract.py').unlink(missing_ok=True)
Path('.github/workflows/patch-f5-contract-once.yml').unlink(missing_ok=True)
