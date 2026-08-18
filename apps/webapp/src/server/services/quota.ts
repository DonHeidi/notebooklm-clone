// Per-user quota window (SF-11 / NF-15 minimum, session A6). "Per day"
// means the current UTC calendar day — simple, timezone-stable, and cheap to
// evaluate as a `created_at >= since` count. Request-RATE limiting (bursts
// within a day) remains open — tracked as SEC-7 in product/security.md.

export function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
