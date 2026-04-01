import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, it, expect, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };
type MockImageProps = { src: string; alt: string; className?: string; fill?: boolean };

vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt, className }: MockImageProps) =>
    React.createElement('img', { src, alt, className }),
}));

vi.mock('@nepally/shared', () => ({
  LISTING_TYPE_LABELS: { business: 'Business', individual: 'Individual' },
}));

vi.mock('../../pages/marketplace/marketplace.module.css', () => ({
  default: new Proxy({}, { get: (_target, prop) => `mock-${String(prop)}` }),
}));

// Must import after vi.mock
import { ListingCard } from './ListingCard';

const MOCK_CATEGORY = {
  id: 'cat-1',
  name: 'Food & Restaurants',
  slug: 'food-restaurants',
  emoji: '🍜',
  icon: 'restaurant',
  color: '#FF6B35',
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
  } as never;
}

describe('ListingCard (web)', () => {
  it('renders the listing title', () => {
    render(React.createElement(ListingCard, { listing: makeListing() }));
    expect(screen.getByText('Himalayan Kitchen')).toBeDefined();
  });

  it('renders category badge', () => {
    render(React.createElement(ListingCard, { listing: makeListing() }));
    expect(screen.getByText(/Food & Restaurants/)).toBeDefined();
  });

  it('renders listing type label', () => {
    render(React.createElement(ListingCard, { listing: makeListing() }));
    expect(screen.getByText('Business')).toBeDefined();
  });

  it('renders price when present', () => {
    render(React.createElement(ListingCard, { listing: makeListing({ price: '$20' }) }));
    expect(screen.getByText('$20')).toBeDefined();
  });

  it('does not render price when null', () => {
    render(React.createElement(ListingCard, { listing: makeListing({ price: null }) }));
    expect(screen.queryByText('$15-25')).toBeNull();
  });

  it('renders views and saves counts', () => {
    render(React.createElement(ListingCard, { listing: makeListing({ views_count: 42, saves_count: 7 }) }));
    expect(screen.getByText('42 views')).toBeDefined();
    expect(screen.getByText('7 saves')).toBeDefined();
  });

  it('links to the correct listing detail page', () => {
    render(React.createElement(ListingCard, { listing: makeListing() }));
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/marketplace/listing/listing-1');
  });

  it('shows placeholder emoji when no photos', () => {
    render(React.createElement(ListingCard, { listing: makeListing({ photos: [] }) }));
    expect(screen.getByText('🍜')).toBeDefined();
  });

  it('renders image when photos are present', () => {
    render(React.createElement(ListingCard, { listing: makeListing({ photos: ['https://example.com/photo.jpg'] }) }));
    const img = screen.getByAltText('Himalayan Kitchen');
    expect(img).toBeDefined();
  });

  it('uses fallback emoji when category is null', () => {
    render(React.createElement(ListingCard, { listing: makeListing({ category: null }) }));
    expect(screen.getByText('📦')).toBeDefined();
  });
});
