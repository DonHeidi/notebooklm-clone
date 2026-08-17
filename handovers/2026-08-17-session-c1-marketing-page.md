# Session C1 — Marketing page (2026-08-17)

## Goal

Real marketing/landing site for the product in `apps/marketing` (Astro +
Tailwind v4): hero with the core value proposition, feature sections matching
the actual prototype scope, closing CTA. Roadmap lane C, session C1.

## What was done

- Working product name: **Marginalia** — "notes in the margins of your
  sources". Placeholder only; stated as such in the page footer and the PR.
  No Google/NotebookLM branding anywhere; footer carries an explicit
  non-affiliation line.
- Single page (`src/pages/index.astro`) composed from components under
  `src/components/`: `SiteHeader`, `Hero`, `GroundedDemo`, `HowItWorks`,
  `AudioSection`, `ScopeSection`, `CtaSection`, `SiteFooter`, with a shared
  `src/layouts/Base.astro`.
- **Design direction — "a page that shows its work":** the landing page
  practices the product's grounding principle on itself. Marketing claims
  carry superscript citation chips that resolve to a Footnotes section in the
  footer, linking to the repo's real `product/scope.md` and
  `product/roadmap.md`. The hero holds a CSS-only demo (no JavaScript on the
  page at all): hovering/focusing/clicking a citation chip in a mock grounded
  answer highlights the exact cited passage in the source cards next to it
  (`:has()` + `:target`).
- Visual identity: neutral paper white (`#fafaf6`) + deep ink blue
  (`#17293b`) + a single marker-yellow accent (`#ffe14d`) used as highlighter
  and citation chips. Type: Newsreader (display), Public Sans (body), IBM
  Plex Mono (labels/chips) — all self-hosted via `@fontsource` packages, no
  runtime CDN/font requests. Committed to light theme only.
- Honest copy: features limited to prototype scope (notebooks, PDF/text/MD/
  paste/URL ingestion, source selection, grounded chat, citations → exact
  passage, notes). Audio overview section badged **"in development"** and
  explicitly limited to a single narrator. A "Small on purpose" section lists
  the cut list ("Not yet — and not pretended"). No testimonials, logos,
  pricing, or fabricated numbers.
- Accessibility: semantic landmarks, skip link, keyboard-reachable citation
  chips (real in-page anchors, no dead `#` links), global `:focus-visible`
  style, `prefers-reduced-motion` kill-switch for all animation/transitions,
  screen-reader text for the demo's checkbox states. Contrast verified
  programmatically: all text pairs ≥ 6.7:1 (AA, mostly AAA).
- Verified in Chrome via devtools MCP: desktop (1440) and mobile (375)
  full-page screenshots in `handovers/assets/2026-08-17-c1-{desktop,mobile}.jpeg`;
  citation→passage highlight confirmed working; `dist/` grep confirmed no
  external runtime URLs.
- `bun run build` passes (static output, 1 page).

## Decisions

- **Name "Marginalia" is a placeholder** — owner to confirm or rename.
  Renaming touches only copy in the components and the favicon.
- Zero-JS page: all interaction is CSS (`:has()`, `:target`, `:hover`,
  `:focus-visible`). Keeps the static-bucket deployment trivial.
- Replaced the default Astro `favicon.ico`/`favicon.svg` with a simple
  marker-yellow "M" SVG mark.
- Fonts added via `bun add` (hard rule): `@fontsource-variable/newsreader`,
  `@fontsource-variable/public-sans`, `@fontsource/ibm-plex-mono` → root
  `bun.lock` changed (hot file, listed in PR).

## Open / next

- Owner decision: keep or replace the working name "Marginalia".
- C2 (docs site) can reuse the token set in `src/styles/global.css` if a
  shared look is wanted; nothing is extracted to `packages/` yet (YAGNI until
  a second consumer exists).
- Deployment to the Scaleway bucket arrives via B2's pipeline; nothing to do
  here.
- If the webapp ships under a real domain later, hero/CTA should gain an
  "Open the app" primary action; today the only honest CTA is the repository.
