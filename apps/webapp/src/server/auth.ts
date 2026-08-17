import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The authenticated identity, derived from verified JWT claims. `id` is
// auth.uid() and IS the ownerId every repository call is scoped by.
export type AuthenticatedUser = {
  id: string;
  email: string | undefined;
};

// Returns the verified user for this request, or null. Uses getClaims() — it
// cryptographically verifies the JWT — never getSession(), which trusts the
// cookie as-is.
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return null;
  }
  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : undefined,
  };
}

// Guard for every authenticated page and server action. The proxy's redirect
// is optimistic only; this is the authoritative check.
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
