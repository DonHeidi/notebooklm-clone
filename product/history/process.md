# Process — project history

> **Status:** Snapshot as of 2026-08-18, written by session C4. The
> cross-cutting story: how the project is built, what the working model
> delivered, and where it rubbed. Later sessions append below rather than
> rewriting.
> **Sources:** PR descriptions, `handovers/`, `product/roadmap.md`,
> `product/security.md`.
>
> **Update (2026-08-18, session C8):** coverage extended through the full
> merged board — the second wave and the foreman hand-off, in the catch-up
> section at the end of this page.

## The setup (2026-08-17, PR [#1](https://github.com/DonHeidi/notebooklm-clone/pull/1))

- **Bun** as package manager, workspace manager, script runner, and test
  runner (`apps/*`, `packages/*`); **mise** pins the tools outside the JS
  dependency tree (Bun itself, Terraform, the Supabase CLI); **varlock**
  declares every environment variable in a committed `.env.schema` while
  secret values live in Proton Pass and resolve into an untracked
  `.env.local`. Two hard rules from day one: never pin dependency versions
  from memory (always `bun add`), and never print or commit secret values.
- Conventions were committed before any feature existed: nested AGENTS.md
  files per workspace, Angular-style branch naming (`<type>/<topic>`),
  Conventional Commits, work in git worktrees under `.worktrees/` — never
  directly on `main`.

## Docs before code (PRs [#2](https://github.com/DonHeidi/notebooklm-clone/pull/2)–[#5](https://github.com/DonHeidi/notebooklm-clone/pull/5))

