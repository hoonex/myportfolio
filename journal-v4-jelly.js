/* Journal v4: preferred optical defaults + jelly press/drag dynamics. */
(() => {
  const OPTICAL_DEFAULTS = Object.freeze({
    refraction: 1.60,
    blurAmount: 0.00,
    chromAberration: 0.180,
    specular: 0.00,
    fresnel: 0.00,
    edgeHighlight: 0.00,
    zRadius: 50,
    cornerRadius: 80,
    saturation: 0.02,
    brightness: 0.02
  });

  const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)');
  let queued = false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function applyPreferredDefaults() {
    const trigger = document.querySelector('#ref-refraction');
    if (!trigger) return;

    for (const [id, value] of Object.entries(OPTICAL_DEFAULTS)) {
      const input = document.querySelector(`#ref-${id}`);
      if (input) input.value = String(value);
    }

    // v3's input handler reads every control, updates data-config, labels,
    // the code snippet and marks the WebGL renderer dirty in one pass.
    trigger.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function installResetOverride(glass) {
    const reset = document.querySelector('#refReset');
    if (!reset || reset.dataset.jellyResetReady) return;
    reset.dataset.jellyResetReady = '1';

    reset.addEventListener('click', (event) => {
      // Run before the older reset handler so its old defaults never win.
      event.stopImmediatePropagation();
      applyPreferredDefaults();
      resetJelly(glass, true);
    }, { capture: true });
  }

  function installJelly(glass) {
    if (glass.dataset.jellyReady) return;
    glass.dataset.jellyReady = '1';
    glass.classList.add('jelly-enabled');

    const state = {
      active: false,
      pointerId: null,
      lastX: 0,
      lastY: 0,
      lastTime: 0,
      pointerVx: 0,
      pointerVy: 0,
      sx: 1,
      sy: 1,
      rot: 0,
      lagX: 0,
      lagY: 0,
      vsx: 0,
      vsy: 0,
      vrot: 0,
      vlagX: 0,
      vlagY: 0,
      targetSx: 1,
      targetSy: 1,
      targetRot: 0,
      targetLagX: 0,
      targetLagY: 0,
      raf: 0,
      lastFrame: 0
    };

    glass.__jellyState = state;

    const spring = (value, velocity, target, stiffness, damping, dt) => {
      const acceleration = (target - value) * stiffness;
      velocity += acceleration * dt;
      velocity *= Math.exp(-damping * dt);
      value += velocity * dt;
      return [value, velocity];
    };

    const renderFrame = () => {
      glass.style.setProperty('scale', `${state.sx.toFixed(4)} ${state.sy.toFixed(4)}`);
      glass.style.setProperty('rotate', `${state.rot.toFixed(3)}deg`);
      glass.style.setProperty('--jelly-lag-x', `${state.lagX.toFixed(2)}px`);
      glass.style.setProperty('--jelly-lag-y', `${state.lagY.toFixed(2)}px`);
    };

    const tick = (time) => {
      state.raf = 0;
      if (!document.contains(glass)) return;

      const dt = state.lastFrame ? clamp((time - state.lastFrame) / 1000, 0.001, 0.032) : 1 / 60;
      state.lastFrame = time;

      [state.sx, state.vsx] = spring(state.sx, state.vsx, state.targetSx, 265, 16.5, dt);
      [state.sy, state.vsy] = spring(state.sy, state.vsy, state.targetSy, 265, 16.5, dt);
      [state.rot, state.vrot] = spring(state.rot, state.vrot, state.targetRot, 225, 17.5, dt);
      [state.lagX, state.vlagX] = spring(state.lagX, state.vlagX, state.targetLagX, 310, 18.5, dt);
      [state.lagY, state.vlagY] = spring(state.lagY, state.vlagY, state.targetLagY, 310, 18.5, dt);

      state.sx = clamp(state.sx, 0.88, 1.28);
      state.sy = clamp(state.sy, 0.88, 1.28);
      state.rot = clamp(state.rot, -8.5, 8.5);
      renderFrame();

      const settled = !state.active &&
        Math.abs(state.sx - 1) < 0.001 && Math.abs(state.sy - 1) < 0.001 &&
        Math.abs(state.rot) < 0.03 && Math.abs(state.lagX) < 0.08 && Math.abs(state.lagY) < 0.08 &&
        Math.abs(state.vsx) < 0.008 && Math.abs(state.vsy) < 0.008 && Math.abs(state.vrot) < 0.08;

      if (settled) {
        state.sx = state.sy = 1;
        state.rot = state.lagX = state.lagY = 0;
        state.vsx = state.vsy = state.vrot = state.vlagX = state.vlagY = 0;
        state.lastFrame = 0;
        glass.style.setProperty('scale', '1 1');
        glass.style.setProperty('rotate', '0deg');
        glass.style.setProperty('--jelly-lag-x', '0px');
        glass.style.setProperty('--jelly-lag-y', '0px');
        glass.style.transformOrigin = '50% 50%';
        glass.classList.remove('is-jelly-moving');
        return;
      }

      state.raf = requestAnimationFrame(tick);
    };

    const startSpring = () => {
      if (REDUCED_MOTION.matches || state.raf) return;
      state.lastFrame = 0;
      state.raf = requestAnimationFrame(tick);
    };

    const onPointerDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      state.active = true;
      state.pointerId = event.pointerId;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.lastTime = performance.now();
      state.pointerVx = state.pointerVy = 0;

      const rect = glass.getBoundingClientRect();
      const ox = clamp((event.clientX - rect.left) / Math.max(rect.width, 1), 0, 1) * 100;
      const oy = clamp((event.clientY - rect.top) / Math.max(rect.height, 1), 0, 1) * 100;
      glass.style.transformOrigin = `${ox.toFixed(1)}% ${oy.toFixed(1)}%`;
      glass.classList.add('is-jelly-pressed', 'is-jelly-moving');

      if (REDUCED_MOTION.matches) return;
      state.targetSx = 1.085;
      state.targetSy = 1.085;
      state.targetRot = 0;
      startSpring();
    };

    const onPointerMove = (event) => {
      if (!state.active || event.pointerId !== state.pointerId || REDUCED_MOTION.matches) return;
      const now = performance.now();
      const dt = Math.max(8, now - state.lastTime);
      const rawVx = (event.clientX - state.lastX) / dt * 1000;
      const rawVy = (event.clientY - state.lastY) / dt * 1000;
      state.pointerVx = state.pointerVx * 0.58 + rawVx * 0.42;
      state.pointerVy = state.pointerVy * 0.58 + rawVy * 0.42;
      state.lastX = event.clientX;
      state.lastY = event.clientY;
      state.lastTime = now;

      const xStretch = clamp(Math.abs(state.pointerVx) / 5200, 0, 0.16);
      const yStretch = clamp(Math.abs(state.pointerVy) / 5200, 0, 0.16);
      const xSquash = clamp(Math.abs(state.pointerVy) / 9000, 0, 0.055);
      const ySquash = clamp(Math.abs(state.pointerVx) / 9000, 0, 0.055);

      state.targetSx = 1.085 + xStretch - xSquash;
      state.targetSy = 1.085 + yStretch - ySquash;
      state.targetRot = clamp(state.pointerVx / 260, -6.5, 6.5);
      state.targetLagX = clamp(-state.pointerVx * 0.0065, -10, 10);
      state.targetLagY = clamp(-state.pointerVy * 0.0065, -10, 10);
      startSpring();
    };

    const release = (event) => {
      if (!state.active || (event?.pointerId !== undefined && event.pointerId !== state.pointerId)) return;
      state.active = false;
      state.pointerId = null;
      glass.classList.remove('is-jelly-pressed');

      if (REDUCED_MOTION.matches) {
        resetJelly(glass, true);
        return;
      }

      // Keep a little release momentum so the return overshoots instead of
      // looking like a CSS ease-out.
      state.vsx += clamp(Math.abs(state.pointerVx) / 4200, 0, 0.34);
      state.vsy += clamp(Math.abs(state.pointerVy) / 4200, 0, 0.34);
      state.vrot += clamp(state.pointerVx / 1450, -0.9, 0.9);
      state.targetSx = 1;
      state.targetSy = 1;
      state.targetRot = 0;
      state.targetLagX = 0;
      state.targetLagY = 0;
      startSpring();
    };

    glass.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', release, { passive: true });
    window.addEventListener('pointercancel', release, { passive: true });
  }

  function resetJelly(glass, immediate = false) {
    const state = glass?.__jellyState;
    if (!glass || !state) return;
    state.active = false;
    state.pointerId = null;
    state.targetSx = state.targetSy = 1;
    state.targetRot = state.targetLagX = state.targetLagY = 0;
    glass.classList.remove('is-jelly-pressed');

    if (immediate) {
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;
      state.sx = state.sy = 1;
      state.rot = state.lagX = state.lagY = 0;
      state.vsx = state.vsy = state.vrot = state.vlagX = state.vlagY = 0;
      glass.style.setProperty('scale', '1 1');
      glass.style.setProperty('rotate', '0deg');
      glass.style.setProperty('--jelly-lag-x', '0px');
      glass.style.setProperty('--jelly-lag-y', '0px');
      glass.style.transformOrigin = '50% 50%';
      glass.classList.remove('is-jelly-moving');
    }
  }

  function enhanceLab() {
    if (!location.hash.startsWith('#/lab')) return;
    const glass = document.querySelector('#realLiquidGlass');
    if (!glass) return;

    const firstInstall = !glass.dataset.jellyReady;
    if (firstInstall) {
      applyPreferredDefaults();
      installJelly(glass);
      installResetOverride(glass);
    }
  }

  function queueEnhance() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      enhanceLab();
    });
  }

  document.addEventListener('hj:rendered', queueEnhance);
  queueMicrotask(queueEnhance);
})();