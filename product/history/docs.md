# Docs site — project history

> **Status:** Snapshot as of 2026-08-18, written by session C4. Covers
> `apps/docs` through sessions C3 (PR [#14](https://github.com/DonHeidi/notebooklm-clone/pull/14))
> and C4 (PR [#22](https://github.com/DonHeidi/notebooklm-clone/pull/22)).
> Later sessions append below rather than rewriting.
> **Sources:** PR descriptions, `handovers/`.
>
> **Update (2026-08-18, session C8):** coverage extended through the full
> merged board — sessions C5, C6, C7, and C8 itself in the catch-up
> section below.

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

> **Update (2026-08-18, session C8):** superseded — see the catch-up
> section that follows; the site now also lives at `docs.mrgnl.eu` (B4).

Live at the Scaleway bucket endpoint since B2's deploy
(PR [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13)), rendering
product docs, decisions, roadmap, session log, legal pages — and now this
history. Open items: the sidebar-scaling note above and the shared-package
dedup for legal content (see `product/history/marketing.md`).

## Catch-up: sessions C5–C8 (appended 2026-08-18, session C8)

Written by session C8 from the session handovers and PR descriptions
(#28, #34, #41). Since C4, the site also gained its custom domain —
`https://docs.mrgnl.eu`, an Edge Services pipeline in front of the same
bucket (session B4, PR
[#45](https://github.com/DonHeidi/notebooklm-clone/pull/45),
`product/history/infrastructure.md`).

### What was built

- **2026-08-18 — Architecture section, session C5**
  (PR [#28](https://github.com/DonHeidi/notebooklm-clone/pull/28)). The
  Kruchten 4+1 views, canonical in `product/architecture/` and rendered
  through a new `architecture` content collection — written code-first
  from the merged source, with seven UML diagrams (class, sequence,
  component, deployment, use-case). Unlike `/history/`, the section's
  overview renders the canonical `index.md` (the render-don't-copy rule
  applied to the index itself).
- **2026-08-18 — Dependency rationale, D-10, and the FAQ, session C6**
  (PR [#34](https://github.com/DonHeidi/notebooklm-clone/pull/34)). The
  development view gained the per-dependency rationale tables, feasibility
  gained D-10 (the deliberate Scaleway-over-AWS decision with its
  interchange map), and `/faq/` renders the new `product/faq.md` — eleven
  reviewer questions, each answer routing into the deep docs.
- **2026-08-18 — Scope status badges, session C7**
  (PR [#41](https://github.com/DonHeidi/notebooklm-clone/pull/41)). Zero
  docs-app source changes: the insert-only annotations in
  `product/scope.md` (36 status badges + summary table) render through the
  existing product collection, blockquotes appearing as styled callouts —
  verified in the built output.
- **2026-08-18 — History/architecture catch-up, session C8** (this page's
  own section; PR number cited in the session's handover,
  `handovers/2026-08-18-session-c8-history-latest.md`). Docs-app change:
  the sidebar became independently scrollable (owner request
  mid-session) — the sticky nav gets its own `max-height` + `overflow-y`,
  so long navigation no longer requires scrolling the whole page.

### Decisions and why

- **Diagrams: PlantUML sources rendered to committed SVGs** (session C5,
  revised mid-session on owner review — the first iteration used
  hand-authored ASCII; the owner directed UML instead). The `.puml`
  sources are canonical in `product/architecture/diagrams/`; committed
  SVGs are regenerated by `diagrams/render.sh` using the official PlantUML
  Docker image, so neither Java nor Graphviz joins `mise.toml` or CI.
  Rendering is commit-time, never build- or page-load-time: the site stays
  free of client-side rendering and external requests (client-side
  mermaid.js and the headless-browser `rehype-mermaid` stayed rejected),
  and the images render on GitHub too.
- **`passthroughImageService()`** (session C5): Astro's content-layer
  markdown images otherwise invoke the default sharp service, which is not
  installed (the build failed) — and the only images are pre-rendered SVGs
  needing no raster transforms, so passthrough avoids a native dependency.
- **Canonical-link rewriting as a Sätteri hast plugin** (session C6,
  `src/canonical-links.mjs`). The FAQ links sibling docs with
  repo-relative markdown links (GitHub-navigable); Astro 7's default
  processor takes no rehype plugins, so a hast plugin rewrites known
  repo-relative `.md` links to the site routes rendering the same files —
  such links previously 404'd on the site. This added the site's one new
  dependency since C2 (`@astrojs/markdown-satteri`, explicit rather than
  transitive).

### Problems and how they were dealt with

- **Graphviz spreads deployment diagrams horizontally** (session C5): the
  topology diagram needed coarser artifact granularity plus hidden layout
  edges to fit the docs column (1854 → 1432 px).
- **`product/security.md` has no rendered route** (session C6): the FAQ
  links SEC topics via the logical/physical views instead; if a security
  page is ever added, `canonical-links.mjs` needs a rule for it. Still
  open.
- **The sessions sidebar keeps growing** (C2's scaling note): the count
  passed fifteen with this session's handover. C8 made the sidebar
  independently scrollable, which removes the immediate pain; collapsing
  the per-session group remains the recorded long-term option.

### Where the docs site stands (2026-08-18, after C8)

Live at `https://docs.mrgnl.eu`, rendering the product docs, decisions
(D-1…D-10), FAQ, scope with status badges, architecture views with UML
diagrams, per-package history (these pages), and the full session log —
all canonical files rendered in place, zero external requests. Open: the
security-register route question and the legal-content dedup
(`product/history/marketing.md`).
