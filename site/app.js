const posts = {
  glass: {
    slug: 'glass',
    number: '01',
    category: 'Material study',
    date: 'Aug 2026',
    title: 'Liquid Glass is not frosted glass.',
    deck: 'Blur is only the first layer. A convincing glass surface needs hierarchy, optical cues, edge light, motion, and restraint.',
    visual: 'glass',
    body: `
      <p class="lede">Most web “glassmorphism” stops at one CSS declaration: <code>backdrop-filter: blur()</code>. It makes the background softer, but it does not make the interface feel like a material.</p>
      <h2>Start with hierarchy, not blur.</h2>
      <p>Glass works when it explains where the interface lives. A floating toolbar can be translucent because the content below should remain perceptually present. A modal, by contrast, often needs stronger separation and a dimmed background. If every layer is transparent, there is no hierarchy left to read.</p>
      <div class="callout"><strong>Rule of thumb.</strong><br>Large surfaces should feel thicker. Small controls should feel clearer and lighter. Never stack several low-contrast translucent layers and expect legibility to survive.</div>
      <h2>Build the edge.</h2>
      <p>Real glass gives itself away at the boundary: a bright rim, a slight internal reflection, a denser shadow where the object overlaps busy content. On the web, these cues are often more important than increasing blur radius.</p>
      <pre><code>.glass {
  background: rgba(255,255,255,.16);
  backdrop-filter: blur(18px) saturate(155%);
  border: 1px solid rgba(255,255,255,.55);
  box-shadow:
    0 28px 70px rgba(30,36,64,.24),
    inset 0 1px 1px rgba(255,255,255,.72);
}</code></pre>
      <h2>Refraction is the hard part.</h2>
      <p>Native CSS can blur and color the pixels behind an element, but broadly supported CSS still cannot treat arbitrary page content like a physically refracted texture. That means “true” refraction usually requires a rendered scene—Canvas/WebGL—or a carefully constrained visual trick.</p>
      <p>The <a href="#/lab">Glass Lab</a> on this site is deliberately honest about that boundary. It lets you drag a lens and tune blur, fill, saturation and geometry. The goal is to understand which cues create the material impression before reaching for a shader.</p>
      <h2>Motion makes the material believable.</h2>
      <p>A glass surface should not simply fade in. Scale, blur, shadow and position should arrive together, and anything the user can drag should react immediately. The material becomes convincing when visual behavior and input behavior tell the same physical story.</p>
    `
  },
  sloar: {
    slug: 'sloar',
    number: '02',
    category: 'Tool / system',
    date: 'Aug 2026',
    title: 'Designing Sloar Chat Coder.',
    deck: 'A repository continuity protocol for coding in disposable chat sessions: durable state over memory, evidence over confident guesses.',
    visual: 'sloar',
    body: `
      <p class="lede">Chat coding has a strange failure mode: the interface feels continuous while the execution environment may not be. A sandbox disappears, a branch moves, CI changes, or a tool quietly loses permission. Sloar exists to make that discontinuity explicit.</p>
      <h2>The repository is the memory.</h2>
      <p>The central idea is simple: conversation history is useful context, but it is not authoritative engineering state. Before editing, the agent should identify the exact commit, tree and working state it intends to modify.</p>
      <div class="callout"><strong>RECOVER → IDENTIFY → MATERIALIZE → BRANCH → IMPLEMENT → VERIFY → PUBLISH → REMOTE_VERIFY.</strong><br><br>The sequence is intentionally boring. Boring is good when the alternative is silently writing to the wrong branch.</div>
      <h2>Failure should change strategy.</h2>
      <p>If an identical operation fails with identical inputs, repeating it is not progress. Sloar classifies the failure first: local execution, hosted forge, permissions, branch policy, remote movement, or degraded transport. The next step depends on that layer.</p>
      <h2>Evidence bounds the claim.</h2>
      <p>A file being written does not prove the site builds. A local build does not prove a deployment happened. A green deployment does not prove the branch still points at the expected commit. Each completion statement should be no broader than the evidence actually collected.</p>
      <p>Sloar is intentionally not a framework chooser. It does not care whether the project uses React, Blazor, Astro or a single HTML file. It cares that work remains recoverable and exact while those choices evolve.</p>
      <p><a href="https://github.com/hoonex/sloar-chat-coder" target="_blank" rel="noreferrer">View Sloar Chat Coder on GitHub</a></p>
    `
  },
  motion: {
    slug: 'motion',
    number: '03',
    category: 'Interaction note',
    date: 'Aug 2026',
    title: 'Motion should begin under your hand.',
    deck: 'Notes on immediate feedback, interruptible springs, velocity handoff, and why a polished interface is mostly about continuity.',
    visual: 'motion',
    body: `
      <p class="lede">The difference between an interface that looks animated and one that feels fluid is continuity. The user should never have to wait for the interface to finish its idea before starting a new one.</p>
      <h2>Respond on contact.</h2>
      <p>Pressed feedback belongs on pointer-down, not after a click has completed. During a drag, the object should stay attached to the pointer. This sounds obvious, but even small delays immediately weaken the feeling of direct manipulation.</p>
      <h2>Make transitions interruptible.</h2>
      <p>If a sheet is closing and the user grabs it again, the next motion should begin from the sheet’s current visible position. Starting from the old target value causes a jump. Springs are useful because changing the target can preserve continuity instead of restarting a fixed animation.</p>
      <h2>Velocity is part of state.</h2>
      <p>Position alone is not enough. A flick contains direction and speed, so the release animation should inherit that velocity and project where the gesture is going. This is why a good carousel or sheet feels thrown rather than merely snapped.</p>
      <div class="callout">This article is an original note inspired by Emil Kowalski’s MIT-licensed <strong>apple-design</strong> skill, which distills Apple’s fluid-interface principles for the web. The source is credited rather than reproduced wholesale.</div>
      <p><a href="https://github.com/emilkowalski/skills/tree/main/skills/apple-design" target="_blank" rel="noreferrer">Read the apple-design skill</a></p>
      <h2>Restraint is part of motion design.</h2>
      <p>Not every state change needs a spring. Motion should clarify causality, spatial relationships, or momentum. If it does none of those, the most polished animation may be no animation at all.</p>
    `
  }
};

