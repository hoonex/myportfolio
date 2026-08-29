/* Route-aware runtime loader: keep article-only JavaScript off the index path. */
(() => {
  const loaded = new Map();
  let manifestPromise = null;
  let requestRevision = 0;

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

  function loadScript(rel) {
    const url = assetUrl(rel);
    if ([...document.scripts].some(node => node.src === url)) return Promise.resolve();
    if (loaded.has(url)) return loaded.get(url);

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = false;
      script.dataset.hjRouteAsset = rel;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error(`failed to load ${rel}`)), { once: true });
      document.body.append(script);
    });
    loaded.set(url, promise);
    return promise;
  }

  async function syncRoute() {
    const revision = ++requestRevision;
    const current = route();
    if (current === '/') {
      document.documentElement.dataset.runtimeRoute = 'core';
      return;
    }

    try {
      const config = await manifest();
      const groups = (config.routes || []).filter(group =>
        (group.paths || []).some(path => current === path || current.startsWith(`${path}/`))
      );

      for (const group of groups) {
        for (const script of group.scripts || []) await loadScript(script);
      }

      if (revision !== requestRevision || current !== route()) return;
      document.documentElement.dataset.runtimeRoute = groups.map(group => group.id).join(' ') || 'core';
      window.HJRuntime?.schedule?.();
    } catch (error) {
      if (revision !== requestRevision) return;
      document.documentElement.dataset.runtimeRoute = 'error';
      console.error('[HJ runtime loader]', error);
    }
  }

  addEventListener('hashchange', syncRoute);
  queueMicrotask(syncRoute);
})();
