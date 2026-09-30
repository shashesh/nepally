import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  DELETION_IN_PROGRESS,
  PROFILE_NOT_FOUND,
  REAUTH_MAX_AGE_SECONDS,
  REAUTH_REQUIRED,
  UNAVAILABLE_ACCOUNT_NAME,
} from '../index';

describe('account deletion constants', () => {
  it('match the database: the 050 grace period and the 048 recency window', () => {
    expect(ACCOUNT_DELETION_GRACE_DAYS).toBe(29);
    expect(REAUTH_MAX_AGE_SECONDS).toBe(600);
  });

  it('name the errors the RPCs raise', () => {
    expect([REAUTH_REQUIRED, DELETION_IN_PROGRESS, PROFILE_NOT_FOUND]).toEqual([
      'reauth_required',
      'deletion_in_progress',
      'profile_not_found',
    ]);
  });

  it('has the placeholder the apps show for a missing chat partner', () => {
    expect(UNAVAILABLE_ACCOUNT_NAME).toBe('Unavailable account');
  });
});