The first four content PRs were documents, merged as a stack in order:
the product scope (adopted from a ChatGPT-drafted feature catalogue of the
real Gemini Notebook, with a provenance header saying exactly that), the
feasibility study (three parallel research passes over primary sources,
producing verdicts F-1..F-10 and decisions D-1..D-7), the UI research
(top-down decomposition of the real product from live screenshots), and the
roadmap. Decisions have been numbered ever since (D-8 arrived with spike D1,
PR [#8](https://github.com/DonHeidi/notebooklm-clone/pull/8)), which is what
lets every later PR say *why* by reference — and what this history links to.

## The working model

- **Sessions.** The planning unit is a session: one goal, one branch in a
  worktree, one PR, one handover note in `handovers/`. Time estimates for
  agent-executed work are unreliable, so the roadmap's dependency DAG is the
  contract and day numbers are loose guidance (`product/roadmap.md`).
- **A foreman and parallel lanes.** A foreman session plans, writes briefs,
  reviews PRs, and merges; worker sessions execute one brief each. Worker
  PRs carry "Do not merge — foreman reviews." Four lanes run in parallel —
  A (core product, the critical path), B (platform), C (static sites),
  D (audio differentiator) — under two ground rules: Lane A always wins
  conflicts, and a session that can't merge within a day is too big.
- **Briefs carry boundaries.** Each brief names allowed and read-only
  surfaces plus expected "hot files" (shared files like `bun.lock` that
  several lanes touch); sessions list their actual hot-file changes in the
  PR so the foreman can sequence merges deliberately.
- **Risk first.** The riskiest unknown (SSE through Scaleway's gateway) was
  deliberately scheduled as the *first* platform session (B1) rather than
  late — it decided D-7 on day 1 with measurements instead of leaving a
  possible VM migration hanging over the week
  (PR [#11](https://github.com/DonHeidi/notebooklm-clone/pull/11)).
- **The security register** (`product/security.md`, PRs
  [#16](https://github.com/DonHeidi/notebooklm-clone/pull/16),
  [#17](https://github.com/DonHeidi/notebooklm-clone/pull/17)) turns review
  findings into numbered SEC rows with explicit prototype-acceptance
  rationale and hardening triggers, instead of burying them in PR comments.
  "Accepted" always names the trigger that revokes it.
- **The owner stays in the loop at decision points, not keystrokes:**
  confirming the Marginalia name mid-session (C1), re-weighting the TTS
  criteria mid-spike (D1), dictating the Impressum data verbatim (C3),
  approving deploys (B2), and deciding D-1 (Node runtime).

## What the parallelism actually delivered

**Wave 1 landed in one day.** On 2026-08-17, eleven PRs merged: the
scaffold, all four founding documents, A1 (domain schema), A2 (auth +
library), B1 (SSE spike, D-7 decided), C1 (marketing site), C2 (docs site),
and D1 (TTS spike, D-8 decided) — four lanes genuinely in flight at once
(PRs [#1](https://github.com/DonHeidi/notebooklm-clone/pull/1)–[#11](https://github.com/DonHeidi/notebooklm-clone/pull/11)).
Day 2 (2026-08-18) added A3 (ingestion), B2 (CI + deploys — the sites went
live), C3 (legal pages), the security register, and a deploy fix
(PRs [#12](https://github.com/DonHeidi/notebooklm-clone/pull/12)–[#19](https://github.com/DonHeidi/notebooklm-clone/pull/19)).
Review capacity — not execution — was the bottleneck, as the roadmap
predicted.

## Where it rubbed

- **`bun.lock` is the collision point.** Nearly every session adds
  dependencies, and they all funnel into the root lockfile: A1, C1, C2, B1,
  and A3 each listed `bun.lock` as a hot file. The mitigation is
  procedural, not technical — PRs declare the change, Lane A wins, and the
  losing branch re-runs `bun add` after rebasing (spelled out in B1's PR).
  It worked, at the cost of foreman attention on every merge.
- **Two spikes appended to the same document.** B1 and D1 both appended to
  `product/feasibility.md`'s decision and risk sections in parallel; D1's
  PR predicted the conflict and specified the resolution ("keep both") in
  advance. The conflict happened as predicted and resolved trivially —
  declaring expected conflicts in the PR turned a merge hazard into a
  non-event (PRs [#8](https://github.com/DonHeidi/notebooklm-clone/pull/8),
  [#11](https://github.com/DonHeidi/notebooklm-clone/pull/11)).
- **Cross-lane coupling surfaced at deploy time.** A2 made the webapp build
  require Supabase env values, which silently broke B1's Dockerfile on
  main — discovered only when B2 built the deploy image. B2 added the build
  args on its own allowed surface and noted that main's Dockerfile alone no
  longer built (PR [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13)).
  Hot-file lists cover shared *files*; shared *build contracts* had no
  equivalent declaration.
- **CI found what local runs couldn't.** The `bun test` exit-99-despite-
  passing quirk and PGlite's slow cold init existed from A1 onward but only
  surfaced when B2's CI checked exit codes on a slow runner — a working
  argument for getting CI up early in the week
  (details in `product/history/infrastructure.md`).
- **Sequencing against going public.** C3 (Impressum + privacy pages) was
  inserted into the roadmap on 2026-08-18, explicitly *before* B2 made the
  static sites publicly reachable (PR [#12](https://github.com/DonHeidi/notebooklm-clone/pull/12))
  — an example of the roadmap being extended mid-flight, as its own status
  header invites.
- **The B1 false start.** Two sessions opened with the B1 brief on
  2026-08-17: the first, launched at ~16:21, ended after four API calls
  (~$1 of usage) with no commits and no PR trace; a fresh session at ~16:26
  with the identical brief did all the actual work and produced PR
  [#11](https://github.com/DonHeidi/notebooklm-clone/pull/11). What ended
  the first session is unrecorded — it predates the correct-the-record
  convention. It was found only retroactively, in the foreman's
  cross-session usage analysis on 2026-08-18; the aborted session was
  invisible in the git/PR record. Resolution: relaunch with the identical
  brief — nothing was lost because nothing had been produced. The process
  lesson: session starts are cheap and disposable precisely because briefs
  are self-contained and re-runnable. (Source: foreman session record,
  recorded via PR [#22](https://github.com/DonHeidi/notebooklm-clone/pull/22)
  — see "Correcting the record" below.)
- **GitHub itself flaked mid-wave.** During the evening merges of PRs
  [#9](https://github.com/DonHeidi/notebooklm-clone/pull/9)–[#11](https://github.com/DonHeidi/notebooklm-clone/pull/11)
  on 2026-08-17, GitHub's API intermittently returned HTTP 503 ("No server
  is currently available") — merges and PR reads failed mid-sequence.
  Found by direct `gh` failures while the foreman was merging the reviewed
  wave; absorbed by a background retry loop (re-attempt every ~15 s,
  checking merge state each pass) that landed both blocked merges on the
  fourth attempt, while B1's conflict resolution proceeded locally in
  parallel — git itself was unaffected. The lesson: external-platform
  flakiness is absorbed by making merge operations idempotent-and-retried,
  not by waiting. Nothing in the repo record shows it happened — which is
  precisely why this history page exists. (Source: foreman session record,
  recorded via PR [#22](https://github.com/DonHeidi/notebooklm-clone/pull/22).)
- **Third-party review automation throttled during the wave.** The
  CodeRabbit reviews on the day-1 merge wave repeatedly hit the plan's
  rate limit (visible in the PR comment threads of
  [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6),
  [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10),
  [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13)); the
  foreman's own review remained the effective gate.

## Correcting the record

Three incidents on this page and in `product/history/webapp.md` — the B1
false start, the shadcn CLI flag change, and the GitHub 503 window — appear
in no PR, handover, doc, or commit: they lived only in the foreman
session's own history. C4's first draft omitted them under its
every-claim-traceable rule; the facts were then supplied from the foreman
session record and confirmed by the owner during the review exchange of PR
[#22](https://github.com/DonHeidi/notebooklm-clone/pull/22), which is now
their citable source. The gap the rule caught is itself the finding:
session knowledge that never reaches the repo is invisible to every future
reader, and this history section exists to close exactly that gap — this
correction being its first proof.

## Where the process stands

Eleven working sessions and nineteen PRs in, the conventions have held: no
work on `main`, every session ended in a reviewed PR and a handover, and
both spikes converted risk into numbered decisions before feature work
depended on them. The known process debts are the ones the friction list
implies — shared build contracts between lanes are only caught at
integration time, and hot-file resolution costs foreman attention on every
overlapping merge.

## Why human-in-the-loop between sessions (extended 2026-08-18, session C6)

A natural question about this working model: why review at every session
boundary instead of letting one long agentic loop run the whole roadmap?
The owner's rationale, recorded here from the foreman exchange of
2026-08-18: reviewing each session's output allows observation of
intermediate results, so diversion or drift is detected early instead of
compounding across an unattended run; and the checkpoints are where
requirements get fine-tuned and external feedback injected. The roadmap
itself is the evidence — C3 (legal pages before going public), C4–C6
(history, architecture views, this rationale), and A7 (the D-9 test
migration) were all added mid-flight at review boundaries, none of them in
the original plan. The review gate is not overhead on the process; it is
where the process steers.

## Catch-up: the second wave and the foreman hand-off (appended 2026-08-18, session C8)

Written by session C8 from the session handovers, the two foreman
handovers (`handovers/2026-08-18-foreman-handover.md`,
`…-foreman-2-handover.md`), and the PR record (#24–#50). By end of day 2
the entire roadmap board was merged — S-0, A1–A7, B1–B5, C1–C7, D1–D2, 51
PRs — and the product live on its own domain (`https://app.mrgnl.eu`).
What follows is what the process record gained on the way there.

### The second wave

Day 2's second half landed the rest of the board: A4 (grounded chat), D2
(audio overview), A5 (citation navigation + notes), A7 (the D-9 test
migration), B3 (hosted demo environment), C5–C7 (architecture views,
rationale + FAQ, scope status), B4 (custom domain), B5 (Supabase under
Terraform), and A6 (demo polish) — with the foreman role itself handed
over in between. The predicted-collision discipline held: A4 and A5 both
declared their expected merge conflicts with D2 in their PRs before the
conflicts existed (`bun.lock`, the workspace `page.tsx`), and both
resolved per the standing protocol (Lane A wins; take main's lockfile and
re-run the branch's `bun add`s).

### Where it rubbed, round two

- **A cross-lane lint break gated CI for half a wave.** After the #27–#29
  merges, main's CI was red at the Lint step on two
  `react-hooks/set-state-in-effect` findings in D2's studio components —
  so A7's PR
  [#33](https://github.com/DonHeidi/notebooklm-clone/pull/33) stopped at
  Lint and its Test step (the whole point of that PR) never ran in CI; the
  proof of D-9's exit-code contract had to be local full-suite runs. The
  fix was a dedicated two-effect PR
  ([#35](https://github.com/DonHeidi/notebooklm-clone/pull/35)) rather
  than a drive-by from an unrelated lane — boundary discipline kept even
  for a two-line fix. The instructive tail: A6's brief, written earlier,
  still listed the lint fix as a requirement; A6 verified it was already
  done and annotated the A7 handover instead of re-fixing. Briefs encode
  the board state at writing time — correct-the-record applies to their
  assumptions too.
- **Deviate-and-flag worked as designed.** B5's brief said to manage
  `supabase_settings` for what is configured today; the session concluded
  that doing so would create a standing double-ownership fight with
  `supabase config push` and deliberately did **not** instantiate the
  resource — flagging the deviation from the brief's letter, with
  reasoning, in the PR
  ([#48](https://github.com/DonHeidi/notebooklm-clone/pull/48)) for
  foreman review. The deviation was accepted. The pattern on record:
  a worker may deviate from a brief's letter in service of its intent,
  but only visibly, never silently.
- **The foreman role needed its own handover.** The first foreman session
  ended of context weight after ~20 sessions of coordination; its
  handover (`handovers/2026-08-18-foreman-handover.md`) carries the live
  board, open decisions, and twelve numbered items of operational craft —
  and the successor (foreman-2) continued the numbering to sixteen. The
  session-handover convention proved to apply to the coordinating role
  exactly as to workers, including the advice to write the handover
  *before* the context runs out.
- **Verification tooling can lie green.** Foreman-2's craft items record
  two traps found the hard way: `bunx varlock run` from a worktree
  *subdirectory* silently no-ops with exit 0 (it prints "No .env files
  found" and the wrapped command never runs — "a green verification can
  be a verification that never happened"), and `supabase config push`
  auto-confirms when it detects an agent, making every push an apply
  (found in B3 when a piped "n" did not abort). Both are now standing
  session-brief warnings.
- **Adjacent-row edits do conflict.** A6 and B5 each touched one adjacent
  row of `product/security.md`'s register table and merge-conflicted;
  the resolution was mechanical (keep both rows) but the foreman-2
  handover's rule is the keeper: verify the kept SEC-n lines afterwards
  by content, not by count.
- **Worktree hygiene stayed manual.** Worker sessions leave their
  worktrees behind (found twice — craft items 7 and 16), and
  `gh pr merge --delete-branch` fails while a worktree still holds the
  branch. The foreman checks `git worktree list` after every merge batch.

### Spike → decision → implementation, completed (D1 → D2)

The D-lane closed the loop the spike process was designed for. D1's
weighted-criteria spike decided D-8 (Azure AI Speech, region pinned);
D2 implemented it and immediately hit reality — Azure had closed
`westeurope` to new customers. The deviation was handled inside the
decision's own frame: `swedencentral` was chosen because it preserves
every property the original region was picked for (EU in-region
processing, standard + HD German voices), and the correction was recorded
against D-8 rather than re-opening it
(PR [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27)). The
owner stayed at the decision points: auditioning five real voice
generations mid-session and accepting standard-neural quality (no
ElevenLabs escalation). The same flow then seeded the next decision:
B5's recorded list of what the Supabase Terraform provider *cannot*
manage is the standing input to the still-open question of
Terraform-managing the Azure Speech resources
(`handovers/2026-08-18-session-b5-supabase-terraform.md`).

### The appending contract needed a batch session

C4's handover set the contract that later sessions append to the history
pages in the same PR that does the work "or the foreman batches it".
Through ten further merged sessions, only A7 did (its D-9 annotations);
the pages fell behind reality — `product/history/supabase.md` still said
no hosted project existed while the product ran on one. C8 (roadmap row
via PR [#51](https://github.com/DonHeidi/notebooklm-clone/pull/51)) is
the foreman-dispatched batch. The honest reading for future boards:
per-session appending loses to feature pressure unless the review
checklist enforces it, and a scheduled catch-up session is the fallback
that actually happens.

### Where the process stands (2026-08-18, after the board)

Every roadmap session is merged (51 PRs), the product is live, and ~4 days
of buffer remain for day-7 demo prep. The conventions held under
parallelism twice over; the second wave's new lessons are the ones above —
green that isn't green, briefs that go stale, and record-keeping that
needs enforcement, not intention.
