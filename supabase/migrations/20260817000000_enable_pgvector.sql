-- Enable pgvector before any Drizzle-generated migration references the
-- `vector` type (Drizzle does not model extensions). The `extensions` schema
-- is on Supabase's default search_path, so unqualified `vector(n)` resolves.
create extension if not exists vector with schema extensions;
