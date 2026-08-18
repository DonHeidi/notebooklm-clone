-- Private storage bucket for generated artifacts (session D2; mirrors
-- 20260818090000_sources_bucket.sql). Objects are keyed by owner:
--   <auth.uid()>/<artifact-id>.<ext>
-- so ownership is the first path segment, and every policy checks it.
--
-- Uploads happen server-side (service role, bypasses RLS) from the
-- generation pipeline; playback goes through short-lived signed URLs also
-- created server-side. The owner-scoped policies below cover any direct
-- user-JWT path (PostgREST/Realtime) as defense-in-depth.
--
-- file_size_limit: 20 MB — a 5-minute mp3 at 96 kbps is ~3.6 MB, so this is
-- generous headroom, aligned with the sources bucket.

insert into storage.buckets (id, name, public, file_size_limit)
values ('artifacts', 'artifacts', false, 20971520)
on conflict (id) do nothing;

create policy "artifacts_objects_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'artifacts'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "artifacts_objects_owner_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'artifacts'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "artifacts_objects_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'artifacts'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
