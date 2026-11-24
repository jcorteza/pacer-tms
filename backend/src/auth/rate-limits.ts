import { isDemoMode } from '../common/demo-mode.js';

const FIVE_MINUTES = 5 * 60 * 1000;

/**
 * Requests per route, per user, in 5 minutes: 30 a minute, over a window 5 times as long. The environment can override it so the e2e specs,
 * which make far more requests than one person would, aren't throttled.
 * An empty value counts as unset; anything else must be a positive whole number, or the app won't start.
 */
export function defaultLimit() {
  const raw = process.env.RATE_LIMIT_DEFAULT?.trim();
  if (!raw) return 150;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1)
    throw new Error(`RATE_LIMIT_DEFAULT must be a positive whole number, got "${raw}".`);
  return limit;
}
export const DEFAULT_WINDOW = FIVE_MINUTES;

/** Password guessing: 5 attempts per email, then locked out for 5 minutes. Demo mode takes no credentials, so only the default applies. */
export const LOGIN_LIMIT = {
  default: { limit: () => (isDemoMode() ? defaultLimit() : 5), ttl: FIVE_MINUTES, blockDuration: FIVE_MINUTES },
};

/** Current-password guessing: 3 attempts per user, then locked out for 5 minutes. */
export const PASSWORD_LIMIT = { default: { limit: 3, ttl: FIVE_MINUTES, blockDuration: FIVE_MINUTES } };

/** The compose healthcheck calls /ping every 5 seconds, so 60 times in 5 minutes; the rest is headroom. */
export const PING_LIMIT = { default: { limit: 75, ttl: FIVE_MINUTES, blockDuration: FIVE_MINUTES } };
