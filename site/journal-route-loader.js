/* Route-aware runtime loader: keep article/lab JavaScript and CSS off unrelated routes. */
(() => {
  const loadedScripts = new Map();
  const loadedStyles = new Map();
  let manifestPromise = null;
  let requestRevision = 0;
  const fullEditorialRoutes = new Set(['/lab', '/post/glass', '/post/sloar', '/post/motion']);

  const route = () => (location.hash.slice(1) || '/').split('?')[0];
  const assetUrl = rel => new URL(`./${rel}`, document.baseURI).href;

  function manifest() {
    if (!manifestPromise) {
      manifestPromise = fetch('./runtime-manifest.json', { cache: 'no-cache' }).then(response => {
        if (!response.ok) throw new Error(`runtime manifest ${response.status}`);
        return response.json();
      });
    }
    return manifestPromise;
  }

  function loadStyle(rel) {
    const url = assetUrl(rel);
    const existing = [...document.styleSheets].some(sheet => sheet.href === url)
      || [...document.querySelectorAll('link[rel="stylesheet"]')].some(node => node.href === url);
    if (existing) return Promise.resolve();
    if (loadedStyles.has(url)) return loadedStyles.get(url);
    const promise = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.dataset.hjRouteStyle = rel;
      link.addEventListener('load', resolve, { once: true });
      link.addEventListener('error', () => reject(new Error(`failed to load ${rel}`)), { once: true });
      document.head.append(link);
    });
    loadedStyles.set(url, promise);
    return promise;
  }

  function loadScript(rel) {
    const url = assetUrl(rel);
    if ([...document.scripts].some(node => node.src === url)) return Promise.resolve();
    if (loadedScripts.has(url)) return loadedScripts.get(url);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.dataset.hjRouteAsset = rel;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error(`failed to load ${rel}`)), { once: true });
      document.body.append(script);
    });
    loadedScripts.set(url, promise);
    return promise;
  }

  async function syncRoute() {
    const revision = ++requestRevision;
    const current = route();
    if (current === '/') {
      document.documentElement.dataset.runtimeRoute = 'core';
      return;
    }
    const runtime = window.HJRuntime;
    runtime?.beginRenderBatch?.();
    document.documentElement.dataset.runtimeRoute = 'loading';
    try {
      const config = await manifest();
      // Exact matching keeps /lab/vision independent from the heavy /lab WebGL stack.
      const groups = (config.routes || []).filter(group => (group.paths || []).includes(current));
      for (const group of groups) {
        for (const style of group.styles || []) await loadStyle(style);
        for (const script of group.scripts || []) await loadScript(script);
      }
      if (revision !== requestRevision || current !== route()) return;
      if (fullEditorialRoutes.has(current) && typeof render === 'function') render();
      document.documentElement.dataset.runtimeRoute = groups.map(group => group.id).join(' ') || 'core';
    } catch (error) {
      if (revision !== requestRevision) return;
      document.documentElement.dataset.runtimeRoute = 'error';
      console.error('[HJ runtime loader]', error);
    } finally {
      runtime?.endRenderBatch?.();
      window.HJRuntime?.schedule?.();
    }
  }
  addEventListener('hashchange', syncRoute);
  queueMicrotask(syncRoute);
})();