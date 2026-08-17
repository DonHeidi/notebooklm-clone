-- Row Level Security: owner-based access, keyed on notebooks.owner_id =
-- auth.uid() and cascading to child tables through their FK chain.
--
-- Defense-in-depth only: the app connects through the pooler as `postgres`,
-- which is not subject to these policies. Authorization is ALSO enforced in
-- the app layer — every repository method takes the owner id and scopes its
-- queries by it. These policies protect direct PostgREST/Realtime access
-- with user JWTs.

alter table public.notebooks enable row level security;
alter table public.sources enable row level security;
alter table public.chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.citations enable row level security;
alter table public.notes enable row level security;

create policy "notebooks_owner_all" on public.notebooks
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "sources_owner_all" on public.sources
  for all to authenticated
  using (
    exists (
      select 1 from public.notebooks n
      where n.id = sources.notebook_id
        and n.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.notebooks n
      where n.id = sources.notebook_id
        and n.owner_id = (select auth.uid())
    )
  );

create policy "chunks_owner_all" on public.chunks
  for all to authenticated
  using (
    exists (
      select 1
      from public.sources s
      join public.notebooks n on n.id = s.notebook_id
      where s.id = chunks.source_id
        and n.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.sources s
      join public.notebooks n on n.id = s.notebook_id
      where s.id = chunks.source_id
        and n.owner_id = (select auth.uid())
    )
  );

create policy "conversations_owner_all" on public.conversations
  for all to authenticated
  using (
    exists (
      select 1 from public.notebooks n
      where n.id = conversations.notebook_id
        and n.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.notebooks n
      where n.id = conversations.notebook_id
        and n.owner_id = (select auth.uid())
    )
  );

create policy "messages_owner_all" on public.messages
  for all to authenticated
  using (
    exists (
      select 1
      from public.conversations c
      join public.notebooks n on n.id = c.notebook_id
      where c.id = messages.conversation_id
        and n.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.conversations c
      join public.notebooks n on n.id = c.notebook_id
      where c.id = messages.conversation_id
        and n.owner_id = (select auth.uid())
    )
  );

create policy "citations_owner_all" on public.citations
  for all to authenticated
  using (
    exists (
      select 1
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      join public.notebooks n on n.id = c.notebook_id
      where m.id = citations.message_id
        and n.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.messages m
      join public.conversations c on c.id = m.conversation_id
      join public.notebooks n on n.id = c.notebook_id
      where m.id = citations.message_id
        and n.owner_id = (select auth.uid())
    )
  );

create policy "notes_owner_all" on public.notes
  for all to authenticated
  using (
    exists (
      select 1 from public.notebooks n
      where n.id = notes.notebook_id
        and n.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.notebooks n
      where n.id = notes.notebook_id
        and n.owner_id = (select auth.uid())
    )
  );
