import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ListingStrip } from './ListingStrip';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return { LinearGradient: View };
});
jest.mock('@nepally/shared', () => {
  const actual = jest.requireActual('@nepally/shared');
  return {
    ...actual,
  };
});

const CATEGORY = {
  id: 'cat-1',
  name: 'Food & Restaurants',
  slug: 'food-restaurants',
  emoji: '🍜',
  icon: 'restaurant',
  color: '#FF6B35',
  description: null,
  sort_order: 1,
  created_at: '2025-01-01T00:00:00Z',
};

function makeListing(id: string, title: string) {
  return {
    id,
    owner_id: 'user-2',
    metro_area_id: 'metro-1',
    category_id: 'cat-1',
    listing_type: 'business' as const,
    status: 'active' as const,
    title,
    description: 'Test',
    photos: [],
    price: '$10',
    business_name: title,
    address: null,
    phone: null,
    email: null,
    website_url: null,
    item_condition: null,
    business_hours: null,
    is_global: false,
    is_featured: false,
    trending_score: 10,
    views_count: 5,
    saves_count: 1,
    contacts_count: 0,
    refreshed_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    category: CATEGORY,
    owner: { id: 'user-2', full_name: 'Asha', trust_level: 1, profile_photo: null },
  };
}

describe('ListingStrip', () => {
  it('renders nothing when listings is empty', () => {
    const { queryByText } = render(
      <ListingStrip
        title="Featured"
        listings={[]}
        onItemPress={jest.fn()}
        onShowAll={jest.fn()}
      />
    );
    expect(queryByText('Featured')).toBeNull();
  });

  it('renders title with icon', () => {
    const { getByText } = render(
      <ListingStrip
        title="Featured"
        titleIcon="⭐"
        listings={[makeListing('1', 'Himalayan Kitchen')]}
        onItemPress={jest.fn()}
        onShowAll={jest.fn()}
      />
    );
    expect(getByText(/⭐ Featured/)).toBeTruthy();
  });

  it('renders up to maxItems listings', () => {
    const listings = Array.from({ length: 15 }, (_, i) =>
      makeListing(`l-${i}`, `Listing ${i}`)
    );
    const { getByText, queryByText } = render(
      <ListingStrip
        title="Recent"
        listings={listings}
        onItemPress={jest.fn()}
        onShowAll={jest.fn()}
        maxItems={5}
      />
    );
    expect(getByText('Listing 0')).toBeTruthy();
    expect(getByText('Listing 4')).toBeTruthy();
    expect(queryByText('Listing 5')).toBeNull();
  });

  it('shows "Show All" terminal card when listings >= maxItems', () => {
    const listings = Array.from({ length: 10 }, (_, i) =>
      makeListing(`l-${i}`, `Listing ${i}`)
    );
    const { getByText } = render(
      <ListingStrip
        title="Featured"
        listings={listings}
        onItemPress={jest.fn()}
        onShowAll={jest.fn()}
        maxItems={10}
      />
    );
    expect(getByText('Show All')).toBeTruthy();
  });

  it('hides "Show All" terminal card when listings < maxItems', () => {
    const { queryByText } = render(
      <ListingStrip
        title="Featured"
        listings={[makeListing('1', 'One')]}
        onItemPress={jest.fn()}
        onShowAll={jest.fn()}
        maxItems={10}
      />
    );
    expect(queryByText('Show All')).toBeNull();
  });

  it('calls onShowAll when "View All" header link pressed', () => {
    const onShowAll = jest.fn();
    const { getByText } = render(
      <ListingStrip
        title="Featured"
        listings={[makeListing('1', 'Kitchen')]}
        onItemPress={jest.fn()}
        onShowAll={onShowAll}
      />
    );
    fireEvent.press(getByText('View All →'));
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it('calls onItemPress with listing when card pressed', () => {
    const onItemPress = jest.fn();
    const listing = makeListing('1', 'Kitchen');
    const { getByText } = render(
      <ListingStrip
        title="Featured"
        listings={[listing]}
        onItemPress={onItemPress}
        onShowAll={jest.fn()}
      />
    );
    fireEvent.press(getByText('Kitchen'));
    expect(onItemPress).toHaveBeenCalledWith(listing);
  });
});
