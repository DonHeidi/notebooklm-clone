# Docs site — project history

> **Status:** Snapshot as of 2026-08-18, written by session C4. Covers
> `apps/docs` through sessions C3 (PR [#14](https://github.com/DonHeidi/notebooklm-clone/pull/14))
> and C4 (PR [#22](https://github.com/DonHeidi/notebooklm-clone/pull/22)).
> Later sessions append below rather than rewriting.
> **Sources:** PR descriptions, `handovers/`.

## What was built

- **2026-08-17 — Astro scaffold** (PR [#1](https://github.com/DonHeidi/notebooklm-clone/pull/1)):
  create-astro minimal template + Tailwind.
- **2026-08-17 — The documentation site, session C2**
  (PR [#9](https://github.com/DonHeidi/notebooklm-clone/pull/9)). Ten static
  pages: home, product scope, UI research, the feasibility study as the
  architecture decision record, the roadmap, and the chronological session
  log with one page per handover. Header, sticky sidebar, prose pages;
  mobile nav is a no-JS `<details>` disclosure.
- **2026-08-18 — Legal pages, session C3**
  (PR [#14](https://github.com/DonHeidi/notebooklm-clone/pull/14)):
  `/impressum/` and `/datenschutz/` (with the `/privacy` redirect) and the
  footer legal nav, mirroring the marketing site — see
  `product/history/marketing.md` for the shared story.
- **2026-08-18 — This History section, session C4**
  (PR [#22](https://github.com/DonHeidi/notebooklm-clone/pull/22)). A
  `history` content collection pointed at `product/history/` and one page
  per package — the pages you are reading now.

## Decisions and why

- **Render, don't copy.** The site's founding rule (session C2): content
  collections point Astro's content-layer `glob` loaders at the repo-root
  `product/` and `handovers/` directories (`base: "../../product"`), so the
  canonical markdown files are rendered in place. Nothing is copied into
  `apps/docs`, no source file is ever edited from here, and presentation
  fixes are CSS-only (wide tables and code fences scroll inside their own
  `overflow-x` boxes). The C4 history section follows the same pattern —
  the canonical pages live in `product/history/`.
- **The provenance card.** Every rendered document opens with its canonical
  repo path as a marker-yellow chip linking to the file on GitHub, plus
  "Rendered from the repository — the file stays the source of truth." The
  site's one rule made visible; it doubles as the citation mechanism the
  whole product is about.
- **Marginalia identity reused, not imported** (session C2). Same
  paper/ink/marker-yellow tokens and type stack as the marketing site, but
  the fontsource packages were added in this workspace with `bun add` —
  the repo convention is to keep the two apps in sync by copying token
  changes, never by cross-workspace imports.
- **No docs framework, no search, no versioning, no theme toggle.**
  Hand-rolled was simpler at this page count (YAGNI); Shiki is pinned to
  `github-light` to match the single paper theme. The footer carries the
  same non-affiliation line as the marketing site.
- **Chronology-safe session URLs.** Session pages live at
  `/sessions/<full-file-slug>/` — the date-prefixed handover filename — so
  URLs sort chronologically and never collide. Titles and dates are
  recovered from each handover's H1, because the handover files have no
  frontmatter (and adding some would violate render-don't-copy).

## Problems and how they were dealt with

- **Canonical files have no frontmatter.** Astro content collections
  usually lean on frontmatter for titles and ordering; the handovers and
  product docs are plain markdown owned by other conventions. Resolved in
  C2 by recovering title and date from each file's H1
  (`# Session X — Topic (date)`) at build time rather than annotating the
  sources (PR [#9](https://github.com/DonHeidi/notebooklm-clone/pull/9)).
- **Handover assets aren't published.** Screenshot binaries under
  `handovers/assets/` are not part of the build; nothing in the markdown
  embeds them today, so no image handling was needed — but the C2 handover
  records that if a future handover embeds an image, the docs build needs a
  strategy (e.g. a passthrough copy). Consciously deferred.
- **The sessions sidebar won't scale forever.** C2 noted that at ~15+
  sessions the per-session sidebar group should collapse to just the
  "Session log" link. Still open; the count is at ten.
- **Zero external requests, verified not assumed.** The C2 review grepped
  `dist/` for external `<script>`/`<link>` tags and `url()` references —
  the only URLs in the output are content anchors inside rendered documents.
  The same check is repeated by later sessions touching the static sites
  (C3, C4).

## Where the docs site stands

Live at the Scaleway bucket endpoint since B2's deploy
(PR [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13)), rendering
product docs, decisions, roadmap, session log, legal pages — and now this
history. Open items: the sidebar-scaling note above and the shared-package
dedup for legal content (see `product/history/marketing.md`).
