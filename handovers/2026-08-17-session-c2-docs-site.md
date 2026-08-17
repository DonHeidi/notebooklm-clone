# Session C2 — Docs site (2026-08-17)

## Goal

The project's documentation site in `apps/docs` (Astro + Tailwind v4,
static): product docs, architecture decisions, and the session history,
readable in the browser. Roadmap lane C, session C2.

## What was done

- **Render, don't copy.** Content collections (`src/content.config.ts`) use
  Astro's content-layer `glob` loader with `base: "../../product"` and
  `base: "../../handovers"`, so the repo-root markdown files are rendered in
  place and stay the single source of truth. No file was copied or edited;
  presentation fixes (wide tables, ASCII diagrams) are CSS-only
  (`.prose` in `src/styles/global.css`: tables and code fences scroll in
  their own `overflow-x` boxes).
- **Pages** (10 built): Home (original copy: what Marginalia is, how the
  repo is organized, where to start) · `/product/scope/` ·
  `/product/ui-research/` · `/decisions/` (feasibility.md as the ADR) ·
  `/roadmap/` · `/sessions/` (chronological log) + one page per handover
  via `getStaticPaths`. Session titles/dates are recovered from each file's
  H1 (the files have no frontmatter).
- **Marginalia identity** reused from `apps/marketing` (C1): same
  paper/ink/marker-yellow tokens, Newsreader / Public Sans / IBM Plex Mono
  self-hosted via fontsource (added with `bun add` in this workspace — no
  cross-workspace imports). Simpler chrome as briefed: header, sticky
  sidebar (current page marked by a marker-yellow highlight), prose pages;
  on mobile the nav collapses into a no-JS `<details>` disclosure.
- **Signature element — the provenance card**: every rendered document
  opens with its canonical repo path (`product/scope.md`) as a
  marker-yellow chip linking to the file on GitHub, plus "Rendered from the
  repository — the file stays the source of truth." The site's one rule
  made visible. Status/method blockquotes in the docs render as highlighted
  passages (mark-soft background).
- No docs framework (hand-rolled was simpler at this page count), no
  search, no versioning, no theme toggle. Shiki set to `github-light` to
  match the single paper theme. Footer carries the same non-affiliation
  line as the marketing site.
- `apps/docs/AGENTS.md` extended with the render-don't-copy convention and
  the shared-identity rule.

## Verification

- `bun run build` passes; 10 static pages, no SSR adapter.
- External-request grep over `dist/`: no external `<script>`/`<link>` tags,
  no external `url()` in CSS, fonts bundled as local woff2 under
  `dist/_astro/`. The only URLs in the output are content anchors
  (github.com links and one `api.scaleway.ai` mention inside the rendered
  feasibility text).
- Screenshots (desktop home, decisions, mobile session page) in
  `handovers/assets/2026-08-17-c2-{home,decisions,mobile}.jpeg`.

## Decisions / notes for the next session

- Session pages live at `/sessions/<full-file-slug>/` (date-prefixed), so
  URLs sort chronologically and never collide.
- The sessions sidebar group lists every handover; at ~15+ sessions that
  group should probably collapse to just the "Session log" link.
- `handovers/assets/*` binaries are not published — nothing in the
  markdown embeds them (the one mention is a code span), so no image
  handling was needed. If a future handover embeds an image with a
  markdown image tag, the docs build will need a strategy (e.g. a public/
  passthrough copy at build time).
- Deploys via B2's bucket pipeline (roadmap); nothing here assumes a
  particular base URL.

## Hot files

- `bun.lock` (fontsource packages added via `bun add` in `apps/docs`) —
  coordinate when merging alongside other lanes.