const app = document.querySelector('#app');
const themeToggle = document.querySelector('#themeToggle');

const memoryStore = new Map();
const storage = {
  getItem(key) { try { return localStorage.getItem(key); } catch { return memoryStore.get(key) ?? null; } },
  setItem(key, value) { try { localStorage.setItem(key, value); } catch { memoryStore.set(key, value); } }
};

const savedTheme = storage.getItem('hj-theme');
if (savedTheme) document.documentElement.dataset.theme = savedTheme;
else if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.theme = 'dark';

function setTheme(next) {
  document.documentElement.dataset.theme = next;
  storage.setItem('hj-theme', next);
}

themeToggle.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

function homeTemplate() {
  return `
    <div class="page home-page">
      <section class="hero">
        <div class="eyebrow">Selected experiments / 2026</div>
        <h1>Interfaces that feel <span class="serifish">physical.</span></h1>
        <div class="hero-meta">
          <p class="hero-intro">A small journal about interface materials, motion, and the tools I build while learning how digital things should feel.</p>
          <div class="hero-note">Not a conventional portfolio. More like a working notebook where the prototypes are allowed to stay visible.</div>
        </div>
      </section>

      <section aria-labelledby="writing-title">
        <div class="section-head">
          <h2 id="writing-title">Writing / experiments</h2>
          <span>03 notes</span>
        </div>
        <div class="post-grid">
          ${Object.values(posts).map((post, i) => `
            <a class="post-card" href="#/post/${post.slug}" data-post="${post.slug}">
              ${i < 2 ? `<span class="card-orb ${i === 0 ? 'blue' : 'orange'}" aria-hidden="true"></span>` : ''}
              <div class="post-card-top"><span>${post.number} / ${post.category}</span><span>${post.date}</span></div>
              <div>
                <h3>${post.title}</h3>
                <p>${post.deck}</p>
              </div>
              <span class="post-card-arrow" aria-hidden="true">↗</span>
            </a>
          `).join('')}
        </div>
      </section>

      <section class="manifesto">
        <div class="manifesto-label">Working principle</div>
        <p class="manifesto-copy">Polish is not decoration. It is the point where <em>visual hierarchy</em>, input, motion, and system behavior stop contradicting each other.</p>
      </section>
    </div>
  `;
}

function articleVisual(type) {
  if (type === 'glass') {
    return `<div class="article-hero"><div class="hero-visual"><span class="disc disc-a"></span><span class="disc disc-b"></span><span class="glass-panel"></span></div></div>`;
  }
  if (type === 'sloar') {
    return `<div class="article-hero sloar-visual"><div class="terminal"><div class="terminal-top"><span class="terminal-dot"></span><span class="terminal-dot"></span><span class="terminal-dot"></span></div><div class="terminal-row"><span>STATE</span><strong>VERIFY</strong></div><div class="terminal-row"><span>BASE</span><strong>6409422 / exact</strong></div><div class="terminal-row"><span>LOCAL</span><strong>READY</strong></div><div class="terminal-row"><span>REMOTE</span><strong>PARTIAL → alternate transport</strong></div><div class="terminal-row"><span>EVIDENCE</span><strong>syntax · render · interaction</strong></div></div></div>`;
  }
  return `<div class="article-hero motion-visual"><div class="motion-track"><div class="motion-knob glass"></div></div></div>`;
}

