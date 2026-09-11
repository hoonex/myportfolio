/* Route-aware runtime loader: keep article/lab JavaScript and CSS off unrelated routes. */
(() => {
  const loadedScripts = new Map();
  const loadedStyles = new Map();
  let manifestPromise = null;
  let requestRevision = 0;
  const fullEditorialRoutes = new Set(['/lab', '/post/glass', '/post/sloar', '/post/motion']);

  const route = () => (location.hash.slice(1) || '/').split('?')[0];
  const DEPLOY_REV = 'SITE31-VISION13_3-20260911-1712';
  const assetUrl = rel => {
    const url = new URL(`./${rel}`, document.baseURI);
    url.searchParams.set('v', DEPLOY_REV);
    return url.href;
  };

  function manifest() {
    if (!manifestPromise) {
      manifestPromise = fetch(`./runtime-manifest.json?v=${encodeURIComponent(DEPLOY_REV)}`, { cache: 'no-store' }).then(response => {
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

  function finishLabBoot() {
    window.__HJGlassLabReady = true;
    requestAnimationFrame(() => {
      if (route() === '/lab') document.documentElement.classList.remove('hj-lab-booting');
    });
  }

  async function syncRoute() {
    const revision = ++requestRevision;
    const current = route();
    if (current === '/') {
      document.documentElement.dataset.runtimeRoute = 'core';
      return;
    }
    if (current === '/lab' && !window.__HJGlassLabReady) {
      document.documentElement.classList.add('hj-lab-booting');
    }
    const runtime = window.HJRuntime;
    runtime?.beginRenderBatch?.();
    document.documentElement.dataset.runtimeRoute = 'loading';
    try {
      const config = await manifest();
      const groups = (config.routes || []).filter(group => (group.paths || []).includes(current));
      for (const group of groups) {
        for (const style of group.styles || []) await loadStyle(style);
        for (const script of group.scripts || []) await loadScript(script);
      }
      if (revision !== requestRevision || current !== route()) return;
      if (current === '/lab') window.__HJGlassLabReady = true;
      if (fullEditorialRoutes.has(current) && typeof render === 'function') render();
      document.documentElement.dataset.runtimeRoute = groups.map(group => group.id).join(' ') || 'core';
      if (current === '/lab') finishLabBoot();
    } catch (error) {
      if (revision !== requestRevision) return;
      document.documentElement.dataset.runtimeRoute = 'error';
      if (current === '/lab') document.documentElement.classList.remove('hj-lab-booting');
      console.error('[HJ runtime loader]', error);
    } finally {
      runtime?.endRenderBatch?.();
      window.HJRuntime?.schedule?.();
    }
  }
  addEventListener('hashchange', syncRoute);
  queueMicrotask(syncRoute);
})();
