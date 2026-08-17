<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# apps/webapp — agent guide

Next.js (App Router, Turbopack) fullstack app running on **Bun** — package name
`@notebooklm-clone/webapp`. TypeScript, TailwindCSS, shadcn/ui, Drizzle ORM
against the Supabase Postgres.

## Architecture (Domain Driven Design)

Every feature must be traceable along this path — keep each layer thin and
obvious:

```
app view (src/app/**/page.tsx)
  → URL path (App Router route / route handler)
    → business layer / middleware (src/server/services, src/middleware.ts)
      → repository (src/server/repositories)
        → database (src/server/db — Drizzle client + schema)
```

- **Repository pattern is mandatory**: UI code, route handlers, and server
  actions never import `db` directly — they go through a repository (see
  `src/server/repositories/notebook-repository.ts` for the shape: factory
  function taking `Database` for testability).
- Everything under `src/server/` is server-only.

## Database (Drizzle + Supabase)

- Schema lives in `src/server/db/schema.ts`; only application tables — never
  model or touch Supabase-managed schemas (`auth`, `storage`, `vault`).
- Migrations: `bunx varlock run -- bunx drizzle-kit generate` /
  `... drizzle-kit migrate` (config in `drizzle.config.ts`, output in
  `drizzle/`). Supabase-level SQL (extensions, RLS) lives in
  `supabase/migrations/` instead — see `supabase/AGENTS.md`.
- `DATABASE_URL` is the pooled (transaction-mode) connection string, so the
  client is created with `prepare: false`.

## UI

- shadcn/ui components: add with `bunx shadcn@latest add <component>`
  (config in `components.json`; components land in `src/components/ui`).
- Tailwind v4 (CSS-based config in `src/app/globals.css`).

## Rules

- Deployment target is a Scaleway serverless container — **no Vercel-only
  features**; the app must work under `next start`/standalone in a container.
- Env vars go through varlock (root `.env.schema`); never read secrets from
  anywhere else, never commit values.
- Tests: `bun test`.
- Root conventions apply: see the repository root `AGENTS.md`.
