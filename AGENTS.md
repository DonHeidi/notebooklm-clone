# notebooklm-clone — agent guide

Gemini Notebook (formerly NotebookLM) clone. Bun-managed TypeScript monorepo.
Product scope and phase roadmap: `product/scope.md` — current target is
**Phase 1 (Core MVP)**: notebooks → sources → retrieval → grounded chat →
inline citations → source navigation → notes.

## Layout

| Path | What | Details |
| --- | --- | --- |
| `apps/webapp` | Next.js fullstack app (Bun runtime) | `apps/webapp/AGENTS.md` |
| `apps/docs` | Astro static docs site | `apps/docs/AGENTS.md` |
| `apps/marketing` | Astro static marketing site | `apps/marketing/AGENTS.md` |
| `packages/` | Shared workspace packages (empty so far) | — |
| `infrastructure/` | Terraform for Scaleway | `infrastructure/AGENTS.md` |
| `supabase/` | Supabase project (auth, Postgres, pgvector, storage) | `supabase/AGENTS.md` |

## Tooling

- **Bun** is the package manager, workspace manager, script runner, and test
  runner. Workspaces: `apps/*`, `packages/*`.
- **mise** (`mise.toml`) pins tools outside the JS dependency tree: Bun itself,
  Terraform, the Supabase CLI. Run them via `mise exec -- <tool>` if mise is
  not activated in your shell.
- **varlock** (`.env.schema`) declares all environment variables. The schema is
  committed; secret values are never committed and never pasted into files or
  chat. Secrets live in **Proton Pass** (`pass-cli`); developers resolve them
  into an untracked `.env.local`. Run env-dependent commands through
  `bunx varlock run -- <cmd>`.

## Hard rules

- **Never pin dependency versions from memory.** Add dependencies with
  `bun add <pkg>` (or the tool's own generator/CLI) so the latest version is
  resolved at install time.
- **Never print or commit secret values.** Only `.env.schema` is committed.
- **Not Vercel.** Deployment target is a Scaleway serverless container
  (webapp) and object-storage buckets (docs, marketing). Avoid Vercel-only
  features (e.g. relying on Vercel image optimization, Vercel KV/Edge config,
  `@vercel/*` packages).
- Tests run with `bun test`.

## Methodology

- **Domain Driven Design.** Functionality must be traceable straight through:
  app view → URL path → business layer/middleware → repository → database.
- **Repository pattern** for all data access in the webapp (see
  `apps/webapp/AGENTS.md`).
- **Iterative sessions.** Each working session has one goal; it ends in a PR,
  review, and a documented handover in `handovers/` (one note per session).
  Work happens on a branch in a git worktree under `.worktrees/`, never
  directly on `main`.
- **Branch naming** follows the Angular conventional-commit types:
  `<type>/<short-kebab-topic>`, where `<type>` is one of `feat`, `fix`,
  `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `style`, `chore`
  (e.g. `feat/notebook-upload`, `chore/setup-monorepo`).
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org)
  with the same Angular types: `<type>(<optional scope>): <description>`,
  imperative mood, lowercase description, no trailing period. Scope is the
  workspace or area when it clarifies (e.g. `feat(webapp): add notebook
  upload`, `fix(infrastructure): correct bucket website config`). Breaking
  changes are marked with `!` and a `BREAKING CHANGE:` footer.
