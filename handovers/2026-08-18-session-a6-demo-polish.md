# Session A6 — Demo polish (2026-08-18)

**Branch:** `feat/demo-polish` · **Spec:** roadmap A6 (empty states, error
handling, NF-15 quotas, seeded demo notebook)

## Goal and outcome

The webapp reads demo-ready: every screen has a designed empty state,
failures surface visibly, per-user quotas close the NF-15 minimum and
advance SF-11, and `bun run seed:demo` provisions the demo notebook — which
is also the data-recovery procedure. All shipped; details below.

## The lint item was already fixed (record corrected)

The brief assigned A6 the studio lint failure from #28/#29, but PR
[#35](https://github.com/DonHeidi/notebooklm-clone/pull/35)
(`fix/studio-lint`) had already landed it and main's CI has been green
since (verified: `bun run lint` exits 0 on main; recent `ci` runs conclude
success). Instead of re-fixing, this session annotated the A7 handover's
open item — correct the record, not just the code.

## What was done

- **Empty states** (icon + copy + CTA, shadcn/Tailwind only): library
  (dashed-border block with its own New-notebook button), sources panel
  (Add sources CTA), chat (guidance + one-click example-question chips
  when sources are selected), studio (CTA opens the Audio Overview
  dialog), notes (designed empty + skeleton rows for the pre-load `null`),
  note dialog (empty-content state with Edit CTA). Plus the A5-deferred
  viewer state: a citation landing on a still-processing source shows a
  spinner + explanation, and the existing poll swaps the content in when
  ready.
- **Error surfaces**: `error.tsx` (reset + back-to-library, digest shown),
  `global-error.tsx` (self-contained html/body), `not-found.tsx` (styled
  404 — `notebooks/[id]`'s `notFound()` lands here now), `loading.tsx`
  skeletons for library and workspace. Source/artifact rows print their
  failure reason as visible text instead of tooltip-only. The inline
  save-as-note error the brief lists was already shipped by A5
  (`AssistantActions` error span) — verified, kept.
- **Per-user quotas (SF-11 / NF-15 minimum)** — constants in the owning
  services, enforced via repository count queries, no schema changes; the
  day window is the current UTC calendar day (`startOfUtcDay`,
  `src/server/services/quota.ts`):
  | Quota | Value | Enforcement point |
  | --- | --- | --- |
  | Notebooks per user | 20 | `notebook-service.createNotebook` → `notebookRepository.countByOwner` |
  | Chat messages per notebook per day (user role only) | 50 | `chat-service.assertChatMessageQuota`, called by the chat route **before** retrieval → `conversationRepository.countUserMessagesForNotebookSince` |
  | Audio overviews per user per day | 10 | `audio-overview-service.createAudioOverview` → `artifactRepository.countByOwnerSince` |
  Surfacing: notebook rejection inline under the New-notebook button
  (client component + ActionResult), chat as HTTP 429 whose body text the
  AI-SDK transport delivers into the existing dismissible banner
  (verified E2E), audio through the config dialog's existing error slot.
  Limitation, documented in code: regenerations are not counted against
  the daily audio cap (no generation-event log without a schema change);
  they stay bounded by the 1-concurrent and 20-per-notebook caps.
- **Seed script**: see below.
- **Tests**: `src/server/services/quota.test.ts` — 11 DB-backed tests
  (caps hit/free/per-user/per-notebook scoping, role filtering, `since`
  boundaries). Full suite **154 pass, 0 fail, exit 0** (baseline 143).

## Seed = demo opening state = data recovery

`apps/webapp/scripts/seed-demo.ts`, invoked as

```sh
# local stack
SEED_DEMO_USER_EMAIL=<email> bunx varlock run -- bun run seed:demo
# hosted project (remaps the TF_VAR_* values onto the runtime vars)
SEED_TARGET=hosted SEED_DEMO_USER_EMAIL=<email> bunx varlock run -- bun run seed:demo
```

(from `apps/webapp`; in a worktree, `varlock run --path ../.. --`).

- **Why runtime-through-services, not `supabase/seed.sql`**: chunks and
  embeddings must be real for retrieval and citations to work, and
  embeddings cannot be generated from SQL. The script goes create →
  `ingestSource` (real parse/chunk/embed) → `prepareGrounding` +
  `generateText` (the route's service path minus streaming) →
  `persistUserMessage`/`persistAssistantMessage` with
  `buildCitationInputs` → `saveMessageAsNote`.
- **Content**: three curated excerpts of this repo's own product docs
  (scope, architecture, security register) — self-owned, demo-safe.
- **Idempotency**: the notebook title ("Marginalia — Product Tour") is the
  marker; every step re-checks before acting (existing ready source by
  title is kept, an existing note ends the run). Re-runs are no-ops;
  half-finished runs resume.
- **New env** (declared schema-only in `.env.schema`):
  `SEED_DEMO_USER_EMAIL` (account must exist — sign it up first),
  `SEED_TARGET` (`local` default | `hosted`).
- **Recovery procedure** (Free tier has no backups — this is the plan):
  if the hosted project is lost, recreate it (B3/B5 infra path), sign the
  demo account up again, run the hosted command above. Verified against
  the hosted project on `b3-e2e-user1@example.com`: first run seeded the
  notebook + 3 ready sources then hit a transient provider timeout at the
  chat step; the **re-run resumed** (skipped ready sources) and completed
  — 3 citations, note saved. The resumability story proved itself on a
  real failure.
- **NOT yet run for the actual demo account** — the foreman/owner should
  run it against the demo-day account before the demo (the credential is
  in Proton Pass; the account email choice is the owner's).

## Verified locally

- `bun test` from root: **154 pass, 0 fail, exit 0** · `bun run lint`
  exit 0 · `next typegen && tsc --noEmit` clean · `bun run build` green.
- E2E on `supabase start` + real Scaleway (fresh user
  `a6-demo@example.com`, headless chromium/puppeteer-core): signup →
  empty library → empty workspace (all four column states) → pasted-text
  source → chat empty state with example chips → chip click → streamed
  answer with citation → chip opens viewer with highlighted passage →
  SSRF-blocked URL source shows visible row error → `seed:demo` run +
  idempotent re-run → demo notebook in library → seeded note's citation
  chip resolves to a highlighted passage → notebook quota rejection
  inline (20/20) → chat quota 429 in the dismissible banner (50 messages
  seeded via SQL as test data). Screenshots:
  `handovers/assets/2026-08-18-a6-*.jpeg` (1–11).

## Gotchas / notes for future sessions

1. In a worktree, `bunx varlock run` needs `--path ../..` from
   `apps/webapp` (the `.env.local` symlink lives at the worktree root).
2. The AI-SDK `DefaultChatTransport` surfaces a non-OK response's body
   text as `error.message` — that is what makes the 429 copy appear in
   the chat banner verbatim. If the transport is ever swapped, re-verify.
3. The seed script keeps its content as constants (not file reads) so it
   survives doc refactors; update the excerpts if the product story
   changes materially.
4. E2E: shadcn Tabs unmount inactive tab content — switch tab first, then
   wait for the tab's inputs. Citation chips are `[data-chunk-id]`
   elements; programmatic `.click()` avoids the A5 tooltip hit-test quirk.
5. Local E2E leftovers on the local stack: `a6-demo@example.com` with 20
   notebooks (one chat-capped until midnight UTC). Harmless; delete at
   will.

## Hot files / boundary notes

- `apps/webapp/package.json`: added the `seed:demo` script only (not a
  hot file; no dependencies added — the E2E puppeteer-core lives in the
  session scratchpad, not the repo).
- `.env.schema`: SEED_* declarations only, schema-only.
- `product/scope.md` (SF-11/NF-15 status + SF-11 table row),
  `product/security.md` (SEC-7 mitigation column only), A7 handover
  annotation — all correct-the-record edits required by the brief.
- No toast library added: the existing inline-banner/ActionResult idiom
  covered every case.

## Open questions / next sessions

- Request-RATE limiting (SEC-7) remains open — quotas bound daily volume,
  not burst rate.
- The audio daily cap counts creations, not regenerations (schema-free
  compromise; a generation-event log would need a migration).
- URL-addressable source viewer (A3/A5) still open; unchanged here.
