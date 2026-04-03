import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ListingCard } from './ListingCard';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

jest.mock('@nepally/shared', () => ({
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
}));

const MOCK_CATEGORY = {
  id: 'cat-1',
  name: 'Food & Restaurants',
  slug: 'food-restaurants',
  emoji: '🍜',
  icon: 'restaurant',
  color: '#FF6B35',
  description: 'Nepali restaurants',
  sort_order: 1,
  created_at: new Date().toISOString(),
};

function makeListing(overrides: Record<string, unknown> = {}) {
  return {
    id: 'listing-1',
    owner_id: 'user-2',
    metro_area_id: 'metro-1',
    category_id: 'cat-1',
    listing_type: 'business' as const,
    status: 'active' as const,
    title: 'Himalayan Kitchen',
    description: 'Authentic Nepali food.',
    photos: [] as string[],
    price: '$15-25',
    business_name: 'Himalayan Kitchen',
    address: null,
    phone: null,
    email: null,
    website_url: null,
    item_condition: null,
    business_hours: null,
    is_global: false,
    views_count: 10,
    saves_count: 3,
    contacts_count: 1,
    refreshed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: MOCK_CATEGORY,
    owner: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 1, profile_photo: null },
    ...overrides,
  };
}

describe('ListingCard', () => {
  it('renders the listing title', () => {
    const { getAllByText } = render(
      <ListingCard listing={makeListing()} onPress={jest.fn()} />
    );
    // Title and business_name are both "Himalayan Kitchen"
    expect(getAllByText('Himalayan Kitchen').length).toBeGreaterThanOrEqual(1);
  });

  it('renders category badge', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing()} onPress={jest.fn()} />
    );
    expect(getByText(/Food & Restaurants/)).toBeTruthy();
  });

  it('renders listing type label', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing()} onPress={jest.fn()} />
    );
    expect(getByText('Business')).toBeTruthy();
  });

  it('renders price when present', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing({ price: '$20' })} onPress={jest.fn()} />
    );
    expect(getByText('$20')).toBeTruthy();
  });

  it('does not render price when null', () => {
    const { queryByText } = render(
      <ListingCard listing={makeListing({ price: null })} onPress={jest.fn()} />
    );
    expect(queryByText('$15-25')).toBeNull();
  });

  it('renders business name when present', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing({ business_name: 'My Biz' })} onPress={jest.fn()} />
    );
    expect(getByText('My Biz')).toBeTruthy();
  });

  it('renders views and saves counts', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing({ views_count: 42, saves_count: 7 })} onPress={jest.fn()} />
    );
    expect(getByText('42')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    const { getAllByText } = render(
      <ListingCard listing={makeListing()} onPress={onPress} />
    );
    fireEvent.press(getAllByText('Himalayan Kitchen')[0]);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows placeholder emoji when no photos', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing({ photos: [] })} onPress={jest.fn()} />
    );
    expect(getByText('🍜')).toBeTruthy();
  });

  it('uses fallback values when category is null', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing({ category: null })} onPress={jest.fn()} />
    );
    expect(getByText('📦')).toBeTruthy();
    expect(getByText(/Other/)).toBeTruthy();
  });
});
