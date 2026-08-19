# FAQ — quick answers

> **Status:** Added 2026-08-18 (session C6). A routing layer, not a fifth
> copy of the content: every answer is deliberately short and ends with a
> link to the document that carries the full story — the decision record
> (D-n), an architecture view, a history page, or the security register.
> If an answer here and a deep doc ever disagree, the deep doc wins and
> this page has a bug.

## Is this affiliated with Google or NotebookLM?

No. **Marginalia** is an independent open-source clone built as a
demonstration project; it is not affiliated with Google, NotebookLM, or
Gemini, and every public page carries that notice in its footer. The name
and identity have their own story.
→ [history/marketing.md](history/marketing.md)

## Why Scaleway, when the target company works with AWS?

A deliberate, owner-decided deviation: Scaleway is more cost-effective and
carries less organisational overhead for a prototype, and the building
blocks are deliberately interchangeable — the same Docker image, S3-
compatible storage already driven by `aws s3 sync`, and a provider-swap
LLM abstraction mean provisioning on AWS is straightforwardly
accomplishable. Decision **D-10** records the rationale, a per-building-
block AWS interchange map, and the honest caveats.
→ [feasibility.md — D-10](feasibility.md)

## Why does Bun run the tooling but Node the production container?

Bun 1.3 has acknowledged bugs on exactly this app's path — `next build`
segfaults, ~670 MB idle memory for the standalone server, and open
streaming issues, while streaming chat is the core feature. So Node runs
production (the official Next standalone Docker pattern) and Bun stays as
package manager, script runner, and test runner. Decision **D-1** has the
issue links.
→ [feasibility.md — D-1](feasibility.md)

## Why Supabase?

The stack — Supabase included — was a declared parameter of the challenge
this project answers; the feasibility study's job was to validate it, not
choose it. It validated well: auth, Postgres with pgvector, storage with
row-level security, and realtime are exactly the BaaS building blocks a
grounded-chat product needs (verdicts F-3, F-6). How the schema ownership
is split between Drizzle and Supabase migrations is its own story.
→ [history/supabase.md](history/supabase.md)

## How are answers kept grounded — can it fake citations?

Retrieved chunks enter the prompt only inside delimiter blocks the model
is told are data, never instructions, and the `[n]` citation markers it
emits are mapped **server-side against the retrieved set only** — an
invented marker cites nothing and is dropped, so a citation chip can only
ever point at a chunk that was actually retrieved. Citation *relevance* is
still model-limited; the structural guarantees and their limits are
recorded as SEC-3 and in the logical view's grounding contract.
→ [architecture/logical.md](architecture/logical.md)

## What happens to uploaded documents?

Uploads go from the browser directly to a **private** storage bucket under
a path owned by the uploading user and guarded by row-level security; the
chosen model provider processes prompts with zero retention and no
training on them (D-4). Honest current-state note: no hosted Supabase
project exists yet — today the data plane runs against a *local* Supabase
stack, and going hosted is session B3's pending work. The deployment
reality is in the physical view; the legal stance is on the privacy pages.
→ [architecture/physical.md](architecture/physical.md)

## Why are some NotebookLM features missing?

By design: the target is **the prototype end state** — the grounded-chat
core loop plus Audio Overview — and the roadmap carries an explicit cut list
(YouTube/Drive ingestion, sharing, research modes, mind maps, and more)
that stays catalogued in the research document rather than getting stub UI. The
smallest product that genuinely captures NotebookLM is the targeted
version defined in [target-scope.md](target-scope.md), and that is what
is built.
→ [roadmap.md](roadmap.md)

## How was this built in seven days?

By a foreman-and-workers process: a foreman session plans, writes
self-contained briefs, reviews, and merges, while agent-executed worker
sessions run in up to four parallel lanes, each ending in a PR and a
handover note. Eleven PRs merged on day one alone; review capacity, not
execution, was the bottleneck. The full story — including where the
process rubbed — is on the process history page.
→ [history/process.md](history/process.md)

## Why review between sessions instead of one long agentic loop?

The owner's rationale: reviewing each session's output means intermediate
results are *observed*, so drift is detected early instead of compounding
across an unattended run — and the review checkpoints are where
requirements get fine-tuned and external feedback injected. The roadmap
itself changed this way: several sessions (C3–C6, A7) were added
mid-flight at review boundaries.
→ [history/process.md](history/process.md)

## What does it cost to run?

Per the feasibility study's running-cost table: roughly **€0–5/month
idle** (container scaled to zero, free tiers) and **€65–80/month
demo-ready** (container at min-scale 1, Supabase Pro). Audio generation
adds ~$0.07 per episode on Azure's paid tier and $0 within its free tier
(D-8).
→ [feasibility.md](feasibility.md)

## Can I run it locally?

Yes — the local stack is the development default: `mise exec -- supabase
start` runs Supabase (Docker required), `bun install` and `bun run
dev:webapp` run the app, and every required environment variable is
declared in the committed `.env.schema` (you supply your own values, e.g.
a model-provider key; secrets are never in the repo). The conventions live
in the repo's AGENTS.md files.
→ [`AGENTS.md`](https://github.com/DonHeidi/notebooklm-clone/blob/main/AGENTS.md)
