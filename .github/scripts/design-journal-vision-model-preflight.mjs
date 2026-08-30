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
const geometry = await mobile.evaluate(() => {
  const startRect = document.querySelector('[data-start]')?.getBoundingClientRect();
  const cameraCard = document.querySelector('.vision-camera-card-v11')?.getBoundingClientRect();
  const threeCard = document.querySelector('.vision-3d-card-v11')?.getBoundingClientRect();
  const cameraStage = document.querySelector('.vision-stage-v11')?.getBoundingClientRect();
  const threeStage = document.querySelector('[data-vision-3d]')?.getBoundingClientRect();
  const box = rect => rect ? ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }) : null;
  return {
    innerWidth,
    innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    title: document.title,
    current: document.querySelector('[data-nav="vision"]')?.getAttribute('aria-current') || '',
    startVisible: !!document.querySelector('[data-start]')?.getClientRects().length,
    startInViewport: !!startRect && startRect.top >= 0 && startRect.bottom <= innerHeight,
    cameraCard: box(cameraCard),
    threeCard: box(threeCard),
    cameraStage: box(cameraStage),
    threeStage: box(threeStage),
    touchTargets: [...document.querySelectorAll('.vision-command-v11 button,.vision-toggle-v11 span')].map(node => {
      const rect = node.getBoundingClientRect();
      return { label: node.textContent?.trim() || '', width: rect.width, height: rect.height };
    })
  };
});
expect(geometry.scrollWidth <= geometry.innerWidth + 1, `Vision mobile horizontal overflow: ${JSON.stringify(geometry)}`);
expect(geometry.title === 'Vision Lab. — HJ', `Vision mobile title drift: ${geometry.title}`);
expect(geometry.current === 'page', `Vision mobile nav aria-current drift: ${geometry.current}`);
expect(geometry.startVisible, 'Vision mobile Start camera action is not visible');
expect(geometry.startInViewport, `Vision mobile Start camera action must remain inside the first 844px viewport: ${JSON.stringify(geometry)}`);
expect(geometry.cameraCard && geometry.threeCard && geometry.cameraStage && geometry.threeStage, `Vision paired surfaces must be measurable: ${JSON.stringify(geometry)}`);
expect(geometry.cameraCard.left < geometry.threeCard.left, `Vision mobile must keep camera left and 3D right: ${JSON.stringify(geometry)}`);
expect(Math.abs(geometry.cameraCard.top - geometry.threeCard.top) <= 2, `Vision paired cards must share a row: ${JSON.stringify(geometry)}`);
expect(Math.abs(geometry.cameraCard.width - geometry.threeCard.width) <= 2, `Vision paired cards must share equal width: ${JSON.stringify(geometry)}`);
const portraitRatio = 4 / 3;
expect(Math.abs(geometry.cameraStage.height / geometry.cameraStage.width - portraitRatio) < 0.035, `Vision camera stage must be 3:4 portrait: ${JSON.stringify(geometry.cameraStage)}`);
expect(Math.abs(geometry.threeStage.height / geometry.threeStage.width - portraitRatio) < 0.035, `Vision 3D stage must be 3:4 portrait: ${JSON.stringify(geometry.threeStage)}`);
const undersized = geometry.touchTargets.filter(({ width, height }) => width < 44 || height < 44);
expect(undersized.length === 0, `Vision mobile command touch targets must be at least 44x44 CSS px: ${JSON.stringify(undersized)}`);
await mkdir('.artifacts/design-journal', { recursive: true });
await mobile.screenshot({ path: '.artifacts/design-journal/vision-mobile.png', fullPage: true });
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
      realHumanFixture: REAL_FACE_IMAGE
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
