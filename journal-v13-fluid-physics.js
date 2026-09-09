/* Journal v13: center-balanced liquid dynamics, presets, shake response, and optional gravity. */
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

  const PRESETS = Object.freeze({
    original: {
      label: { ko: '현재값', en: 'Current', ja: '現在値' },
      values: OPTICAL_DEFAULTS
    },
    natural: {
      label: { ko: '추천 · Natural', en: 'Recommended · Natural', ja: 'おすすめ · Natural' },
      values: { refraction: 1.32, blurAmount: 0.02, chromAberration: 0.055, specular: 0.18, fresnel: 0.34, edgeHighlight: 0.045, zRadius: 58, cornerRadius: 72, saturation: 0.08, brightness: 0.02 }
    },
    clear: {
      label: { ko: 'Clear Lens', en: 'Clear Lens', ja: 'Clear Lens' },
      values: { refraction: 1.12, blurAmount: 0.00, chromAberration: 0.025, specular: 0.08, fresnel: 0.18, edgeHighlight: 0.025, zRadius: 44, cornerRadius: 68, saturation: 0.02, brightness: 0.00 }
    },
    water: {
      label: { ko: 'Water Drop', en: 'Water Drop', ja: 'Water Drop' },
      values: { refraction: 1.50, blurAmount: 0.01, chromAberration: 0.070, specular: 0.10, fresnel: 0.24, edgeHighlight: 0.035, zRadius: 74, cornerRadius: 80, saturation: 0.12, brightness: 0.03 }
    },
    soft: {
      label: { ko: 'Soft Glass', en: 'Soft Glass', ja: 'Soft Glass' },
      values: { refraction: 0.82, blurAmount: 0.09, chromAberration: 0.025, specular: 0.32, fresnel: 0.60, edgeHighlight: 0.080, zRadius: 36, cornerRadius: 60, saturation: 0.16, brightness: 0.03 }
    },
    prism: {
      label: { ko: 'Prism Edge', en: 'Prism Edge', ja: 'Prism Edge' },
      values: { refraction: 1.45, blurAmount: 0.00, chromAberration: 0.180, specular: 0.12, fresnel: 0.25, edgeHighlight: 0.070, zRadius: 64, cornerRadius: 74, saturation: 0.18, brightness: 0.04 }
    },
    gel: {
      label: { ko: 'Dense Gel', en: 'Dense Gel', ja: 'Dense Gel' },
      values: { refraction: 1.60, blurAmount: 0.02, chromAberration: 0.100, specular: 0.08, fresnel: 0.15, edgeHighlight: 0.030, zRadius: 88, cornerRadius: 80, saturation: -0.02, brightness: 0.01 }
    }
  });

  const COPY = {
    ko: {
      presets: '추천 프리셋', physics: '물리 반응', gravity: '중력', shake: '흔들기', motion: '기기 모션',
      motionOn: '모션 켜짐', motionDenied: '모션 권한 필요', gravityOn: '중력 ON', gravityOff: '중력 OFF'
    },
    en: {
      presets: 'Recommended presets', physics: 'Physics response', gravity: 'Gravity', shake: 'Shake', motion: 'Device motion',
      motionOn: 'Motion on', motionDenied: 'Motion permission needed', gravityOn: 'Gravity ON', gravityOff: 'Gravity OFF'
    },
    ja: {
      presets: 'おすすめプリセット', physics: '物理反応', gravity: '重力', shake: '揺らす', motion: '端末モーション',
      motionOn: 'モーション ON', motionDenied: 'モーション権限が必要', gravityOn: '重力 ON', gravityOff: '重力 OFF'
    }
  };

  const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const signFlip = (a, b) => a !== 0 && b !== 0 && Math.sign(a) !== Math.sign(b);
  let queued = false;
  let cleanupCurrent = null;

  const language = () => {
    const value = document.documentElement.lang || 'ko';
    return value.startsWith('ja') ? 'ja' : value.startsWith('en') ? 'en' : 'ko';
  };
  const t = () => COPY[language()];

  function applyValues(values) {
    const trigger = document.querySelector('#ref-refraction');
    if (!trigger) return;
    for (const [id, value] of Object.entries(values)) {
      const input = document.querySelector(`#ref-${id}`);
      if (input) input.value = String(value);
    }
    trigger.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function applyPreferredDefaults() {
    applyValues(OPTICAL_DEFAULTS);
  }

  function matchingPreset() {
    for (const [name, preset] of Object.entries(PRESETS)) {
      const matches = Object.entries(preset.values).every(([id, value]) => {
        const input = document.querySelector(`#ref-${id}`);
        if (!input) return true;
        const step = Math.max(Number(input.step) || 0.001, 0.001);
        return Math.abs(Number(input.value) - Number(value)) <= step * 0.51;
      });
      if (matches) return name;
    }
    return null;
  }

  function syncPresetButtons(panel) {
    const active = matchingPreset();
    panel?.querySelectorAll('[data-fluid-preset]').forEach(button => {
      const selected = button.dataset.fluidPreset === active;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function createPhysicsPanel(glass, state, controller) {
    const controls = document.querySelector('.refraction-controls');
    const head = controls?.querySelector('.ref-controls-head');
    if (!controls || !head) return null;

    controls.querySelector('.fluid-physics-panel')?.remove();
    const lang = language();
    const copy = t();
    const panel = document.createElement('section');
    panel.className = 'fluid-physics-panel';
    panel.innerHTML = `
      <div class="fluid-panel-group">
        <span class="fluid-panel-label">${copy.presets}</span>
        <div class="fluid-preset-grid">
          ${Object.entries(PRESETS).map(([name, preset]) => `<button type="button" data-fluid-preset="${name}" aria-pressed="false">${preset.label[lang]}</button>`).join('')}
        </div>
      </div>
      <div class="fluid-panel-group fluid-physics-actions">
        <span class="fluid-panel-label">${copy.physics}</span>
        <div class="fluid-action-row">
          <button type="button" data-fluid-gravity aria-pressed="false"><span aria-hidden="true">↓</span>${copy.gravity}</button>
          <button type="button" data-fluid-shake><span aria-hidden="true">≈</span>${copy.shake}</button>
          <button type="button" data-fluid-motion aria-pressed="false"><span aria-hidden="true">◉</span>${copy.motion}</button>
        </div>
        <span class="fluid-physics-status" data-fluid-status>${copy.gravityOff}</span>
      </div>`;

    head.insertAdjacentElement('afterend', panel);

    panel.querySelectorAll('[data-fluid-preset]').forEach(button => {
      button.addEventListener('click', () => {
        const preset = PRESETS[button.dataset.fluidPreset];
        if (!preset) return;
        applyValues(preset.values);
        syncPresetButtons(panel);
      }, { signal: controller.signal });
    });

    document.querySelectorAll('.refraction-controls input[type="range"]').forEach(input => {
      input.addEventListener('input', () => syncPresetButtons(panel), { signal: controller.signal });
    });

    const gravity = panel.querySelector('[data-fluid-gravity]');
    gravity?.addEventListener('click', () => {
      state.gravityEnabled = !state.gravityEnabled;
      gravity.setAttribute('aria-pressed', String(state.gravityEnabled));
      gravity.classList.toggle('is-active', state.gravityEnabled);
      panel.querySelector('[data-fluid-status]').textContent = state.gravityEnabled ? copy.gravityOn : copy.gravityOff;
      if (state.gravityEnabled) {
        state.vpy += 35;
        state.grounded = false;
      }
      startSpring(glass, state);
    }, { signal: controller.signal });

    panel.querySelector(