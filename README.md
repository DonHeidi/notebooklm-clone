# notebooklm-clone

A Gemini Notebook (formerly NotebookLM) clone — Bun-managed TypeScript monorepo.

## Layout

- `apps/` — deployable applications (webapp, docs, marketing)
- `packages/` — shared workspace packages
- `infrastructure/` — Terraform (Scaleway)
- `supabase/` — Supabase project (auth, Postgres, pgvector, storage)

See `AGENTS.md` for development conventions and per-directory details.
