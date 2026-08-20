# Marginalia in numbers

> **Status:** Snapshot as of **2026-08-20** (Part 1 computed 2026-08-18,
> session C11; Part 2 rebuilt as a pricing/ROI basis in session C14 with
> every price re-fetched 2026-08-19, and restructured for readability in
> session C15). Every price on this page was fetched from the provider's
> published pricing page on the stated date — the source URL and retrieval
> date sit next to the figure in Part 1 and in the notes under each table in
> Part 2, and **prices change**; re-run the
> method in the appendix to refresh. Every other figure is either
> **computed** from the session transcripts (development) or **derived** from
> constants in the merged code (operations), or an **assumption** labeled as
> one. No number on this page comes from memory.
>
> **Currency.** Part 2 is presented in **euro**, one currency throughout.
> Providers that bill in US dollars (Supabase, Azure) are converted at
> **€1 = $1.1605** — the European Central Bank euro reference rate for
> **2026-08-19**, fetched 2026-08-20 from
> [ecb.europa.eu](https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html)
> — and every converted figure carries its dollar original in the note beside
> it. Part 1 stays in **US dollars**, the currency Anthropic publishes its
> list prices in; it mixes no currencies, so nothing there needs converting.

This page answers two questions the rest of the docs don't: what did it cost
to have AI agent sessions build this prototype, and what does it cost to run?

- **Development cost** is stated as *API-equivalent inference spend*: the
  token usage recorded in every agent session's transcript, priced at the
  provider's current published list prices. The owner develops on a
  subscription plan, so this is what the work *would* have cost at
  pay-per-token list prices — a comparable, reproducible measure, not an
  invoice.
- **Operating cost** is the running monthly bill as deployed today, plus a
  transparent model — not a guess — of what a user costs and how the bill
  develops from 1 to 1,000 users, derived from the actual guard and quota
  constants in the code (the model inventory itself lives in the
  [generative view](architecture/generative.md)). Part 2 is built to be read
  as the basis for a price: every table there splits into line items and a
  summary block, and every summary block closes with the same four rows, so
  the numbers are comparable across tables.

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

**Building this prototype cost ≈ $854 in API-equivalent inference** (≈ €736
at the rate stated at the top of this page) across
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

This part exists to support a price. It answers three questions and nothing
else: what does the system cost before any user exists; what does one more
user cost, split into what they cost by *existing* and what they cost by
*using*; and how does that change as the user count grows.

### How to read every table in this part

Every cost table below — today's deployment, each usage-assumption set, and
the growth view — is in two parts:

1. **Line items.** One row per billed thing: *what it is · how much of it ·
   what it costs · a note number*. The cost column carries a figure and
   nothing else. Every derivation, price source, tier condition and
   assumption lives in the numbered notes directly under the table, so the
   table can be read at a glance and audited line by line.
2. **A summary block**, headed with the **user count it is evaluated at**,
   closing with the **same four rows, identically labeled**, and then doing
   the arithmetic: the monthly total, and that total divided by the user
   count.

The four rows:

| Row | What it is | What moves it |
| --- | --- | --- |
| **System, fixed** | The bill with the system up and nobody touching it: subscriptions and always-on capacity — the Edge Services plan, the always-warm container floor, and any provider tier fee the deployment has been forced onto. | Nothing in normal operation. Only a **tier step**, named in the growth view where it lands. |
| **System, variable** | Driven by *total* load but not attributable to any one user: burst container instances above the always-warm floor. | Peak concurrency, bounded by `max_scale = 2`. |
| **Per user, standing** | What one more user costs by **existing** — the retained footprint of their sources, chunks and embeddings — with zero activity. | Storage crossing a tier allowance; then linear in users × tenure. |
| **Per user, marginal** | What one more user costs by **using** — chat turns, ingestion, audio. **This is the floor a per-user price has to clear**, before any contribution to the fixed base. | The Azure F0 → S1 step at 50 users. Otherwise flat at every user count, within an assumption set. |

**"Fixed" means two different things here, deliberately.** On the *system*
rows it means **does not move with load**: €4.99 of Edge Services is €4.99
whether the system serves nothing or serves its ceiling. On the *per user*
rows it means **does not move with that user's activity** — "per user,
standing" is what a dormant account still costs, and it is charged once per
user, so it very much scales with headcount. Both per-user rows are
**marginal** figures, the cost of the *next* user, which is why the summary
block multiplies them by the user count rather than dividing anything.

Two consequences are worth stating up front, because they are where the
money actually is:

- **The container floor is a system-fixed cost, not an option.** The
  deployment can scale to zero (and does today, with no users), but with real
  users you do not let it go cold — a ~4 s cold start on the first request of
  every idle period is not a product. Every table below except "today's
  deployment" therefore carries the always-warm floor as a fixed cost.
