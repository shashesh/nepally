/**
 * Account deletion helpers (spec: docs/specs/2026-09-28-account-deletion.md
 * §5.1). The database has the final say on recency
 * (request_account_deletion); these only decide what the apps show.
 */
import { ACCOUNT_DELETION_GRACE_DAYS, REAUTH_MAX_AGE_SECONDS } from '../constants/accountDeletion';

export type ReauthMethod = 'password' | 'google';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A JWT's payload, or null when the token can't be read. Never throws. */
function readJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const payload: unknown = JSON.parse(atob(padded));
    return typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** The newest `amr` timestamp (seconds) in a Supabase access token, or null if there is none. */
export function getLastSignInAt(accessToken: string): number | null {
  const amr = readJwtPayload(accessToken)?.amr;
  if (!Array.isArray(amr)) return null;
  const timestamps = amr
    .map((entry: unknown) =>
      typeof entry === 'object' && entry !== null
        ? (entry as { timestamp?: unknown }).timestamp
        : undefined
    )
    .filter((timestamp): timestamp is number => typeof timestamp === 'number');
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

/** True when the last sign-in is within REAUTH_MAX_AGE_SECONDS of `nowMs`. */
export function isRecentSignIn(accessToken: string, nowMs: number = Date.now()): boolean {
  const signedInAt = getLastSignInAt(accessToken);
  return signedInAt !== null && nowMs / 1000 - signedInAt <= REAUTH_MAX_AGE_SECONDS;
}

type WithProviders = { app_metadata?: { providers?: unknown } };

function hasProvider(user: WithProviders, provider: string): boolean {
  const providers = user.app_metadata?.providers;
  return Array.isArray(providers) && providers.includes(provider);
}

/** 'password' when the account has an email identity, otherwise 'google'. */
export function getReauthMethod(user: WithProviders): ReauthMethod {
  return hasProvider(user, 'email') ? 'password' : 'google';
}

/** True when Google is linked, so it can stand in for a forgotten password. */
export function hasGoogleIdentity(user: WithProviders): boolean {
  return hasProvider(user, 'google');
}

/** "October 30, 2026" for an ISO timestamp. */
export function formatDeletionDate(iso: string, locale: string = 'en-US'): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** The purge date a request made at `nowMs` would get. */
export function getScheduledDeletionDate(nowMs: number = Date.now()): string {
  return new Date(nowMs + ACCOUNT_DELETION_GRACE_DAYS * DAY_MS).toISOString();
}

/** True once the date has passed, when restoring is closed (050). */
export function isDeletionDatePassed(iso: string, nowMs: number = Date.now()): boolean {
  return new Date(iso).getTime() <= nowMs;
}
