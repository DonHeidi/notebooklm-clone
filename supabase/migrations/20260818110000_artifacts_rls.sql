-- Row Level Security for artifacts, mirroring the owner-chain pattern of
-- 20260817170000_rls_policies.sql: access follows notebooks.owner_id =
-- auth.uid() through the notebook FK.
--
-- Defense-in-depth only (see that migration's header): the app connects as
-- `postgres` via the pooler; authorization is ALSO enforced app-side by the
-- owner-scoped artifact repository.

alter table public.artifacts enable row level security;

create policy "artifacts_owner_all" on public.artifacts
  for all to authenticated
  using (
    exists (
      select 1 from public.notebooks n
      where n.id = artifacts.notebook_id
        and n.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.notebooks n
      where n.id = artifacts.notebook_id
        and n.owner_id = (select auth.uid())
    )
  );
