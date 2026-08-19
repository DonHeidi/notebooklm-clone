# Target scope — Marginalia v1

> **Status:** Adopted 2026-08-18 (owner decision, session C12); re-baselined
> against the target 2026-08-19 (owner review, session C13). Living
> document: whichever session ships or cuts a delivered item updates this
> table in the same change.
> **Role:** this document **commits to a target** — it defines what
> Marginalia v1, the shipped 7-day-prototype end state, *is*, and it is the
> **only** document that records implementation status. Its counterparts:
> [scope.md](scope.md) is the **research catalog** of what Gemini Notebook
> offers (descriptive, no plan meaning, no status), and
> [roadmap.md](roadmap.md) is the authoritative plan whose end state this
> document itemizes.
> **Single source per fact:** where a fact is already recorded — the
> security register, the in-numbers page, a session handover — this
> document links the record instead of restating prose that can drift.

## What Marginalia v1 is

The [roadmap](roadmap.md)'s delivered end state: the characteristic
NotebookLM experience — **notebooks → sources → retrieval → grounded chat →
inline citations → source navigation → notes** — plus **Audio Overview** as
the differentiator, deployed on Scaleway and demoable at
[app.mrgnl.eu](https://app.mrgnl.eu). Two supporting features that the end
state does not name were built as prerequisites: authentication (everything
is user-scoped) and usage quotas (operational cost control).

## The targeted version, item by item

**Status measures delivery against the v1 target defined in each row** —
not against everything Gemini Notebook does. A row is ✅ when what v1
committed to shipped, and 🔶 only when a limitation sits inside that
commitment itself. Where the target is deliberately narrower than the
researched capability, the narrowing is part of the target and is stated in
the target column; it does not degrade the status.

The [research catalog](scope.md) is descriptive and carries no
implementation status at all — the research id in each row is a
traceability link into the description of the original capability, nothing
more. Rows without one are marked **prototype-only**: they exist because
the prototype needed them, not because the research catalogued them.

| Capability | What v1 targets | Status | Shipped in | Known limitation |
| --- | --- | --- | --- | --- |
| Notebook management ([CF-01](scope.md#cf-01--notebook-management)) | Create, rename, delete and open notebooks; each one an isolated, persistent, user-scoped source collection (roadmap A1/A2). | ✅ | [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6), [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10), [#36](https://github.com/DonHeidi/notebooklm-clone/pull/36) | — |
| Notebook library ([SF-02](scope.md#sf-02--notebook-library--home-screen)) | The signed-in home screen: see your notebooks, open, create, delete (roadmap A2). Owned notebooks only — there is no shared-notebook section, because sharing is cut. | ✅ | [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10) | — |
| Authentication (email + password) ([SF-01](scope.md#sf-01--authentication-and-account-management)) | Email + password signup, login and logout with server-side sessions, so every notebook is user-scoped (roadmap A2: `@supabase/ssr` auth + RLS). SSO/OAuth, account deletion and plan association are outside the target. | ✅ | [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10) | — |
| Source ingestion (PDF, TXT/Markdown, pasted text, URL) ([CF-02](scope.md#cf-02--source-ingestion)) | Exactly those four source kinds, parsed → chunked → embedded (roadmap A3). DOCX was conditional — "only if mammoth drops in trivially" — and did not qualify; every other format is on the [cut list](roadmap.md). | ✅ | [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15) | DOCX not shipped: the parser was not a trivial drop-in ([A3 handover](../handovers/2026-08-18-session-a3-ingestion.md)) |
| Source processing and retrieval index ([CF-03](scope.md#cf-03--source-processing-and-knowledge-indexing)) | Every source converted into retrievable chunks carrying the location metadata citations point at, with per-source processing/ready/failed state (roadmap A1/A3). | ✅ | [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6), [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15), [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24) | — |
| Source viewer ([CF-04](scope.md#cf-04--source-viewer)) | Open a source, read its extracted content, see its status, remove it — and land on the cited passage when a citation is clicked (roadmap A3 "basic source viewer" + A5). Auto-generated Source Guide summaries are cut. | ✅ | [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15), [#29](https://github.com/DonHeidi/notebooklm-clone/pull/29) | The viewer is a dialog, so an open source is not URL-addressable or shareable ([A5 handover, open items](../handovers/2026-08-18-session-a5-citations-notes.md)) |
| Source selection for retrieval ([CF-05](scope.md#cf-05--source-selection--context-control)) | Per-source checkboxes and an "N sources" counter that restrict retrieval to the selected subset (roadmap A4). | ✅ | [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24) | — |
| Grounded AI chat ([CF-06](scope.md#cf-06--grounded-ai-chat)) | Streaming, multi-turn answers grounded in the selected sources via hybrid retrieval (RRF), including an explicit zero-source disclosure mode (roadmap A4). | ✅ | [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24) | — |
| Inline citations ([CF-07](scope.md#cf-07--inline-citations)) | Citations streamed with the answer as chips carrying source, location and excerpt, clicking through to the passage in the viewer (roadmap A4/A5; verified on the deployed environment in B3). | ✅ | [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24), [#29](https://github.com/DonHeidi/notebooklm-clone/pull/29), [#36](https://github.com/DonHeidi/notebooklm-clone/pull/36) | Markers always resolve to a retrieved chunk of a selected source, but the model sometimes picks a weakly related one ([A4 handover, "Gotchas" §4](../handovers/2026-08-18-session-a4-grounded-chat.md)) |
| Chat history (persistent, multi-turn) ([CF-08](scope.md#cf-08--conversation-state)) | Conversation history persisted per notebook, multi-turn context, and clear-chat (roadmap A4). Server-side stop and regenerate are cut. | ✅ | [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24) | The stop button aborts the client view only: the server finishes the answer and persists it in full ([A4 handover, "Gotchas" §1](../handovers/2026-08-18-session-a4-grounded-chat.md)) |
| Notes, including saved chat answers ([CF-10](scope.md#cf-10--notes)) | Create, edit and delete notes, and save a chat answer as a note with its citations preserved and still navigable (roadmap A5). Note→source conversion is cut. | ✅ | [#29](https://github.com/DonHeidi/notebooklm-clone/pull/29) | — |
| Audio Overview (single narrator) ([CF-12](scope.md#cf-12--audio-overview)) | A single-narrator spoken overview of the selected sources — script → TTS → stored artifact — with language, voice and focus configuration, asynchronous generation and in-app playback (roadmap D2). Two-speaker and interactive audio are cut. | ✅ | [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27) | The generated script is not persisted, so an overview has no readable transcript ([D2 handover, open items](../handovers/2026-08-18-session-d2-audio-overview.md)) |
| Audio artifact management ([SF-08](scope.md#sf-08--artifact-sharing-and-download)) | Download, rename, regenerate and delete a generated overview over private signed URLs (roadmap D2's Studio tile). Sharing and public links are cut. | ✅ | [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27) | Playback/download URLs expire after 10 minutes; a long-paused episode needs Play pressed again ([D2 handover, open items](../handovers/2026-08-18-session-d2-audio-overview.md)) |
| Background generation (in-process async) ([SF-09](scope.md#sf-09--background-generation-jobs)) | Generation runs asynchronously so the app stays usable, **in-process by decision** ([feasibility](feasibility.md) D-2 stage 1), with job state in a status column. Queued, recoverable job infrastructure is cut. | ✅ | [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15), [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27) | Live status is short-interval polling, not Supabase Realtime — decided in session A3 for fewer silent-failure modes at these durations ([A3 handover](../handovers/2026-08-18-session-a3-ingestion.md)) |
| Language configuration (audio output) ([SF-10](scope.md#sf-10--language-configuration)) | The Audio Overview's output language is selectable — German or English — independently of the source language (roadmap D2). Multilingual output everywhere else is cut. | ✅ | [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27) | — |
| Usage guards and per-user quotas ([SF-11](scope.md#sf-11--usage-limits-and-quotas)) | Ingestion and generation guards (20 MB/file, 200k words/source, 50 sources/notebook, 20 artifacts/notebook, 1 concurrent generation) plus per-user quotas as the cost-control minimum: 20 notebooks/user, 50 chat messages/notebook/day, 10 audio overviews/user/day (roadmap A3/D2/A6). | ✅ | [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15), [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27), [#49](https://github.com/DonHeidi/notebooklm-clone/pull/49) | Regenerations are not counted against the daily audio quota — they stay bounded by the 1-concurrent and 20-per-notebook caps ([A6 handover](../handovers/2026-08-18-session-a6-demo-polish.md)); request *rate* within the quotas is not limited (SEC-7 in `product/security.md`) |
| Demo polish: empty states, error pages, seeded demo notebook | Every screen has a designed empty state, failures surface as visible text, error/404 pages exist, and `bun run seed:demo` provisions the demo notebook (roadmap A6). | ✅ | [#49](https://github.com/DonHeidi/notebooklm-clone/pull/49) | — |
| Deployed demo environment (Scaleway container, CI, custom domain, Supabase under Terraform) | The app deployed and demoable at app.mrgnl.eu: CI, a Scaleway serverless container, the custom domain, and the hosted Supabase project under Terraform (roadmap B2–B5). | ✅ | [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13), [#36](https://github.com/DonHeidi/notebooklm-clone/pull/36), [#45](https://github.com/DonHeidi/notebooklm-clone/pull/45), [#48](https://github.com/DonHeidi/notebooklm-clone/pull/48) | — |

Legend: ✅ delivered as targeted · 🔶 a limitation sits inside the target
itself. Every row of v1 is ✅ — that is the honest reading of the record,
because each row's target is what the roadmap session committed to, and
each one shipped. The narrower-than-Gemini scope is visible in the target
column, and the cut capabilities are on the [roadmap cut list](roadmap.md).

## Operational envelope

Marginalia v1 runs inside the guards and per-user quotas stated in the
usage-limits row above. What that envelope costs to operate — the current
bill and a modeled 10-user month — is the [in-numbers page](in-numbers.md).
Three standing qualifications from the record: request *rate* within the
quotas is not limited (SEC-7 in `product/security.md`); the further cost
controls the research catalog lists — token budgets, model routing,
caching, storage quotas — are not implemented (SEC-7/SEC-10); and the
prototype operates in a **closed signup circle**, which several of the
security register's acceptances, most notably SEC-10, are conditional on.

## What v1 consciously excludes

Everything the prototype deliberately does not do is recorded once, on the
[roadmap's cut list](roadmap.md) — including deferrals decided in practice
and recorded by the C10 reconciliation. The full description of what the
original product offers beyond this target is the
[research catalog](scope.md), which describes those capabilities without
claiming anything about our implementation of them.
