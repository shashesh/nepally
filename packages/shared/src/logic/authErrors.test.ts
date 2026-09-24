import { describe, expect, it } from 'vitest';
import { getAuthErrorMessage, isExistingAccountError, type AuthAction } from './authErrors';

const ACTIONS: AuthAction[] = ['log-in', 'sign-up', 'google', 'resend'];

const RATE_LIMITED = 'Too many attempts. Please wait a minute and try again.';

const CODE_SENTENCES: Array<[string, string]> = [
  ['invalid_credentials', "That email and password don't match. Check them and try again."],
  ['email_not_confirmed', 'Confirm your email first. Use the link we sent when you signed up.'],
  ['over_email_send_rate_limit', RATE_LIMITED],
  ['over_request_rate_limit', RATE_LIMITED],
  ['weak_password', 'Choose a stronger password.'],
];

const FALLBACKS: Record<AuthAction, string> = {
  'log-in': "Couldn't log you in. Please try again.",
  'sign-up': "Couldn't create your account. Please try again.",
  google: "Couldn't continue with Google. Please try again.",
  resend: "Couldn't resend the email. Please try again.",
};

describe('getAuthErrorMessage', () => {
  describe.each(CODE_SENTENCES)('code %s', (code, sentence) => {
    it.each(ACTIONS)('gives its sentence for the %s action', (action) => {
      expect(getAuthErrorMessage({ code }, action)).toBe(sentence);
    });
  });

  it.each(ACTIONS)('gives the connection sentence for a network failure (%s)', (action) => {
    expect(getAuthErrorMessage({ name: 'AuthRetryableFetchError', status: 0 }, action)).toBe(
      "Couldn't reach Nepally. Check your connection and try again."
    );
  });

  it('treats a status of 0 alone as a network failure', () => {
    expect(getAuthErrorMessage({ status: 0 }, 'log-in')).toBe(
      "Couldn't reach Nepally. Check your connection and try again."
    );
  });

  it('gives the log-in fallback for an unknown code', () => {
    expect(getAuthErrorMessage({ code: 'something_new' }, 'log-in')).toBe(FALLBACKS['log-in']);
  });

  it('gives the sign-up fallback for a plain Error, never its message', () => {
    expect(getAuthErrorMessage(new Error('Database error saving new user'), 'sign-up')).toBe(
      FALLBACKS['sign-up']
    );
  });

  it('gives the google fallback for null', () => {
    expect(getAuthErrorMessage(null, 'google')).toBe(FALLBACKS.google);
  });

  it('gives the resend fallback for a string', () => {
    expect(getAuthErrorMessage('Email rate limit exceeded', 'resend')).toBe(FALLBACKS.resend);
  });
});

describe('isExistingAccountError', () => {
  it.each(['user_already_exists', 'email_exists'])('is true for %s', (code) => {
    expect(isExistingAccountError({ code })).toBe(true);
  });

  it('is false for another code', () => {
    expect(isExistingAccountError({ code: 'invalid_credentials' })).toBe(false);
  });

  it('is false for a message match without a code', () => {
    expect(isExistingAccountError(new Error('User already registered'))).toBe(false);
  });

  it('is false for undefined', () => {
    expect(isExistingAccountError(undefined)).toBe(false);
  });
});
