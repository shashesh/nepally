import { describe, it, expect } from 'vitest';
import { getListingHighlights } from './getListingHighlights';
import type { MarketplaceListing } from '../../types/marketplace';

const NOW = new Date(2026, 3, 13, 10, 0, 0); // Monday 10am

const BASE: MarketplaceListing = {
  id: 'l1',
  owner_id: 'u1',
  metro_area_id: 'm1',
  category_id: 'c1',
  listing_type: 'business',
  status: 'active',
  title: 'Himalayan Kitchen',
  description: 'Momos',
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
  refreshed_at: NOW.toISOString(),
  created_at: NOW.toISOString(),
  updated_at: NOW.toISOString(),
};

describe('getListingHighlights', () => {
  it('returns open/address/phone chips for business listing', () => {
    const chips = getListingHighlights(
      {
        ...BASE,
        listing_type: 'business',
        business_hours: { monday: { open: '09:00', close: '17:00' } },
        address: '4823 Georgia Ave NW, Washington, DC 20011',
        phone: '(202) 555-0184',
      },
      NOW
    );
    expect(chips.map((c) => c.key)).toEqual(['open_now', 'address', 'phone']);
    expect(chips[0].value).toBe('Closes 5p');
  });

  it('omits chips when source field is missing', () => {
    const chips = getListingHighlights(
      { ...BASE, listing_type: 'business', phone: '555-1' },
      NOW
    );
    expect(chips.map((c) => c.key)).toEqual(['phone']);
  });

  it('returns condition/category/posted chips for individual listing', () => {
    const chips = getListingHighlights(
      {
        ...BASE,
        listing_type: 'individual',
        item_condition: 'used',
        category: {
          id: 'c1',
          name: 'Electronics',
          slug: 'electronics',
          emoji: '📱',
          icon: null,
          color: null,
          description: null,
          sort_order: 0,
          created_at: NOW.toISOString(),
        },
        refreshed_at: new Date(2026, 3, 10, 10, 0, 0).toISOString(), // 3 days ago
      },
      NOW
    );
    expect(chips.map((c) => c.key)).toEqual(['condition', 'category', 'posted']);
    expect(chips[0].value).toBe('Used');
    expect(chips[1].value).toBe('Electronics');
    expect(chips[2].value).toBe('Posted 3d ago');
  });

  it('returns empty array for individual with no fields', () => {
    const chips = getListingHighlights(
      { ...BASE, listing_type: 'individual' },
      NOW
    );
    expect(chips.map((c) => c.key)).toEqual(['posted']);
    expect(chips[0].value).toBe('Posted today');
  });
});