function commentsTemplate(slug) {
  return `
    <section class="comments" data-comments="${slug}">
      <div class="comments-head"><h2>Conversation</h2><span>Local preview</span></div>
      <form class="comment-form" data-comment-form>
        <div class="comment-form-row">
          <input name="name" maxlength="28" placeholder="Name" autocomplete="name" aria-label="Name" />
          <textarea name="message" maxlength="500" placeholder="Write a thought…" required aria-label="Message"></textarea>
        </div>
        <div class="comment-actions">
          <small>Saved only in this browser for now.</small>
          <button class="comment-submit" type="submit">Post</button>
        </div>
      </form>
      <div class="comment-list" data-comment-list></div>
    </section>
  `;
}

function articleTemplate(post) {
  return `
    <div class="page article-page">
      <article class="article">
        <a class="article-back" href="#/">← Index</a>
        <div class="article-kicker"><span>${post.number}</span><span class="dot"></span><span>${post.category}</span><span class="dot"></span><span>${post.date}</span></div>
        <h1>${post.title}</h1>
        <p class="article-deck">${post.deck}</p>
        ${articleVisual(post.visual)}
        <div class="article-body">${post.body}</div>
        ${commentsTemplate(post.slug)}
      </article>
    </div>
  `;
}

function labTemplate() {
  return `
    <div class="page lab">
      <section class="lab-header">
        <h1>Glass<br>Lab.</h1>
        <p>A browser-native material test. Drag the lens over the scene and tune the variables. This uses real <code>backdrop-filter</code> for blur/saturation and edge-light cues for thickness; it does not pretend CSS blur is full optical refraction.</p>
      </section>

      <section class="lab-stage" id="labStage" aria-label="Liquid glass experiment">
        <div class="lab-scene">
          <div class="lab-lines"></div>
          <div class="lab-copy"><span class="big">OPTICAL<br>WEIGHT</span><span class="small">Move the lens across text and structure. The material only reads as glass when the scene behind it remains perceptible.</span></div>
          <div class="glass-lens" id="glassLens" role="img" aria-label="Draggable glass lens"><span class="lens-specular"></span></div>
        </div>
        <div class="lab-controls glass">
          <div class="controls-head"><strong>Material controls</strong><button id="labReset" type="button">Reset</button></div>
          ${control('blur','Blur',0,40,1,18,'px')}
          ${control('alpha','Fill',4,40,1,16,'%')}
          ${control('saturation','Sat.',80,220,5,155,'%')}
          ${control('size','Size',150,380,5,260,'px')}
          ${control('radius','Radius',18,50,1,48,'%')}
          ${control('highlight','Edge',10,100,2,72,'%')}
        </div>
      </section>

      <div class="lab-notes">
        <div class="lab-note"><span>01 / Native</span><h3>Backdrop sampling</h3><p>The browser samples what is behind the lens for blur and saturation. It is cheap enough for a small interactive surface.</p></div>
        <div class="lab-note"><span>02 / Illusion</span><h3>Edge thickness</h3><p>Border, inner highlight, shadow and local contrast do most of the visual work that makes a flat blur read as material.</p></div>
        <div class="lab-note"><span>03 / Limit</span><h3>True refraction</h3><p>Arbitrary page-content distortion is not broadly available through standard CSS. A shader/canvas path is the next experiment.</p></div>
      </div>
      ${commentsTemplate('lab')}
    </div>
  `;
}

function control(id,label,min,max,step,value,suffix) {
  return `<label class="control-row"><span>${label}</span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" /><span class="control-value" data-value="${id}">${value}${suffix}</span></label>`;
}

function updateNav(route) {
  document.querySelectorAll('[data-nav]').forEach(el => el.classList.remove('active'));
  const key = route.startsWith('/lab') ? 'lab' : route === '/' ? 'home' : '';
  if (key) document.querySelector(`[data-nav="${key}"]`)?.classList.add('active');
}

