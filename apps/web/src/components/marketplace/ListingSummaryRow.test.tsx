import React from 'react';
import type { MarketplaceCategory, MarketplaceListing } from '@nepally/shared';
import { render, screen } from '../../test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ListingSummaryRow } from './ListingSummaryRow';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const category: MarketplaceCategory = {
  id: 'cat-1',
  name: 'Food & Restaurants',
  slug: 'food-restaurants',
  emoji: '🍜',
  icon: 'restaurant',
  color: '#FF6B35',
  description: 'Restaurants and catering',
  sort_order: 1,
  created_at: '2026-01-01T00:00:00.000Z',
};

const baseListing: MarketplaceListing = {
  id: 'listing-1',
  owner_id: 'user-1',
  metro_area_id: 'metro-1',
  category_id: 'cat-1',
  listing_type: 'individual',
  status: 'active',
  title: 'Toyota Camry 2015',
  description: 'Reliable commuter car.',
  photos: [],
  price: '80',
  business_name: null,
  address: null,
  business_hours: null,
  item_condition: 'used',
  phone: null,
  email: null,
  website_url: null,
  is_global: false,
  views_count: 12,
  saves_count: 3,
  contacts_count: 1,
  is_featured: false,
  trending_score: 0,
  refreshed_at: '2026-03-30T12:00:00.000Z',
  created_at: '2026-09-18T07:00:00.000Z',
  updated_at: '2026-09-18T07:00:00.000Z',
  category,
};

const now = new Date('2026-04-01T12:00:00.000Z');

describe('ListingSummaryRow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-18T09:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('links the title, and only the title, to the listing', () => {
    render(<ListingSummaryRow listing={baseListing} />);

    const link = screen.getByRole('link', { name: 'Toyota Camry 2015' });
    expect(link.getAttribute('href')).toBe('/marketplace/listing/listing-1');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('shows a numeric price as dollars', () => {
    render(<ListingSummaryRow listing={{ ...baseListing, price: '80' }} />);

    expect(screen.getByText('$80')).toBeDefined();
  });

  it('shows free-text price as typed', () => {
    render(<ListingSummaryRow listing={{ ...baseListing, price: 'Negotiable' }} />);

    expect(screen.getByText('Negotiable')).toBeDefined();
  });

  it('shows no price when it is null, leaving no dangling separator', () => {
    render(<ListingSummaryRow listing={{ ...baseListing, price: null }} />);

    expect(screen.queryByText('$80')).toBeNull();
    const categoryText = screen.getByText('Food & Restaurants');
    expect(categoryText.parentElement?.children).toHaveLength(1);
  });

  it('shows the category name', () => {
    render(<ListingSummaryRow listing={baseListing} />);

    expect(screen.getByText('Food & Restaurants')).toBeDefined();
  });

  it('falls back to "Marketplace" when there is no category', () => {
    render(<ListingSummaryRow listing={{ ...baseListing, category: undefined }} />);

    expect(screen.getByText('Marketplace')).toBeDefined();
  });

  it('shows the category emoji when there are no photos', () => {
    render(<ListingSummaryRow listing={{ ...baseListing, photos: [] }} />);

    expect(screen.getByText('🍜')).toBeDefined();
    expect(screen.queryByRole('presentation')).toBeNull();
  });

  it('falls back to the box emoji when there is no category', () => {
    render(<ListingSummaryRow listing={{ ...baseListing, photos: [], category: undefined }} />);

    expect(screen.getByText('📦')).toBeDefined();
  });

  it('shows an image, not the emoji, when there is a photo', () => {
    render(<ListingSummaryRow listing={{ ...baseListing, photos: ['https://cdn.example.com/car.jpg'] }} />);

    expect(screen.getByRole('presentation')).toBeDefined();
    expect(screen.queryByText('🍜')).toBeNull();
  });

  describe('public view', () => {
    it('shows the relative time', () => {
      render(<ListingSummaryRow listing={baseListing} />);

      expect(screen.getByText('2h ago')).toBeDefined();
    });

    it('marks the age with a machine-readable dateTime', () => {
      render(<ListingSummaryRow listing={baseListing} />);

      expect(screen.getByRole('time').getAttribute('dateTime')).toBe(baseListing.created_at);
    });

    it('shows no status chip', () => {
      render(<ListingSummaryRow listing={baseListing} />);

      expect(screen.queryByText('Active')).toBeNull();
    });

    it('shows no view/save/contact counts', () => {
      render(<ListingSummaryRow listing={baseListing} />);

      expect(screen.queryByText('12 views')).toBeNull();
    });
  });

  describe('owner view', () => {
    it('shows the Active status', () => {
      render(<ListingSummaryRow listing={baseListing} owner={{ now }} />);

      const chip = screen.getByText('Active');
      expect(chip.getAttribute('data-status')).toBe('active');
    });

    it('shows the Inactive status', () => {
      render(<ListingSummaryRow listing={{ ...baseListing, status: 'inactive' }} owner={{ now }} />);

      const chip = screen.getByText('Inactive');
      expect(chip.getAttribute('data-status')).toBe('inactive');
    });

    it('shows the Removed status', () => {
      render(<ListingSummaryRow listing={{ ...baseListing, status: 'removed' }} owner={{ now }} />);

      const chip = screen.getByText('Removed');
      expect(chip.getAttribute('data-status')).toBe('removed');
    });

    it('shows views, saves and contacts, each on its own', () => {
      render(
        <ListingSummaryRow
          listing={{ ...baseListing, views_count: 12, saves_count: 3, contacts_count: 1 }}
          owner={{ now }}
        />
      );

      expect(screen.getByText('12 views')).toBeDefined();
      expect(screen.getByText('3 saves')).toBeDefined();
      expect(screen.getByText('1 contact')).toBeDefined();
    });

    it('shows no relative time', () => {
      render(<ListingSummaryRow listing={baseListing} owner={{ now }} />);

      expect(screen.queryByRole('time')).toBeNull();
    });

    it('shows "Expires in N days" when the listing is within the warning window', () => {
      const refreshedAt80DaysAgo = new Date(now.getTime() - 80 * MS_PER_DAY).toISOString();
      render(
        <ListingSummaryRow listing={{ ...baseListing, refreshed_at: refreshedAt80DaysAgo }} owner={{ now }} />
      );

      expect(screen.getByText('Expires in 10 days')).toBeDefined();
    });

    it('singularises "Expires in 1 day"', () => {
      const refreshedAt89DaysAgo = new Date(now.getTime() - 89 * MS_PER_DAY).toISOString();
      render(
        <ListingSummaryRow listing={{ ...baseListing, refreshed_at: refreshedAt89DaysAgo }} owner={{ now }} />
      );

      expect(screen.getByText('Expires in 1 day')).toBeDefined();
    });

    it('shows no expiry warning for a listing refreshed recently', () => {
      render(<ListingSummaryRow listing={{ ...baseListing, refreshed_at: now.toISOString() }} owner={{ now }} />);

      expect(screen.queryByText(/Expires in/)).toBeNull();
    });

    it('shows no expiry warning for an inactive listing, even one that is stale', () => {
      const refreshedAt80DaysAgo = new Date(now.getTime() - 80 * MS_PER_DAY).toISOString();
      render(
        <ListingSummaryRow
          listing={{ ...baseListing, status: 'inactive', refreshed_at: refreshedAt80DaysAgo }}
          owner={{ now }}
        />
      );

      expect(screen.queryByText(/Expires in/)).toBeNull();
    });
  });
});
