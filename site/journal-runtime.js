/* Journal runtime: one render lifecycle signal for progressive enhancement layers. */
(() => {
  const app = document.querySelector('#app');
  if (!app) return;

  let raf = 0;
  let revision = 0;
  let renderBarrier = 0;
  let barrierDirty = false;
  const systemDark = matchMedia('(prefers-color-scheme: dark)');
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const currentRoute = () => (location.hash.slice(1) || '/').split('?')[0];

  const syncThemeColor = () => {
    if (!themeMeta) return;
    const explicit = document.documentElement.dataset.theme;
    const dark = explicit === 'dark' || (!explicit && systemDark.matches);
    themeMeta.setAttribute('content', dark ? '#0b0c0e' : '#f3f1eb');
  };

  const syncNavigation = route => {
    document.querySelectorAll('[data-nav]').forEach(link => link.removeAttribute('aria-current'));
    const key = route === '/' ? 'home' : route === '/lab/vision' ? 'vision' : route === '/lab' ? 'lab' : '';
    if (key) document.querySelector(`[data-nav="${key}"]`)?.setAttribute('aria-current', 'page');
  };

  const syncTitle = route => {
    const heading = app.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim();
    if (route === '/') document.title = 'HJ — Design Journal';
    else if (route === '/lab/vision') document.title = `${heading || 'Vision Lab'} — HJ`;
    else if (route === '/lab') document.title = `${heading || 'Glass Lab'} — HJ`;
    else if (route.startsWith('/post/')) document.title = `${heading || 'Journal'} — HJ`;
    else document.title = 'Not found — HJ';
  };

  const syncDynamicA11y = () => {
    app.querySelectorAll('textarea[data-editor]').forEach(editor => {
      const kind = String(editor.dataset.editor || 'code').toUpperCase();
      if (!editor.getAttribute('aria-label')) editor.setAttribute('aria-label', `${kind} code editor`);
    });

    const configOutput = app.querySelector('#refConfigOutput');
    if (configOutput) {
      configOutput.tabIndex = 0;
      const label = configOutput.closest('.ref-config')?.querySelector('span')?.textContent?.trim();
      configOutput.setAttribute('aria-label', label || 'Current shader config');
    }
  };

  const syncDocumentChrome = route => {
    syncNavigation(route);
    syncTitle(route);
    syncThemeColor();
    syncDynamicA11y();
  };

  const emit = () => {
    raf = 0;
    if (renderBarrier > 0) {
      barrierDirty = true;
      return;
    }
    revision += 1;
    const route = currentRoute();
    syncDocumentChrome(route);
    document.dispatchEvent(new CustomEvent('hj:rendered', {
      detail: { route, revision }
    }));
  };

  const schedule = () => {
    if (renderBarrier > 0) {
      barrierDirty = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      return;
    }
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(emit);
  };

  const beginRenderBatch = () => {
    renderBarrier += 1;
    barrierDirty = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const endRenderBatch = () => {
    if (renderBarrier <= 0) return;
    renderBarrier -= 1;
    if (renderBarrier > 0) return;
    const shouldEmit = barrierDirty;
    barrierDirty = false;
    if (shouldEmit) schedule();
  };

  const observer = new MutationObserver(schedule);
  observer.observe(app, { childList: true, subtree: false });

  const themeObserver = new MutationObserver(syncThemeColor);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  systemDark.addEventListener?.('change', () => {
    if (!document.documentElement.dataset.theme) syncThemeColor();
  });

  // Deferred scripts finish in one task; emit on the next frame so later
  // enhancement layers have registered their listeners before first sync.
  queueMicrotask(schedule);

  window.HJRuntime = Object.freeze({
    schedule,
    route: currentRoute,
    syncDocumentChrome,
    beginRenderBatch,
    endRenderBatch
  });
})();