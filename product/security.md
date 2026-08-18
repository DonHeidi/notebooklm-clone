# Security register

> **Status:** Living document, started 2026-08-18. One entry per known
> security concern: what it is, what mitigates it today, whether the residual
> risk is accepted for the prototype, and the trigger that ends the
> acceptance. Review sessions append here instead of burying findings in PR
> comments. Scope-doc anchors: NF-07 (security), NF-17 (safety/prompt
> injection).
>
> **Acceptance model:** "Accepted (prototype)" means: single-tenant-ish demo,
> authenticated users only, private repo, no untrusted public traffic. Every
> acceptance below names the trigger that revokes it — most commonly "before
> public exposure" = opening signups/URLs to people we don't know.

## Open — accepted for the prototype

| ID | Area | Concern | Current mitigation | Hardening trigger / plan |
| --- | --- | --- | --- | --- |
| SEC-1 | Ingestion (A3) | **SSRF via URL sources.** The guard blocks loopback/private/link-local hostnames but checks only the *original* hostname while `redirect: "follow"` is on — a public URL 30x-ing to a private address gets fetched. No DNS resolution check (rebinding). | Hostname blocklist regex; http(s)-only; 15s timeout; content-type check; authenticated users only; container has no privileged internal network neighbors today. | Before public exposure, or before the container gets internal neighbors (e.g. VPC services): resolve DNS and re-check each redirect hop (undici custom dispatcher or manual redirect loop), or route fetches through an egress proxy. |
| SEC-2 | Ingestion (A3) | **Oversized/hostile files cost parse CPU.** The 20 MB cap is enforced at upload (client + bucket + server), but word-count limits are enforced only *after* parsing — a crafted PDF can spike CPU/memory in-process (mammoth-class parser bombs noted in feasibility research too). | 20 MB hard cap; in-process ingestion means a crash affects one request, status goes `failed`; authenticated users only. | D-2 stage 2 (Serverless Jobs) isolates parsing in a disposable container with its own CPU/memory limits — the structural fix. Until then, acceptable. |
| SEC-3 | Ingestion / chat (A3→A4) | **Prompt injection via source content (NF-17).** Parsed web pages and documents are untrusted input that will be fed into A4's chat prompts. A3 only stores text (no execution), so the risk activates with A4. | None yet — A3 does not prompt with content. | **A4 must treat chunks as data:** wrap retrieved chunks in clearly delimited blocks, instruct the model that source content is quoted material and never instructions, and never let source text reach tool-calling authority. Carried into the A4 brief. |
| SEC-4 | Platform (B1/B2) | **Spike route publicly reachable.** `/api/spike-stream` on the deployed container (B1's image) was unauthenticated on a public URL, proxying to the Generative-APIs account (token cost abuse). | **Largely resolved by PR #13 (B2, 2026-08-18):** the deployed container now runs current main, so the route sits behind A2's auth proxy — verified by curl at review (307 → /login on `/` and `/api/spike-stream`). | Full close when A4 deletes the route (it remains auth-gated dead code until then). |
| SEC-5 | AuthZ (A1/A2) | **RLS is defense-in-depth, not the primary guard.** The app connects via the pooler as `postgres`; the service-role storage client bypasses RLS entirely. Authorization correctness rests on the app layer (every repository/service call owner-scoped). | Consistent `ownerId`-from-JWT pattern (`requireUser()`); owner-scoping tested (incl. cross-user 404s); RLS policies on all 7 tables + storage objects for any PostgREST/Realtime path. | Standing review item: every new repository/service method must take and apply `ownerId`. If Realtime/PostgREST client access is ever added, RLS becomes load-bearing — re-audit policies then. |
| SEC-6 | Secrets | **Service-role key + Scaleway/Azure keys are high-privilege.** `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS; SCW keys control infra; keys live in dev `.env.local` files and GitHub Actions secrets (B2). | varlock schema keeps values out of the repo; Proton Pass is the store; keys never printed in sessions/PRs (convention enforced in briefs); `.env*` gitignored. | Rotate any key that ever appears in a log/transcript. B2 review: confirm secrets flow via `gh secret set` without echo. Later: scoped IAM policies per key (Scaleway IAM application per use). |
| SEC-7 | Abuse limits (NF-15) | **No rate limiting on actions/chat.** Guard limits exist (20 MB, 200k words, 50 sources/notebook) but nothing limits request *rate* — an authenticated user can hammer ingestion/embedding (token spend). | Closed signup circle during prototype; Scaleway org-level rate limits backstop token spend. | Before public exposure: per-user rate limits on server actions and (critically) A4 chat + D2 audio generation; quota columns exist conceptually in scope SF-11. |
| SEC-8 | Uploads | **No malware scanning; filenames stored raw.** Uploaded files are stored and parsed but never scanned (NF-07 lists scanning); original filenames land in path segment 3 and DB titles. | Private bucket; files only ever parsed server-side, never served back for download to other users; path prefix validated. | Only relevant with sharing (SF-05) or file re-download features — add scanning + filename sanitization then. |
| SEC-9 | Web (A2) | **No CSRF-hardening beyond framework defaults; no security headers set.** Next server actions have same-origin protections built in, but we set no explicit CSP/HSTS/frame headers. | Framework defaults (Server Actions origin checks); TLS via platform endpoints. | B3/demo-hardening: add security headers (CSP tuned for the app, HSTS, X-Frame-Options) in next.config or at the edge. |

## Closed / resolved

| ID | Area | Concern | Resolution |
| --- | --- | --- | --- |
| — | — | *(none yet — move rows here with the resolving PR #)* | — |

## Process

- **Adding entries:** any session or review that surfaces a concern appends a
  row (next SEC-n) in its PR; the foreman keeps this file consistent.
- **Closing entries:** move the row to Closed with the PR number that
  resolved it. Do not delete rows — the register is also the audit trail of
  what was consciously accepted and when.
- **Standing review checks** (foreman, every PR): new repository/service
  methods owner-scoped (SEC-5); no secret values in code, logs, or PR text
  (SEC-6); new outbound fetches go through the SSRF-guarded path (SEC-1);
  anything touching A4 prompting respects SEC-3.
