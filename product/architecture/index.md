# Architecture — the 4+1 views

> **Status:** Snapshot as of **2026-08-18** (session C5), describing the code
> merged to `main` on that date. Sessions **A5 (citation navigation + notes
> UI)** and **D2 (audio overview)** were running in parallel when this was
> written — nothing from them appears here; the pages note where their work
> will land. Later sessions append corrections rather than silently rewriting
> (root `AGENTS.md`, "correct the record").
>
> **Update (2026-08-18, session C8):** the roadmap board has since merged
> completely (A5, D2, A6, A7, B3–B5, C6–C7). The views carry dated
> corrections where that changed what they describe — the logical view's
> artifacts table (D2), the process view's second pipeline and quota step
> (D2/A6), the development view's test setup and providers (A7/B4/B5), and
> the physical view's hosted, custom-domained, Terraform-managed platform
> (B3/B4/B5). The full chronological record is `product/history/`.

Kruchten's 4+1 model describes a software architecture through four
complementary views — logical (the domain model), process (runtime dynamics),
development (code organization), physical (deployment topology) — plus one
set of scenarios that walks concrete use cases through all four. These pages
apply that model to Marginalia, the NotebookLM clone this repository builds.

## How the five pages map to this repository

| View | Page | Primary sources of truth |
| --- | --- | --- |
| Logical | `product/architecture/logical.md` | `apps/webapp/src/server/db/schema.ts`, the repositories, `product/scope.md` §10 |
| Process | `product/architecture/process.md` | The chat route handler, `ingestion-service.ts`, `proxy.ts` |
| Development | `product/architecture/development.md` | The `AGENTS.md` files, `.github/workflows/ci.yml`, the toolchain configs |
| Physical | `product/architecture/physical.md` | `infrastructure/*.tf`, `apps/webapp/Dockerfile`, the deploy workflows |
| Scenarios (+1) | `product/architecture/scenarios.md` | The A3/A4 handovers' end-to-end verification records |

## Sourcing discipline

These pages describe **what is** — the system as merged. Every architectural
claim traces to a repository path, a decision ID (D-n from
`product/feasibility.md`, SEC-n from `product/security.md`), or a merged PR.
The **why** behind each decision is not repeated here: it lives in
`product/feasibility.md` (the decision record) and `product/history/`
(the narrative, one page per package). Where the implementation deliberately
diverges from the scope's ideal (`product/scope.md`), the divergence is
stated plainly rather than papered over.

## Diagrams

Diagrams are **UML, authored in PlantUML**. The `.puml` sources are
canonical in `product/architecture/diagrams/`; the committed SVGs in
`product/architecture/assets/` are rendered artifacts, regenerated with
`product/architecture/diagrams/render.sh` (the official PlantUML container,
which bundles Java and Graphviz — Docker is already a project requirement
for the local Supabase stack, so no new toolchain entry). Rendering happens
at commit time, never at build or page-load time: the docs site stays free
of client-side rendering and external requests, and the diagrams render on
GitHub too. Edit the `.puml`, re-run the script, commit both files.
