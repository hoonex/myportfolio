import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.JOURNAL_BASE_URL || 'http://127.0.0.1:4173';
const expect = (condition, message) => { if (!condition) throw new Error(message); };
const VERSION = '1.0.1';
const MOD = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/vision_bundle.mjs`;
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const GESTURE_MODEL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
// MediaPipe's own web FaceLandmarker examples use this real-person portrait fixture.
const REAL_FACE_IMAGE = 'https://storage.googleapis.com/mediapipe-assets/portrait.jpg';

const browser = await chromium.launch({ headless: true });

const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobile = await mobileContext.newPage();
await mobile.goto(`${baseURL}/#/lab/vision`, { waitUntil: 'domcontentloaded' });
await mobile.waitForSelector('[data-vision-lab]', { timeout: 12000 });
await mobile.waitForTimeout(700);
const defaultDiagnosticHidden = await mobile.locator('.vision-3d-card-v11').getAttribute('hidden') !== null;
expect(defaultDiagnosticHidden, 'Vision diagnostic 3D must be secondary and hidden by default');
const geometryBase = await mobile.evaluate(() => {
  const startRect = document.querySelector('[data-start]')?.getBoundingClientRect();
  const cameraStage = document.querySelector('.vision-stage-v11')?.getBoundingClientRect();
  const box = rect => rect ? ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }) : null;
  return {
    innerWidth, innerHeight, scrollWidth: document.documentElement.scrollWidth, title: document.title,
    current: document.querySelector('[data-nav="vision"]')?.getAttribute('aria-current') || '',
    startVisible: !!document.querySelector('[data-start]')?.getClientRects().length,
    startInViewport: !!startRect && startRect.top >= 0 && startRect.bottom <= innerHeight,
    cameraStage: box(cameraStage),
    touchTargets: [...document.querySelectorAll('.vision-command-v11 button,.vision-toggle-v11 span')].map(node => { const rect = node.getBoundingClientRect(); return { label: node.textContent?.trim() || '', width: rect.width, height: rect.height }; }),
    projectedCenter: window.HJVisionLab?.projectFramePoint?.({ x: .5, y: .5 }, 1280, 720, 300, 400, true),
    projectedLeft: window.HJVisionLab?.projectFramePoint?.({ x: 0, y: .5 }, 1280, 720, 300, 400, true),
    projectedRight: window.HJVisionLab?.projectFramePoint?.({ x: 1, y: .5 }, 1280, 720, 300, 400, true)
  };
});
expect(geometryBase.scrollWidth <= geometryBase.innerWidth + 1, `Vision mobile horizontal overflow: ${JSON.stringify(geometryBase)}`);
expect(geometryBase.title === 'Vision Lab. — HJ', `Vision mobile title drift: ${geometryBase.title}`);
expect(geometryBase.current === 'page', `Vision mobile nav aria-current drift: ${geometryBase.current}`);
expect(geometryBase.startVisible, 'Vision mobile Start camera action is not visible');
expect(geometryBase.startInViewport, `Vision mobile Start camera action must remain inside the first 844px viewport: ${JSON.stringify(geometryBase)}`);
const portraitRatio = 4 / 3;
expect(geometryBase.cameraStage && Math.abs(geometryBase.cameraStage.height / geometryBase.cameraStage.width - portraitRatio) < 0.035, `Vision mobile camera stage must be 3:4 portrait: ${JSON.stringify(geometryBase.cameraStage)}`);
const undersized = geometryBase.touchTargets.filter(({ width, height }) => width < 44 || height < 44);
expect(undersized.length === 0, `Vision mobile command touch targets must be at least 44x44 CSS px: ${JSON.stringify(undersized)}`);
expect(Math.abs(geometryBase.projectedCenter.x - 150) < .01 && Math.abs(geometryBase.projectedCenter.y - 200) < .01, `object-fit cover projection center drift: ${JSON.stringify(geometryBase)}`);
expect(geometryBase.projectedLeft.x > 300 && geometryBase.projectedRight.x < 0, `portrait crop projection must account for cropped source columns: ${JSON.stringify(geometryBase)}`);
await mkdir('.artifacts/design-journal', { recursive: true });
await mobile.screenshot({ path: '.artifacts/design-journal/vision-mobile.png', fullPage: true });
await mobile.evaluate(() => { const input = document.querySelector('[data-vt="view"]'); input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); });
await mobile.waitForTimeout(80);
const stacked = await mobile.evaluate(() => {
  const cameraCard = document.querySelector('.vision-camera-card-v11')?.getBoundingClientRect();
  const threeCard = document.querySelector('.vision-3d-card-v11')?.getBoundingClientRect();
  const threeStage = document.querySelector('[data-vision-3d]')?.getBoundingClientRect();
  const box = rect => rect ? ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }) : null;
  return { cameraCard: box(cameraCard), threeCard: box(threeCard), threeStage: box(threeStage), scrollWidth: document.documentElement.scrollWidth, innerWidth };
});
expect(stacked.cameraCard && stacked.threeCard && stacked.threeStage, `Vision stacked diagnostic surfaces must be measurable: ${JSON.stringify(stacked)}`);
expect(stacked.cameraCard.top < stacked.threeCard.top, `Vision mobile must stack camera above diagnostic 3D: ${JSON.stringify(stacked)}`);
expect(Math.abs(stacked.cameraCard.left - stacked.threeCard.left) <= 2 && Math.abs(stacked.cameraCard.width - stacked.threeCard.width) <= 2, `Vision stacked cards must align: ${JSON.stringify(stacked)}`);
expect(stacked.threeCard.top - stacked.cameraCard.bottom <= 10, `Vision stacked cards should remain tightly grouped: ${JSON.stringify(stacked)}`);
expect(stacked.scrollWidth <= stacked.innerWidth + 1, `Vision stacked mobile overflow: ${JSON.stringify(stacked)}`);
await mobile.screenshot({ path: '.artifacts/design-journal/vision-mobile-diagnostic.png', fullPage: true });
await mobileContext.close();

