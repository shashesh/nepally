import { describe, expect, it } from 'vitest';
import { buildSearchHref, parseSearchParams } from './searchUrl';

describe('parseSearchParams', () => {
  it('reads q, tab and scope', () => {
    expect(parseSearchParams({ q: 'thapa', tab: 'people', scope: 'all' })).toEqual({ q: 'thapa', tab: 'people', allMetros: true });
  });

  it('defaults unknown or missing values', () => {
    expect(parseSearchParams({ tab: 'bogus' })).toEqual({ q: '', tab: 'all', allMetros: false });
    expect(parseSearchParams({ q: ['a', 'b'] })).toEqual({ q: 'a', tab: 'all', allMetros: false });
  });
});

describe('buildSearchHref', () => {
  it('omits defaults', () => {
    expect(buildSearchHref({ q: 'room' })).toBe('/search?q=room');
  });

  it('encodes the query and adds tab and scope', () => {
    expect(buildSearchHref({ q: "thapa's momo", tab: 'posts', allMetros: true })).toBe(
      "/search?q=thapa%27s+momo&tab=posts&scope=all"
    );
  });
});
