/* Journal v22: resilient Real Jelly installer + clean material surface. */
(() => {
  const activeRoute = () => location.hash.startsWith('#/lab') && !location.hash.startsWith('#/lab/vision');
  const state = globalThis.__HJRealJellyBootV22 = globalThis.__HJRealJellyBootV22 || {
    attempts: 0,
    ready: false,
    lastReason: 'boot',
    startedAt: 0
  };

  let observer = null;
  let timer = 0;
  let raf = 0;
  let pending = false;

  function removeInternalCopy() {
    const glass = document.querySelector('#realLiquidGlass');
    if (!glass) return null;
    glass.querySelectorAll(':scope > .glass-content').forEach(node => node.remove());
    glass.setAttribute('aria-label', 'Interactive LiquidGlass jelly');
    return glass;
  }

  function clearScheduled() {
    if (timer) clearTimeout(timer);
    timer = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    pending = false;
  }

  function schedule(reason = 'scheduled', delay = 36) {
    if (!activeRoute() || state.ready || pending) return;
    pending = true;
    timer = setTimeout(() => {
      timer = 0;
      raf = requestAnimationFrame(() => {
        raf = 0;
        pending = false;
        verify(reason);
      });
    }, delay);
  }

  function verify(reason = 'verify') {
    if (!activeRoute()) {
      state.ready = false;
      state.lastReason = 'inactive-route';
      clearScheduled();
      return;
    }

    const glass = removeInternalCopy();
    const panel = document.querySelector('.fluid-physics-panel');
    const api = globalThis.HJFluidLab;

    if (glass?.dataset.realJellyV21Ready === '1') {
      state.ready = true;
      state.lastReason = 'installed';
      document.documentElement.dataset.realJellyRuntime = 'ready';
      clearScheduled();
      return;
    }

    state.ready = false;
    state.lastReason = reason;
    document.documentElement.dataset.realJellyRuntime = 'waiting';

    if (glass && panel && api && state.attempts < 8) {
      state.attempts += 1;
      // v21 listens for hj:rendered. Re-emit only after all of its prerequisites exist.
      document.dispatchEvent(new CustomEvent('hj:rendered', {
        detail: { source: 'real-jelly-v22-bootstrap', attempt: state.attempts }
      }));
    }

    if (performance.now() - state.startedAt < 8000) {
      schedule('retry', glass && panel && api ? 48 : 80);
    } else {
      state.lastReason = 'install-timeout';
      document.documentElement.dataset.realJellyRuntime = 'timeout';
      console.warn('[Real Jelly v22] installer timed out', { glass: !!glass, panel: !!panel, api: !!api });
    }
  }

  function armObserver() {
    observer?.disconnect();
    observer = new MutationObserver(() => {
      removeInternalCopy();
      schedule('mutation', 0);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function boot() {
    clearScheduled();
    state.attempts = 0;
    state.ready = false;
    state.lastReason = 'boot';
    state.startedAt = performance.now();
    removeInternalCopy();
    if (activeRoute()) verify('boot');
  }

  armObserver();
  document.addEventListener('hj:rendered', event => {
    if (event.detail?.source === 'real-jelly-v22-bootstrap') return;
    requestAnimationFrame(boot);
  });
  addEventListener('hashchange', () => requestAnimationFrame(boot));
  queueMicrotask(boot);
})();
