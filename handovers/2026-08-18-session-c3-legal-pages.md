# Session C3 — Legal pages (2026-08-18)

## Goal

Both public static sites (`apps/marketing`, `apps/docs`) carry the legally
expected pages for an EU/Germany-published website — an Impressum (§ 5 DDG)
and a privacy statement (GDPR Art. 13) — linked from each site's footer,
before the sites go public on the Scaleway bucket endpoints (session B2).
Roadmap lane C, session C3.

## What was done

- **Owner input first.** The Impressum data (name, address, email, phone,
  no VAT ID) was dictated verbatim by the owner in-session — nothing was
  invented or inferred. The owner opted for **bilingual** pages.
- **Pages on both sites**: `/impressum/` and `/datenschutz/`, each a single
  bilingual page — German first (authoritative), English translation below,
  with `lang="de"` on the German section. `/privacy` is a static
  meta-refresh redirect to `/datenschutz/` via `redirects` in each app's
  `astro.config.mjs`, so the English URL works too.
- **Privacy statement describes reality, deliberately short**: fully static
  sites, no cookies, no tracking/analytics, no forms, self-hosted fonts, no
  external runtime requests; Scaleway Object Storage (fr-par, Scaleway SAS)
  as the sole processor with its server logs under Art. 6(1)(f) GDPR; the
  GitHub repo as the only notable external link; standard GDPR rights
  section (Art. 15–21, 77).
- **Footers**: both `SiteFooter.astro` components gained a
  `<nav aria-label="Legal">` with Impressum + Datenschutz/Privacy links next
  to the existing non-affiliation line.
- **Marketing header fix** (`SiteHeader.astro`): nav anchors changed from
  `#section` to `/#section` and the logo now links to `/`, so the header
  works from the new subpages (previously the marketing site was a
  one-pager and bare anchors were fine).
- **Content is mirrored, not shared.** The legal content is authored once
  and duplicated into both apps (no cross-workspace imports, per the repo
  convention). A future `packages/` shared package can deduplicate it —
  noted in the PR.
- **Verified**: `bun run build` passes in both apps; built legal pages have
  zero external asset references (checked in `dist/`); semantic heading
  hierarchy (h1 → h2 → h3), `<address>` elements, focus-visible styles and
  skip links come from the existing layouts.

## Decisions

- Bilingual-on-one-page (DE first, EN translation below) rather than
  separate language routes — keeps one file per page per site to sync, and
  a single canonical URL per document. `/privacy` exists as a redirect
  alias only.
- Phone number is listed in the Impressum (owner provided it for that
  purpose). No VAT ID exists; the pages state this explicitly (§ 27a UStG).

## Open items for later sessions

- **Webapp privacy statement is out of scope here.** Once the webapp goes
  public it needs its own, substantially larger privacy work: accounts
  (Supabase auth), uploaded documents, AI processing, storage locations,
  processors, retention. This session's texts cover only the two static
  sites.
- **Owner review of the legal texts.** The Impressum and privacy texts were
  drafted by an AI session from owner-supplied data; they are a template,
  not legal advice, and await the owner's (or a lawyer's) review before or
  shortly after going live.
- A shared `packages/` workspace package could hold the legal content once
  one exists, replacing the mirrored copies.

## How to verify

```sh
cd apps/marketing && bun run build   # builds /, /impressum/, /datenschutz/, /privacy/ (redirect)
cd apps/docs && bun run build        # same legal routes alongside the docs pages
```

Then open `dist/impressum/index.html` / `dist/datenschutz/index.html` in
each app and check the footer links on any page.
