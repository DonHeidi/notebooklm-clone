// Pure route-access rules for the proxy's optimistic redirects. Kept free of
// Next.js imports so `bun test` can exercise them directly. The proxy check is
// convenience only — every server action and page re-validates the JWT via
// requireUser() (src/server/auth.ts).

/** Routes reachable without a session. */
const PUBLIC_PATHS = ["/login", "/signup"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Where to redirect a request, or null to let it through.
 * - Unauthenticated requests to protected pages go to /login.
 * - Authenticated requests to the auth screens go to the library (/).
 */
export function redirectTarget(
  pathname: string,
  isAuthenticated: boolean,
): string | null {
  if (!isAuthenticated && !isPublicPath(pathname)) {
    return "/login";
  }
  if (isAuthenticated && isPublicPath(pathname)) {
    return "/";
  }
  return null;
}
