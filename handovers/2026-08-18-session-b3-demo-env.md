# Session B3 — Demo environment: hosted Supabase + full deployed E2E (2026-08-18)

## Goal

Make the DEPLOYED product function end to end (`feat/demo-env`): hosted
Supabase behind the existing `marginalia-webapp` container, real runtime
env via Terraform, real build args via the deploy workflow, verified by a
full E2E on the public URL.

## What was provisioned

- **Supabase project `marginalia`**, ref `ahphkkvsofqmxkqzbica`, org
  `DonHeidi's Org` (`lvnsbuzfnbnigvuswtsl`), region **eu-west-3 (Paris)** —
  chosen for colocation with the Scaleway fr-par container (~1 ms DB
  round-trips instead of cross-region). Created via
  `supabase projects create` (CLI; the account token was created by the
  owner with `supabase login` — it lives in the system keyring, not
  `.env.local`).
- **Tier: Free — owner decision (2026-08-18)**, presented against
  feasibility's pause-risk row: $0 but the project **pauses after ~1 week
  idle**, and the demo URL dies until someone clicks Restore in the
  dashboard. Operational rule recorded in `product/feasibility.md`: check /
  restore (or upgrade to Pro for the window) before any demo.
- **DB password**: generated locally (32 alnum chars), staged in
  `.env.local` as `SUPABASE_DB_PASSWORD`, never echoed. TODO for owner: copy
  it (plus the new `TF_VAR_supabase_*` values) into the `marginalia` Proton
  Pass vault — they exist only in `.env.local` right now.

## Migrations + schema verification (hosted)

`supabase link` + `supabase db push` applied all 7 migrations cleanly.
Verified by SQL against the hosted DB (transaction pooler
`aws-1-eu-west-3.pooler.supabase.com:6543` — note **aws-1**, not aws-0):

- 8 tables in `public`, **all with `rowsecurity = t`**; 1 policy per table
  + 6 `storage.objects` policies.
- `chunks_embedding_idx` (HNSW) + `chunks_fts_idx` (GIN) present.
- Buckets `sources` and `artifacts`: private, 20 MB limit each.
- **pgvector 0.8.2 on Postgres 17.6 — identical to local** (0.8.2 / PG 17):
  the feasibility "local vs hosted pgvector" risk row is resolved.

## Auth config = code (`supabase config push`)

Hosted auth settings live in `supabase/config.toml` under
**`[remotes.demo]`** (project_id-keyed override section) and were applied
with `supabase config push --project-ref ahphkkvsofqmxkqzbica`. No
dashboard-only settings were needed — **zero unrecorded clicks**. Effective
hosted config:

- email+password signup on; **email confirmation OFF** (`mailer_autoconfirm`)
  — hosted has no SMTP/mail catcher; Supabase's built-in mailer is hard
  capped at 2 emails/hour anyway.
- `site_url` + redirect allow-list = the container's public endpoint.
- Rate limits (SEC-7): 30 sign-in/sign-ups per 5 min per IP, 30 OTP
  verifications per 5 min, 150 token refreshes per 5 min; email resend
  frequency kept at hosted's stricter 1/min, OTP length 8.
- CLI gotcha: `supabase config push` **auto-confirms when it detects an
  agent** — a piped "n" did not abort the first push. Treat every
  `config push` as an apply, not a preview.

## Env-wiring design (build-time vs runtime split)

- **Build-time (client bundle):** `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`
  are inlined by `next build` → they flow as Docker build args in
  `deploy-webapp.yml` from GitHub secrets. B2's placeholder secrets were
  replaced with the real hosted values via `gh secret set` (piped, no
  echo). The anon key is **publishable by design** (SEC-6): RLS enforces
  access, not key secrecy.
- **Runtime (container, via Terraform):** plain env
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `AZURE_SPEECH_REGION`, `TTS_PROVIDER`, `SCW_GENERATIVE_APIS_BASE_URL`;
  secret env `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`,
  `AZURE_SPEECH_KEY`, `SCW_GENERATIVE_APIS_KEY`. Values are sourced from
  `.env.local` as `TF_VAR_*` at apply time; nothing committed; no secrets
  in Terraform outputs. (They ARE in the Terraform state by nature of
  `secret_environment_variables` — recorded in SEC-6.)
- `DATABASE_URL` uses the **transaction pooler** (port 6543,
  `postgres.<ref>@aws-1-eu-west-3.pooler.supabase.com`); the app already
  sets `prepare: false` (`apps/webapp/src/server/db/index.ts`).
