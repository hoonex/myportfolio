# HJ Design Journal

A static, host-agnostic design journal built as an experimental interface notebook rather than a conventional portfolio.

## Repository contract

- `main` intentionally preserves the historical Blazor project until the portfolio PR is explicitly merged.
- active journal development lives on `feat/design-journal-liquid-glass-20260827` while PR #1 remains open.
- the public site is served from `gh-pages` at `https://hoonex.github.io/myportfolio/`.
- do not infer the current site state from chat history; verify branch SHA, tree and workflows first.

## Runtime layers

The site is intentionally framework-free and layered so experiments can be added or removed without rewriting the historical implementation.

- `index.html`, `styles.css`, `app.js` — base shell, routing, theme and browser-local conversations.
- `journal-v2.css`, `journal-v2.js` — authored KO / EN / JP long-form articles, translation UI and sandboxed HTML/CSS playgrounds.
- `journal-v3-refraction.css`, `journal-v3-refraction.js` — real WebGL refraction Glass Lab using pinned `@ybouane/liquidglass@1.0.3`.
- `journal-v4-jelly.css`, `journal-v4-jelly.js` — preferred optical defaults plus velocity-driven press/drag/release jelly dynamics.
- `journal-v5-experiments.css`, `journal-v5-experiments.js` — Sloar Continuity Control Room and Motion Dynamics Lab.
- `journal-v6-studio.css`, `journal-v6-studio.js` — interactive home previews, reading progress and section navigator.
- `journal-v6-compat.css` — explicit stagger timings for browsers where newer typed CSS arithmetic is unreliable.
- `THIRD_PARTY_NOTICES.md` — required third-party attribution.

## Liquid Glass contract

The primary Glass Lab must not regress to blur-only glassmorphism. Real refraction is produced by capturing the scene and displacing background texture sample coordinates in WebGL. CSS `backdrop-filter` remains a fallback only.

Preferred defaults are intentionally locked by CI:

```js
element.dataset.config = JSON.stringify({
  floating: true,
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
```

The renderer itself owns `transform: translate(...)` for floating drag position. Jelly dynamics therefore use separate CSS `scale` / `rotate` properties and must not overwrite the renderer transform.

## Interactive article contract

### Sloar

`Continuity Control Room` models:

`RECOVER → IDENTIFY → MATERIALIZE → BRANCH → IMPLEMENT → VERIFY → PUBLISH → REMOTE_VERIFY`

It supports repository identity changes, clean/dirty working state and failure injection for transport, stale remote movement and CI failure. The visual model is educational; sample SHA values in the mini preview are not claims about the repository's current real HEAD.

### Motion

`Motion Dynamics Lab` supports direct pointer manipulation, release velocity, projected destination, snap target selection, spring stiffness/damping/mass, nonlinear rubber-banding and a live position/target graph.

## Accessibility / browser behavior

- responsive layouts are required for mobile.
- `prefers-reduced-motion` disables or simplifies nonessential motion.
- high-contrast mode reduces transparency where necessary.
- v6 pointer previews use fully computed `%`, `deg` and scalar custom-property values rather than depending on typed CSS multiplication.

## Verification

`.github/workflows/design-journal-ci.yml` is permanent PR/main validation and checks:

- JavaScript syntax for `app.js` and journal v2-v6 scripts.
- every local asset referenced by `site/index.html`.
- the preferred Liquid Glass optical defaults.
- Sloar / Motion interactive contracts.
- v6 studio/navigation presence.
- deployment workflow invariants.

The old Blazor Pages workflow is preserved as `Archived Blazor Pages build` and is manual-only. It must not regain a push trigger unless the deployment architecture intentionally changes.

## Deployment after merge

`.github/workflows/design-journal-deploy.yml` is prepared to sync `site/` into the root of `gh-pages` after future `site/**` changes land on `main`. It preserves `.github/` in the deployment branch while replacing the public site files and retaining `.nojekyll`.

Until PR #1 is explicitly merged, live review builds can still be materialized directly into `gh-pages` from verified feature-branch blobs.

## Current limitations

- article/Lab conversations are stored only in the current browser via local storage; there is no shared backend yet.
- real refraction depends on the pinned jsDelivr copy of `@ybouane/liquidglass@1.0.3`; CSS fallback remains available if module/WebGL initialization fails.
- HTML/CSS playground previews intentionally block arbitrary JavaScript and external network resources.
