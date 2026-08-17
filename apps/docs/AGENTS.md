# apps/docs — agent guide

Astro static site for product/developer documentation. TypeScript + TailwindCSS
(via `@tailwindcss/vite`, see `astro.config.mjs`; global styles in
`src/styles/global.css`).

- Package name: `@notebooklm-clone/docs`. Dev server: `bun run dev:docs` from
  the repo root (or `bun run dev` here).
- Purely static output (`bun run build` → `dist/`), deployed to a Scaleway
  object-storage website bucket (`infrastructure/`). No server-side runtime —
  do not add SSR adapters.
- Content is **rendered, never copied**: content collections in
  `src/content.config.ts` point their glob loaders at the repo-root
  `product/` and `handovers/` directories, which stay the single source of
  truth. Never duplicate or edit those files from here; presentation fixes
  belong in this app's CSS (`.prose` in `src/styles/global.css`).
- Visual identity is shared with `apps/marketing` (paper/ink/mark tokens,
  Newsreader / Public Sans / IBM Plex Mono via fontsource). Keep the two in
  sync by copying token changes, not by importing across workspaces.
- Root conventions apply: see the repository root `AGENTS.md`.
