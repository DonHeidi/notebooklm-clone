# Session C5 — Architecture views (2026-08-18)

## Goal

The Kruchten 4+1 architectural view model for Marginalia, canonical in
`product/architecture/` (five views + an index), rendered by the docs app
as an Architecture section — accurate to the code as merged on 2026-08-18.
Roadmap lane C, session C5.

## What was done

- **Six canonical pages in `product/architecture/`** (NEW directory, same
  convention as `product/history/`): `index.md`, `logical.md`,
  `process.md`, `development.md`, `physical.md`, `scenarios.md`. Written
  **code-first**: each view was drafted after reading the actual merged
  source (schema, repositories, services, route handler, proxy, ingestion
  pipeline, Dockerfile, Terraform, workflows, migrations), then
  cross-checked against `product/feasibility.md`, `product/security.md`,
  `product/scope.md` §10, and the A3/A4 handovers. Every claim carries a
  repo path (code span), a decision ID (D-n/SEC-n), or a PR link — C4's
  sourcing discipline (paths as code spans, PRs as full links).
- **Snapshot framing:** every page is date-stamped "as of 2026-08-18" with
  the in-flight caveat (A5 and D2 running; nothing of theirs described).
  Divergences from the scope ideal are stated plainly: no artifacts or
  permissions tables yet, notes table+repository exist but have no UI
  (A5's work), ingestion is in-process D-2 stage 1 (no workers), hosted
  Supabase pending B3, Azure Speech pending D2.
- **Scenarios are real traces, not hypotheticals:** the four use cases
  (PDF → chunks, grounded question → citation, sign up/log in,
  zero-source question) reuse the recorded evidence from A3/A4's
  end-to-end verification runs (chunk counts, SQL invariant checks, the
  307 smoke-test contract), each closing with the views it exercises.
- **Docs app renders the section**: an `architecture` content collection
  (glob at `../../product/architecture`), `/architecture/` rendering the
  canonical `index.md` through `DocPage` (unlike `/history/`, whose
  overview is authored in the app — here a canonical index exists),
  `/architecture/<id>/` via the C4 `[id].astro` pattern, an Architecture
  nav group (after Decisions — reading order: what for → how decided →
  what is → when → how it went), a home-page "Where to start" card, and
  the `apps/docs/AGENTS.md` content-roots line updated.

## Decisions

- **Diagrams: hand-authored ASCII in fenced code blocks.** The site's hard
  constraint is zero external runtime requests and no client-side JS;
  build-time mermaid (`rehype-mermaid`) needs a headless-browser
  dependency (playwright) — rejected. ASCII matches the existing
  convention (`product/feasibility.md`'s architecture diagram renders on
  `/decisions/` already), costs zero dependencies (no `bun.lock` touch),
  and stays readable in the raw markdown, which is itself canonical.
  Trade-off accepted: less visual polish than SVG; diagrams kept ≤ ~78
  chars wide, and on mobile they scroll inside their own code block
  (verified by screenshot).
- **`/architecture/` renders `index.md` instead of an app-authored
  overview** — the brief made the index canonical content, so the
  render-don't-copy rule applies to it too.

## Verified

- `bun run build` in `apps/docs`: passes, **33 pages** (27 before in this
  tree + 6 new: `/architecture/` + five views; the new handover adds its
  own session page on the next build).
- External-request grep over `dist/`: unchanged — no external
  `<script src>`, `<link href>`, or `url(http…)`; the only absolute URLs
  are content anchors (github.com PR links, the deployed-site URLs inside
  rendered handovers, the scaleway.com link in the legal pages).
- `bun test` from the worktree root: **80 pass, 0 fail**.
- Screenshots (headless Chromium, C4's fallback path):
  `handovers/assets/2026-08-18-c5-index.png` (overview, 1440),
  `…-c5-logical.png` (logical view incl. aggregate diagram, 1440),
  `…-c5-physical-mobile.png` (physical view, 390 — code-block scroll OK).

## Hot files

None — no new dependencies; `bun.lock` and root `package.json` untouched.

## Errors found in read-only files (not fixed here — boundaries)

- `infrastructure/AGENTS.md` ("Resources") still says "the
  `scaleway_container` resource stays commented until a first image is
  pushed" — `infrastructure/main.tf` has had it active since B2. A
  correct-the-record fix for the foreman or the next infrastructure
  session.

## Open items / next sessions

- **Appending is the contract** (same as history pages): sessions that
  change what a view describes (A5 citations UI/notes, D2 audio + its
  async pipeline, B3 hosted Supabase/demo mode, D-9 test migration)
  should update the affected view(s) in the same PR — the status
  callouts name today's in-flight caveats, which go stale otherwise.
- `architecturePages` in `apps/docs/src/nav.ts` holds the labels/order —
  new views need an entry there.
- After merge: foreman dispatches `deploy-static-sites`.
