# Target scope — Marginalia v1

> **Status:** Adopted 2026-08-18 (owner decision, session C12). Living
> document: whichever session ships or cuts a delivered item updates this
> table **and** the research document's badges in the same change.
> **Role:** this document **commits to a target** — it defines what
> Marginalia v1, the shipped 7-day-prototype end state, *is*. Its
> counterparts: [scope.md](scope.md) is the **research catalog** of what
> Gemini Notebook offers (descriptive, no plan meaning), and
> [roadmap.md](roadmap.md) is the authoritative plan whose end state this
> document itemizes. Both this file and the research document are tracked
> with the same machinery: a per-item status with shipping-PR evidence.
> **Single source per fact:** where a fact is already recorded — a research
> item's status badge, the security register, the in-numbers page — this
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

Statuses mirror the research document's status table and are kept in sync
with it: ✅ the researched capability is fully in v1 · 🔶 partially in v1.
For every 🔶 the honest edge is recorded in the linked research item's
**status badge** — the "Known limitation" column links a deeper record only
where one exists beyond the badge. Rows without a research id are marked
**prototype-only**: they exist because the prototype needed them, not
because the research catalogued them.

| Target item | Research id | Status | Shipped in | Known limitation |
| --- | --- | --- | --- | --- |
| Notebook management | [CF-01](scope.md#cf-01--notebook-management) | ✅ | [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6), [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10), [#36](https://github.com/DonHeidi/notebooklm-clone/pull/36) | — |
| Notebook library / home screen | [SF-02](scope.md#sf-02--notebook-library--home-screen) | ✅ | [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10) | — |
| Authentication (email + password) | [SF-01](scope.md#sf-01--authentication-and-account-management) | 🔶 | [#10](https://github.com/DonHeidi/notebooklm-clone/pull/10) | badge |
| Source ingestion (PDF, TXT/Markdown, pasted text, URL) | [CF-02](scope.md#cf-02--source-ingestion) | 🔶 | [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15) | badge |
| Source processing and knowledge indexing | [CF-03](scope.md#cf-03--source-processing-and-knowledge-indexing) | ✅ | [#6](https://github.com/DonHeidi/notebooklm-clone/pull/6), [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15), [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24) | — |
| Source viewer | [CF-04](scope.md#cf-04--source-viewer) | 🔶 | [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15), [#29](https://github.com/DonHeidi/notebooklm-clone/pull/29) | badge |
| Source selection / context control | [CF-05](scope.md#cf-05--source-selection--context-control) | ✅ | [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24) | — |
| Grounded AI chat | [CF-06](scope.md#cf-06--grounded-ai-chat) | ✅ | [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24) | — |
| Inline citations | [CF-07](scope.md#cf-07--inline-citations) | ✅ | [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24), [#29](https://github.com/DonHeidi/notebooklm-clone/pull/29), [#36](https://github.com/DonHeidi/notebooklm-clone/pull/36) | — |
| Conversation state | [CF-08](scope.md#cf-08--conversation-state) | 🔶 | [#24](https://github.com/DonHeidi/notebooklm-clone/pull/24) | [A4 handover, "Gotchas" §1](../handovers/2026-08-18-session-a4-grounded-chat.md) |
| Notes | [CF-10](scope.md#cf-10--notes) | 🔶 | [#29](https://github.com/DonHeidi/notebooklm-clone/pull/29) | badge |
| Audio Overview (single-narrator tier) | [CF-12](scope.md#cf-12--audio-overview) | 🔶 | [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27) | [D2 handover](../handovers/2026-08-18-session-d2-audio-overview.md) (transcript not persisted) |
| Artifact download and management | [SF-08](scope.md#sf-08--artifact-sharing-and-download) | 🔶 | [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27) | badge |
| Background generation (in-process async) | [SF-09](scope.md#sf-09--background-generation-jobs) | 🔶 | [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15), [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27) | badge |
| Language configuration (audio output) | [SF-10](scope.md#sf-10--language-configuration) | 🔶 | [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27) | badge |
| Usage limits and quotas | [SF-11](scope.md#sf-11--usage-limits-and-quotas) | 🔶 | [#15](https://github.com/DonHeidi/notebooklm-clone/pull/15), [#27](https://github.com/DonHeidi/notebooklm-clone/pull/27), [#49](https://github.com/DonHeidi/notebooklm-clone/pull/49) | SEC-7 in `product/security.md` |
| Demo polish: empty states, error pages, seeded demo notebook | prototype-only | ✅ | [#49](https://github.com/DonHeidi/notebooklm-clone/pull/49) | — |
| Deployed demo environment (Scaleway container, CI, custom domain, Supabase under Terraform) | prototype-only | ✅ | [#13](https://github.com/DonHeidi/notebooklm-clone/pull/13), [#36](https://github.com/DonHeidi/notebooklm-clone/pull/36), [#45](https://github.com/DonHeidi/notebooklm-clone/pull/45), [#48](https://github.com/DonHeidi/notebooklm-clone/pull/48) | — |

## Operational envelope

Marginalia v1 runs inside deliberate guards and per-user quotas; the
concrete numbers live in the [SF-11 status badge](scope.md#sf-11--usage-limits-and-quotas)
and are not repeated here. What that envelope costs to operate — the
current bill and a modeled 10-user month — is the
[in-numbers page](in-numbers.md). Two standing qualifications from the
record: request *rate* within the quotas is not limited (SEC-7 in
`product/security.md`), and the prototype operates in a **closed signup
circle** — several of the security register's acceptances, most notably
SEC-10, are conditional on it.

## What v1 consciously excludes

Everything the prototype deliberately does not do is recorded once, on the
[roadmap's cut list](roadmap.md) — including deferrals decided in practice
and recorded by the C10 reconciliation. The full catalog of what the
original product offers beyond this target, with per-item status, is the
[research document](scope.md).
