# Marginalia in numbers

> **Status:** Snapshot as of **2026-08-18** (session C11). Every price on this
> page was fetched from the provider's published pricing page on that date —
> the source URL and retrieval date sit next to each figure, and **prices
> change**; re-run the method in the appendix to refresh. Every other figure
> is either **computed** from the session transcripts (development) or
> **derived** from constants in the merged code (operations), or an
> **assumption** labeled as one. No number on this page comes from memory.

This page answers two questions the rest of the docs don't: what did it cost
to have AI agent sessions build this prototype, and what does it cost to run?

- **Development cost** is stated as *API-equivalent inference spend*: the
  token usage recorded in every agent session's transcript, priced at the
  provider's current published list prices. The owner develops on a
  subscription plan, so this is what the work *would* have cost at
  pay-per-token list prices — a comparable, reproducible measure, not an
  invoice.
- **Operating cost** is the running monthly bill as deployed today, plus a
  transparent model — not a guess — of what 10 active users would cost,
  derived from the actual guard and quota constants in the code (the model
  inventory itself lives in the [generative view](architecture/generative.md)).

---

## Part 1 — What it cost to build

### Method in one paragraph

Every agent session that built this product left a transcript in which each
assistant turn records the model id and a `usage` object: uncached input
tokens, cache-write tokens (split by 5-minute and 1-hour cache lifetime),
cache-read tokens, and output tokens. The computation deduplicates turns by
message id, sums each tier per transcript, labels each transcript by the
session id in its kickoff brief, and multiplies by the published price of the
recorded model. Only these aggregates leave the transcripts — no content.
The full procedure is in the [appendix](#appendix--how-these-numbers-were-computed)
so it can be re-run.

**Every one of the 2,782 recorded turns across all 28 transcripts ran on one
model: `claude-fable-5` (Claude Fable 5).** Its published list prices
(fetched 2026-08-18 from
[platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing),
USD per million tokens): input **$10**, 5-minute cache write **$12.50**,
1-hour cache write **$20**, cache read **$1**, output **$50**. All cache
writes in the transcripts used the 1-hour tier; recorded web-search usage was
zero, so no per-search charges apply.

### Per-session costs

Sessions are the roadmap's build sessions (see [roadmap](roadmap.md));
"turns" are deduplicated assistant turns (subagent turns included). Token
columns are exact sums from the transcripts; costs are USD at the prices
above. Two transcripts carry no session label — they are the two foreman
(coordination) sessions, identified by their time spans matching the foreman
handovers (`handovers/2026-08-18-foreman-handover.md`,
`…-foreman-2-handover.md`); the first also contains the day-1 project setup.
One transcript carries both the B3 and B4 briefs — those two roadmap sessions
were executed in a single physical session, reported here as one row.

| Session | Turns | Uncached input | Cache write (1h) | Cache read | Output | Cost (USD) |
| --- | --: | --: | --: | --: | --: | --: |
| A1 domain schema | 57 | 114 | 146,069 | 7,308,471 | 61,699 | 13.32 |
| A2 auth library | 119 | 238 | 149,014 | 15,278,066 | 45,503 | 20.54 |
| A3 ingestion | 133 | 266 | 202,741 | 20,596,042 | 85,397 | 28.92 |
| A4 grounded chat | 148 | 296 | 257,293 | 28,694,251 | 109,766 | 39.33 |
| A5 citations + notes | 186 | 372 | 248,908 | 36,046,042 | 110,270 | 46.54 |
| A6 demo polish | 138 | 276 | 269,991 | 28,842,132 | 103,975 | 39.44 |
| A7 test Postgres | 46 | 92 | 116,786 | 4,768,830 | 49,727 | 9.59 |
| B1 SSE spike (false start) | 4 | 8 | 31,993 | 178,019 | 5,529 | 1.09 |
| B1 SSE spike | 121 | 242 | 149,353 | 14,415,378 | 80,802 | 21.44 |
| B2 CI + deploy | 125 | 250 | 172,271 | 17,129,396 | 79,795 | 24.57 |
| B3 demo env + B4 custom domain (one session) | 232 | 464 | 324,578 | 49,029,794 | 166,911 | 63.87 |
| B5 Supabase Terraform | 53 | 106 | 137,396 | 5,828,919 | 58,807 | 11.52 |
| C1 marketing page | 59 | 118 | 101,137 | 5,868,396 | 40,358 | 9.91 |
| C2 docs site | 47 | 94 | 102,740 | 4,238,920 | 34,671 | 8.03 |
| C3 legal pages | 24 | 48 | 75,222 | 1,814,742 | 30,149 | 4.83 |
| C4 project history | 72 | 144 | 168,092 | 10,414,263 | 58,794 | 16.72 |
| C5 architecture views | 97 | 194 | 246,167 | 18,209,107 | 90,387 | 27.65 |
| C6 architecture rationale | 69 | 138 | 159,991 | 8,981,310 | 53,249 | 14.84 |
| C7 scope status | 34 | 68 | 114,716 | 3,472,733 | 33,591 | 7.45 |
| C8 history latest | 89 | 178 | 195,962 | 15,311,209 | 65,712 | 22.52 |
| C9 generative view | 58 | 116 | 158,637 | 7,236,194 | 38,555 | 12.34 |
| C10 scope reconciliation | 28 | 56 | 107,319 | 2,906,353 | 40,242 | 7.07 |
| C11 this page (partial — measured mid-session) | 27 | 54 | 356,341 | 8,751,562 | 19,167 | 16.84 |
| D1 TTS spike | 34 | 68 | 133,612 | 3,811,715 | 37,536 | 8.36 |
| D2 audio overview (false start) | 12 | 24 | 78,333 | 846,447 | 5,426 | 2.68 |
| D2 audio overview | 128 | 256 | 234,427 | 22,451,880 | 108,900 | 32.59 |
| Foreman 1 (incl. day-1 project setup) | 471 | 941 | 2,030,187 | 236,926,030 | 369,554 | 296.02 |
| Foreman 2 | 171 | 342 | 274,362 | 33,847,761 | 135,332 | 46.11 |

### Lane subtotals and total

| Lane | Turns | Uncached input | Cache write (1h) | Cache read | Output | Cost (USD) |
| --- | --: | --: | --: | --: | --: | --: |
| Lane A — webapp core (A1–A7) | 827 | 1,654 | 1,390,802 | 141,533,834 | 566,337 | 197.68 |
| Lane B — platform (B1–B5) | 535 | 1,070 | 815,591 | 86,581,506 | 391,844 | 122.50 |
| Lane C — docs & marketing (C1–C11) | 604 | 1,208 | 1,786,324 | 87,204,789 | 504,875 | 148.19 |
| Lane D — audio (D1–D2) | 174 | 348 | 446,372 | 27,110,042 | 151,862 | 43.63 |
| Coordination (foreman + setup) | 642 | 1,283 | 2,304,549 | 270,773,791 | 504,886 | 342.12 |
| **Total** | **2,782** | **5,563** | **6,743,638** | **613,203,962** | **2,119,804** | **854.12** |

**Building this prototype cost ≈ $854 in API-equivalent inference** across
28 agent sessions and ~622 million processed tokens, essentially all of it
over two calendar days (2026-08-17/18). The shape of the bill is as telling
as the total:

- **Cache reads are 72% of the cost** ($613 of $854): agent sessions re-read
  their whole growing context every turn, and prompt caching turns that from
  a $6,132 problem (at the $10/MTok uncached rate) into a $613 one. Without
  caching, the same work would have cost roughly **$6,700**.
- **Output tokens — the text and code actually written — are only 12%**
  ($106). Coordination (the foreman sessions that wrote briefs, reviewed and
  merged the prototype's ~49 PRs, and ran deploys) is the single most expensive lane at
  40% of total spend; foreman 1 alone, which spanned both days, cost more
  than any *whole* build lane.
- The recorded false starts (B1, D2) cost $3.77 combined — abandoning a
  session early is cheap.

> **Correcting the record:** the first foreman handover
> (`handovers/2026-08-18-foreman-handover.md`) carried an informal estimate
> of "~$300 total through day 2 across ~20 sessions". That estimate is
> **superseded** by the computed figure above: it was written mid-day-2,
> before roughly a third of the sessions (A6, B5, C8–C11, foreman 2) had
> run — and it undercounted even the sessions it covered. The computed total
> for just the sessions finished by that estimate's own cutoff time
> (~18:00 on day 2) is ≈ $700.

**Caveats.** (1) These are *list-price equivalents*; the owner works on a
subscription, so no invoice matches this number. (2) Transcripts may
undercount: turns aborted mid-request, retries, and any usage outside this
project's transcript directory are not captured. (3) The C11 row measures
this very session *while it was still running* and therefore undercounts
itself; re-running the appendix method after merge yields the final row.
(4) Prices were fetched 2026-08-18 and change; the token sums are the durable
part of this table.

---

## Part 2 — What it costs to run

### Today's bill (as deployed, 2026-08-18)

The deployed footprint is in the
[physical view](architecture/physical.md); the resources below are
Terraform-managed in `infrastructure/` unless noted. Line items are in each
provider's billing currency; no exchange-rate conversion is applied.

| Line item | Monthly cost | Where it's on record |
| --- | --- | --- |
| Scaleway Edge Services — Starter plan (1 pipeline) + 1 extra pipeline for the second static site | **€0.99 + €4.00 = €4.99** | `infrastructure/domain.tf` (`scaleway_edge_services_plan` + 2 pipelines); price verified 2026-08-18 against [scaleway.com/en/pricing/network](https://www.scaleway.com/en/pricing/network/) — Starter €0.99/mo incl. 1 pipeline, additional pipeline €4/mo, egress free |
| Webapp container (`min_scale = 0`, scale-to-zero) | **≈ €0 idle** | `infrastructure/main.tf` (1000 mvCPU, 2,147,000,000 B); Scaleway bills only consumed vCPU-s/GB-s, with 200,000 vCPU-s + 400,000 GB-s free per month ([scaleway.com/en/pricing/serverless](https://www.scaleway.com/en/pricing/serverless/), fetched 2026-08-18) — idle at zero scale consumes nothing |
| Apex-redirect function (`min_scale = 0`) | **≈ €0** | `infrastructure/domain.tf`; functions free tier: 1M requests + 400,000 GB-s/mo (same pricing page) |
| Supabase project (Free tier) | **$0** | Not TF-priced (tier chosen in B3, `handovers/2026-08-18-session-b3-demo-env.md`); Free plan limits fetched 2026-08-18 from [supabase.com/pricing](https://supabase.com/pricing): 500 MB database, 1 GB file storage, pauses after 1 week idle |
| Azure AI Speech (F0 free tier) | **$0** | D2/B3 record; F0 allows 0.5M neural-TTS characters/month free ([azure.microsoft.com — Speech services pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/), fetched 2026-08-18) |
| Scaleway Generative APIs | **≈ €0 idle** | Pure pay-per-token, no standing fee ([scaleway.com/en/pricing/model-as-a-service](https://www.scaleway.com/en/pricing/model-as-a-service/), fetched 2026-08-18) |
| Object storage (3 buckets) + container registry | **≈ €0** | B2/B4 record: static-site + tfstate buckets and images are megabytes, within free allowances |
| **Fixed total** | **€4.99/mo** | |

**Optional always-warm container:** `terraform apply -var webapp_min_scale=1`
keeps one container instance warm, eliminating the ~4 s cold start. (The B3
record calls this "demo mode" — accurate while the deployment *is* a demo;
with real users it is simply a fixed operating cost, and the scenarios below
treat it as one.) Derived from the fetched serverless prices and the
container's Terraform sizing (1 vCPU, ~2.147 GB): a 730-hour month is
2,628,000 s → (2,628,000 − 200,000 free) vCPU-s × €0.00001 + (2,628,000 ×
2.147 − 400,000 free) GB-s × €0.000002 ≈ **€34.8/mo while on** — matching
the "~€35/mo" recorded in `infrastructure/variables.tf` and the B3 handover.

### Ten users, modeled

Signup is currently a **closed circle** (see SEC-10 in
`product/security.md`) — 10 users is a hypothetical, not a forecast. The
model prices each user action from the constants in the merged code, then
runs two scenarios. Fetched prices used (2026-08-18): Scaleway
`mistral-small-3.2-24b-instruct-2506` **€0.15/M input, €0.35/M output**
tokens; `qwen3-embedding-8b` **€0.10/M tokens**
([scaleway.com/en/pricing/model-as-a-service](https://www.scaleway.com/en/pricing/model-as-a-service/));
Azure standard neural TTS (S1) **$15.00/1M characters** in `swedencentral`
(Azure Retail Prices API,
[prices.azure.com](https://prices.azure.com/api/retail/prices?%24filter=armRegionName%20eq%20%27swedencentral%27%20and%20contains%28meterName,%27Neural%27%29),
meter "S1 Neural Text To Speech Characters", fetched 2026-08-18).
Token-count conversions use the ~4 characters ≈ 1 token ≈ 0.75 words rule of
thumb (as stated on Anthropic's pricing page FAQ; an approximation across
tokenizers — labeled assumption).

**Per-action footprints** (constants cited from code):

| Action | Tokens / characters | Derivation | Cost per action |
| --- | --- | --- | --- |
| One grounded chat turn — LLM input | ≈ 6,500 tokens | 10 retrieved chunks × 400 tokens (`RETRIEVAL_LIMIT`, `src/server/services/chat-service.ts`; `CHUNK_SIZE_TOKENS`, `src/server/ingestion/chunking.ts`) = 4,000 hard cap, + 12-message history window (`CHAT_HISTORY_WINDOW`) at an *assumed* ~150 tokens/message = 1,800, + system prompt & question ≈ 700 (assumption) | €0.00098 |
| One grounded chat turn — LLM output | ≈ 300 tokens (assumption) | typical answer length | €0.00011 |
| One grounded chat turn — query embedding | ≈ 50 tokens (assumption) | one user question | €0.000005 |
| **One chat turn, total** | | | **≈ €0.0011** |
| Ingesting one source at the caps | ≈ 296,000 embedding tokens | 200,000 words max (`MAX_SOURCE_WORDS`, `src/server/ingestion/limits.ts`) × 4/3 tokens/word × 400/360 chunk-overlap factor (`CHUNK_OVERLAP_TOKENS = 40`) | ≈ €0.030 |
| Ingesting a typical ~5,000-word source | ≈ 7,400 embedding tokens | same formula | ≈ €0.0007 |
| One audio overview — script LLM | ≈ 6,400 in / ≈ 1,070 out | 24,000-char source budget (`TOTAL_SOURCE_CHAR_BUDGET`, `src/server/audio/script.ts`) ÷ 4 + prompt; output 600–800 words by prompt contract | ≈ €0.0013 |
| One audio overview — TTS | ≈ 5,000 characters (assumption: ~700 words × ~6 chars/word + SSML markup; billed per SSML character) | script contract in `audio-overview-service.ts`; billing per `charactersBilled`, `src/server/audio/azure-tts.ts` | ≈ $0.075 |

**Scenario (a) — quota ceiling.** All 10 users max every daily quota every
day for a 30-day month. This is the *hard upper bound the A6 quotas
guarantee* — the app cannot spend more than this on inference:

| Item | Volume | Derivation | Monthly cost |
| --- | --- | --- | --- |
| **Fixed (independent of usage within the scenario)** | | | |
| Edge Services | — | unchanged | €4.99 |
| Supabase | — | this load forces the Pro tier (storage, below) | $25 |
| Azure S1 / Generative APIs | — | no standing fee — both are pure pay-per-use; they appear only under Variable | $0 / €0 |
| **Variable (scales with usage — the quota-bounded consumption)** | | | |
| Chat completions | 300,000 turns | 20 notebooks/user (`MAX_NOTEBOOKS_PER_USER`, `notebook-service.ts`) × 50 messages/notebook/day (`MAX_CHAT_MESSAGES_PER_NOTEBOOK_PER_DAY`, `chat-service.ts`) × 10 users × 30 days | ≈ €324 |
| Query embeddings | 15M tokens | 300,000 × 50 | ≈ €1.50 |
| Audio scripts | 3,000 overviews | 10/user/day (`MAX_AUDIO_OVERVIEWS_PER_USER_PER_DAY`, `audio-overview-service.ts`) × 10 × 30 | ≈ €4 |
| TTS | 15M characters | 3,000 × 5,000 chars | ≈ **$225** — requires the paid S1 tier; the free F0 tier hard-stops at 0.5M chars/month (~100 overviews), 30× below what the app's own quotas would allow |
| Container compute at this load | ~1.5M vCPU-s | 300,000 requests × ~5 s each (assumption) | ≈ €19 |
| *One-time, not monthly:* ingestion filling every slot once | 10,000 max-size sources | 50 sources/notebook (`MAX_SOURCES_PER_NOTEBOOK`, `limits.ts`) × 20 notebooks × 10 users | ≈ €296 one-time — but see the storage note: unreachable in practice |
| **Ceiling total** | | fixed **€4.99 + $25** · variable **≈ €348.5 + $225** — i.e. **≈ €34.9 + $22.50 per user** at the ceiling | **≈ €350 + $250 per month** (≈ €330 of it chat inference) |

**Scenario (b) — a stated realistic assumption.** Assume each of the 10
users sends **N = 10 chat messages/day**, ingests **2 typical (~5,000-word)
sources/week**, and generates **2 audio overviews/month**. N and the
ingestion/audio rates are assumptions, not measurements:

| Item | Volume | Monthly cost |
| --- | --- | --- |
| **Fixed (independent of usage within the scenario)** | | |
| Edge Services | — | €4.99 |
| Supabase Free / Azure F0 | — | $0 |
| Always-warm container (optional) | — | + €34.8 if kept on (`min_scale=1`, derivation above); €0 at scale-to-zero |
| **Variable (scales with usage)** | | |
| Chat completions (LLM) | 3,000 turns | ≈ €3.26 |
| Query embeddings | 0.15M tokens | ≈ €0.02 |
| Ingestion embeddings | ~87 sources ≈ 0.64M tokens | ≈ €0.06 |
| Audio scripts | 20 overviews | ≈ €0.03 |
| TTS | 100,000 characters | **$0** on the current F0 tier (under its 500,000 free chars/month); would be ≈ $1.50 on S1 |
| Container compute | ~15,000 vCPU-s | €0 (within the 200,000 vCPU-s monthly free tier) |
| **Realistic total** | | fixed **€4.99** · variable **≈ €3.37** — i.e. **≈ €0.34 per user per month** → **≈ €8.4/mo** all-in (≈ €43/mo with the always-warm container on) |

The punchline of scenario (b): at realistic 10-user usage, **the entire
variable bill (≈ €3.4/mo, ≈ €0.34 per user) is smaller than the €4.99 Edge
Services subscription** — fixed subscriptions dominate, and the marginal
cost of one more realistic user is cents. Model inference is not where this
architecture's money goes; the quotas exist to keep the *ceiling*
scenario — where the variable side is two orders of magnitude larger and
per-user cost rises to ≈ €35 + $22 — impossible to reach by accident.

**Non-inference ceilings (what actually breaks first at 10 users):**

- **Supabase Free storage (1 GB) is the binding constraint, not tokens.**
  The app-level caps allow a *single* user 20 notebooks × 50 sources × 20 MB
  = 20 GB of uploads — twenty times the whole project's Free-tier storage.
  SEC-10 in `product/security.md` records this precisely (~50 max-size
  objects fill the tier) along with the abuse implications; the closed
  signup circle is the load-bearing control. Sustained 10-user use forces
  the **Pro tier at $25/mo** (8 GB database + 100 GB storage included,
  fetched 2026-08-18 from [supabase.com/pricing](https://supabase.com/pricing)) —
  which also removes the pauses-after-1-week-idle behavior.
- **The 500 MB Free-tier database** holds roughly 50–60k chunks (each
  `vector(2000)` embedding is ~8 KB before index overhead) — a few hundred
  typical sources; Pro's 8 GB moves that ceiling out of sight.
- **Azure F0** caps audio at ~100 overviews/month project-wide; the app's
  quotas allow 3,000. First user growth step on the audio feature is the S1
  tier (pay-per-character, no standing fee).

---

## Appendix — how these numbers were computed

Reproduce the development table with any JSON-capable script; no repo code
is involved. The transcripts live outside the repo on the development
machine (Claude Code project directory, one `.jsonl` file per session).

1. **Collect** every `*.jsonl` transcript in the project's transcript
   directory (28 files at computation time, 2026-08-18).
2. **Parse** each line as JSON; keep objects with `type == "assistant"` and
   a `message.usage` field.
3. **Deduplicate by `message.id`** — a turn's usage is repeated on one line
   per content block; count each message id once. Skip `model ==
   "<synthetic>"` (harness-injected, no API cost).
4. **Sum per file and per model id**: `usage.input_tokens` (uncached),
   `usage.cache_creation.ephemeral_5m_input_tokens` and
   `…ephemeral_1h_input_tokens` (falling back to
   `cache_creation_input_tokens` as 5m when the split is absent),
   `cache_read_input_tokens`, `output_tokens`. Also sum
   `server_tool_use.web_search_requests` (billable searches — zero here).
5. **Label** each file by the first match of
   `executing session <ID>` in its first 200 KB (the kickoff brief).
   Unmatched files are coordination sessions; identify them by comparing
   the file's timestamp span with the foreman handovers. One file may carry
   several briefs (B3+B4 here) — search the whole file when a roadmap
   session seems to be missing.
6. **Price** each tier at the recorded model's current published rate from
   [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing):
   `cost = (input × P_in + cw_5m × 1.25·P_in + cw_1h × 2·P_in + reads ×
   0.1·P_in + output × P_out) / 10⁶`, plus `searches × $10/1000`. If a
   recorded model id has no published price, say so on the page and price it
   at the nearest published equivalent, flagged (not needed in this run —
   every turn was `claude-fable-5`).

The ops model is the arithmetic shown inline in Part 2: per-action token
footprints from the named code constants, times scenario volumes, times the
fetched per-token/per-character prices.

**Pricing sources used on this page** (all fetched **2026-08-18**):

| Provider | Page |
| --- | --- |
| Anthropic (Claude Fable 5 token prices, cache multipliers) | <https://platform.claude.com/docs/en/about-claude/pricing> |
| Scaleway Generative APIs (chat + embedding models) | <https://www.scaleway.com/en/pricing/model-as-a-service/> |
| Scaleway Serverless (containers, functions) | <https://www.scaleway.com/en/pricing/serverless/> |
| Scaleway Network (Edge Services plans) | <https://www.scaleway.com/en/pricing/network/> |
| Azure AI Speech (F0 free allowance) | <https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/> |
| Azure Retail Prices API (S1 neural TTS $/char, `swedencentral`) | <https://prices.azure.com/api/retail/prices> |
| Supabase (Free/Pro tiers) | <https://supabase.com/pricing> |
