# apps/marketing — agent guide

Astro static marketing/landing site. TypeScript + TailwindCSS (via
`@tailwindcss/vite`, see `astro.config.mjs`; global styles in
`src/styles/global.css`).

- Package name: `@notebooklm-clone/marketing`. Dev server: `bun run
  dev:marketing` from the repo root (or `bun run dev` here).
- Purely static output (`bun run build` → `dist/`), deployed to a Scaleway
  object-storage website bucket (`infrastructure/`). No server-side runtime —
  do not add SSR adapters.
- Root conventions apply: see the repository root `AGENTS.md`.
