import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';
import type { MarketplaceListing } from '@nepally/shared';
import { ListingGridCard } from './ListingGridCard';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mkListing = (overrides: Partial<MarketplaceListing> = {}): MarketplaceListing => ({
  id: 'listing-1',
  owner_id: 'owner-1',
  metro_area_id: 'metro-1',
  category_id: 'cat-1',
  listing_type: 'individual',
  status: 'active',
  title: 'Cozy room near LIRR',
  description: '',
  photos: [],
  price: '$450',
  business_name: null,
  address: null,
  business_hours: null,
  item_condition: 'used',
  phone: null,
  email: null,
  website_url: null,
  is_global: false,
  views_count: 42,
  saves_count: 3,
  contacts_count: 0,
  trending_score: 0,
  refreshed_at: '2026-04-14T11:00:00Z',
  created_at: '2026-04-14T11:00:00Z',
  updated_at: '2026-04-14T11:00:00Z',
  owner: { id: 'owner-1', full_name: 'Ama', trust_level: 1, profile_photo: null },
  category: { id: 'cat-1', name: 'Housing', slug: 'housing', emoji: '🏠', icon: null, color: '#4CAF50', description: null, sort_order: 1, created_at: '2026-01-01' },
  ...overrides,
});

describe('ListingGridCard', () => {
  it('renders title and price', () => {
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={() => {}} isSaved={false} onToggleSave={() => {}} />
    );
    expect(screen.getByText('Cozy room near LIRR')).toBeTruthy();
    expect(screen.getByText('$450')).toBeTruthy();
  });

  it('does NOT render a "Contact Seller" button', () => {
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={() => {}} isSaved={false} onToggleSave={() => {}} />
    );
    expect(screen.queryByText('Contact Seller')).toBeNull();
  });

  it('calls onPress when the card body is tapped', () => {
    const onPress = jest.fn();
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={onPress} isSaved={false} onToggleSave={() => {}} />
    );
    fireEvent.press(screen.getByLabelText('Open listing: Cozy room near LIRR'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleSave with the listing id when heart is tapped', () => {
    const onToggleSave = jest.fn();
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={() => {}} isSaved={false} onToggleSave={onToggleSave} />
    );
    fireEvent.press(screen.getByLabelText('Save listing'));
    expect(onToggleSave).toHaveBeenCalledWith('listing-1');
  });

  it('announces unsave state when already saved', () => {
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={() => {}} isSaved={true} onToggleSave={() => {}} />
    );
    expect(screen.getByLabelText('Unsave listing')).toBeTruthy();
  });

  it('renders a Sponsored badge when sponsored=true', () => {
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={() => {}} isSaved={false} onToggleSave={() => {}} sponsored />
    );
    expect(screen.getByText('Sponsored')).toBeTruthy();
  });

  it('shows the verified check for a verified seller', () => {
    const screen = render(
      <ListingGridCard listing={mkListing()} width={180} onPress={() => {}} isSaved={false} onToggleSave={() => {}} />
    );
    expect(screen.getByText('✓')).toBeTruthy();
  });

  it('hides the verified check for a new seller', () => {
    const screen = render(
      <ListingGridCard
        listing={mkListing({ owner: { id: 'owner-1', full_name: 'Ama', trust_level: 0, profile_photo: null } })}
        width={180}
        onPress={() => {}}
        isSaved={false}
        onToggleSave={() => {}}
      />
    );
    expect(screen.queryByText('✓')).toBeNull();
  });

  it('hides the verified check when the owner is missing', () => {
    const screen = render(
      <ListingGridCard
        listing={mkListing({ owner: undefined })}
        width={180}
        onPress={() => {}}
        isSaved={false}
        onToggleSave={() => {}}
      />
    );
    expect(screen.queryByText('✓')).toBeNull();
  });

  it('renders without price gracefully', () => {
    const screen = render(
      <ListingGridCard
        listing={mkListing({ price: null })}
        width={180}
        onPress={() => {}}
        isSaved={false}
        onToggleSave={() => {}}
      />
    );
    expect(screen.queryByText('$450')).toBeNull();
    expect(screen.getByText('Cozy room near LIRR')).toBeTruthy();
  });
});
