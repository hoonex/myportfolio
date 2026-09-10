/* Journal v15: keep custom Glass Lab physics synchronized with LiquidGlass' real render cache. */
(() => {
  let raf = 0;
  let glass = null;
  let lastSignature = '';
  let epoch = 0;

  const round = (v, p = 1000) => Math.round((Number(v) || 0) * p) / p;

  function routeActive() {
    return location.hash.startsWith('#/lab') && !location.hash.startsWith('#/lab/vision');
  }

  function parseConfig(el) {
    try { return JSON.parse(el.dataset.config || '{}') || {}; }
    catch { return {}; }
  }

  function invalidate(el) {
    const config = parseConfig(el);
    config.floating = false;
    config.__hjRenderEpoch = ++epoch;
    el.dataset.config = JSON.stringify(config);
  }

  function signature(el) {
    const body = el.__fluidPhysics;
    const dent = globalThis.__HJGlassDentState || {};
    if (!body) return 'waiting';
    return [
      round(body.x), round(body.y), round(body.impact),
      round(dent.u), round(dent.v), round(dent.depth),
      round(dent.radius), round(dent.axisX), round(dent.axisY),
      body.pointer ? 1 : 0,
      body.gravity ? 1 : 0,
      body.grounded ? 1 : 0,
      body.raf ? 1 : 0
    ].join('|');
  }

  function frame() {
    raf = 0;
    if (!routeActive()) {
      glass = null;
      lastSignature = '';
      return;
    }

    const current = document.querySelector('#realLiquidGlass');
    if (!current) {
      raf = requestAnimationFrame(frame);
      return;
    }

    if (current !== glass) {
      glass = current;
      lastSignature = '';
      invalidate(glass);
    }

    const body = glass.__fluidPhysics;
    const dent = globalThis.__HJGlassDentState;

    // Recovery guard: a stopped physics loop must never leave a pressed shader frozen.
    if (body && dent && !body.pointer && !body.raf && Math.abs(Number(dent.depth) || 0) > 0.001) {
      body.dent = 0;
      body.dentVel = 0;
      body.dentTarget = 0;
      dent.depth = 0;
    }

    const nextSignature = signature(glass);
    if (nextSignature !== lastSignature) {
      lastSignature = nextSignature;
      invalidate(glass);
    }

    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf) cancelAnimationFrame(raf);
    glass = null;
    lastSignature = '';
    if (routeActive()) raf = requestAnimationFrame(frame);
  }

  document.addEventListener('hj:rendered', start);
  addEventListener('hashchange', start);
  queueMicrotask(start);
})();
