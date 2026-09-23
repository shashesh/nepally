import React from 'react';
import { render, screen } from '../../test-utils';
import { describe, it, expect } from 'vitest';
import type { MarketplaceListing } from '@nepally/shared';
import { ListingBusinessDetails, hasBusinessDetails } from './ListingBusinessDetails';

function listing(overrides: Partial<MarketplaceListing> = {}): MarketplaceListing {
  return {
    id: 'listing-1',
    title: 'Himalayan Kitchen',
    business_name: 'Himalayan Kitchen LLC',
    address: '12 Main St',
    phone: '555-1234',
    email: 'hi@example.com',
    website_url: 'https://example.com',
    business_hours: null,
    photos: [],
    ...overrides,
  } as unknown as MarketplaceListing;
}

const EMPTY = {
  business_name: null,
  address: null,
  phone: null,
  email: null,
  website_url: null,
  business_hours: null,
};

describe('hasBusinessDetails', () => {
  it('is true when any contact field is set', () => {
    expect(hasBusinessDetails(listing({ ...EMPTY, phone: '555-1234' }))).toBe(true);
  });

  it('is true when only opening hours are set', () => {
    expect(
      hasBusinessDetails(
        listing({ ...EMPTY, business_hours: { monday: { open: '9:00', close: '17:00' } } } as never)
      )
    ).toBe(true);
  });

  it('is false when the business has told us nothing', () => {
    expect(hasBusinessDetails(listing(EMPTY as never))).toBe(false);
  });
});

describe('ListingBusinessDetails', () => {
  it('pairs each label with its value', () => {
    render(<ListingBusinessDetails listing={listing()} />);

    const term = screen.getByText('Phone');
    expect(term.tagName).toBe('DT');
    expect(term.nextElementSibling?.textContent).toBe('555-1234');
  });

  it('omits rows the listing has not filled in', () => {
    render(<ListingBusinessDetails listing={listing({ address: null, email: null })} />);

    expect(screen.queryByText('Address')).toBeNull();
    expect(screen.queryByText('Email')).toBeNull();
    expect(screen.getByText('Phone')).toBeDefined();
  });

  it('lists opening hours under one Hours term', () => {
    render(
      <ListingBusinessDetails
        listing={
          listing({
            business_hours: {
              monday: { open: '9:00', close: '17:00' },
              tuesday: { open: '10:00', close: '18:00' },
            },
          } as never)
        }
      />
    );

    expect(screen.getByText('Hours')).toBeDefined();
    expect(screen.getByText('Monday')).toBeDefined();
    expect(screen.getByText('9:00 - 17:00')).toBeDefined();
    expect(screen.getByText('Tuesday')).toBeDefined();
  });

  it('shows no hours block when none are set', () => {
    render(<ListingBusinessDetails listing={listing()} />);
    expect(screen.queryByText('Hours')).toBeNull();
  });

  it('renders nothing at all when there is nothing to show', () => {
    const { container } = render(<ListingBusinessDetails listing={listing(EMPTY as never)} />);
    expect(container.querySelector('dl')).toBeNull();
  });
});
