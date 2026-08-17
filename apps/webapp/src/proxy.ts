import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { redirectTarget } from "@/lib/auth/route-access";

// Next 16 proxy (the renamed middleware). Two jobs:
// 1. Refresh the Supabase session: getClaims() refreshes an expiring token,
//    and the setAll handler writes the rotated cookies onto both the request
//    (for this render) and the response (for the browser).
// 2. Optimistic redirects via redirectTarget(). Authorization itself lives in
//    requireUser() / the repositories — never here alone (a matcher change
//    must not be able to open a hole).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Validates the JWT (and refreshes it when close to expiry). Do not use
  // getSession() here: it reads the cookie without verifying it.
  const { data } = await supabase.auth.getClaims();

  const target = redirectTarget(request.nextUrl.pathname, Boolean(data?.claims));
  if (target) {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    // Keep any refreshed auth cookies on the redirect response.
    response.cookies
      .getAll()
      .forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
