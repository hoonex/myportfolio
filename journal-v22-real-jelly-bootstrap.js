/* Journal v22: resilient Real Jelly installer + clean material surface. */
(() => {
  const activeRoute = () => location.hash.startsWith('#/lab') && !location.hash.startsWith('#/lab/vision');
  const state = globalThis.__HJRealJellyBootV22 = globalThis.__HJRealJellyBootV22 || {
    attempts: 0,
    ready: false,
    lastReason: 'boot'
  };

  let observer = null;
  let timer = 0;
  let raf = 0;

  function removeInternalCopy() {
    const glass = document.querySelector('#realLiquidGlass');
    if (!glass) return null;
    glass.querySelectorAll(':scope > .glass-content').forEach(node => node.remove());
    glass.setAttribute('aria-label', 'Interactive LiquidGlass jelly');
    return glass;
  }

  function stopPolling() {
    if (timer) clearTimeout(timer);
    timer = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function verify(reason = 'verify') {
    if (!activeRoute()) {
      state.ready = false;
      state.lastReason = 'inactive-route';
      stopPolling();
      return;
    }

    const glass = removeInternalCopy();
    const panel = document.querySelector('.fluid-physics-panel');
    const api = globalThis.HJFluidLab;

    if (glass?.dataset.realJellyV21Ready === '1') {
      state.ready = true;
      state.lastReason = 'installed';
      document.documentElement.dataset.realJellyRuntime = 'ready';
      stopPolling();
      return;
    }

    state.ready = false;
    state.lastReason = reason;
    document.documentElement.dataset.realJellyRuntime = 'waiting';

    if (glass && panel && api) {
      state.attempts += 1;
      // v21 listens for hj:rendered. Re-emit only after all of its prerequisites exist.
      document.dispatchEvent(new CustomEvent('hj:rendered', {
        detail: { source: 'real-jelly-v22-bootstrap', attempt: state.attempts }
      }));
    }

    if (state.attempts < 24) {
      timer = setTimeout(() => {
        raf = requestAnimationFrame(() => verify('retry'));
      }, state.attempts < 6 ? 34 : 90);
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
      if (activeRoute() && !state.ready) verify('mutation');
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function boot() {
    stopPolling();
    state.attempts = 0;
    state.ready = false;
    state.lastReason = 'boot';
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