function storageKey(slug) { return `hj-comments:${slug}`; }
function getComments(slug) {
  try { return JSON.parse(storage.getItem(storageKey(slug)) || '[]'); }
  catch { return []; }
}
function saveComments(slug, comments) { storage.setItem(storageKey(slug), JSON.stringify(comments)); }
function safeText(value) {
  const node = document.createElement('div');
  node.textContent = value;
  return node.innerHTML;
}
function renderComments(slug) {
  const root = document.querySelector(`[data-comments="${slug}"]`);
  if (!root) return;
  const list = root.querySelector('[data-comment-list]');
  const comments = getComments(slug);
  if (!comments.length) {
    list.innerHTML = `<div class="comment-empty">No messages yet. Start the conversation.</div>`;
    return;
  }
  list.innerHTML = comments.map(item => `
    <div class="comment" data-comment-id="${item.id}">
      <div class="comment-meta"><span><span class="comment-name">${safeText(item.name || 'Anonymous')}</span> · ${new Date(item.createdAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span><button class="comment-delete" type="button" data-delete="${item.id}">Delete</button></div>
      <p>${safeText(item.message)}</p>
    </div>
  `).join('');
  list.querySelectorAll('[data-delete]').forEach(button => {
    button.addEventListener('click', () => {
      saveComments(slug, getComments(slug).filter(item => item.id !== button.dataset.delete));
      renderComments(slug);
    });
  });
}
function initComments() {
  document.querySelectorAll('[data-comments]').forEach(root => {
    const slug = root.dataset.comments;
    renderComments(slug);
    root.querySelector('[data-comment-form]').addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const message = String(data.get('message') || '').trim();
      if (!message) return;
      const comments = getComments(slug);
      comments.push({ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, name: String(data.get('name') || '').trim().slice(0,28), message: message.slice(0,500), createdAt: new Date().toISOString() });
      saveComments(slug, comments.slice(-50));
      event.currentTarget.reset();
      renderComments(slug);
    });
  });
}

function initLab() {
  const stage = document.querySelector('#labStage');
  const lens = document.querySelector('#glassLens');
  if (!stage || !lens) return;
  const defaults = { blur:18, alpha:16, saturation:155, size:260, radius:48, highlight:72 };
  const suffixes = { blur:'px', alpha:'%', saturation:'%', size:'px', radius:'%', highlight:'%' };

  function apply() {
    const values = Object.fromEntries(Object.keys(defaults).map(id => [id, Number(document.querySelector(`#${id}`).value)]));
    lens.style.setProperty('--blur', `${values.blur}px`);
    lens.style.setProperty('--alpha', values.alpha / 100);
    lens.style.setProperty('--saturation', `${values.saturation}%`);
    lens.style.setProperty('--size', `${values.size}px`);
    lens.style.setProperty('--radius', `${values.radius}%`);
    lens.style.setProperty('--highlight', values.highlight / 100);
    Object.entries(values).forEach(([id,v]) => document.querySelector(`[data-value="${id}"]`).textContent = `${v}${suffixes[id]}`);
  }
  Object.keys(defaults).forEach(id => document.querySelector(`#${id}`).addEventListener('input', apply));
  document.querySelector('#labReset').addEventListener('click', () => {
    Object.entries(defaults).forEach(([id,v]) => document.querySelector(`#${id}`).value = v);
    lens.style.setProperty('--x','65%'); lens.style.setProperty('--y','62%'); apply();
  });
  apply();

  let dragging = false;
  lens.addEventListener('pointerdown', e => {
    dragging = true; lens.setPointerCapture(e.pointerId); move(e);
  });
  lens.addEventListener('pointermove', e => { if (dragging) move(e); });
  lens.addEventListener('pointerup', e => { dragging = false; lens.releasePointerCapture?.(e.pointerId); });
  lens.addEventListener('pointercancel', () => { dragging = false; });

  function move(e) {
    const rect = stage.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    lens.style.setProperty('--x', `${(x / rect.width) * 100}%`);
    lens.style.setProperty('--y', `${(y / rect.height) * 100}%`);
  }
}

function render() {
  const raw = location.hash.slice(1) || '/';
  const route = raw.split('?')[0];
  updateNav(route);
  if (route === '/') app.innerHTML = homeTemplate();
  else if (route === '/lab') app.innerHTML = labTemplate();
  else if (route.startsWith('/post/')) {
    const slug = route.split('/')[2];
    const post = posts[slug];
    app.innerHTML = post ? articleTemplate(post) : `<div class="page"><h1>Not found</h1><p><a href="#/">Return to index</a></p></div>`;
  } else app.innerHTML = `<div class="page"><h1>Not found</h1><p><a href="#/">Return to index</a></p></div>`;

  initComments();
  initLab();
  window.scrollTo({ top:0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'instant' });
  app.focus({ preventScroll:true });
}

window.addEventListener('hashchange', render);
render();
