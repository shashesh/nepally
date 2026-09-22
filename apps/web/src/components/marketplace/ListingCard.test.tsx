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
    is_featured: false,
    trending_score: 24,
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

  it('renders category chip', () => {
    render(React.createElement(ListingCard, { listing: makeListing() }));
    expect(screen.getByText(/Food & Restaurants/)).toBeDefined();
  });

  it('renders price with "Starting at" prefix when present', () => {
    render(React.createElement(ListingCard, { listing: makeListing({ price: '$20' }) }));
    expect(screen.getByText('Starting at $20')).toBeDefined();
  });

  it('does not render price row when null', () => {
    render(React.createElement(ListingCard, { listing: makeListing({ price: null }) }));
    expect(screen.queryByText(/Starting at/)).toBeNull();
  });

  it('renders views count in meta line', () => {
    render(React.createElement(ListingCard, { listing: makeListing({ views_count: 42 }) }));
    expect(screen.getByText('42 views')).toBeDefined();
  });

  it('names a verified seller', () => {
    render(React.createElement(ListingCard, { listing: makeListing() }));
    expect(screen.getByText('Verified Seller')).toBeDefined();
  });

  it('hides the verified mark from assistive tech, keeping its label', () => {
    const { container } = render(React.createElement(ListingCard, { listing: makeListing() }));
    const star = container.querySelector('[data-testid="verified-mark"]');
    expect(star?.getAttribute('aria-hidden')).toBe('true');
  });

  it('says nothing about verification for a new seller', () => {
    render(
      React.createElement(ListingCard, {
        listing: makeListing({
          owner: { id: 'user-2', full_name: 'Asha Kumar', trust_level: 0, profile_photo: null },
        }),
      })
    );
    expect(screen.queryByText('Verified Seller')).toBeNull();
  });

  it('drops the inert "Contact Seller" text', () => {
    render(React.createElement(ListingCard, { listing: makeListing() }));
    expect(screen.queryByText('Contact Seller')).toBeNull();
  });

  it('carries one link, named by the title alone, to the listing', () => {
    render(React.createElement(ListingCard, { listing: makeListing() }));
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/marketplace/listing/listing-1');
    expect(links[0].textContent).toBe('Himalayan Kitchen');
  });

  it('puts the title link inside a heading', () => {
    render(React.createElement(ListingCard, { listing: makeListing() }));
    const heading = screen.getByRole('heading', { name: 'Himalayan Kitchen' });
    expect(heading.querySelector('a')).not.toBeNull();
  });

  it('themes itself from the category slug', () => {
    const { container } = render(React.createElement(ListingCard, { listing: makeListing() }));
    expect(container.querySelector('article')?.getAttribute('data-category')).toBe(
      'food-restaurants'
    );
  });

  it('falls back to the other theme for a category that no longer exists', () => {
    const { container } = render(
      React.createElement(ListingCard, {
        listing: makeListing({ category: { ...MOCK_CATEGORY, slug: 'beauty-wellness' } }),
      })
    );
    expect(container.querySelector('article')?.getAttribute('data-category')).toBe('other');
  });

  it('shows the category emoji on the cover when there are no photos', () => {
    const { container } = render(
      React.createElement(ListingCard, { listing: makeListing({ photos: [] }) })
    );
    const placeholder = container.querySelector('[data-testid="cover-placeholder"]');
    expect(placeholder?.textContent).toBe('🍜');
    expect(placeholder?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders a decorative cover image when photos are present', () => {
    const { container } = render(
      React.createElement(ListingCard, {
        listing: makeListing({ photos: ['https://example.com/photo.jpg'] }),
      })
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/photo.jpg');
    // The title is already the link's name; repeating it as alt says it twice.
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('uses fallback emoji when category is null', () => {
    const { container } = render(
      React.createElement(ListingCard, { listing: makeListing({ category: null }) })
    );
    expect(container.querySelector('[data-testid="cover-placeholder"]')?.textContent).toBe('📦');
  });

  it('marks a sponsored listing', () => {
    render(React.createElement(ListingCard, { listing: makeListing(), sponsored: true }));
    expect(screen.getByText('Sponsored')).toBeDefined();
  });
});
