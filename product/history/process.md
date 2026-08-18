# Process — project history

> **Status:** Snapshot as of 2026-08-18, written by session C4. The
> cross-cutting story: how the project is built, what the working model
> delivered, and where it rubbed. Later sessions append below rather than
> rewriting.
> **Sources:** PR descriptions, `handovers/`, `product/roadmap.md`,
> `product/security.md`.

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
- **Third-party review automation throttled during the wave.** The
  CodeRabbit reviews on the day-1 merge wave repeatedly hit the plan's
  rate limit (visible in the PR comment threads of
  [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6),
  [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10),
  [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13)); the
  foreman's own review remained the effective gate.

## Where the process stands

Eleven working sessions and nineteen PRs in, the conventions have held: no
work on `main`, every session ended in a reviewed PR and a handover, and
both spikes converted risk into numbered decisions before feature work
depended on them. The known process debts are the ones the friction list
implies — shared build contracts between lanes are only caught at
integration time, and hot-file resolution costs foreman attention on every
overlapping merge.
