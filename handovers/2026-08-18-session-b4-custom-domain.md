# Session B4 — Custom domain mrgnl.eu (2026-08-18)

## Goal

`feat/custom-domain`: the product on its own domain with HTTPS everywhere —
app./docs./www.mrgnl.eu + apex redirect — old default endpoints intact.

## Decisions (owner, 2026-08-18)

- **Registrar: Scaleway** — the root zone is native; no delegation step.
- **Edge Services Starter plan approved: €0.99/mo + €4/mo** for the second
  pipeline (2 pipelines needed; Professional at €12.99/10 loses for our
  count). Webapp uses the free native container-domain path, so it consumes
  no pipeline.
- **Apex approach: serverless redirect function** — Edge Services is
  **subdomain-only** (feasibility F-8 claim re-verified against current
  docs; no correction needed). Functions accept apex hostnames via ALIAS
  and auto-issue a certificate, so `mrgnl.eu` gets a true HTTPS 301 to
  `https://www.mrgnl.eu` with path preserved.

## Design (infrastructure/domain.tf)

- `app.mrgnl.eu`: `scaleway_domain_record` (CNAME) +
  `scaleway_container_domain` — platform issues the cert via HTTP-01
  (~ready in minutes).
- `docs./www.`: per site `scaleway_edge_services_{pipeline, backend_stage
  (s3 bucket website), tls_stage (managed LE), dns_stage (fqdn),
  head_stage}` + the Starter `scaleway_edge_services_plan`.
- Apex: `scaleway_function` (node24, ESM handler under
  `infrastructure/functions/apex-redirect/`) + `scaleway_function_domain` +
  ALIAS record.
- Supabase `[remotes.demo]`: `site_url = https://app.mrgnl.eu`; old
  container endpoint kept in `additional_redirect_urls`. Applied via
  `supabase config push`.
- Astro `site` fields → `https://docs.mrgnl.eu` / `https://www.mrgnl.eu`;
  static sites redeployed via `deploy-static-sites` dispatched on this
  branch (42 s, green).

## Platform gotchas found (worth remembering)

1. **Edge Services owns the docs/www CNAMEs.** For Scaleway-managed zones
   it auto-creates the CNAME to its pipeline endpoint (TTL 60) and updates
   it when a pipeline is rebuilt. A Terraform-managed duplicate fails on
   CNAME uniqueness — these two records are the documented exception to
   "all records in code" (comment in domain.tf).
2. **Concurrent dns_stage creation races** (`404 edge_api_key not Found`)
   — creating two DNS stages in parallel on first Edge Services use in a
   project failed for one of them; the retry succeeded. Worse, the race
   left the docs TLS stage referenced in TF state but **missing on the
   platform** (GET → 404), which broke the pipeline
   (`pipeline_configuration_failed`) and required a state-rm + pipeline
   rebuild. Recommendation: `-parallelism=1` for first-time Edge applies.
3. **Scaleway node functions are ESM** — the runtime wraps sources with
   `"type": "module"`; `module.exports` fails to import (HTTP 500,
   `handler could not be imported`). Use `export const handle = …`.
4. **Stage deletes 500 while referenced.** DELETE on a tls_stage that a
   dns_stage still links (and on a head_stage whose target is gone)
   returns a bare 500, which surfaces through Terraform as an opaque
   `Internal error`. Replace linked stages *together* so Terraform
   detaches in dependency order; when the platform object is already
   gone, `terraform state rm` + re-apply instead of `-replace`.
5. **The provider cannot see head-stage drift.** After the docs rebuild
   the platform reported `pipeline_missing_head_stage` while
   `terraform plan` said "no changes" — the head pointer had to be
   state-rm'd and re-applied. Check the pipeline's `errors[]` via the API
   whenever status is `error`; the fine-grained codes never surface in
   Terraform.
6. **Destroying a dns_stage deletes its auto-managed CNAME — recreating
   one does NOT bring it back** (API path; the console flow would). The
   record had to be re-added manually (matching the platform's TTL-60
   shape), then a no-op PATCH on the dns_stage (`fqdns` unchanged)
   forced revalidation: status went error → pending → ready within a
   minute. Side effect: resolvers that queried during the deleted window
   negative-cache the name — looks like an outage from an affected
   machine while every fresh resolver works.

## Verification evidence (2026-08-18)

| Check | Result |
| --- | --- |
| `https://app.mrgnl.eu/` | 307 → `/login`, cert CN=app.mrgnl.eu, Let's Encrypt (YR2), expires 2026-11-16 |
| `https://www.mrgnl.eu/` | HTTP 200, cert CN=www.mrgnl.eu, LE (YR1), expires 2026-11-16 |
| `https://mrgnl.eu/some/path` | **301 → `https://www.mrgnl.eu/some/path`**, cert CN=mrgnl.eu, LE (YR1), expires 2026-11-16 |
| `https://docs.mrgnl.eu/` | HTTP 200, cert CN=docs.mrgnl.eu, LE (YR2), expires 2026-11-16 (after the gotcha-4/5/6 repair sequence) |
| Auth round trip on app.mrgnl.eu | anon → /login redirect; signup (1.3 s) → library; sign out; login → library — all on the new origin |
| Old endpoints | webapp default 307, docs bucket 200, marketing bucket 200 — nothing broken |

DNS propagation caveat: fresh records (apex/app TTL 3600, pipeline CNAMEs
TTL 60) — resolvers that cached NXDOMAIN before registration may lag up to
their negative-TTL.

### Docs cert — what actually happened

The docs pipeline broke in three stacked ways, all traced and fixed
(gotchas 2, 4–6): the initial `edge_api_key` race left a TLS stage in TF
state that the platform had deleted; the repair rebuild lost the pipeline's
head-stage pointer (invisible to `terraform plan`); and rebuilding the DNS
stage silently deleted the auto-managed CNAME without recreating it. The
Let's Encrypt certificate itself issued fine (15:39Z) once validation could
reach a coherent pipeline; final state `ready` + HTTP 200 at 16:37Z. The
`www` pipeline — created in one clean serial pass — never had any of these
problems, which is the strongest argument for `-parallelism=1` on
first-time Edge Services applies.

## Cost delta

Domain registration: owner-paid (Scaleway). Edge Services: **€4.99/mo**
(Starter + 1 extra pipeline). Redirect function: ~€0 (free tier,
min_scale 0). DNS zone: included with the registered domain.

## Registers

- physical.md: dated B4 section + annotation on the stale "custom domains
  are B3" line.
- SEC-9 (security headers): Edge Services *does* expose header policies as
  a possible hardening surface now — left untouched this session (optional
  per brief); the SEC-9 row's "at the edge" option is now concretely
  available for docs/www.
