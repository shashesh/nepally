import React from 'react';
import { render, screen, fireEvent, act } from '../../test-utils';
import { describe, it, expect, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string; 'aria-label'?: string };

vi.mock('next/link', () => ({
  default: ({ href, children, className, 'aria-label': ariaLabel }: MockLinkProps) =>
    React.createElement('a', { href, className, 'aria-label': ariaLabel }, children),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));

// No shared API is called here, and ListingCard reads MARKETPLACE_CATEGORIES
// and isVerifiedSeller from the real module.

import { ListingStrip } from './ListingStrip';

function makeListing(id: string) {
  return {
    id,
    owner_id: 'user-2',
    metro_area_id: 'metro-1',
    category_id: 'cat-1',
    listing_type: 'business' as const,
    status: 'active' as const,
    title: `Listing ${id}`,
    description: 'x',
    photos: [] as string[],
    price: '$10',
    business_name: null,
    address: null,
    phone: null,
    email: null,
    website_url: null,
    item_condition: null,
    business_hours: null,
    is_global: false,
    views_count: 5,
    saves_count: 1,
    contacts_count: 0,
    is_featured: false,
    trending_score: 8,
    refreshed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    category: { id: 'cat-1', name: 'Food', slug: 'food-restaurants', emoji: '🍜', icon: null, color: '#FF6B35', sort_order: 1, description: null, created_at: '' },
    owner: { id: 'user-2', full_name: 'Seller', trust_level: 1, profile_photo: null },
  } as never;
}

describe('ListingStrip (web)', () => {
  it('returns null when listings is empty', () => {
    render(
      React.createElement(ListingStrip, {
        title: 'Featured',
        listings: [],
        showAllHref: '/marketplace?view=featured',
      })
    );
    expect(screen.queryByRole('region', { name: 'Featured' })).toBeNull();
    expect(screen.queryByText('Featured')).toBeNull();
  });

  it('renders the section title with icon', () => {
    render(
      React.createElement(ListingStrip, {
        title: 'Featured',
        titleIcon: '⭐',
        listings: [makeListing('a')],
        showAllHref: '/marketplace?view=featured',
      })
    );
    expect(screen.getByText(/Featured/)).toBeDefined();
    expect(screen.getByText('⭐')).toBeDefined();
  });

  it('renders up to maxItems cards', () => {
    const listings = Array.from({ length: 15 }, (_, i) => makeListing(`l-${i}`));
    render(
      React.createElement(ListingStrip, {
        title: 'Featured',
        listings,
        showAllHref: '/marketplace?view=featured',
        maxItems: 5,
      })
    );
    // First 5 cards rendered
    expect(screen.getByText('Listing l-0')).toBeDefined();
    expect(screen.getByText('Listing l-4')).toBeDefined();
    expect(screen.queryByText('Listing l-5')).toBeNull();
  });

  it('appends Show All card when listings.length >= maxItems', () => {
    const listings = Array.from({ length: 10 }, (_, i) => makeListing(`l-${i}`));
    render(
      React.createElement(ListingStrip, {
        title: 'Featured',
        listings,
        showAllHref: '/marketplace?view=featured',
        maxItems: 10,
      })
    );
    expect(screen.getByText('Show All')).toBeDefined();
  });

  it('does not render Show All card when listings.length < maxItems', () => {
    const listings = Array.from({ length: 3 }, (_, i) => makeListing(`l-${i}`));
    render(
      React.createElement(ListingStrip, {
        title: 'Featured',
        listings,
        showAllHref: '/marketplace?view=featured',
        maxItems: 10,
      })
    );
    expect(screen.queryByText('Show All')).toBeNull();
  });

  it('Show All link routes to showAllHref', () => {
    const listings = Array.from({ length: 10 }, (_, i) => makeListing(`l-${i}`));
    render(
      React.createElement(ListingStrip, {
        title: 'Featured',
        listings,
        showAllHref: '/marketplace?view=featured',
        maxItems: 10,
      })
    );
    const showAll = screen.getByLabelText('Show all Featured listings');
    expect(showAll.getAttribute('href')).toBe('/marketplace?view=featured');
  });

  it('renders View All header link', () => {
    render(
      React.createElement(ListingStrip, {
        title: 'Featured',
        listings: [makeListing('a')],
        showAllHref: '/marketplace?view=featured',
      })
    );
    const viewAll = screen.getByText('View All →');
    expect(viewAll.getAttribute('href')).toBe('/marketplace?view=featured');
  });

  it('shows right arrow when scroll can go right', () => {
    const listings = Array.from({ length: 10 }, (_, i) => makeListing(`l-${i}`));
    // Mock scroll dimensions on initial mount via jsdom
    const origDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    const origClient = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 2000 });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 500 });

    try {
      render(
        React.createElement(ListingStrip, {
          title: 'Featured',
          listings,
          showAllHref: '/marketplace?view=featured',
        })
      );
      expect(screen.getByLabelText('Scroll Featured right')).toBeDefined();
      expect(screen.queryByLabelText('Scroll Featured left')).toBeNull();
    } finally {
      if (origDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', origDescriptor);
      if (origClient) Object.defineProperty(HTMLElement.prototype, 'clientWidth', origClient);
    }
  });

  it('right arrow click calls scrollBy', () => {
    const listings = Array.from({ length: 10 }, (_, i) => makeListing(`l-${i}`));
    const origScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    const origClient = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    const scrollBy = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 2000 });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 500 });
    Object.defineProperty(HTMLElement.prototype, 'scrollBy', { configurable: true, value: scrollBy });

    try {
      act(() => {
        render(
          React.createElement(ListingStrip, {
            title: 'Featured',
            listings,
            showAllHref: '/marketplace?view=featured',
          })
        );
      });
      const btn = screen.getByLabelText('Scroll Featured right');
      fireEvent.click(btn);
      expect(scrollBy).toHaveBeenCalledWith({ left: 320, behavior: 'smooth' });
    } finally {
      if (origScrollWidth) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', origScrollWidth);
      if (origClient) Object.defineProperty(HTMLElement.prototype, 'clientWidth', origClient);
    }
  });

  it('exposes the scroll arrow as a button that can take focus', () => {
    const listings = Array.from({ length: 10 }, (_, i) => makeListing(`l-${i}`));
    const origScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    const origClient = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 2000 });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 500 });

    try {
      render(
        React.createElement(ListingStrip, {
          title: 'Featured',
          listings,
          showAllHref: '/marketplace?view=featured',
        })
      );

      const arrow = screen.getByRole('button', { name: 'Scroll Featured right' });
      act(() => {
        (arrow as HTMLButtonElement).focus();
      });
      expect(document.activeElement).toBe(arrow);
    } finally {
      if (origScrollWidth) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', origScrollWidth);
      if (origClient) Object.defineProperty(HTMLElement.prototype, 'clientWidth', origClient);
    }
  });

  it('hides the arrow glyphs from assistive tech, which reads the label', () => {
    const listings = Array.from({ length: 10 }, (_, i) => makeListing(`l-${i}`));
    const origScrollWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth');
    const origClient = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, get: () => 2000 });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 500 });

    try {
      render(
        React.createElement(ListingStrip, {
          title: 'Featured',
          listings,
          showAllHref: '/marketplace?view=featured',
        })
      );

      const arrow = screen.getByRole('button', { name: 'Scroll Featured right' });
      expect(arrow.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    } finally {
      if (origScrollWidth) Object.defineProperty(HTMLElement.prototype, 'scrollWidth', origScrollWidth);
      if (origClient) Object.defineProperty(HTMLElement.prototype, 'clientWidth', origClient);
    }
  });
});