const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.goto(`${baseURL}/#/lab/vision`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-vision-lab]', { timeout: 12000 });

const preflight = await page.evaluate(async ({ MOD, WASM, GESTURE_MODEL, FACE_MODEL, REAL_FACE_IMAGE }) => {
  const vision = await import(MOD);
  const fileset = await vision.FilesetResolver.forVisionTasks(WASM);
  let hand = null;
  let face = null;
  try {
    hand = await vision.GestureRecognizer.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: GESTURE_MODEL },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    face = await vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.55,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true
    });

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#eee';
    ctx.fillRect(32, 24, 32, 48);

    const t0 = performance.now();
    const handResult = hand.recognizeForVideo(canvas, t0);
    const faceResult = face.detectForVideo(canvas, t0 + 1);

    const response = await fetch(REAL_FACE_IMAGE, { cache: 'no-store' });
    if (!response.ok) throw new Error(`real-person portrait download failed: ${response.status}`);
    const bitmap = await createImageBitmap(await response.blob());
    const maxEdge = 640;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const humanCanvas = document.createElement('canvas');
    humanCanvas.width = Math.max(1, Math.round(bitmap.width * scale));
    humanCanvas.height = Math.max(1, Math.round(bitmap.height * scale));
    humanCanvas.getContext('2d').drawImage(bitmap, 0, 0, humanCanvas.width, humanCanvas.height);
    const humanFaceResult = face.detectForVideo(humanCanvas, t0 + 2);
    bitmap.close?.();

    return {
      gestureRecognizer: !!hand,
      faceLandmarker: !!face,
      handResultShape: Array.isArray(handResult?.landmarks) && Array.isArray(handResult?.worldLandmarks) && Array.isArray(handResult?.gestures),
      faceResultShape: Array.isArray(faceResult?.faceLandmarks) && Array.isArray(faceResult?.faceBlendshapes),
      syntheticHands: handResult?.landmarks?.length ?? -1,
      syntheticFaces: faceResult?.faceLandmarks?.length ?? -1,
      realHumanFaces: humanFaceResult?.faceLandmarks?.length ?? -1,
      realHumanFacePoints: humanFaceResult?.faceLandmarks?.[0]?.length ?? 0,
      realHumanBlendshapeSets: humanFaceResult?.faceBlendshapes?.length ?? 0,
      realHumanMatrices: humanFaceResult?.facialTransformationMatrixes?.length ?? 0,
      realHumanFixture: REAL_FACE_IMAGE,
      tessellationEdges: vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION?.length ?? 0
    };
  } finally {
    try { hand?.close?.(); } catch {}
    try { face?.close?.(); } catch {}
  }
}, { MOD, WASM, GESTURE_MODEL, FACE_MODEL, REAL_FACE_IMAGE });

expect(preflight.gestureRecognizer, `GestureRecognizer did not initialize: ${JSON.stringify(preflight)}`);
expect(preflight.faceLandmarker, `FaceLandmarker did not initialize: ${JSON.stringify(preflight)}`);
expect(preflight.handResultShape, `GestureRecognizer VIDEO inference result contract drift: ${JSON.stringify(preflight)}`);
expect(preflight.faceResultShape, `FaceLandmarker VIDEO inference result contract drift: ${JSON.stringify(preflight)}`);
expect(preflight.realHumanFaces > 0, `FaceLandmarker failed to detect the real-person fixture: ${JSON.stringify(preflight)}`);
expect(preflight.realHumanFacePoints > 400, `Real-person face landmark count is unexpectedly low: ${JSON.stringify(preflight)}`);
expect(preflight.realHumanBlendshapeSets > 0, `Real-person face should produce blendshapes: ${JSON.stringify(preflight)}`);
expect(preflight.realHumanMatrices > 0, `Real-person face should produce a transformation matrix: ${JSON.stringify(preflight)}`);
expect(preflight.tessellationEdges > 1000, `MediaPipe face tessellation topology is unavailable: ${JSON.stringify(preflight)}`);
const productSource = await page.evaluate(() => fetch('./journal-v11-vision.js', { cache: 'no-store' }).then(r => r.text()));
expect(productSource.includes('FACE_LANDMARKS_TESSELATION'), 'Vision product overlay must use MediaPipe face tessellation');
expect(productSource.includes('function framePoint('), 'Vision product overlay must include object-fit/mirror projection correction');
expect(pageErrors.length === 0, `Vision model preflight page errors: ${pageErrors.join(' | ')}`);

const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => entry.name));
expect(resources.some(url => url.includes('@mediapipe/tasks-vision') || url.includes('vision_bundle')), `MediaPipe runtime was not fetched: ${resources.join(', ')}`);
expect(resources.some(url => url.includes('gesture_recognizer.task')), `Gesture model was not fetched: ${resources.join(', ')}`);
expect(resources.some(url => url.includes('face_landmarker.task')), `Face model was not fetched: ${resources.join(', ')}`);
expect(resources.some(url => /wasm/i.test(url) && /mediapipe|tasks-vision|jsdelivr/i.test(url)), `MediaPipe WASM was not fetched: ${resources.join(', ')}`);
expect(resources.some(url => url.includes('mediapipe-assets/portrait.jpg')), `Real-person portrait fixture was not fetched: ${resources.join(', ')}`);

await context.close();
await browser.close();
console.log(`Vision MediaPipe real-human + VIDEO inference preflight ok: ${JSON.stringify(preflight)}`);
