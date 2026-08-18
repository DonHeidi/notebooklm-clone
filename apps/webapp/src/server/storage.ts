import { createClient } from "@supabase/supabase-js";

// Server-only Supabase Storage access for the `sources` bucket. Uses the
// service-role key because ingestion runs in `after()` — outside the request
// whose cookies carry the user session. Safe because every call site sits
// behind app-layer ownership checks (repositories scope by ownerId, and
// object paths are validated to start with the owner's user id).
export const SOURCES_BUCKET = "sources";

function adminStorage() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  ).storage.from(SOURCES_BUCKET);
}

export async function downloadSourceObject(storagePath: string): Promise<Uint8Array> {
  const { data, error } = await adminStorage().download(storagePath);
  if (error || !data) {
    throw new Error(`could not download the uploaded file: ${error?.message ?? "not found"}`);
  }
  return new Uint8Array(await data.arrayBuffer());
}

export async function deleteSourceObject(storagePath: string): Promise<void> {
  const { error } = await adminStorage().remove([storagePath]);
  if (error) {
    // The DB row is the source of truth; a dangling object is acceptable
    // debris, a failed delete should not block removing the source.
    console.error(`failed to delete storage object ${storagePath}: ${error.message}`);
  }
}
