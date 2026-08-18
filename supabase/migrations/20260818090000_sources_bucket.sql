-- Private storage bucket for uploaded source files (feasibility D-5:
-- uploads go browser → Supabase Storage directly; the server only ever
-- receives the object path). Objects are keyed by owner:
--   <auth.uid()>/<random-uuid>/<original-filename>
-- so ownership is the first path segment, and every policy checks it.
--
-- file_size_limit mirrors MAX_FILE_BYTES (20 MB) in
-- apps/webapp/src/server/ingestion/limits.ts — server-side enforcement of
-- the upload cap (NF-15).

insert into storage.buckets (id, name, public, file_size_limit)
values ('sources', 'sources', false, 20971520)
on conflict (id) do nothing;

-- RLS is already enabled on storage.objects (Supabase-managed). These
-- policies grant owner-only access within the `sources` bucket; the
-- service-role key (ingestion pipeline) bypasses RLS by design.

create policy "sources_objects_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "sources_objects_owner_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "sources_objects_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
