# Session C4 — Project history (2026-08-18)

## Goal

A historical view of the project so far, one page per package: what was
built (dates, PR numbers), the technical decisions and why (linked to the
feasibility decision IDs), and the problems encountered and how they were
dealt with. Canonical content in `product/history/`, rendered as a History
section in the docs app. Roadmap lane C, session C4.

## What was done

- **Six canonical pages in `product/history/`** (NEW directory, same
  convention as the rest of `product/`): `webapp.md`, `supabase.md`,
  `infrastructure.md`, `marketing.md`, `docs.md`, `process.md`. Sourced from
  the merged PR descriptions (#1–#19), all ten handovers,
  `product/feasibility.md`, `product/security.md`, and the git log. Every
  claim carries its PR link inline; handovers and docs are referenced as
  repo paths. Problems follow one structure everywhere: what happened → how
  it was found → how it was resolved or consciously accepted (with SEC-n
  links where the register is the answer).
- **Each page is a date-stamped snapshot** ("as of 2026-08-18", in the
  status callout) with an explicit "later sessions append below" note, and
  ends with a "where it stands" section naming the open items.
- **Docs app renders the section**: a `history` content collection
  (glob loader at `../../product/history`), `/history/` overview page
  (card list, same pattern as `/sessions/`), `/history/<id>/` pages through
  the existing `DocPage` layout — provenance card included. Nav gains a
  History group (Overview + the six pages, reading order maintained in
  `src/nav.ts` because the canonical files have no frontmatter, same
  reasoning as the sessions). Home page "Where to start" gained a Project
  history card. `apps/docs/AGENTS.md` updated to mention the new content
  root. No timelines/graphics (YAGNI, per brief).

## Decisions

- **PR references are full GitHub links, handover/doc references are code
  spans.** Relative markdown links between `product/history/` files would
  break on the docs site (its URLs don't mirror the repo layout), and the
  existing product docs already use code-span paths — so cross-page
  references use paths, and only PRs (which have one canonical URL) are
  linked.
- **Ordering/labels for the six pages live in `nav.ts`**, not in
  frontmatter — the canonical files stay plain markdown like everything
  else in `product/`.
- **Three brief-mentioned incidents were left out for lack of a record**:
  a shadcn CLI flag change, a GitHub 503 window during merges, and "the B1
  false start" appear in no PR, handover, product doc, or commit. Per the
  accuracy rule (every claim traceable), the pages don't assert them; the
  PR asks the foreman to supply the record if they should be added.

## Verified

- `bun run build` in `apps/docs`: passes, **26 pages** (18 before + 7 new:
  `/history/` + six pages + this handover's own session page).
- External-request grep over `dist/`: unchanged — no external
  `<script>`/`<link>`/`url()`; the only absolute URLs are content anchors
  (github.com, the deployed-site URLs quoted inside the rendered B2
  handover, one scaleway.com link in the legal pages).
- `bun test` from the worktree root: 52 pass, 0 fail.
- Screenshots (headless Chromium — the chrome-devtools MCP browser was in
  use by another session): `handovers/assets/2026-08-18-c4-history-index.jpeg`
  (overview, 1440), `…-c4-history-webapp.jpeg` (webapp page, 1440),
  `…-c4-history-mobile.jpeg` (process page, 390).

## Hot files

None — `bun.lock` and root `package.json` untouched (no new dependencies).

## Open items / next sessions

- **Appending is the contract.** Future sessions (A4, A5, B3, D2, …) should
  append to the relevant history page(s) in the same PR that does the work,
  or the foreman batches it — otherwise the snapshot dates go stale
  silently.
- The docs `historyPages` list in `apps/docs/src/nav.ts` must gain an entry
  if a new package (e.g. `packages/*`) gets a history page.
- After merge: foreman dispatches `deploy-static-sites` so the history goes
  live.
