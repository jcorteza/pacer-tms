type TrackedRequest = { userId?: string; body?: unknown; ip?: string };

/** The email a login body names, in one canonical form so letter case and spaces can't dodge a limit. */
function emailIn(body: unknown) {
  if (typeof body !== 'object' || body === null || !('email' in body)) return undefined;
  const { email } = body;
  return typeof email === 'string' && email.trim() !== '' ? email.trim().toLowerCase() : undefined;
}

/**
 * Who a request counts against: the signed-in user (all their sessions together), else the email being
 * logged in to, else the IP. Behind the dev proxy the IP is the proxy's, so requests with neither
 * a user nor an email (the healthcheck, logout) share one bucket.
 * The throttler must run after SessionGuard, which is what sets `userId`.
 */
export function throttleTracker(req: TrackedRequest): string {
  if (req.userId) return `user:${req.userId}`;
  const email = emailIn(req.body);
  return email ? `email:${email}` : `ip:${req.ip}`;
}
