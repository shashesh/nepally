import { describe, expect, it } from 'vitest';
import { getSignInReturnPath, safeRedirectPath } from './redirect';

const ORIGIN = 'https://nepally.us';

describe('safeRedirectPath', () => {
  it('accepts a same-origin path, with its query and hash', () => {
    expect(safeRedirectPath('/delete-account', ORIGIN)).toBe('/delete-account');
    expect(safeRedirectPath('/feed?tags=jobs#top', ORIGIN)).toBe('/feed?tags=jobs#top');
  });

  it('refuses anything that could leave the site', () => {
    for (const value of [
      'https://evil.com',
      '//evil.com',
      '/\\evil.com',
      '/\t/evil.com',
      '/\n/evil.com',
      ' /feed',
      'javascript:alert(1)',
      'feed',
    ]) {
      expect(safeRedirectPath(value, ORIGIN)).toBeNull();
    }
  });

  it('refuses dot segments that collapse into a protocol-relative path', () => {
    for (const value of ['/.//evil.com', '/..//evil.com', '/a/..//evil.com', '/./\\evil.com']) {
      expect(safeRedirectPath(value, ORIGIN)).toBeNull();
    }
  });

  it('never returns a value that starts with two slashes', () => {
    for (const value of ['/.//evil.com', '/..//evil.com', '/a/../..//evil.com', '/feed']) {
      const result = safeRedirectPath(value, ORIGIN);
      expect(result === null || !result.startsWith('//')).toBe(true);
    }
  });

  it('keeps an encoded backslash as text, on this site', () => {
    expect(safeRedirectPath('/%5Cevil.com', ORIGIN)).toBe('/%5Cevil.com');
  });

  it('refuses empty and non-string values', () => {
    expect(safeRedirectPath('', ORIGIN)).toBeNull();
    expect(safeRedirectPath(undefined, ORIGIN)).toBeNull();
    expect(safeRedirectPath(['/feed'], ORIGIN)).toBeNull();
  });
});

describe('getSignInReturnPath', () => {
  it('refuses the sign-in pages, which only lead back into signing in', () => {
    expect(getSignInReturnPath('/login', ORIGIN)).toBeNull();
    expect(getSignInReturnPath('/login/', ORIGIN)).toBeNull();
    expect(getSignInReturnPath('/login?redirect=%2Ffeed', ORIGIN)).toBeNull();
    expect(getSignInReturnPath('/auth/callback', ORIGIN)).toBeNull();
    expect(getSignInReturnPath('/auth/callback?redirect=/x', ORIGIN)).toBeNull();
  });

  it('passes every other safe path, without matching /login as a prefix', () => {
    expect(getSignInReturnPath('/delete-account', ORIGIN)).toBe('/delete-account');
    expect(getSignInReturnPath('/feed?tab=1', ORIGIN)).toBe('/feed?tab=1');
    expect(getSignInReturnPath('/loginhelp', ORIGIN)).toBe('/loginhelp');
  });

  it('sees through trailing and dot segments to the path the router will open', () => {
    expect(getSignInReturnPath('/login//', ORIGIN)).toBeNull();
    expect(getSignInReturnPath('/feed/../login', ORIGIN)).toBeNull();
    expect(getSignInReturnPath('/login/..', ORIGIN)).toBe('/');
    expect(getSignInReturnPath('/auth/anything', ORIGIN)).toBeNull();
  });

  it('still refuses an unsafe value, and anything that is not a string', () => {
    expect(getSignInReturnPath('//evil.com', ORIGIN)).toBeNull();
    expect(getSignInReturnPath(undefined, ORIGIN)).toBeNull();
    expect(getSignInReturnPath(['/feed'], ORIGIN)).toBeNull();
  });
});
