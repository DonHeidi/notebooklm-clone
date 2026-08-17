# apps/docs — agent guide

Astro static site for product/developer documentation. TypeScript + TailwindCSS
(via `@tailwindcss/vite`, see `astro.config.mjs`; global styles in
`src/styles/global.css`).

- Package name: `@notebooklm-clone/docs`. Dev server: `bun run dev:docs` from
  the repo root (or `bun run dev` here).
- Purely static output (`bun run build` → `dist/`), deployed to a Scaleway
  object-storage website bucket (`infrastructure/`). No server-side runtime —
  do not add SSR adapters.
- Root conventions apply: see the repository root `AGENTS.md`.
