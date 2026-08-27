# Design Journal / Portfolio

A static, host-agnostic portfolio and design journal.

## Current structure

- `index.html`, `styles.css`, `app.js`: base shell and original journal implementation
- `journal-v2.css`, `journal-v2.js`: multilingual long-form articles, code playgrounds, language switch, expanded Glass Lab controls
- `journal-v3-refraction.css`, `journal-v3-refraction.js`: real WebGL refraction layer for Glass Lab using `@ybouane/liquidglass@1.0.3`
- `THIRD_PARTY_NOTICES.md`: MIT attribution for referenced/used third-party work

## Liquid Glass rendering

The primary Glass Lab is no longer a blur-only glassmorphism demo. It captures the DOM scene and processes it with a WebGL fragment shader so background sample coordinates are displaced. The lab exposes refraction, chromatic aberration, specular, Fresnel, edge highlight, bevel depth, corner radius, saturation, brightness, and panel geometry controls.

A CSS `backdrop-filter` treatment remains only as a fallback if WebGL/module initialization fails. The article CSS playground is explicitly a fallback-material experiment, not the real refraction renderer.

## Deployment

The site remains host-agnostic. The current public deployment is published from `gh-pages` at:

https://hoonex.github.io/myportfolio/

The legacy Blazor project remains preserved on `main`.
