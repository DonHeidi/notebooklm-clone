# Session C15 — in-numbers readability (2026-08-20)

## Goal

Roadmap lane C, session C15 (`docs/in-numbers-readability`): make the cost
tables in `product/in-numbers.md` **readable**, not just correct. Owner review
of the C14 tables, 2026-08-20 — verdict *legible but not readable*: "the rows
are clean; the problem is that the table asks the reader to do arithmetic it
should have done, and hides its own assumptions." Docs-only; no product code
touched. The defects were fixed **page-wide** — today's deployment, the rate
card, assumption set A, assumption set B and the growth view — not only on
the table the owner screenshotted.

## What was done

### 1. One presentation currency, with a dated rate

C14's rule ("line items are in each provider's billing currency; no
exchange-rate conversion is applied") made every total a sum the reader had to
finish: `≈ €369–404 + $250`. Part 2 is now **euro throughout**, converted at
the **ECB euro reference rate for 2026-08-19, €1 = $1.1605** (fetched
2026-08-20 from the ECB's published reference-rate page, added to the
appendix's pricing-source table). Every converted line keeps its **dollar
original in its note** — `$25.00`, `$225.00`, `$15.00/1M characters` and so
on — so nothing is lost and nothing has to be taken on faith.

**Part 1 deliberately stays in USD.** It mixes no currencies (every figure is
an Anthropic list price, published in dollars), so converting it would add a
conversion step to numbers that never needed one. The page says this
explicitly in the status header, and the headline total carries a euro
equivalent (≈ $854 ≈ €736) so build cost and run cost can still be compared.

### 2. Line items / summary block split

Every cost table is now two tables:

- **Line items** — `# · line item · volume · cost`. The cost column holds a
  figure and nothing else.
- **A summary block** — headed with the user count it is evaluated at, e.g.
  `Summary — assumption set A, 10 users`, and closing with the four standard
  rows plus **`Total, N users`** and **`Per user per month`**.

Set A's and set B's summaries carry a **`From` column** naming which line
items each row is composed of (`System, fixed | A1 + A2 + A3 | €61.29`), so
the decomposition is legible without re-reading the prose. The growth view
gets the same treatment split across four user-count columns: a **drivers**
table (retained sources, storage, tiers in force, requests in flight) and a
**summary** table with the four rows, the monthly total and the per-user
total.

**The page now does the arithmetic it used to ask for**: every summary block
ends with the monthly total *and* that total divided by the user count. That
per-user-per-month figure — €4.31 at ten moderate users, €1.08 at a hundred,
€0.54–0.62 at a thousand — is the number a pricing reader actually wants and
it was nowhere on the C14 page.

### 3. Derivations and caveats out of the cost column, into notes

Every derivation, price source, retrieval date, tier condition and labeled
assumption moved out of the table cells into a **bulleted note list directly
under its table**, keyed by marker: `T1…T7` (today), `R1…R8` (rate card),
`A1…A9` (set A), `B1…B10` (set B), `G1…G10` (growth view). Markers are
prefixed per table rather than restarting at 1, so a note can be cited
unambiguously in prose ("see note A8"). Notes are **bullets, not an ordered
list** — an ordered list rendered "1. **A1** — …", numbering the markers
twice.

Rows that exist only in the summary (per-user standing, the compute add-on,
the burst instance) get notes too — A9, G7, G8, G9 — so no summary figure is
unexplained.

### 4. "Fixed" disambiguated; rows renamed

The four rows are now **System, fixed · System, variable · Per user, standing
· Per user, marginal** (was: fixed/variable cost of the system,
fixed/variable cost per user). The definitions are unchanged. The rename plus
a new paragraph fixes the ambiguity the owner named: *fixed* meant "does not
move with load" on the system rows and "does not move with that user's
activity" on the per-user rows — and the second kind scales with headcount,
which the old labels actively hid. The definition table gained a **"What
moves it"** column so each row states its own step behaviour.

### 5. The one-time ingestion row left the monthly table

Set A's "filling every ingestion slot" line (€296.00) was a one-time cost
sitting in a monthly table with an inline "*One-time, not monthly:*" prefix
doing the disambiguating. It is now its own **Line items — one-time, not
monthly** table with its own note, and the summary block mentions it once
below the monthly total. It cannot leak into a monthly figure any more.

## Restated figures

Everything below is the same model as C14, re-expressed in euro. Nothing in
the cost model changed except two arithmetic slips (see *Corrections*).

| Table | C14 | C15 |
| --- | --- | --- |
| Today's deployment | €4.99 | €4.99 |
| Set A, 10 users | ≈ €369–404 + $250 | **€584.67 – €619.43** (€58.47–61.94 per user) |
| Set B, 10 users | ≈ €43.10 | **€43.10** (€4.31 per user) |
| Growth, 1 user | ≈ €40.09 | **€40.08** |
| Growth, 10 users | ≈ €43.10 + $25 | **€64.64** (€6.46 per user) |
| Growth, 100 users | ≈ €73.21 + $40 | **€107.67** (€1.08 per user) |
| Growth, 1,000 users | ≈ €374–409 + $194–239 | **€541.72 – €615.25** (€0.54–0.62 per user) |

Per-user marginal cost: **€0.335/mo** on the Azure F0 tier, **€0.464/mo**
once S1 applies above 50 users (set B); **€52.34/mo** under set A.

## Rounding convention (new, stated on the page)

Line items are rounded to the cent and each summary block **sums the rounded
line items**, so every table adds up exactly as printed — the point of a
readability pass. The "(€x each)" figures in parentheses are the monthly
figure ÷ the user count, so they can sit a cent off a hand-multiplication;
the monthly figure is the computed one. This is stated in *How to read every
table in this part* and in appendix step 2, so nobody has to rediscover it.

The rate card is the exception: it is quoted to **six decimals**, chosen so
the three chat-turn components sum exactly to the €0.001085 total instead of
appearing not to.

## Corrections made to the record

- **`handovers/2026-08-19-session-c14-in-numbers-cost-model.md`** carries a
  dated correction blockquote: the four row labels, the no-conversion
  currency rule, the restated totals, and two arithmetic slips.
- **Two arithmetic slips in C14, fixed on the page:** the audio-script unit
  cost is (6,400 × €0.15 + 1,070 × €0.35)/10⁶ = **€0.001335**, not
  €0.001334; the Supabase storage overage at 1,000 users is 33.2 × $0.125 +
  4.4 × $0.0213 = **$4.24**, not $4.23. Neither moves a rounded total.
- No AGENTS.md claim was disproved; none needed changing.

## Verified

- **Rounding audit, by recomputation.** Every figure on the page was
  recomputed from the code constants and fetched prices in a throwaway
  script (session scratchpad, not committed) before being written. Each
  summary block sums its own printed line items: today €4.99; set A
  €61.29 + €523.38 = €584.67 (+ €34.76 burst = €619.43); set B
  €39.75 + €3.35 = €43.10; growth €39.75 + €0.33 = €40.08 /
  €61.29 + €3.35 = €64.64 / €61.29 + €46.38 = €107.67 /
  €74.22 + €3.66 + €463.84 = €541.72 to €112.99 + €34.76 + €3.66 +
  €463.84 = €615.25.
- `apps/docs` `bun run build` from the worktree: **57 pages**, exit 0.
  `dist/product/in-numbers/index.html` renders 17 tables, 5 occurrences of
  **System, fixed** (definitions + today + set A + set B + growth view) and
  4 `Summary — …` headings, each naming its user count.
- **Rendered page screenshotted** (headless chromium against the built
  `dist/`) and read at every cost table — the line-items → notes → summary
  rhythm holds, no table overflows its box, and the euro column is the only
  currency column in Part 2.
- Repo root: `bunx varlock run -- bun test` → **154 pass, 0 fail**;
  `bunx varlock run -- bun run build` → exit 0.
- Grep: no `Fixed cost of the system` / `Variable cost per user` / `€0 / $0`
  left in `product/in-numbers.md`; every remaining `$` figure in Part 2 sits
  in a note beside its euro conversion or in the appendix formulas.

## Findings worth keeping

- **The reader's question is "what does a user cost", and no C14 table
  answered it.** Every table stopped at the monthly total. Adding one row —
  total ÷ user count — is the single highest-value change on the page; the
  fixed-base-per-user table under *Where a price has to land* falls straight
  out of it.
- **A "From" column beats a prose explanation.** Naming the line items each
  summary row is built from (`A5 + A6 + A7`) removed three paragraphs of
  "the variable rows comprise…" and made the table self-auditing.
- **The mixed-currency rule was a correctness instinct that cost
  readability.** Refusing to convert protected the page from a stale rate,
  but pushed the conversion onto every reader, every time, with no rate at
  all. A dated rate with the originals in the notes is both correct *and*
  readable — and the rate is now one more thing the appendix says how to
  re-fetch.
- **Round line items, then sum the rounded values.** Summing at full
  precision and rounding once is more accurate and visibly *wrong* on the
  page (columns that do not add up). For a page whose job is to be audited by
  eye, printing what adds up wins; the convention is stated rather than
  hidden.
- **Prefixed note markers (`A8`) beat restarting numbers per table.** They
  survive being cited from prose and from another table's notes, which
  happens a lot on this page (`as note T1 above`, `bounded by … (note A4)`).

## Hot files

None. No new dependencies; `bun.lock` and root `package.json` untouched.

## Open items / next sessions

- **The exchange rate is now a dated figure like any price** and will go
  stale. Appendix step 2 says how to re-fetch and re-apply it; a future
  refresh session should re-run it alongside the provider prices.
- **Nothing in Part 2 is measured** (unchanged from C14): both assumption
  sets, the 1 MB upload size, the 20% peak-hour share, the 5 s request
  duration and the Supabase compute add-on are assumptions. Telemetry
  replaces them; the appendix's 8 steps then re-run.
- **The capacity ceiling still needs a load test**, not more arithmetic —
  it is why the 1,000-user total remains a €541.72–615.25 range.
- **Part 1 is still a mid-session snapshot**: the C11 row measured itself
  while running, so the $854 total is a floor. Re-running the appendix's
  Part 1 method refreshes it; out of scope here.
- After merge: foreman dispatches `deploy-static-sites`.
