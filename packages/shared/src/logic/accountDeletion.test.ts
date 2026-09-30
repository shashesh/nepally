import { describe, expect, it } from 'vitest';
import {
  formatDeletionDate,
  getLastSignInAt,
  getReauthMethod,
  getScheduledDeletionDate,
  isDeletionDatePassed,
  isRecentSignIn,
} from './accountDeletion';

function base64Url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A JWT-shaped token with this payload. The signature is never checked client-side. */
function tokenWith(payload: object): string {
  return `${base64Url({ alg: 'HS256', typ: 'JWT' })}.${base64Url(payload)}.signature`;
}

const NOW_MS = Date.UTC(2026, 9, 1, 12, 0, 0); // 2026-10-01T12:00:00Z
const NOW_S = NOW_MS / 1000;

describe('getLastSignInAt', () => {
  it('returns the newest numeric amr timestamp', () => {
    const token = tokenWith({
      amr: [
        { method: 'password', timestamp: NOW_S - 3600 },
        { method: 'oauth', timestamp: NOW_S - 60 },
      ],
    });
    expect(getLastSignInAt(token)).toBe(NOW_S - 60);
  });

  it('ignores entries without a numeric timestamp', () => {
    expect(
      getLastSignInAt(
        tokenWith({ amr: [{ method: 'otp', timestamp: '123' }, { method: 'password' }] })
      )
    ).toBeNull();
  });

  it('returns null for a missing or malformed claim', () => {
    expect(getLastSignInAt(tokenWith({}))).toBeNull();
    expect(getLastSignInAt(tokenWith({ amr: 'password' }))).toBeNull();
  });

  it('never throws on a token it cannot read', () => {
    expect(getLastSignInAt('not-a-jwt')).toBeNull();
    expect(getLastSignInAt('a.%%%.c')).toBeNull();
    expect(getLastSignInAt('')).toBeNull();
  });
});

describe('isRecentSignIn', () => {
  it('accepts a sign-in inside the ten-minute window, including its edge', () => {
    expect(
      isRecentSignIn(tokenWith({ amr: [{ method: 'password', timestamp: NOW_S - 60 }] }), NOW_MS)
    ).toBe(true);
    expect(
      isRecentSignIn(tokenWith({ amr: [{ method: 'password', timestamp: NOW_S - 600 }] }), NOW_MS)
    ).toBe(true);
  });

  it('rejects an older sign-in, or none', () => {
    expect(
      isRecentSignIn(tokenWith({ amr: [{ method: 'password', timestamp: NOW_S - 601 }] }), NOW_MS)
    ).toBe(false);
    expect(isRecentSignIn('not-a-jwt', NOW_MS)).toBe(false);
  });
});

describe('getReauthMethod', () => {
  it('uses the password when the account has an email identity', () => {
    expect(getReauthMethod({ app_metadata: { providers: ['google', 'email'] } })).toBe('password');
  });

  it('uses Google otherwise', () => {
    expect(getReauthMethod({ app_metadata: { providers: ['google'] } })).toBe('google');
    expect(getReauthMethod({})).toBe('google');
  });
});

describe('deletion dates', () => {
  it('formats a date for people', () => {
    expect(formatDeletionDate('2026-10-30T12:00:00.000Z')).toBe('October 30, 2026');
  });

  it('schedules 29 days out', () => {
    expect(getScheduledDeletionDate(NOW_MS)).toBe('2026-10-30T12:00:00.000Z');
  });

  it('knows when the date has passed', () => {
    expect(isDeletionDatePassed('2026-10-01T11:59:59.000Z', NOW_MS)).toBe(true);
    expect(isDeletionDatePassed('2026-10-01T12:00:00.000Z', NOW_MS)).toBe(true);
    expect(isDeletionDatePassed('2026-10-01T12:00:01.000Z', NOW_MS)).toBe(false);
  });
});