- **`webapp_min_scale` tfvar** (default 0 — owner decision): flip for demo
  windows with `terraform apply -var webapp_min_scale=1` (~€35/mo while 1).
- `memory_limit_bytes` aligned to the API's stored 2147000000 — B2's
  gotcha-5 drift is gone.

## Deploy + E2E evidence (public URL)

Deploy: `deploy-webapp` dispatched on main after the secrets update — run
[32139244122](https://github.com/DonHeidi/notebooklm-clone/actions/runs/32139244122),
green in 3m07s, smoke test `GET / -> HTTP 307` (auth proxy). Post-deploy
probe: `GET /` → 307 → `/login`, warm TTFB 0.21 s.

Full E2E driven headless (puppeteer-core + system chromium, scripts in the
session scratchpad) against
`https://marginalia6bb21b06-marginalia-webapp.functions.fnc.fr-par.scw.cloud`,
test users `b3-e2e-user1/2@example.com`:

| Step | Result | Timing |
| --- | --- | --- |
| Signup (user 1) | account created, **no email confirmation needed**, session live, lands on library | 1.1 s |
| Create notebook | server action → redirect to `/notebooks/414268fd-…` | 1.1 s |
| Ingest PDF (47 KB test corpus, "Veldenbruck brief") | client-side upload direct to hosted Storage (`sources` bucket, exercises inlined anon key + storage RLS) → parsed/chunked/embedded, status `ready` | upload 0.7 s; ingest 1 s |
| Ingest URL (deployed docs site) | fetched, parsed, `ready` | 2 s |
| Grounded chat | correct facts from the PDF (48,215 inhabitants; founded 1362) with `[1]` citation chips resolving to the PDF chunk; streamed | 4.5 s to persisted answer |
| Citation click-through | SourceViewer opens, passage highlighted (`mark[data-testid=cited-passage]`), badge "Cited passage — Page 1" | 0.4 s |
| Save to note | button flips to "Saved to note"; note persists across reload in Studio panel | < 1 s |
| Audio Overview (English) | "Exploring Veldenbruck and the Marginalia Project", **4:10 episode** (250 s), `duration_seconds=250` in DB; playback via signed URL from the hosted `artifacts` bucket, `audio.duration` 250.2 s in-browser | **15 s** generation (LLM script + Azure TTS + upload) |
| Logged-out access | `/` and notebook URLs → 307 → `/login` (curl + browser) | — |
| Foreign notebook | user 2 fetching user 1's notebook → **HTTP 404** | — |

DB cross-check (SQL on hosted): sources both `ready` (1 s / 2 s), 2 chunks,
artifact `audio_overview/ready/250s` generated in 15 s, 2 users.

E2E gotchas for whoever re-runs this: the Audio Overview dialog briefly
shows "Loading sources…" with **Generate disabled** — clicking too early is
a silent no-op (first attempt failed this way); wait for the source
checkboxes. React re-renders detach DOM nodes between query and click —
click inside `page.evaluate`, not via element handles.

## Cost delta

- Supabase Free: **$0** (pause trade-off accepted).
- Container: unchanged, min-scale 0 / max 2 → ~€0 idle.
- No new always-on resources. Demo mode remains an opt-in
  `-var webapp_min_scale=1` (~€35/mo) + optional Pro upgrade ($25/mo).

## Register/doc updates in this PR

- `product/feasibility.md`: free-tier row → accepted w/ operational rule;
  pgvector-version row → resolved (0.8.2 both sides).
- `product/security.md`: SEC-6 key inventory (hosted service-role key, DB
  password, account token in keyring; secrets-in-tfstate note), SEC-7
  hosted auth rate limits.
- `product/architecture/physical.md`: dated "now real" annotation + new
  *Hosted Supabase (B3)* section.
- `.env.schema`: declarations for `SUPABASE_ACCESS_TOKEN`,
  `SUPABASE_DB_PASSWORD`, `TF_VAR_supabase_*`, `TF_VAR_database_url`,
  `TF_VAR_azure_speech_key`.

## Not done / next

- **Custom domains / Edge Services**: not touched (time-allowing item;
  needs its own cost approval). Default endpoints serve the demo.
- Proton Pass: owner to store the new Supabase values (see above).
  > **Done (2026-08-18, owner, recorded by foreman):** `SUPABASE_DB_PASSWORD`
  > and the `TF_VAR_supabase_*` values are in the `marginalia` vault.
- Before-demo checklist: restore/upgrade Supabase if paused; optionally
  `-var webapp_min_scale=1`.
