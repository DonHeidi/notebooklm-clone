# Session C6 — Dependency + platform rationale, FAQ (2026-08-18)

## Goal

Three additions to the docs (roadmap C6): a dependency overview with
per-dependency rationale in the development view; the owner's deliberate
Scaleway-over-AWS decision recorded as feasibility **D-10** and referenced
from the physical view; and a FAQ (`product/faq.md`) in the docs Start
section routing anticipated reviewer questions into the deep docs.

## What was done

- **Dependency overview** (`product/architecture/development.md`, extended
  with a dated note): one table per workspace — webapp runtime, webapp dev,
  the two static sites, root tooling + mise pins, infrastructure, CI
  actions — each row dependency → purpose → why, citing the decision
  (D-n), verdict (F-n), or session PR where the reason is on record, and
  saying plainly where a choice was just a framework/generator convention.
  No version numbers in the doc: `bun.lock` and `mise.toml` are named as
  the authoritative record. An "explicitly rejected or deferred" list
  covers jsdom, pdf-parse, mammoth (A3), the Azure Speech SDK (D2), agent
  frameworks (D-6), and PGlite (D-9).
  - **Sourcing caveat, recorded in the doc itself:** three library-level
    details (linkedom over jsdom, gpt-tokenizer's pure-TS property,
    pdf-parse's Bun crash) come from the F-4 research pass whose *summary*
    — not detail — landed in feasibility.md; they are restated from that
    research and marked "(F-4 pass)". Everything else traces to a repo
    document or PR.
- **D-10** (`product/feasibility.md`, appended after D-9): the owner's
  rationale recorded faithfully — the target company works with AWS;
  Scaleway is a deliberate deviation (cost, less organisational overhead,
  deliberately interchangeable building blocks). Substantiated with an
  interchange map verified against the merged code: same Docker image →
  App Runner/Fargate; `aws s3 sync` already drives the S3-compatible
  storage; the s3 state backend loses its `skip_*` flags and *gains*
  locking; registry → ECR; the one proprietary workflow touch (43 lines of
  Containers-API PATCH/rollout in `deploy-webapp.yml`) → an App Runner
  deploy step; D-4's abstraction → the Bedrock provider package. Honest
  caveats quantified: 8 Terraform resources (~170 lines) are a rewrite,
  embedding-model changes mean re-embedding, cost tables don't transfer.
  `product/architecture/physical.md` gained a short "Platform choice"
  section (dated extension) pointing at D-10.
- **FAQ** (`product/faq.md`, new): eleven questions, one H2 each, answers
  2–4 sentences, every answer ending in a link to the deep doc. All eleven
  seed questions from the brief were answerable from the record — none
  skipped. The why-human-in-the-loop rationale had no on-record source, so
  `product/history/process.md` gained a dated "Why human-in-the-loop"
  section carrying it (owner via foreman exchange, 2026-08-18); the FAQ
  links there, staying a routing layer.
- **Docs app** (`apps/docs`): `/faq/` page rendered from the product
  collection (which already globs `product/*.md`); a "Quick answers" card
  first in the Start section's card list; a "Quick answers" nav entry
  under Start. Plus one enabling change:
  - **Canonical-link rewriting.** The FAQ links to sibling docs with
    repo-relative markdown links (GitHub-navigable). Astro 7's default
    Sätteri processor doesn't take rehype plugins, so
    `src/canonical-links.mjs` is a Sätteri **hast plugin** (registered via
    `markdown.processor: satteri({ hastPlugins })`) that rewrites known
    repo-relative `.md` links to the site routes rendering the same files.
    Applies to all rendered markdown — such links previously 404'd on the
    site. `@astrojs/markdown-satteri` added via `bun add` (it was already
    in the tree as an astro dependency; the explicit dep avoids relying on
    transitive resolution).

## Verification

- `bun run --filter '@notebooklm-clone/docs' build`: 37 pages, exit 0.
- External-request grep over `dist/` (C2's check): 0 external
  `<script src>`/`<link href>`/`url()` references — unchanged.
- Shiki output unchanged (`astro-code github-light` still emitted).
- FAQ links verified rewritten in built HTML (`/decisions/`,
  `/history/…/`, `/architecture/…/`); headless-chromium screenshots of
  `/faq/`, `/`, and the development view reviewed in-session.

## Notes for later sessions

- The development view's PGlite row and D-9 references say A7 was in
  flight — whichever session merges A7 should check those lines still
  read correctly (the D-9 paragraph's own "not yet implemented" marker is
  A7's to remove).
- `product/security.md` has no rendered route on the docs site; the FAQ
  therefore links SEC topics via the logical/physical views. If a
  security page is ever added, consider a `security.md` rule in
  `apps/docs/src/canonical-links.mjs`.
- Hot file: `bun.lock` (one added docs dependency). No overlap with A7's
  surfaces except the planned trivial append-append conflict on
  `product/feasibility.md` (D-9 edits vs. appended D-10).
