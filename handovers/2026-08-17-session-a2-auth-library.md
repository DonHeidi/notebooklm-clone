# Session A2 — Auth + notebook library (2026-08-17)

## Goal

Users can sign up, log in/out, and manage notebooks (CF-01, SF-02): auth via
`@supabase/ssr`, the notebook library as the authenticated home, and a
minimal workspace shell at `/notebooks/[id]` for A3/A4/D2 to fill.

## What was done

- **Auth plumbing** (`@supabase/ssr` 0.12 + `supabase-js` 2.112, added via
  `bun add`):
  - `src/lib/supabase/client.ts` / `server.ts` — browser and per-request
    server clients (cookie sessions, `getAll`/`setAll` pattern; the server
    variant swallows `setAll` in Server Components because refresh happens in
    the proxy).
  - `src/proxy.ts` — **Next 16 renamed middleware to `proxy.ts`** (exported
    function `proxy`; verified against `node_modules/next/dist/docs/`). It
    refreshes tokens via `getClaims()` and does optimistic redirects
    (`/` ⇄ `/login`).
  - `src/lib/auth/route-access.ts` — pure public/protected path rules used by
    the proxy, covered by bun tests (7 tests).
  - `src/server/auth.ts` — `requireUser()`: validates the JWT with
    `auth.getClaims()` (never `getSession()`), returns `{ id, email }`;
    `id` is `auth.uid()` and is the `ownerId` passed to every repository
    call. Every page/server action calls it — the proxy is convenience only
    (the Next docs warn a matcher change can silently drop proxy coverage).
- **Screens** (shadcn/ui; added `input label card alert-dialog dropdown-menu`
  via the shadcn CLI — note this scaffold is the **Base UI** flavor, so
  composition uses `render={...}` props, not radix `asChild`):
  - `/login`, `/signup` — shared `AuthCard` server-component form posting to
    server actions; errors round-trip via `?error=` search param.
  - `/` — notebook library: instant "New notebook" (default title, redirects
    into the workspace, ui-research §1), inline rename, delete behind an
    AlertDialog, cards ordered by `updatedAt` desc.
  - `/notebooks/[id]` — workspace shell: top bar (back, click-to-rename
    title, sign out) + Sources | Chat | Studio placeholder panels
    (ui-research §2). Foreign/missing notebooks 404 via the owner-scoped
    `findById` (no existence leak).
- **DDD path**: page → server action (`src/app/notebooks/actions.ts`) →
  `src/server/services/notebook-service.ts` → A1's `notebook-repository`.
  UI and actions never import `db`.
- Root layout metadata renamed to Marginalia.

## Decisions

- Kept the existing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  env names — `@supabase/ssr` takes url/key as plain arguments, so **no
  `.env.schema` change** was needed. No `supabase/config.toml` change either:
  local email confirmation was already disabled
  (`[auth.email] enable_confirmations = false`).
- Signup handles the confirmation-enabled case defensively (redirects to
  `/login` with a hint if no session comes back) so flipping config.toml
  later doesn't break the flow.
- Service layer is deliberately thin (trim titles, default-title fallback);
  business logic beyond that stays in repositories/later sessions.

## Verified locally

- `bun test`: 24 pass (17 A1 + 7 new route-access tests).
- `bun run build` (via varlock, next.config.ts untouched): passes; all app
  routes dynamic; proxy registered.
- Clicked through against `mise exec -- supabase start` with chrome-devtools:
  signup → library; `curl`: unauthenticated `/` → 307 `/login`, `/login` →
  200; create → instant redirect to workspace; rename in workspace top bar
  and inline on the library card; delete with confirmation; sign out →
  `/login`; wrong password shows "Invalid login credentials"; second user
  sees an empty library and gets a **404 on the first user's notebook URL**;
  authenticated visit to `/login` bounces to `/`. Browser console clean.
  (Screenshots omitted: `take_screenshot` times out in this Wayland setup.)

## Open questions / next sessions

- A3 (ingestion) fills the Sources panel; A4 the Chat panel; A5/D2 Studio.
  `requireUser()` + the service pattern are ready to reuse.
- The dev-server "issues overlay" badge appeared once during dev (transient,
  nothing in console after reload) — worth a glance if it reappears.
- Delete currently cascades silently (schema-level); A6 might want a toast.
