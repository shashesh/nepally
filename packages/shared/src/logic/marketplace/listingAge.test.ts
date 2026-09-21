import { describe, expect, it } from 'vitest';
import { getDaysSinceRefresh, getDaysUntilSoftExpiry, isListingExpiringSoon } from './listingAge';
import { LISTING_SOFT_EXPIRY_DAYS } from '../../constants/marketplace';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-18T12:00:00Z');

function daysBefore(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

describe('getDaysSinceRefresh', () => {
  it('returns 0 for a listing refreshed moments ago', () => {
    expect(getDaysSinceRefresh(daysBefore(0.01), NOW)).toBe(0);
  });

  it('returns whole elapsed days, rounding partial days down', () => {
    expect(getDaysSinceRefresh(daysBefore(3), NOW)).toBe(3);
    expect(getDaysSinceRefresh(daysBefore(3.9), NOW)).toBe(3);
  });

  it('clamps a refresh timestamp later than `now` to 0 (clock skew / refreshed after mount)', () => {
    expect(getDaysSinceRefresh(daysBefore(-0.5), NOW)).toBe(0);
  });
});

describe('getDaysUntilSoftExpiry', () => {
  it('returns the full soft-expiry window for a freshly refreshed listing', () => {
    expect(getDaysUntilSoftExpiry(daysBefore(0), NOW)).toBe(LISTING_SOFT_EXPIRY_DAYS);
  });

  it('counts down as the listing ages', () => {
    expect(getDaysUntilSoftExpiry(daysBefore(80), NOW)).toBe(LISTING_SOFT_EXPIRY_DAYS - 80);
  });

  it('never goes negative once the listing is past soft expiry', () => {
    expect(getDaysUntilSoftExpiry(daysBefore(LISTING_SOFT_EXPIRY_DAYS), NOW)).toBe(0);
    expect(getDaysUntilSoftExpiry(daysBefore(LISTING_SOFT_EXPIRY_DAYS + 30), NOW)).toBe(0);
  });

  it('never exceeds the soft-expiry window when refreshed_at is later than `now`', () => {
    expect(getDaysUntilSoftExpiry(daysBefore(-1), NOW)).toBe(LISTING_SOFT_EXPIRY_DAYS);
  });
});

describe('isListingExpiringSoon', () => {
  it('is true for an active listing with 10 days left (80 days since refresh)', () => {
    const listing = { status: 'active' as const, refreshed_at: daysBefore(80) };
    expect(isListingExpiringSoon(listing, NOW)).toBe(true);
  });

  it('is false for an active listing with 20 days left', () => {
    const listing = { status: 'active' as const, refreshed_at: daysBefore(70) };
    expect(isListingExpiringSoon(listing, NOW)).toBe(false);
  });

  it('is true at exactly 14 days left (the boundary)', () => {
    const listing = { status: 'active' as const, refreshed_at: daysBefore(76) };
    expect(isListingExpiringSoon(listing, NOW)).toBe(true);
  });

  it('is false for an inactive listing even at 80 days since refresh', () => {
    const listing = { status: 'inactive' as const, refreshed_at: daysBefore(80) };
    expect(isListingExpiringSoon(listing, NOW)).toBe(false);
  });
});
