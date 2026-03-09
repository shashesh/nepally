import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: any) =>
    React.createElement('a', { href, className }, children),
}));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const mockEvents = [
  {
    id: 'e1', title: 'Dashain Celebration', description: 'Cultural event',
    event_type: 'cultural', start_date: FUTURE, location_name: 'Dallas Convention Center',
    metro_area_id: '19100', is_global: false, organizer_id: 'u1',
    rsvp_count: 5, rsvp_visibility: 'public', status: 'active',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    organizer: { id: 'u1', full_name: 'Asha Kumar', trust_level: 1, profile_photo: null },
  },
  {
    id: 'e2', title: 'Career Networking Night', description: 'Career event',
    event_type: 'career', start_date: FUTURE, location_name: 'Tech Hub',
    metro_area_id: '19100', is_global: false, organizer_id: 'u2',
    rsvp_count: 12, rsvp_visibility: 'public', status: 'active',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    organizer: { id: 'u2', full_name: 'Rohan Shrestha', trust_level: 1, profile_photo: null },
  },
];

vi.mock('@nusa/shared', () => ({
  getEventsByMetro: vi.fn(async () => ({ data: mockEvents })),
  getUserRsvps: vi.fn(async () => ({ data: [] })),
  EVENT_TYPES: ['cultural', 'religious', 'social', 'career', 'other'],
  EVENT_TYPE_LABELS: { cultural: 'Cultural', religious: 'Religious', social: 'Social', career: 'Career', other: 'Other' },
  EVENT_TYPE_ICONS: { cultural: '🎭', religious: '🕌', social: '🎉', career: '💼', other: '📌' },
  EVENT_TYPE_COLORS: {
    cultural: { text: '#E65100', background: '#FFF3E0' },
    religious: { text: '#6A1B9A', background: '#F3E5F5' },
    social: { text: '#1B5E20', background: '#E8F5E9' },
    career: { text: '#0D47A1', background: '#E3F2FD' },
    other: { text: '#424242', background: '#F5F5F5' },
  },
  TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
  formatPublicName: (name: string) => name,
}));

import EventsPage from './index';

describe('EventsPage', () => {
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ replace: mockReplace });
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(React.createElement(EventsPage));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('renders events list after fetch', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => {
      expect(screen.getByText('Dashain Celebration')).toBeDefined();
      expect(screen.getByText('Career Networking Night')).toBeDefined();
    });
  });

  it('shows Create Event button for Level 1 user', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => {
      expect(screen.getByText('+ Create Event')).toBeDefined();
    });
  });

  it('does not show Create Event button for Level 0 user', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 0, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => expect(screen.queryByText('+ Create Event')).toBeNull());
  });

  it('filters events by type when chip clicked', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => screen.getByText('Dashain Celebration'));

    // Click Career filter chip
    fireEvent.click(screen.getAllByText('💼 Career')[0]);
    await waitFor(() => {
      expect(screen.queryByText('Dashain Celebration')).toBeNull();
      expect(screen.getByText('Career Networking Night')).toBeDefined();
    });
  });

  it('shows empty state when filter has no results', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => screen.getByText('Dashain Celebration'));

    fireEvent.click(screen.getAllByText('🎉 Social')[0]);
    await waitFor(() => {
      expect(screen.getByText('No Social events')).toBeDefined();
    });
  });

  it('shows error state on fetch failure', async () => {
    const { getEventsByMetro } = await import('@nusa/shared');
    (getEventsByMetro as any).mockResolvedValueOnce({ error: new Error('Network error') });
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeDefined();
    });
  });

  it('shows level0 banner for unverified user', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 0, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => {
      expect(screen.getByText('Verify your account to RSVP and create events.')).toBeDefined();
    });
  });
});
