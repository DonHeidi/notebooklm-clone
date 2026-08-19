# Foreman-2 handover addendum (2026-08-19, early day 3)

> Supplements `handovers/2026-08-18-foreman-2-handover.md` (whose craft
> items and checklist still hold) with everything that landed after it.
> Read the base handover first; this note only carries the delta.

## Board delta (all merged)

- **C8 (#54)** history + architecture views current through the board;
  scrollable docs sidebar (owner-requested mid-session).
- **C9 (#57)** generative view — model inventory (verified row-by-row at
  review), RAG pipeline, no-spend paths. Follow-ups landed: #58 (stale
  PGlite comments in webapp code, comment-only) and #59 (physical-topology
  diagram refreshed to merged-board reality).
- **C10 (#60)** scope-vs-roadmap reconciliation + #61 FAQ phrase.
- **C11 (#63)** "Marginalia in numbers": dev cost **≈ $854 API-equivalent**
  (28 transcripts; coordination 40.1%; cache reads 72% of spend) + ops
  model. Supersedes foreman-1's "~$300" estimate (annotated there).
- **C12 (#65)** research/plan split: `product/scope.md` retitled in place
  as the research catalog (filename + CF/SF ids kept — recorded citations
  stay true; phase groupings demoted to reading-order clusters), new
  **`product/target-scope.md`** defines Marginalia v1 with the same badge
  machinery and anchor-linked research ids. Root AGENTS.md now names the
  three-document set. + #68 FAQ phrase.
- **In-numbers cost-model corrections (#64, #66, #67)** — see incident
  below. Final state on main (#67): fixed-vs-variable split per scenario;
  warm container = **fixed cost of real users in both scenarios**
  (scaled-to-1 floor ≈ €34.8/mo, bursts to `max_scale = 2` bill on top,
  ≈ 2× bound); realistic 10-user all-in **≈ €43/mo** (variable ≈ €0.34/user);
  ceiling **≈ €370–405 + $250/mo** with Azure S1 + Supabase Pro as
  *required* tiers beyond the free allowances.

## Incident on record (drove a new memory rule)

The foreman made three successive rounds of direct content edits to
in-numbers.md on owner chat feedback; an interrupted command chain merged
an overcorrected intermediate (#66) to main, which the owner then had to
correct again, and the owner asked why the foreman was doing content work
at all. Resolution: #67 hot-fix restored the intended content (owner-worded
merge); the boundary is now in auto-memory (`foreman-direct-merge-boundary`):
**the foreman's direct lane is roadmap rows, one-line record fixes,
annotations, and pointers — substantive content goes to briefed sessions
even when the owner directs it in chat.** Successors: hold that line.

## Open items

1. **Intermittent local test flake** (demo-prep investigation item): 1 test
   fails in roughly 2 of 3 fresh-worktree `bun test` runs on this machine,
   then passes; failing runs also showed a truncated count (150/154). CI's
   isolated pgvector container has never failed. First seen during the C8
   review (2026-08-18); reproduced across several review worktrees;
   docs-only diffs, so no session code caused it.
2. **D2 Azure-Speech Terraform analog decision** still open (input:
   B5 handover's "what the provider cannot manage").
3. Cosmetic only: dated pre-C12 docs (feasibility, ui-research, two
   architecture views) still use "Phase n" as then-current cluster names —
   verified not-false at C12 review; no action required.
4. **Day-7 demo prep** is all that remains: walkthrough script, before-demo
   checklist (base handover items 1–3 + seed the demo account, item 4),
   and item 1 above.

## Craft additions (continue the numbering)

17. AskUserQuestion answers arrive as tool results; a long compound
    `commit && push && pr create && merge` chain can partially complete
    before a user rejection lands — after any interrupted chain, verify
    what actually executed (`git log`, `gh pr list`, `ls-remote`) before
    reasoning about state. That is how #66 merged unnoticed.
18. The in-numbers dev-cost table can be refreshed with the method in its
    own appendix; C11's row for itself was measured mid-session and
    undercounts.
