import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './redirect';

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
