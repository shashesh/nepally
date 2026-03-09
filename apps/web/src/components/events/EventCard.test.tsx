import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

vi.mock('@nusa/shared', () => ({
  formatPublicName: (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length < 2) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));

vi.mock('../Avatar', () => ({
  default: ({ name }: { name: string }) =>
    React.createElement('div', { 'data-testid': `avatar-${name}` }),
}));

vi.mock('./EventTypeBadge', () => ({
  default: ({ type }: { type: string }) =>
    React.createElement('span', { 'data-testid': 'event-type-badge' }, type),
}));

vi.mock('./EventCard.module.css', () => ({
  default: {
    card: 'card', cardPast: 'cardPast', thumbnail: 'thumbnail',
    thumbnailPlaceholder: 'thumbnailPlaceholder', content: 'content',
    badgeRow: 'badgeRow', globalBadge: 'globalBadge', cancelledBadge: 'cancelledBadge',
    title: 'title', titlePast: 'titlePast', meta: 'meta', footer: 'footer',
    organizerRow: 'organizerRow', organizerName: 'organizerName', rsvpCount: 'rsvpCount',
  },
}));

import EventCard from './EventCard';

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const MOCK_EVENT = {
  id: 'event-1',
  title: 'Dashain Celebration 2026',
  description: 'Annual Dashain celebration.',
  event_type: 'cultural' as const,
  start_date: FUTURE,
  location_name: 'Dallas Convention Center',
  metro_area_id: '19100',
  is_global: false,
  organizer_id: 'user-1',
  rsvp_count: 8,
  rsvp_visibility: 'public' as const,
  status: 'active' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  organizer: {
    id: 'user-1',
    full_name: 'Asha Kumar',
    trust_level: 1,
    profile_photo: null,
  },
};

describe('EventCard (web)', () => {
  it('renders event title', () => {
    render(React.createElement(EventCard, { event: MOCK_EVENT }));
    expect(screen.getByText('Dashain Celebration 2026')).toBeDefined();
  });

  it('renders location name', () => {
    render(React.createElement(EventCard, { event: MOCK_EVENT }));
    expect(screen.getByText(/Dallas Convention Center/)).toBeDefined();
  });

  it('renders RSVP count — plural', () => {
    render(React.createElement(EventCard, { event: MOCK_EVENT }));
    expect(screen.getByText('8 going')).toBeDefined();
  });

  it('renders RSVP count — singular', () => {
    render(React.createElement(EventCard, { event: { ...MOCK_EVENT, rsvp_count: 1 } }));
    expect(screen.getByText('1 going')).toBeDefined();
  });

  it('renders formatted organizer name', () => {
    render(React.createElement(EventCard, { event: MOCK_EVENT }));
    expect(screen.getByText('Asha K.')).toBeDefined();
  });

  it('links to the event detail page', () => {
    render(React.createElement(EventCard, { event: MOCK_EVENT }));
    const link = document.querySelector('a[href="/events/event-1"]');
    expect(link).not.toBeNull();
  });

  it('shows global badge for global event', () => {
    render(React.createElement(EventCard, { event: { ...MOCK_EVENT, is_global: true } }));
    expect(screen.getByText('🌐 Global')).toBeDefined();
  });

  it('does not show global badge for local event', () => {
    render(React.createElement(EventCard, { event: MOCK_EVENT }));
    expect(screen.queryByText('🌐 Global')).toBeNull();
  });

  it('shows Cancelled badge for cancelled event', () => {
    render(React.createElement(EventCard, { event: { ...MOCK_EVENT, status: 'cancelled' as const } }));
    expect(screen.getByText('Cancelled')).toBeDefined();
  });

  it('renders placeholder emoji when no photo_url', () => {
    render(React.createElement(EventCard, { event: MOCK_EVENT }));
    expect(screen.getByText('📅')).toBeDefined();
  });

  it('renders type badge', () => {
    render(React.createElement(EventCard, { event: MOCK_EVENT }));
    expect(screen.getByTestId('event-type-badge')).toBeDefined();
  });

  it('shows Unknown when organizer is missing', () => {
    render(React.createElement(EventCard, { event: { ...MOCK_EVENT, organizer: undefined } }));
    expect(screen.getByText('Unknown')).toBeDefined();
  });

  it('renders multi-day date range when end_date is on a different day', () => {
    const farFuture = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    render(React.createElement(EventCard, { event: { ...MOCK_EVENT, end_date: farFuture } }));
    const dateEl = screen.getByText(/–/);
    expect(dateEl).toBeDefined();
  });

  it('does not crash when past=true prop is passed', () => {
    expect(() =>
      render(React.createElement(EventCard, { event: MOCK_EVENT, past: true }))
    ).not.toThrow();
  });
});
