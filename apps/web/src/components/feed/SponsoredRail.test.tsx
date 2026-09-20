import React from 'react';
import type { Event, SponsoredListing } from '@nepally/shared';
import { render, screen } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import { SponsoredRail } from './SponsoredRail';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

const stickyListing = {
  id: 'sticky-1',
  listing: { id: 'listing-1', title: 'Himalayan Grocers', description: 'Fresh produce and spices every week.' },
} as unknown as SponsoredListing;

const events = [
  {
    id: 'event-1',
    title: 'Dashain Celebration',
    location_name: 'Community Hall',
    start_date: '2026-10-12T18:00:00Z',
  },
  { id: 'event-2', title: 'Tihar Night', location_name: 'City Park', start_date: '2026-11-02T18:00:00Z' },
] as unknown as Event[];

describe('SponsoredRail', () => {
  it('is a complementary landmark holding both sections in order', () => {
    render(<SponsoredRail stickyListings={[stickyListing]} events={events} />);

    const rail = screen.getByRole('complementary');
    const headings = Array.from(rail.querySelectorAll('h2')).map((heading) => heading.textContent);
    expect(headings).toEqual(['Sponsored', 'Upcoming Events']);
  });

  it('shows a paid listing and links to it', () => {
    render(<SponsoredRail stickyListings={[stickyListing]} events={[]} />);

    expect(screen.getByText('Himalayan Grocers')).toBeDefined();
    expect(screen.getByRole('link', { name: 'View Listing' }).getAttribute('href')).toBe(
      '/marketplace/listing/listing-1'
    );
  });

  it('shows each upcoming event with its date, place and link', () => {
    render(<SponsoredRail stickyListings={[]} events={events} />);

    expect(screen.getByRole('link', { name: /Dashain Celebration/ }).getAttribute('href')).toBe('/events/event-1');
    expect(screen.getByText('Community Hall')).toBeDefined();
    expect(screen.getByRole('link', { name: 'View All' }).getAttribute('href')).toBe('/events');
  });

  it('hides the events section when there is nothing coming up', () => {
    render(<SponsoredRail stickyListings={[stickyListing]} events={[]} />);

    expect(screen.queryByText('Upcoming Events')).toBeNull();
  });
});
