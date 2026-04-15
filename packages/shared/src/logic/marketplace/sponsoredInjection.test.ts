import { describe, expect, it } from 'vitest';
import type { MarketplaceListing } from '../../types/marketplace';
import { injectSponsoredIntoGrid } from './sponsoredInjection';

const mkListing = (id: string, overrides: Partial<MarketplaceListing> = {}): MarketplaceListing => ({
  id,
  owner_id: 'owner-1',
  metro_area_id: 'metro-1',
  category_id: 'cat-1',
  listing_type: 'individual',
  status: 'active',
  title: `Listing ${id}`,
  description: '',
  photos: [],
  price: null,
  business_name: null,
  address: null,
  business_hours: null,
  item_condition: null,
  phone: null,
  email: null,
  website_url: null,
  is_global: false,
  views_count: 0,
  saves_count: 0,
  contacts_count: 0,
  trending_score: 0,
  refreshed_at: '2026-04-14T00:00:00Z',
  created_at: '2026-04-14T00:00:00Z',
  updated_at: '2026-04-14T00:00:00Z',
  ...overrides,
});

describe('injectSponsoredIntoGrid', () => {
  it('returns the organic list unchanged when there are no sponsored items', () => {
    const organic = [mkListing('a'), mkListing('b')];
    expect(injectSponsoredIntoGrid(organic, [], 8)).toEqual(organic);
  });

  it('returns the organic list unchanged when there are no organic items', () => {
    expect(injectSponsoredIntoGrid([], [mkListing('s1')], 8)).toEqual([]);
  });

  it('inserts one sponsored item at position `interval`', () => {
    const organic = Array.from({ length: 10 }, (_, i) => mkListing(`o${i}`));
    const sponsored = [mkListing('s1')];
    const result = injectSponsoredIntoGrid(organic, sponsored, 4);
    expect(result.map((l) => l.id)).toEqual(['o0', 'o1', 'o2', 'o3', 's1', 'o4', 'o5', 'o6', 'o7', 'o8', 'o9']);
  });

  it('cycles through sponsored items when the grid is long enough', () => {
    const organic = Array.from({ length: 12 }, (_, i) => mkListing(`o${i}`));
    const sponsored = [mkListing('s1'), mkListing('s2')];
    const result = injectSponsoredIntoGrid(organic, sponsored, 4);
    const ids = result.map((l) => l.id);
    expect(ids.indexOf('s1')).toBe(4);
    expect(ids.indexOf('s2')).toBe(9);
  });

  it('does not duplicate an organic listing that is also in sponsored', () => {
    const shared = mkListing('shared');
    const organic = [shared, mkListing('o1'), mkListing('o2'), mkListing('o3'), mkListing('o4')];
    const sponsored = [shared];
    const result = injectSponsoredIntoGrid(organic, sponsored, 4);
    const sharedOccurrences = result.filter((l) => l.id === 'shared').length;
    expect(sharedOccurrences).toBe(1);
  });

  it('throws when interval is less than 1', () => {
    expect(() => injectSponsoredIntoGrid([mkListing('o')], [mkListing('s')], 0)).toThrow();
  });
});
