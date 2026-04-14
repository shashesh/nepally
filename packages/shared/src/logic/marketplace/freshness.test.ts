import { describe, expect, it } from 'vitest';
import { formatListingFreshness } from './freshness';

describe('formatListingFreshness', () => {
  const NOW = new Date('2026-04-14T12:00:00Z').getTime();

  it('returns "just now" for timestamps under one minute old', () => {
    const createdAt = new Date(NOW - 30 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('just now');
  });

  it('returns "Nm" for minutes under one hour', () => {
    const createdAt = new Date(NOW - 7 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('7m');
  });

  it('returns "Nh" for hours under one day', () => {
    const createdAt = new Date(NOW - 3 * 60 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('3h');
  });

  it('returns "Nd" for days under one week', () => {
    const createdAt = new Date(NOW - 4 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('4d');
  });

  it('returns "Nw" for weeks under 30 days', () => {
    const createdAt = new Date(NOW - 15 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('2w');
  });

  it('returns "Nmo" for months under one year', () => {
    const createdAt = new Date(NOW - 90 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('3mo');
  });

  it('returns "Ny" for durations of one year or more', () => {
    const createdAt = new Date(NOW - 400 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('1y');
  });

  it('returns empty string when the input cannot be parsed', () => {
    expect(formatListingFreshness('not-a-date', NOW)).toBe('');
  });

  it('clamps negative durations (future dates) to "just now"', () => {
    const createdAt = new Date(NOW + 60 * 1000).toISOString();
    expect(formatListingFreshness(createdAt, NOW)).toBe('just now');
  });
});