- **Per user, standing is €0 on the tiers in use, and that is a property of
  the tiers, not of the app.** Supabase Free and Pro bundle storage as an
  *allowance*, not a meter: a user's retained sources cost nothing extra
  until the allowance is exhausted, at which point the whole project steps to
  the next tier and the metered rate (€0.108/GB-month database, €0.018/GB-month
  file storage) begins to apply. So the per-user standing cost is zero, then
  a fraction of a cent — but the *step* it triggers is one of the larger
  jumps on the page. Both effects are shown in the growth view.

**Rounding.** Every line item is rounded to the cent, and each summary block
sums the *rounded* line items, so every table adds up exactly as printed. The
"each" figures in parentheses are the monthly figure divided by the user
count, so they can be a cent off a hand-multiplication; the monthly figure is
the computed one.

### Today's deployment (2026-08-19)

The deployed footprint is in the
[physical view](architecture/physical.md); the resources below are
Terraform-managed in `infrastructure/` unless noted. There are no users yet
(signup is a closed circle — see below), and `webapp_min_scale` is `0` in the
deployed state (`infrastructure/variables.tf`), so this table is the only one
on the page without the always-warm floor.

**Line items**

| # | Line item | Volume | Monthly cost |
| --- | --- | --- | --: |
| T1 | Scaleway Edge Services — Starter plan + 1 extra pipeline | 2 pipelines | €4.99 |
| T2 | Webapp container | scale-to-zero, no traffic | €0.00 |
| T3 | Apex-redirect function | scale-to-zero | €0.00 |
| T4 | Supabase project — Free tier fee | 1 project | €0.00 |
| T5 | Azure AI Speech — F0 tier fee | 0 characters | €0.00 |
| T6 | Scaleway Generative APIs | 0 tokens | €0.00 |
| T7 | Object storage (3 buckets) + container registry | a few MB | €0.00 |

**Notes**

