import { describe, expect, it } from 'vitest';
import { parseMarketplaceQuery, SEARCH_SLUG } from './marketplaceQuery';

describe('parseMarketplaceQuery', () => {
  it('reads an empty query as the unfiltered default', () => {
    expect(parseMarketplaceQuery({})).toEqual({
      view: null,
      category: '',
      q: '',
      sort: 'newest',
      isSearch: false,
    });
  });

  it('reads a category, a search term and a sort', () => {
    expect(
      parseMarketplaceQuery({ category: 'food-restaurants', q: 'momo', sort: 'price_asc' })
    ).toEqual({
      view: null,
      category: 'food-restaurants',
      q: 'momo',
      sort: 'price_asc',
      isSearch: false,
    });
  });

  it.each(['oldest', 'featured', 'price_asc', 'price_desc', 'newest'])(
    'keeps the known sort %s',
    (sort) => {
      expect(parseMarketplaceQuery({ sort }).sort).toBe(sort);
    }
  );

  it('falls back to newest for an unknown sort', () => {
    expect(parseMarketplaceQuery({ sort: 'cheapest' }).sort).toBe('newest');
  });

  it.each(['featured', 'trending'])('keeps the known view %s', (view) => {
    expect(parseMarketplaceQuery({ view }).view).toBe(view);
  });

  it('falls back to no view for an unknown one', () => {
    expect(parseMarketplaceQuery({ view: 'popular' }).view).toBeNull();
  });

  // The two pages disagreed on this: one took `string`, the other
  // `string | string[] | undefined`, so a repeated param behaved differently.
  it('takes the first value of a repeated param', () => {
    expect(parseMarketplaceQuery({ q: ['momo', 'sel roti'] }).q).toBe('momo');
    expect(parseMarketplaceQuery({ sort: ['oldest', 'newest'] }).sort).toBe('oldest');
    expect(parseMarketplaceQuery({ category: ['other', 'transportation'] }).category).toBe('other');
  });

  it('reads an empty repeated param as absent', () => {
    expect(parseMarketplaceQuery({ q: [] }).q).toBe('');
    expect(parseMarketplaceQuery({ sort: [] }).sort).toBe('newest');
  });

  it('treats the search slug as a search, not a category', () => {
    const parsed = parseMarketplaceQuery({ category: SEARCH_SLUG, q: 'momo' });
    expect(parsed.isSearch).toBe(true);
    expect(parsed.category).toBe('');
    expect(parsed.q).toBe('momo');
  });

  it('is not a search when a real category is set', () => {
    expect(parseMarketplaceQuery({ category: 'other' }).isSearch).toBe(false);
  });
});

describe('isFilteredQuery', () => {
  it('is false for the bare marketplace', async () => {
    const { isFilteredQuery } = await import('./marketplaceQuery');
    expect(isFilteredQuery(parseMarketplaceQuery({}))).toBe(false);
  });

  it.each([
    ['a category', { category: 'other' }],
    ['a search term', { q: 'momo' }],
    ['a non-default sort', { sort: 'oldest' }],
    ['a discovery view', { view: 'featured' }],
    ['the search slug', { category: SEARCH_SLUG }],
  ])('is true for %s', async (_label, query) => {
    const { isFilteredQuery } = await import('./marketplaceQuery');
    expect(isFilteredQuery(parseMarketplaceQuery(query))).toBe(true);
  });
});
