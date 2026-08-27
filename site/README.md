# HJ Design Journal

A host-agnostic static portfolio / design journal with three editorial posts, an interactive Liquid Glass material lab, dark mode, responsive layouts, reduced-motion support, and local-preview article conversations.

## Run locally

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Conversation storage

Comments currently use `localStorage`, intentionally. This makes the prototype fully functional before a hosting/backend choice is made. Replace the storage adapter with Supabase/Firebase/another realtime service for shared public conversations.

## Deployment

No platform-specific files are required. The folder can be hosted as a static site on Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any basic web server.