- **T1** — `infrastructure/domain.tf` (`scaleway_edge_services_plan` + 2
  pipelines). Starter **€0.99/mo** including 1 pipeline, additional pipeline
  **€4.00/mo**: €0.99 + €4.00 = €4.99. Bandwidth unlimited, 100 GB cache
  storage included ([scaleway.com/en/pricing/network](https://www.scaleway.com/en/pricing/network/),
  fetched 2026-08-19).
- **T2** — `min_scale = 0` in the deployed state
  (`infrastructure/variables.tf`); sizing 1000 mvCPU / 2,147,000,000 B
  (`infrastructure/main.tf`). Scaleway bills only consumed vCPU-s and GB-s,
  with 200,000 vCPU-s + 400,000 GB-s free per month
  ([scaleway.com/en/pricing/serverless](https://www.scaleway.com/en/pricing/serverless/),
  fetched 2026-08-19), and idle at zero scale consumes nothing.
- **T3** — `infrastructure/domain.tf`, `min_scale = 0`. Functions free tier:
  1M requests + 400,000 GB-s/mo (same pricing page).
- **T4** — **$0**. Not Terraform-priced; tier chosen in B3
  (`handovers/2026-08-18-session-b3-demo-env.md`). Free plan limits fetched
  2026-08-19 from [supabase.com/pricing](https://supabase.com/pricing):
  500 MB database, 1 GB file storage, 5 GB egress, 50,000 MAU, pauses after
  1 week idle.
- **T5** — **$0**. D2/B3 record; F0 allows 0.5M neural-TTS characters per
  month free ([azure.microsoft.com — Speech services pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/),
  fetched 2026-08-19).
- **T6** — Pure pay-per-token, no standing fee
  ([scaleway.com/en/pricing/model-as-a-service](https://www.scaleway.com/en/pricing/model-as-a-service/),
  fetched 2026-08-19); with no users there are no tokens.
- **T7** — B2/B4 record: the static-site and tfstate buckets and the
  container images are megabytes, within the free allowances.

**Summary — 0 users**

| Row | Monthly |
| --- | --: |
| System, fixed | €4.99 |
| System, variable | €0.00 |
| Per user, standing | — |
| Per user, marginal | — |
| **Total, 0 users** | **€4.99** |
| **Per user per month** | **not defined at 0 users** |

The fixed row is Edge Services alone: at `min_scale = 0` the container floor
is not paid, which is why this is the only table on the page without it. The
per-user rows have no value to report rather than a value of zero — the rates
they would carry are in the assumption sets below.

**The always-warm floor**, used by every table below:
`terraform apply -var webapp_min_scale=1` holds exactly one instance warm
around the clock. From the container's Terraform sizing (1 vCPU,
~2.147 GB) and the fetched serverless prices, a 730-hour month is 2,628,000 s
→ (2,628,000 − 200,000 free) vCPU-s × €0.00001 + (2,628,000 × 2.147 −
400,000 free) GB-s × €0.000002 = **€34.76/mo** — matching the "~€35/mo"
recorded in `infrastructure/variables.tf` and the B3 handover. A *second*
instance (the `max_scale = 2` ceiling in `infrastructure/main.tf`) bills on
top at the same rates, so system-variable container cost is bounded at
€0–€34.76 no matter how much demand arrives.

### Per-action footprints — the rate card

This is a **rate card, not a cost table**: it prices one action, so it has no
user count and the four summary rows do not apply to it. Every cost table
above and below is built from these unit costs times a volume.

**Unit prices**, all fetched 2026-08-19: Scaleway
`mistral-small-3.2-24b-instruct-2506` **€0.15/M input tokens, €0.35/M output
tokens**; `qwen3-embedding-8b` **€0.10/M tokens**; Azure standard neural TTS
(S1) in `swedencentral` **$15.00/1M characters = €12.93/1M characters**, from
the Azure Retail Prices API meter "S1 Neural Text To Speech Characters".
Token-count conversions use the ~4 characters ≈ 1 token ≈ 0.75 words rule of
thumb (as stated on Anthropic's pricing page FAQ; an approximation across
tokenizers — labeled assumption). Figures below are given to six decimals so
the components sum exactly.

| # | Action | Volume | Cost per action |
| --- | --- | --- | --: |
| R1 | One grounded chat turn — LLM input | ≈ 6,500 tokens | €0.000975 |
| R2 | One grounded chat turn — LLM output | ≈ 300 tokens | €0.000105 |
| R3 | One grounded chat turn — query embedding | ≈ 50 tokens | €0.000005 |
| | **One chat turn, total** | | **€0.001085** |
| R4 | Ingesting one source at the caps | ≈ 296,000 embedding tokens | €0.029600 |
| R5 | Ingesting a typical ~5,000-word source | ≈ 7,407 embedding tokens | €0.000741 |
| R6 | One audio overview — script LLM | ≈ 6,400 in / ≈ 1,070 out | €0.001335 |
| R7 | One audio overview — TTS | ≈ 5,000 characters | €0.064627 |
| R8 | Standing footprint of one retained typical source | ≈ 0.40 MB database + ≈ 1 MB file storage | metered only above the tier allowance — see the growth view |

**Notes**

- **R1** — 10 retrieved chunks × 400 tokens (`RETRIEVAL_LIMIT`,
  `src/server/services/chat-service.ts`; `CHUNK_SIZE_TOKENS`,
  `src/server/ingestion/chunking.ts`) = 4,000, a hard cap; + a 12-message
  history window (`CHAT_HISTORY_WINDOW`) at an **assumed** ~150 tokens per
  message = 1,800; + system prompt and question ≈ 700 (**assumption**).
- **R2** — ~300 tokens is an **assumption**: a typical answer length.
- **R3** — ~50 tokens is an **assumption**: one user question.
- **R4** — 200,000 words max (`MAX_SOURCE_WORDS`,
  `src/server/ingestion/limits.ts`) × 4/3 tokens per word × the 400/360
  chunk-overlap factor (`CHUNK_OVERLAP_TOKENS = 40`).
- **R5** — the same formula at 5,000 words: 5,000 × 4/3 × 400/360 = 7,407
  tokens.
- **R6** — 24,000-character source budget (`TOTAL_SOURCE_CHAR_BUDGET`,
  `src/server/audio/script.ts`) ÷ 4 + prompt; output 600–800 words by the
  prompt contract.
- **R7** — **$0.075**. 5,000 characters is an **assumption**: ~700 words ×
  ~6 characters per word plus SSML markup, billed per SSML character —
  script contract in `audio-overview-service.ts`, billing per
  `charactersBilled` in `src/server/audio/azure-tts.ts`. This is the S1
  rate; on the F0 free tier the first 0.5M characters per month cost
  nothing.
- **R8** — 6,667 tokens ÷ (400 − 40) = 19 chunks; per chunk ≈ 19.3 KB
  all-in (8,008 B `vector(2000)` at 4 B/dim + ~1.6 KB text + ~1 KB
  `tsvector` + ~8.2 KB HNSW index entry + ~0.4 KB GIN/btree — **the index
  sizes are assumptions**), + ~30 KB of `sources.content`. File storage
  **assumes** a ~1 MB upload for a 5,000-word document (`MAX_FILE_BYTES`
  caps it at 20 MB).

> The chunk footprint above supersedes the 2026-08-18 estimate on this page
> ("roughly 50–60k chunks" in 500 MB, "a few hundred typical sources"). That
> figure counted the raw embedding only; with index and text included the
> Free tier's 500 MB holds ≈ 26,000 chunks ≈ 1,260 typical sources, and its
> 1 GB of file storage — the tighter of the two — holds ≈ 1,000.

### Assumption set A — the quota ceiling

**What it assumes** (this is the hard upper bound the A6 quotas guarantee —
the app cannot spend more than this on inference, whatever a user does):

| Input | Value | Source |
| --- | --- | --- |
| Chat turns per user per day | 1,000 | 20 notebooks (`MAX_NOTEBOOKS_PER_USER`, `notebook-service.ts`) × 50 messages/notebook/day (`MAX_CHAT_MESSAGES_PER_NOTEBOOK_PER_DAY`, `chat-service.ts`) — every quota maxed, every day |
| Audio overviews per user per day | 10 | `MAX_AUDIO_OVERVIEWS_PER_USER_PER_DAY`, `audio-overview-service.ts` |
| Ingestion | every slot filled once | 50 sources/notebook (`MAX_SOURCES_PER_NOTEBOOK`, `limits.ts`) × 20 notebooks — one-time, not monthly |
| Users | 10 | hypothetical (see the closed-signup caveat below) |
| Month | 30 days | assumption |
| Horizon | month 12 of operation | Supabase Pro is already forced from month 2 at this load |

**Line items — monthly**

| # | Line item | Volume | Monthly cost |
| --- | --- | --- | --: |
| A1 | Edge Services | 2 pipelines | €4.99 |
| A2 | Always-warm container floor | 1 instance × 730 h | €34.76 |
| A3 | Supabase Pro tier fee | 1 project | €21.54 |
| A4 | Burst container instance | 0–1 extra instance | €0.00 – €34.76 |
| A5 | Chat completions + query embeddings | 300,000 turns | €325.50 |
| A6 | Audio overview scripts | 3,000 overviews | €4.00 |
| A7 | Text-to-speech (Azure S1) | 15,000,000 characters | €193.88 |

**Line items — one-time, not monthly**

| # | Line item | Volume | One-time cost |
| --- | --- | --- | --: |
| A8 | Filling every ingestion slot once | 10,000 max-size sources | €296.00 |

**Notes**

- **A1** — as note T1 above.
- **A2** — one instance held warm around the clock
  (`webapp_min_scale = 1`); derivation in *The always-warm floor* above.
- **A3** — **$25.00**. Forced at this load: 300,000 chat turns per month
  write ≈ 450 MB of message rows per month (**assumption**: ~1.5 KB per
  question-and-answer pair), so the Free tier's 500 MB database is gone
  inside two months. [supabase.com/pricing](https://supabase.com/pricing),
  fetched 2026-08-19.
- **A4** — bounded by `max_scale = 2` (`infrastructure/main.tf`): at most one
  instance on top of the floor, billed at the same rate.
- **A5** — 10 users × 1,000 turns/day × 30 days = 300,000 turns ×
  €0.001085 (rate card R1–R3).
- **A6** — 10 users × 10 overviews/day × 30 days = 3,000 × €0.001335 (R6).
  Scaleway Generative APIs have no standing fee, so A5 and A6 contribute
  nothing to the fixed rows.
- **A7** — **$225.00**. 3,000 overviews × 5,000 characters = 15M characters
  × $15.00/1M (R7). **Requires the paid S1 tier**: F0 hard-stops at 0.5M
  characters/month (~100 overviews), 30× below what the app's own quotas
  allow. S1 has no standing fee either, so this line too is entirely
  per-user-marginal.
- **A8** — 20 notebooks × 50 sources × 10 users = 10,000 sources at
  `MAX_SOURCE_WORDS`, × €0.0296 (R4). Paid once when the slots are filled
  and never again, which is why it is not in the monthly table. It is also
  **unreachable in practice**: 10,000 × 20 MB = 200 GB of uploads, twice
  Supabase Pro's whole 100 GB storage allowance.
- **A9** (summary row) — **€0.00**. Retained storage stays inside the
  Supabase Pro allowances at this user count: 10 users' message rows reach
  ≈ 5.4 GB after 12 months, still inside Pro's 8 GB database allowance (it
  crosses around month 18).

**Summary — assumption set A, 10 users**

| Row | From | Monthly |
| --- | --- | --: |
| System, fixed | A1 + A2 + A3 | €61.29 |
| System, variable | A4 | €0.00 – €34.76 |
| Per user, standing × 10 users | A9 | €0.00 (€0.00 each) |
| Per user, marginal × 10 users | A5 + A6 + A7 | €523.38 (€52.34 each) |
| **Total, 10 users** | | **€584.67 – €619.43** |
| **Per user per month** | ÷ 10 users | **€58.47 – €61.94** |

Plus **€296.00 once** (A8) if every ingestion slot is ever filled — and it
cannot be, for the reason in note A8.

### Assumption set B — moderate usage

**What it assumes.** The volumes here are stated assumptions, not
measurements — there is no telemetry (see the caveat below).

| Input | Value | Source |
| --- | --- | --- |
| Chat turns per user per day | 10 | assumption |
| Sources ingested per user | 2 per week ≈ 8.7/month, ~5,000 words each | assumption |
| Audio overviews per user | 2 per month | assumption |
| Users | 10 | hypothetical |
| Month | 30 days | assumption |
| Horizon | months 1–11 of operation | the storage-driven Supabase Free → Pro step lands in month 12 at this user count; the growth view below shows the bill after it |

**Line items — monthly**

| # | Line item | Volume | Monthly cost |
| --- | --- | --- | --: |
| B1 | Edge Services | 2 pipelines | €4.99 |
| B2 | Always-warm container floor | 1 instance × 730 h | €34.76 |
| B3 | Supabase Free tier fee | 1 project | €0.00 |
| B4 | Azure AI Speech F0 tier fee | 1 resource | €0.00 |
| B5 | Burst container instances | none | €0.00 |
| B6 | Chat completions + query embeddings | 3,000 turns | €3.26 |
| B7 | Ingestion embeddings | 87 sources ≈ 0.64M tokens | €0.06 |
| B8 | Audio overview scripts | 20 overviews | €0.03 |
| B9 | Text-to-speech (Azure F0) | 100,000 characters | €0.00 |

**Notes**

- **B1** — as note T1 above.
- **B2** — as note A2 above.
- **B3** — **$0**. The Free tier carries this load for months 1–11; the
  storage-driven step to Pro lands in month 12 at this user count (growth
  view below).
- **B4** — **$0**. 100,000 characters per month is a fifth of F0's 0.5M
  allowance; the step to S1 lands at exactly 50 users (growth view below).
- **B5** — peak demand is ≈ 0.03 requests in flight (derivation in *The
  capacity ceiling* below); the one warm instance absorbs it, so no burst
  instance is ever started.
- **B6** — 10 users × 10 turns/day × 30 days = 3,000 turns × €0.001085
  (rate card R1–R3).
- **B7** — 10 users × 8.67 sources/month (2 per week × 52/12) = 86.7
  sources × €0.000741 (R5).
- **B8** — 10 users × 2 overviews/month = 20 × €0.001335 (R6).
- **B9** — **$0** on F0: 20 overviews × 5,000 characters = 100,000, inside
  the 0.5M free allowance. The same volume on S1 would be $1.50 = €1.29,
  i.e. €0.129 per user per month — which is what happens above 50 users.
- **B10** (summary row) — **€0.00**. Through months 1–11 the retained
  footprint stays inside the Supabase Free allowances; the growth view
  shows the month it stops.

**Summary — assumption set B, 10 users**

| Row | From | Monthly |
| --- | --- | --: |
| System, fixed | B1 + B2 | €39.75 |
| System, variable | B5 | €0.00 |
| Per user, standing × 10 users | B10 | €0.00 (€0.00 each) |
| Per user, marginal × 10 users | B6 + B7 + B8 + B9 | €3.35 (€0.335 each) |
| **Total, 10 users** | | **€43.10** |
| **Per user per month** | ÷ 10 users | **€4.31** |

**The shape of the bill at moderate usage:** the fixed base (€39.75/mo) is
**twelve times the entire variable bill** (€3.35/mo). Serving real users
costs ~€40 before the first token is generated, and the marginal cost of one
more moderate user is about a third of a euro — while the *average* cost of a
user at ten users is €4.31, thirteen times that, because nine tenths of it is
the fixed base being shared out. Inference is not where this architecture's
money goes at this scale; the quotas exist so the *set A* world, where the
variable side is two orders of magnitude larger, cannot be reached by
accident.

### Cost development over user count

Assumption set B, evaluated at **month 12 of operation** at each user count
(a horizon has to be stated because the standing footprint accumulates: at
8.7 retained sources per user per month, a user's storage is the one cost
that grows with tenure, not just with headcount). Tier steps are named in the
column where they land.

**What changes with user count** — the drivers, before any money:

| # | Driver | 1 user | 10 users | 100 users | 1,000 users |
| --- | --- | --: | --: | --: | --: |
| G1 | Retained sources at month 12 | 104 | 1,044 | 10,440 | 104,400 |
| G2 | Database storage | 0.04 GB | 0.41 GB | 4.1 GB | **41.2 GB** |
| G3 | File storage | 0.10 GB | **1.04 GB** | 10.4 GB | **104.4 GB** |
| G4 | Supabase tier in force | Free | **Pro** | Pro | **Pro + compute add-on** |
| G5 | Azure Speech tier in force | F0 | F0 | **S1** | S1 |
| G6 | Peak requests in flight | 0.003 | 0.03 | 0.28 | 2.8 |

**Summary — assumption set B, month 12, at each user count**

| Row | 1 user | 10 users | 100 users | 1,000 users |
| --- | --: | --: | --: | --: |
| System, fixed | €39.75 | €61.29 | €61.29 | €74.22 – €112.99 |
| System, variable | €0.00 | €0.00 | €0.00 | €0.00 – €34.76 |
| Per user, standing × users | €0.00 | €0.00 | €0.00 | €3.66 (€0.0037 each) |
| Per user, marginal × users | €0.33 (€0.335 each) | €3.35 (€0.335 each) | €46.38 (€0.464 each) | €463.84 (€0.464 each) |
| **Monthly total** | **€40.08** | **€64.64** | **€107.67** | **€541.72 – €615.25** |
| **Per user per month** | **€40.08** | **€6.46** | **€1.08** | **€0.54 – €0.62** |

**Notes**

- **G1** — users × 8.7 sources per user-month × 12 months.
- **G2, G3** — G1 × the standing footprint per source from the rate card
  (R8): ≈ 0.40 MB of database and an **assumed** ~1 MB upload in file
  storage.
- **G4** — the Supabase **Free → Pro** step, **+$25.00 = €21.54/mo**, fires
  when the tighter of the two Free allowances runs out. At 10 users that is
  the 1 GB of file storage, exhausted in **month 12**; at 100 users, month
  2; at 1,000 users, **day 4**. At 1,000 users a **compute add-on** is
  assumed on top — see note G8.
- **G5** — the Azure **F0 → S1** step fires at **exactly 50 users**: 0.5M
  free characters ÷ 10,000 characters per user-month. S1 carries no standing
  fee, so this step adds nothing to the fixed row; its whole effect is to
  raise per-user marginal from €0.335 to €0.464.
- **G6** — users × 10 turns/day × a 20% peak-hour share × 5 s ÷ 3,600 s.
  The peak-hour share and the request duration are **assumptions**; see
  *The capacity ceiling* below. Not a cost — the reason the table stops at
  1,000 users.
- **G7** (per user, standing at 1,000 users) — 41.2 GB of database less
  Pro's 8 GB allowance = 33.2 GB × $0.125 = $4.15; 104.4 GB of files less
  Pro's 100 GB = 4.4 GB × $0.0213 = $0.09. Together **$4.24 = €3.66/mo**,
  ÷ 1,000 users = **€0.0037 each**. Zero at every smaller user count because
  the footprint fits the allowance.
- **G8** (system, fixed at 1,000 users) — €4.99 + €34.76 + €21.54 Pro
  = €61.29, plus a compute add-on of **$15.00 = €12.93** (Small) to
  **$60.00 = €51.70** (Medium). Pro's $10/mo credit covers one Micro
  instance, but at 1,000 users the chunk table holds ≈ 2.0M rows and its
  HNSW index alone is ≈ 16 GB — past what a Micro instance can keep resident
  while every chat turn runs a vector search. **This is the one figure in
  the table that is a judgment rather than a derivation**: it is unmeasured,
  it needs a load test, and it is why the 1,000-user total is a range.
- **G9** (system, variable at 1,000 users) — the second container instance,
  €0.00 – €34.76, bounded by `max_scale = 2` (note A4). Zero at every
  smaller user count: one warm instance absorbs the load in G6.
- **G10** (per user, marginal) — €0.335 on F0 (chat €0.3255 + ingestion €0.0064 +
  audio script €0.0027) and €0.464 once S1 applies (+ €0.129 of TTS); see
  notes B6–B9.

**What is linear and what is a step.** This distinction is the point of the
table:

- **Linear in user count** — *per user, marginal* (chat, ingestion, audio
  script, and TTS once on S1) is strictly proportional: €0.335/user/mo below
  50 users and €0.464 above, and nothing else in between, because each user's
  actions are priced per token and per character with no allowance and no
  floor.
- **Piecewise linear** — *per user, standing* (retained storage) is exactly
  €0 while it fits the tier's allowance, then linear in users × tenure at
  €0.108/GB-month database ($0.125) + €0.018/GB-month files ($0.0213). Zero
  at 1–100 users, €0.0037/user/mo at 1,000.
- **Step functions** — three, all named in the table:
  1. **Supabase Free → Pro, +€21.54/mo ($25).** Triggered by the *cumulative*
     footprint, so it is a function of user-months, not users: the tighter
     of the two allowances (1 GB of file storage ÷ ~1 MB per source ÷ 8.7
     sources per user-month) is exhausted after **≈ 115 user-months** —
     month 12 at 10 users, month 2 at 100, **day 4** at 1,000.
  2. **Azure F0 → S1, at exactly 50 users.** A per-month, not cumulative,
     boundary: 0.5M free characters ÷ 10,000 characters per user-month. S1
     has no standing fee, so this step does not raise the fixed cost at all
     — it converts a €0 line into a linear one at €0.129/user/mo ($0.15).
     Everyone's audio starts costing money on the day the 51st user's
     overview is generated.
  3. **Supabase compute add-on, +€12.93–51.70/mo ($15–60).** Pro's $10/mo
     credit covers one Micro instance. At 1,000 users the chunk table holds
     ≈ 2.0M rows and its HNSW index alone is ≈ 16 GB, far past what a Micro
     instance can keep resident while every chat turn runs a vector search —
     so a Small or Medium instance is assumed. **This is the one figure in
     the table that is a judgment rather than a derivation**; it is
     unmeasured and needs a load test, and it is why the 1,000-user total is
     given as a range.
- **Flat at every step** — Edge Services (€4.99: bandwidth unlimited, 100 GB
  of cache included on Starter, so no user count in this range moves it) and
  the container floor (€34.76 by definition).

**Where a price has to land.** Reading the two per-user rows together: a
moderate user costs **€0.335/mo in pure marginal cost, €0.464 once the
deployment is on S1** — that is the number a per-user price must never fall
below. On top of it comes their share of the fixed base, which shrinks as it
is spread over the headcount:

| Users | Fixed base ÷ users | + marginal per user | **= total per user per month** |
| --: | --: | --: | --: |
| 1 | €39.75 | €0.335 | **€40.08** |
| 10 | €6.13 | €0.335 | **€6.46** |
| 100 | €0.61 | €0.464 | **€1.08** |
| 1,000 | €0.07 – €0.11 | €0.464 + €0.004 standing | **€0.54 – €0.62** |

The totals are the growth-view monthly totals divided by the user count; the
two component columns are rounded for display and can be a cent off a
hand-addition.

The fixed base is what a price must amortize, and it is the dominant term
until roughly 100 users — where €0.61 of shared base still outweighs €0.464
of marginal cost, but only just. Past that the marginal cost takes over and
the shared base becomes a rounding error.

### The capacity ceiling, stated as a finding

`max_scale = 2` (`infrastructure/main.tf`) caps the deployment at two
instances of 1 vCPU / 2 GB, whatever the demand. That is a deliberate cost
guard, and it is also a hard capacity limit — past it the system does not get
more expensive, it gets slower and then fails. Extrapolating a bill past it
would be fiction, so the growth view stops where it does. Two derived
statements:

- **Under assumption set B, the ceiling is not the first constraint at 1,000
  users.** Assuming 20% of a day's chat turns fall in the peak hour
  (assumption) and a turn holds a request slot for ~5 s (assumption), 1,000
  users generate 10,000 turns/day → 2,000 in the peak hour → **≈ 2.8
  requests in flight**. Two instances plausibly serve that; whether they do
  is **unmeasured** — per-request CPU has never been profiled under load, and
  that measurement is the prerequisite for extending this table to 10,000
  users.
- **Under assumption set A, the ceiling binds around 100 users.** The same
  arithmetic gives ≈ 2.8 requests in flight at 10 users but **≈ 28 at 100** —
  beyond what two 1-vCPU instances can be assumed to stream. Set A at 100
  users is therefore not a ≈ €5,300/mo bill; it is a deployment that
  stops serving. Raising `max_scale` turns the container line from a bounded
  €0–€34.76 into a linear-in-demand cost, and that is the change an ROI
  reader should price, not the ceiling itself.

### What else binds before the bill does

- **Signup is a closed circle** (SEC-10, `product/security.md`). Every user
  count on this page is a hypothetical, not a forecast.
- **Storage caps, not tokens, are the first thing to break.** The app-level
  caps allow a *single* user 20 notebooks × 50 sources × 20 MB
  (`MAX_FILE_BYTES`) = 20 GB of uploads — twenty times the whole project's
  Free-tier storage, and SEC-10 records the abuse implications (~50 max-size
  objects fill the tier). The closed signup circle is the load-bearing
  control; the growth view above assumes users behave like assumption set B,
  not like the caps.
- **Supabase Free pauses after 1 week of inactivity.** Irrelevant while
  users are active, but it means the Free tier is not a resting state for
  anything with a public URL.
- **Monthly active users are not a cost at this scale.** Free includes
  50,000 MAU and Pro 100,000 before the €0.0028/MAU rate ($0.00325) applies
  (fetched 2026-08-19) — 50–100× beyond the largest step modeled, so MAU
  never enters the *per user, standing* row.
- **Egress stays inside the allowances.** At 1,000 users, audio downloads are
  the largest egress item at ≈ 4.8 GB/month (2 overviews/user × ~2.4 MB per
  ~5-minute file — assumption), against Pro's 250 GB; Edge Services bandwidth
  is unlimited on all plans.

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

### The operating model (Part 2), step by step

Everything in Part 2 is the rate card times a volume. To re-run it:

1. **Unit costs.** Take the per-action footprints from the named code
   constants and multiply by the fetched per-token / per-character prices:
   one chat turn = (6,500 × €0.15 + 300 × €0.35 + 50 × €0.10) / 10⁶ =
   **€0.001085**; one typical ingestion = 5,000 words × 4/3 × 400/360 ×
   €0.10/10⁶ = **€0.000741**; one audio script = (6,400 × €0.15 + 1,070 ×
   €0.35) / 10⁶ = **€0.001335**; one audio TTS = 5,000 × $15/10⁶ =
   **$0.075 = €0.064627**.
2. **Currency.** Convert every dollar figure at the ECB euro reference rate
   stated at the top of the page (**€1 = $1.1605**, rate date 2026-08-19,
   fetched 2026-08-20): `EUR = USD / 1.1605`. Keep the dollar original in the
   note beside the converted line. Round each line item to the cent and sum
   the *rounded* line items, so every table adds up as printed.
3. **Container floor** (system, fixed): `(730 × 3600 − 200,000) × €0.00001 +
   (730 × 3600 × 2.147 − 400,000) × €0.000002 = €34.76`. A second instance
   costs the same again; `max_scale = 2` bounds it there.
4. **Per user, marginal** = Σ (per-action cost × that user's monthly action
   count). Set B: `10 × 30 × €0.001085 + (2 × 52/12) × €0.000741 +
   2 × €0.001335 = €0.3346`, plus `2 × 5,000 = 10,000` TTS characters
   (€0.129 on S1, billed only above the F0 allowance) = **€0.464** on S1.
   Set A: `1,000 × 30 × €0.001085 + 10 × 30 × €0.001335 = €32.95`, plus 1.5M
   TTS characters = $22.50 = €19.39, total **€52.34**.
5. **Standing footprint per retained source** (drives *per user, standing*
   and every storage tier step): chunks = `ceil(words × 4/3 ÷
   (CHUNK_SIZE_TOKENS − CHUNK_OVERLAP_TOKENS))` = 19 for a 5,000-word source;
   bytes per chunk = row (`4 × 2000 + 8` embedding + ~1,600 text + ~960
   tsvector + ~100 other) + indexes (~8,200 HNSW + ~400 GIN/btree) ≈
   **19.3 KB**; per source ≈ `19 × 19.3 KB + 30 KB` ≈ **0.40 MB** of
   database, plus an assumed 1 MB upload in file storage.
6. **Tier steps.** Supabase Free → Pro fires when the tighter allowance is
   exhausted: `1 GB ÷ 1 MB per source ÷ 8.7 sources per user-month =
   115 user-months`. Azure F0 → S1 fires at `500,000 ÷ 10,000 = 50 users`
   (per month, not cumulative). Supabase storage overage above Pro:
   `max(0, DB_GB − 8) × $0.125 + max(0, files_GB − 100) × $0.0213`, converted
   per step 2 and divided by the user count for the *per user, standing* row.
7. **Growth view.** For each user count *N* at a stated horizon *M* months:
   retained sources = `N × 8.7 × M`; derive storage and hence the tier from
   step 6; system fixed = €4.99 + €34.76 + any tier fee; system variable =
   the burst instance (€0–€34.76); per user, standing = step-6 overage ÷ *N*;
   per user, marginal = step 4. Monthly total = system fixed + system
   variable + *N* × (standing + marginal); per user per month = that ÷ *N*.
   The table on this page uses *M* = 12.
8. **Capacity check** (not a cost — the reason the table stops at 1,000):
   peak requests in flight = `N × turns_per_user_per_day × 0.20 × 5 s /
   3600`, against two instances of 1 vCPU / 2 GB (`max_scale = 2`). The 20%
   peak-hour share and the 5-second request duration are assumptions; neither
   has been measured under load.

**Pricing sources used on this page** (Part 1 fetched **2026-08-18**; all
Part 2 prices re-fetched **2026-08-19** and unchanged since, except for the
Supabase overage, MAU and compute-add-on rates and the Edge Services
bandwidth/cache allowances, which are new on this page; the exchange rate was
fetched **2026-08-20**):

| Provider | Page |
| --- | --- |
| Anthropic (Claude Fable 5 token prices, cache multipliers) | <https://platform.claude.com/docs/en/about-claude/pricing> |
| European Central Bank (euro reference rate, EUR/USD) | <https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html> |
| Scaleway Generative APIs (chat + embedding models) | <https://www.scaleway.com/en/pricing/model-as-a-service/> |
| Scaleway Serverless (containers, functions) | <https://www.scaleway.com/en/pricing/serverless/> |
| Scaleway Network (Edge Services plans, bandwidth, cache) | <https://www.scaleway.com/en/pricing/network/> |
| Azure AI Speech (F0 free allowance, S0/S1 has no standing fee) | <https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/> |
| Azure Retail Prices API (S1 neural TTS $/char, `swedencentral`) | <https://prices.azure.com/api/retail/prices> |
| Supabase (Free/Pro tiers, storage & MAU overage, compute add-ons) | <https://supabase.com/pricing> |
