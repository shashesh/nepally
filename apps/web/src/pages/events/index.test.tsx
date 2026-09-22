import React from 'react';
import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEventsByMetro } from '@nepally/shared';

type MockHeadProps = { children?: React.ReactNode };
type MockLinkProps = { href: string; children?: React.ReactNode; className?: string };

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('next/head', () => ({
  default: ({ children }: MockHeadProps) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: MockLinkProps) =>
    React.createElement('a', { href, className }, children),
}));
vi.mock('../../lib/supabase', () => ({ supabase: {} }));

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const mockEvents = [
  {
    id: 'e1', title: 'Dashain Celebration', description: 'Cultural event',
    event_type: 'cultural', start_date: FUTURE, location_name: 'Dallas Convention Center',
    metro_area_id: '19100', is_global: false, organizer_id: 'u1',
    rsvp_count: 5, interested_count: 10, rsvp_visibility: 'public', status: 'active',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    organizer: { id: 'u1', full_name: 'Asha Kumar', trust_level: 1, profile_photo: null },
  },
  {
    id: 'e2', title: 'Career Networking Night', description: 'Career event',
    event_type: 'career', start_date: FUTURE, location_name: 'Tech Hub',
    metro_area_id: '19100', is_global: false, organizer_id: 'u2',
    rsvp_count: 12, interested_count: 30, rsvp_visibility: 'public', status: 'active',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    organizer: { id: 'u2', full_name: 'Rohan Shrestha', trust_level: 1, profile_photo: null },
  },
];

vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getEventsByMetro: vi.fn(async () => ({ data: mockEvents })),
    getUserEventResponses: vi.fn(async () => ({ data: {} })),
    setEventResponse: vi.fn(async () => ({})),
    removeEventResponse: vi.fn(async () => ({})),
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
  };
});

import EventsPage from './index.page';

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

    fireEvent.click(screen.getByRole('button', { name: 'Career' }));
    await waitFor(() => {
      expect(screen.queryByText('Dashain Celebration')).toBeNull();
      expect(screen.getByText('Career Networking Night')).toBeDefined();
    });
  });

  it('shows empty state when filter has no results', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => screen.getByText('Dashain Celebration'));

    fireEvent.click(screen.getByRole('button', { name: 'Social' }));
    await waitFor(() => {
      expect(screen.getByText('No Social events')).toBeDefined();
    });
  });

  it('renders the search input', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => screen.getByText('Dashain Celebration'));
    expect(screen.getByRole('searchbox', { name: 'Search events' })).toBeDefined();
  });

  it('filters events by search query', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => screen.getByText('Dashain Celebration'));

    const input = screen.getByRole('searchbox', { name: 'Search events' });
    fireEvent.change(input, { target: { value: 'Dashain' } });

    await waitFor(() => {
      expect(screen.queryByText('Career Networking Night')).toBeNull();
      expect(screen.getByText('Dashain Celebration')).toBeDefined();
    });
  });

  it('shows query-specific empty state when search matches nothing', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => screen.getByText('Dashain Celebration'));

    const input = screen.getByRole('searchbox', { name: 'Search events' });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: 'zzznomatch' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText('No events matching "zzznomatch"')).toBeDefined();
    });
  });

  it('shows error state on fetch failure', async () => {
    vi.mocked(getEventsByMetro).mockResolvedValueOnce({ error: new Error('Network error') });
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeDefined();
    });
  });

  it('refetches when Retry is clicked after a failure', async () => {
    vi.mocked(getEventsByMetro).mockResolvedValueOnce({ error: new Error('Network error') });
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => screen.getByText('Network error'));

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByText('Dashain Celebration')).toBeDefined();
    });
    expect(screen.queryByText('Network error')).toBeNull();
    expect(getEventsByMetro).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state without fetching when the user has no metro', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 1, metro_area_id: '' } });
    render(React.createElement(EventsPage));
    await waitFor(() => {
      expect(screen.getByText('No upcoming events')).toBeDefined();
    });
    expect(getEventsByMetro).not.toHaveBeenCalled();
  });

  it('shows level0 banner for unverified user', async () => {
    mocks.useAuth.mockReturnValue({ user: { id: 'u1', trust_level: 0, metro_area_id: '19100' } });
    render(React.createElement(EventsPage));
    await waitFor(() => {
      expect(screen.getByText('Verify your account to RSVP and create events.')).toBeDefined();
    });
  });
});
