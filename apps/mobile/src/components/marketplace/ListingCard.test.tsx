import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ListingCard } from './ListingCard';

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
    is_featured: false,
    trending_score: 24,
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
  it('reads title, category and price to a screen reader', () => {
    const onPress = jest.fn();
    const screen = render(<ListingCard listing={makeListing()} onPress={onPress} />);

    fireEvent.press(
      screen.getByRole('button', { name: 'Himalayan Kitchen, Food & Restaurants, $15-25, verified seller' })
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reads Sponsored to a screen reader on a sponsored card', () => {
    const screen = render(
      <ListingCard listing={makeListing({ price: null })} onPress={jest.fn()} sponsored />
    );
    expect(
      screen.getByRole('button', { name: 'Himalayan Kitchen, Food & Restaurants, verified seller, sponsored' })
    ).toBeTruthy();
  });

  it('renders the listing title', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing()} onPress={jest.fn()} />
    );
    expect(getByText('Himalayan Kitchen')).toBeTruthy();
  });

  it('renders category chip with emoji and name', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing()} onPress={jest.fn()} />
    );
    expect(getByText(/🍜 Food & Restaurants/)).toBeTruthy();
  });

  it('shows the price as the marketplace formats it, with no "Starting at"', () => {
    const { getByText, queryByText } = render(
      <ListingCard listing={makeListing({ price: '20' })} onPress={jest.fn()} />
    );
    expect(getByText('$20')).toBeTruthy();
    expect(queryByText(/Starting at/)).toBeNull();
  });

  it('shows a non-numeric price as written', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing({ price: 'Free' })} onPress={jest.fn()} />
    );
    expect(getByText('Free')).toBeTruthy();
  });

  it('does not render price row when null', () => {
    const { queryByText } = render(
      <ListingCard listing={makeListing({ price: null })} onPress={jest.fn()} />
    );
    expect(queryByText(/\$/)).toBeNull();
  });

  it('renders verified seller star when owner trust_level >= 1', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing()} onPress={jest.fn()} />
    );
    expect(getByText('★')).toBeTruthy();
    expect(getByText('Verified Seller')).toBeTruthy();
  });

  it('hides verified seller when owner trust_level is 0', () => {
    const { queryByText } = render(
      <ListingCard
        listing={makeListing({
          owner: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 0, profile_photo: null },
        })}
        onPress={jest.fn()}
      />
    );
    expect(queryByText('Verified Seller')).toBeNull();
    expect(queryByText('★')).toBeNull();
  });

  it('renders views count', () => {
    const { getByText } = render(
      <ListingCard listing={makeListing({ views_count: 42 })} onPress={jest.fn()} />
    );
    expect(getByText('42 views')).toBeTruthy();
  });

  it('does not show a Contact Seller button: the whole card opens the listing', () => {
    const { queryByText } = render(
      <ListingCard listing={makeListing()} onPress={jest.fn()} />
    );
    expect(queryByText('Contact Seller')).toBeNull();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ListingCard listing={makeListing()} onPress={onPress} />
    );
    fireEvent.press(getByText('Himalayan Kitchen'));
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
