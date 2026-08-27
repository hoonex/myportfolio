/* Journal runtime: one render lifecycle signal for progressive enhancement layers. */
(() => {
  const app = document.querySelector('#app');
  if (!app) return;

  let raf = 0;
  let revision = 0;

  const currentRoute = () => (location.hash.slice(1) || '/').split('?')[0];

  const emit = () => {
    raf = 0;
    revision += 1;
    document.dispatchEvent(new CustomEvent('hj:rendered', {
      detail: { route: currentRoute(), revision }
    }));
  };

  const schedule = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(emit);
  };

  const observer = new MutationObserver(schedule);
  observer.observe(app, { childList: true, subtree: false });

  // Deferred scripts finish in one task; emit on the next frame so later
  // enhancement layers have registered their listeners before first sync.
  queueMicrotask(schedule);

  window.HJRuntime = Object.freeze({
    schedule,
    route: currentRoute
  });
})();
