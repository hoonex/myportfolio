/* Journal v16: configurable, position-aware press growth for Glass Lab. */
(() => {
  const DEFAULT_GROWTH = 0.075;
  const MAX_GROWTH = 0.12;
  const KEY = 'hj-fluid-press-growth';
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let growth = DEFAULT_GROWTH;
  let raf = 0;
  let glass = null;
  let patchedApi = null;
  let lastScale = '';

  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) {
      const saved = Number(raw);
      if (Number.isFinite(saved)) growth = clamp(saved, 0, MAX_GROWTH);
    }
  } catch {}

  const active = () => location.hash.startsWith('#/lab') && !location.hash.startsWith('#/lab/vision');
  const language = () => {
    const l = document.documentElement.lang || 'ko';
    return l.startsWith('ja') ? 'ja' : l.startsWith('en') ? 'en' : 'ko';
  };
  const labels = {
    ko: ['눌림 팽창', '누를 때 유리 전체가 부풀어 오르는 정도'],
    en: ['Press growth', 'How much the whole glass expands while pressed'],
    ja: ['押し込み膨張', '押している間にガラス全体が膨らむ量']
  };

  function save() {
    try { localStorage.setItem(KEY, String(growth)); } catch {}
  }

  function syncControl() {
    const panel = document.querySelector('.fluid-physics-panel');
    if (!panel) return false;
    let control = panel.querySelector('[data-fluid-press-growth]');
    const [title, desc] = labels[language()];
    if (!control) {
      control = document.createElement('label');
      control.className = 'fluid-growth-control';
      control.setAttribute('data-fluid-press-growth', '');
      control.innerHTML = `<span class="fluid-growth-copy"><b>${title}</b><small>${desc}</small></span><span class="fluid-growth-input"><input type="range" min="0" max="12" step="0.5" aria-label="${title}"><output></output></span>`;
      const status = panel.querySelector('[data-fluid-status]');
      (status?.parentElement || panel).insertBefore(control, status || null);
      control.querySelector('input').addEventListener('input', e => {
        growth = clamp(Number(e.currentTarget.value) / 100, 0, MAX_GROWTH);
        save();
        syncControl();
      });
    }
    const input = control.querySelector('input');
    const output = control.querySelector('output');
    if (input && document.activeElement !== input) input.value = String(Math.round(growth * 200) / 2);
    if (output) output.textContent = `${(growth * 100).toFixed((growth * 100) % 1 ? 1 : 0)}%`;
    const b = control.querySelector('b'), small = control.querySelector('small');
    if (b) b.textContent = title;
    if (small) small.textContent = desc;
    return true;
  }

  function patchApi() {
    const api = globalThis.HJFluidLab;
    if (!api || api === patchedApi) return;
    patchedApi = api;
    api.getPressGrowth = () => growth;
    api.setPressGrowth = value => {
      growth = clamp(Number(value) || 0, 0, MAX_GROWTH);
      save();
      syncControl();
      return growth;
    };
    if (!api.__pressGrowthResetWrapped && typeof api.reset === 'function') {
      const originalReset = api.reset.bind(api);
      api.reset = (...args) => {
        growth = DEFAULT_GROWTH;
        save();
        syncControl();
        return originalReset(...args);
      };
      Object.defineProperty(api, '__pressGrowthResetWrapped', { value:true });
    }
  }

  function applyScale(el) {
    const body = el.__fluidPhysics;
    if (!body || reduce.matches) {
      const sig = '1|1';
      if (sig !== lastScale) {
        lastScale = sig;
        el.style.setProperty('--hj-fluid-scale-x', '1');
        el.style.setProperty('--hj-fluid-scale-y', '1');
      }
      return;
    }
    const press = clamp(Number(body.dent) || 0, 0, 1.15);
    const impact = clamp(Number(body.impact) || 0, 0, 1);
    const xSupport = clamp(((Number(body.axisX) || .62) - .62) / .38, 0, 1);
    const ySupport = clamp(((Number(body.axisY) || .62) - .62) / .38, 0, 1);
    const centerSupport = Math.sqrt(xSupport * ySupport);
    const locationWeight = .72 + .28 * centerSupport;
    const grow = press * growth * locationWeight;
    const sx = 1 + impact * .045 + grow;
    const sy = 1 - impact * .032 + grow * .88;
    const sig = `${sx.toFixed(4)}|${sy.toFixed(4)}`;
    if (sig === lastScale) return;
    lastScale = sig;
    el.style.setProperty('--hj-fluid-scale-x', sx.toFixed(4));
    el.style.setProperty('--hj-fluid-scale-y', sy.toFixed(4));
  }

  function frame() {
    raf = 0;
    if (!active()) {
      glass?.classList.remove('fluid-press-growth-enabled');
      glass = null;
      patchedApi = null;
      lastScale = '';
      return;
    }
    const current = document.querySelector('#realLiquidGlass');
    if (current !== glass) {
      glass?.classList.remove('fluid-press-growth-enabled');
      glass = current;
      lastScale = '';
      if (glass) glass.classList.add('fluid-press-growth-enabled');
    }
    patchApi();
    syncControl();
    if (glass) applyScale(glass);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf) cancelAnimationFrame(raf);
    if (active()) raf = requestAnimationFrame(frame);
  }

  reduce.addEventListener?.('change', () => { lastScale=''; });
  document.addEventListener('hj:rendered', start);
  addEventListener('hashchange', start);
  queueMicrotask(start);
})();
