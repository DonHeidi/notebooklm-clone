# Marketing site — project history

> **Status:** Snapshot as of 2026-08-18, written by session C4. Covers
> `apps/marketing` through session C3 (PR [#14](https://github.com/DonHeidi/notebooklm-clone/pull/14)).
> Later sessions append below rather than rewriting.
> **Sources:** PR descriptions, `handovers/`.

## What was built

- **2026-08-17 — Astro scaffold** (PR [#1](https://github.com/DonHeidi/notebooklm-clone/pull/1)):
  create-astro minimal template + Tailwind.
- **2026-08-17 — The Marginalia landing page, session C1**
  (PR [#7](https://github.com/DonHeidi/notebooklm-clone/pull/7)). A single
  static page, componentized (hero, grounded demo, how-it-works, audio,
  scope, CTA), shipping **zero JavaScript**. Screenshots (desktop 1440,
  mobile 375) committed under `handovers/assets/`.
- **2026-08-18 — Legal pages, session C3**
  (PR [#14](https://github.com/DonHeidi/notebooklm-clone/pull/14)).
  `/impressum/` (§ 5 DDG) and `/datenschutz/` (GDPR Art. 13) ahead of the
  B2 go-live, with `/privacy` as a static redirect alias and a
  `<nav aria-label="Legal">` in the footer.

## Decisions and why

- **The name: Marginalia** — "notes in the margins of your sources".
  Proposed in C1 as a placeholder and **confirmed by the owner during the
  session**; the footer's working-title hedge was removed, and an explicit
  non-affiliation line (no Google / NotebookLM / Gemini association) stays
  on every public page. The infrastructure resource prefix was renamed to
  `marginalia` in the same wave, before Terraform's first apply
  (PR [#11](https://github.com/DonHeidi/notebooklm-clone/pull/11)).
- **A page that shows its work.** The design direction applies the product's
  grounding principle to the marketing itself: claims carry superscript
  citation chips resolving to a Footnotes section that links to the repo's
  real `product/scope.md` and `product/roadmap.md`, and the hero holds a
  CSS-only demo where hovering/focusing a citation chip highlights the exact
  cited passage in the source cards (`:has()` + `:target` — no script).
  Zero JS keeps the static-bucket deployment trivial.
- **The visual identity** (reused by the docs site): paper white `#fafaf6`,
  ink blue `#17293b`, one marker-yellow accent `#ffe14d` (the researcher's
  highlighter); Newsreader (display), Public Sans (body), IBM Plex Mono
  (chips and labels), all self-hosted via fontsource — no runtime CDN, font,
  or script requests, verified by grepping `dist/`. Light theme only, on
  purpose.
- **Honest-copy constraints.** Features are limited to the actual prototype
  scope; Audio Overviews are badged "in development" and limited to a single
  narrator; a "Small on purpose" section lists the cut list under "Not yet —
  and not pretended". No testimonials, logos, pricing, ratings, or
  fabricated numbers; every CTA is a real link (repo or in-page anchor).
- **Bilingual legal pages on one URL each** (session C3). German first
  (authoritative), English translation below, `lang="de"` on the German
  sections — one file per page per site to keep in sync, one canonical URL
  per document; `/privacy` exists only as a redirect. The Impressum data
  (name, address, email, phone, no VAT ID) was dictated verbatim by the
  owner in-session; nothing was invented. The privacy statement is
  deliberately short because it describes reality: fully static, no cookies,
  no tracking, no forms, self-hosted fonts, Scaleway Object Storage as the
  sole processor.
- **Accessibility floor** (session C1): semantic landmarks, skip link,
  keyboard-reachable citation chips (real anchors), `:focus-visible` styles,
  `prefers-reduced-motion` disables all motion, and programmatically
  verified contrast — all text pairs ≥ 6.7:1.

## Problems and how they were dealt with

- **Header anchors broke on subpages.** The site was a one-pager, so nav
  links were bare `#section` anchors; adding `/impressum/` and
  `/datenschutz/` broke them from those pages. Found in C3 while adding the
  pages; fixed by making anchors root-relative (`/#how-it-works`) and
  pointing the logo at `/` (PR [#14](https://github.com/DonHeidi/notebooklm-clone/pull/14)).
- **Legal content is mirrored, not shared.** The same Impressum/privacy
  content exists in both static apps because the repo convention forbids
  cross-workspace imports and no shared `packages/` package exists yet.
  Consciously accepted, with the future dedup path noted in the C3 PR.
- **The legal texts are a template, not legal advice.** Drafted by an AI
  session from owner-supplied data; the surrounding legal wording awaits the
  owner's (or a lawyer's) review — recorded prominently in the PR and
  handover as an open item.
- **No "Open the app" CTA yet.** The only honest CTA today is the
  repository; the C1 handover notes the hero should gain a real app link
  once the webapp ships under a real domain.

## Where the marketing site stands

Live at the Scaleway bucket endpoint since B2's deploy
(PR [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13)), legally
furnished, tracking-free. Open items: owner review of the legal texts, a
webapp privacy statement when the webapp goes public (explicitly out of
C3's scope), and the app CTA.

> **Update (2026-08-18, session C8):** no marketing-lane session ran after
> C4, but the platform moved under the site: it serves at
> `https://www.mrgnl.eu` (Edge Services pipeline, session B4, PR
> [#45](https://github.com/DonHeidi/notebooklm-clone/pull/45)), with the
> apex `mrgnl.eu` 301-redirecting there and the old bucket endpoint still
> serving; and the webapp *is* public now (`https://app.mrgnl.eu`), so the
> webapp-privacy-statement and app-CTA items above are live open items, no
> longer conditional. See `product/history/infrastructure.md`.
