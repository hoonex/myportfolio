/* Journal v6: studio index previews + article reading navigator. */
(() => {
  const COPY = {
    ko: {
      studio: 'INTERACTIVE INDEX',
      studioNote: '각 글은 읽는 문서이면서 동시에 직접 조작하는 실험입니다.',
      glass: 'WebGL 굴절 · 젤리 드래그',
      sloar: '상태 복구 · 실패 주입',
      motion: '스프링 · 속도 전달',
      open: '실험 열기',
      contents: 'On this page',
      progress: 'READING',
      live: 'LIVE'
    },
    en: {
      studio: 'INTERACTIVE INDEX',
      studioNote: 'Each article is both a document to read and a model you can manipulate.',
      glass: 'WebGL refraction · jelly drag',
      sloar: 'state recovery · failure injection',
      motion: 'springs · velocity handoff',
      open: 'Open experiment',
      contents: 'On this page',
      progress: 'READING',
      live: 'LIVE'
    },
    ja: {
      studio: 'INTERACTIVE INDEX',
      studioNote: '各記事は読むドキュメントであると同時に、直接操作できる実験です。',
      glass: 'WebGL 屈折 · jelly drag',
      sloar: 'state recovery · failure injection',
      motion: 'spring · velocity handoff',
      open: '実験を開く',
      contents: 'On this page',
      progress: 'READING',
      live: 'LIVE'
    }
  };

  const language = () => {
    const value = document.documentElement.lang || 'ko';
    return value.startsWith('ja') ? 'ja' : value.startsWith('en') ? 'en' : 'ko';
  };
  const t = () => COPY[language()];

  let routeCleanup = () => {};
  let scheduled = 0;

  function previewMarkup(slug) {
    if (slug === 'glass') {
      return `<div class="studio-preview studio-preview--glass" aria-hidden="true">
        <div class="studio-grid"></div>
        <span class="studio-orb studio-orb--a"></span><span class="studio-orb studio-orb--b"></span>
        <div class="studio-glass-lens"><i></i></div>
        <div class="studio-preview-label"><b>${t().live}</b><span>${t().glass}</span></div>
      </div>`;
    }
    if (slug === 'sloar') {
      return `<div class="studio-preview studio-preview--sloar" aria-hidden="true">
        <div class="studio-sloar-fingerprint"><span>HEAD</span><b>6b8df2ba</b><span>TREE</span><b>0a595721</b></div>
        <div class="studio-pipeline">${['R','I','M','B','I','V','P','R'].map((x,i)=>`<i style="--i:${i}">${x}</i>`).join('')}</div>
        <div class="studio-evidence"><span></span><span></span><span></span></div>
        <div class="studio-preview-label"><b>${t().live}</b><span>${t().sloar}</span></div>
      </div>`;
    }
    return `<div class="studio-preview studio-preview--motion" aria-hidden="true">
      <div class="studio-motion-track"><i></i><i></i><i></i><span class="studio-motion-card">THROW</span></div>
      <svg viewBox="0 0 320 64" preserveAspectRatio="none"><path d="M0 44 C35 44,42 12,74 18 S120 52,154 31 S204 17,232 33 S280 44,320 28" /></svg>
      <div class="studio-preview-label"><b>${t().live}</b><span>${t().motion}</span></div>
    </div>`;
  }

  function enhanceHome() {
    const home = document.querySelector('.home-page');
    if (!home || home.dataset.studioV6 === 'true') return;
    home.dataset.studioV6 = 'true';

    const section = home.querySelector('.section-head');
    if (section) {
      const intro = document.createElement('div');
      intro.className = 'studio-index-note';
      intro.innerHTML = `<span>${t().studio}</span><p>${t().studioNote}</p>`;
      section.after(intro);
    }

    const cleanups = [];
    home.querySelectorAll('.post-card[data-post]').forEach(card => {
      const slug = card.dataset.post;
      card.classList.add('post-card--studio', `post-card--${slug}`);
      card.insertAdjacentHTML('afterbegin', previewMarkup(slug));

      const footer = document.createElement('span');
      footer.className = 'studio-card-cta';
      footer.innerHTML = `<span>${slug === 'glass' ? t().glass : slug === 'sloar' ? t().sloar : t().motion}</span><b>${t().open} ↗</b>`;
      card.append(footer);

      const onMove = (event) => {
        const rect = card.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        const nx = x * 2 - 1;
        const ny = y * 2 - 1;
        const energy = Math.min(1, Math.hypot(nx, ny));
        card.style.setProperty('--studio-x', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--studio-y', `${(y * 100).toFixed(1)}%`);
        card.style.setProperty('--studio-shift', `${(nx * 32).toFixed(2)}%`);
        card.style.setProperty('--studio-tilt', `${(nx * 5).toFixed(2)}deg`);
        card.style.setProperty('--studio-glass-tilt', `${(nx * 3).toFixed(2)}deg`);
        card.style.setProperty('--studio-scale', (1 + energy * .025).toFixed(4));
        card.style.setProperty('--studio-scale-x', (1 + Math.abs(nx) * .08).toFixed(4));
      };
      const onDown = () => card.classList.add('is-studio-pressed');
      const onUp = () => card.classList.remove('is-studio-pressed');
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerdown', onDown);
      window.addEventListener('pointerup', onUp);
      cleanups.push(() => {
        card.removeEventListener('pointermove', onMove);
        card.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp);
      });
    });
    routeCleanup = () => cleanups.forEach(fn => fn());
  }

  function articleTargets(body) {
    const seen = new Set();
    const items = [];
    body.querySelectorAll(':scope > .article-live-lab, :scope > .essay-section, :scope > h2').forEach((node, index) => {
      const heading = node.matches('h2') ? node : node.querySelector('h2');
      if (!heading) return;
      const label = heading.textContent.trim();
      if (!label || seen.has(label)) return;
      seen.add(label);
      if (!node.id) node.id = `section-${index + 1}`;
      items.push({ node, label });
    });
    return items;
  }

  function enhanceArticle() {
    const page = document.querySelector('.article-page');
    const article = page?.querySelector('.article');
    const body = article?.querySelector('.article-body');
    if (!page || !article || !body || page.dataset.navigatorV6 === 'true') return;
    page.dataset.navigatorV6 = 'true';

    const items = articleTargets(body);
    if (items.length < 2) return;

    const progress = document.createElement('div');
    progress.className = 'reading-progress-v6';
    progress.innerHTML = `<i></i><span>${t().progress}</span>`;
    document.body.append(progress);

    const rail = document.createElement('aside');
    rail.className = 'article-rail-v6';
    rail.setAttribute('aria-label', t().contents);
    rail.innerHTML = `<div class="article-rail-head"><span>${t().contents}</span><b data-reading-percent>0%</b></div>
      <nav>${items.map((item,i)=>`<button type="button" data-v6-target="${item.node.id}" title="${item.label.replace(/"/g,'&quot;')}"><i>${String(i+1).padStart(2,'0')}</i><span>${item.label}</span></button>`).join('')}</nav>`;
    article.append(rail);

    const buttons = [...rail.querySelectorAll('[data-v6-target]')];
    const onClick = (event) => {
      const button = event.target.closest('[data-v6-target]');
      if (!button) return;
      document.getElementById(button.dataset.v6Target)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    };
    rail.addEventListener('click', onClick);

    let currentId = items[0].node.id;
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if (visible[0]) currentId = visible[0].target.id;
      buttons.forEach(button => button.classList.toggle('is-active', button.dataset.v6Target === currentId));
    }, { rootMargin: '-22% 0px -62% 0px', threshold: [0, .1, .5] });
    items.forEach(item => observer.observe(item.node));

    let raf = 0;
    const updateProgress = () => {
      raf = 0;
      const rect = article.getBoundingClientRect();
      const total = Math.max(1, article.offsetHeight - innerHeight * .65);
      const read = Math.max(0, Math.min(total, -rect.top + innerHeight * .18));
      const pct = Math.round((read / total) * 100);
      progress.style.setProperty('--reading-progress', `${pct}%`);
      const value = rail.querySelector('[data-reading-percent]');
      if (value) value.textContent = `${pct}%`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(updateProgress); };
    addEventListener('scroll', onScroll, { passive:true });
    addEventListener('resize', onScroll, { passive:true });
    updateProgress();

    routeCleanup = () => {
      observer.disconnect();
      rail.removeEventListener('click', onClick);
      removeEventListener('scroll', onScroll);
      removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
      progress.remove();
    };
  }

  function enhanceCurrentRoute() {
    routeCleanup();
    routeCleanup = () => {};
    if (location.hash === '' || location.hash === '#/' || location.hash === '#') enhanceHome();
    else if (location.hash.startsWith('#/post/')) enhanceArticle();
  }

  function scheduleEnhance() {
    cancelAnimationFrame(scheduled);
    scheduled = requestAnimationFrame(enhanceCurrentRoute);
  }

  document.addEventListener('hj:rendered', scheduleEnhance);
  queueMicrotask(scheduleEnhance);
})();
