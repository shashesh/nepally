import React from 'react';
import { render, screen, waitFor, fireEvent } from '../../test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEventById, getUserEventResponse, rsvpToEvent } from '@nepally/shared';
import type { Event } from '@nepally/shared';

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

const FUTURE = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

const MOCK_EVENT: Event = {
  id: 'event-1', title: 'Dashain Celebration',
  description: 'Annual cultural celebration in Dallas.',
  event_type: 'cultural', start_date: FUTURE,
  location_name: 'Dallas Convention Center',
  location_address: '650 S Griffin St, Dallas, TX',
  metro_area_id: '19100', is_global: false,
  organizer_id: 'user-1', rsvp_count: 8, interested_count: 15,
  rsvp_visibility: 'public', status: 'active',
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  organizer: { id: 'user-1', full_name: 'Asha Kumar', trust_level: 1, profile_photo: null },
};

vi.mock('@nepally/shared', async () => {
  const actual = await vi.importActual<object>('@nepally/shared');
  return {
    ...actual,
    getEventById: vi.fn(async () => ({ data: MOCK_EVENT })),
    getEventAttendees: vi.fn(async () => ({ data: [] })),
    getUserEventResponse: vi.fn(async () => ({ data: null })),
    getOrCreateConversation: vi.fn(async () => ({ data: { conversationId: 'conv-1', isNew: true } })),
    rsvpToEvent: vi.fn(async () => ({})),
    unrsvpFromEvent: vi.fn(async () => ({})),
    cancelEvent: vi.fn(async () => ({})),
    deleteEvent: vi.fn(async () => ({})),
    formatPublicName: (name: string) => name,
    TrustLevel: { NEW: 0, VERIFIED: 1, CONTRIBUTOR: 2 },
    EVENT_TYPE_COLORS: {
      cultural: { text: '#E65100', background: '#FFF3E0' },
      religious: { text: '#6A1B9A', background: '#F3E5F5' },
      social: { text: '#1B5E20', background: '#E8F5E9' },
      career: { text: '#0D47A1', background: '#E3F2FD' },
      other: { text: '#424242', background: '#F5F5F5' },
    },
    EVENT_TYPE_LABELS: { cultural: 'Cultural', religious: 'Religious', social: 'Social', career: 'Career', other: 'Other' },
    EVENT_TYPE_ICONS: { cultural: '🎭', religious: '🕌', social: '🎉', career: '💼', other: '📌' },
  };
});

import EventDetailPage from './[id].page';

describe('EventDetailPage', () => {
  const mockReplace = vi.fn();
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ query: { id: 'event-1' }, replace: mockReplace, push: mockPush });
    mocks.useAuth.mockReturnValue({ user: { id: 'user-2', trust_level: 1 } });
  });

  it('renders event details after fetch', async () => {
    render(React.createElement(EventDetailPage));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dashain Celebration' })).toBeDefined();
      expect(screen.getByText('Annual cultural celebration in Dallas.')).toBeDefined();
    });
  });

  it('shows RSVP button for non-organizer Level 1 user', async () => {
    render(React.createElement(EventDetailPage));
    await waitFor(() => {
      expect(screen.getByText('RSVP')).toBeDefined();
    });
  });

  it('offers RSVP to an interested member, and RSVP marks them going', async () => {
    vi.mocked(getUserEventResponse).mockResolvedValueOnce({ data: 'interested' });
    render(React.createElement(EventDetailPage));
    await waitFor(() => expect(screen.getByText('RSVP')).toBeDefined());
    expect(screen.queryByText('Going ✓')).toBeNull();

    fireEvent.click(screen.getByText('RSVP'));
    await waitFor(() => expect(rsvpToEvent).toHaveBeenCalledWith({}, 'event-1', 'user-2'));
  });

  it('shows Going ✓ to a member who is going', async () => {
    vi.mocked(getUserEventResponse).mockResolvedValueOnce({ data: 'going' });
    render(React.createElement(EventDetailPage));
    await waitFor(() => expect(screen.getByText('Going ✓')).toBeDefined());
  });

  it('shows cancelled banner for cancelled event', async () => {
    vi.mocked(getEventById).mockResolvedValueOnce({
      data: { ...MOCK_EVENT, status: 'cancelled' },
    });
    render(React.createElement(EventDetailPage));
    await waitFor(() => {
      expect(screen.getByText('This event has been cancelled.')).toBeDefined();
    });
  });

  it('shows past banner for past event', async () => {
    vi.mocked(getEventById).mockResolvedValueOnce({
      data: { ...MOCK_EVENT, start_date: PAST },
    });
    render(React.createElement(EventDetailPage));
    await waitFor(() => {
      expect(screen.getByText('This event has passed.')).toBeDefined();
    });
  });

  it('shows error state on fetch failure', async () => {
    vi.mocked(getEventById).mockResolvedValueOnce({ error: new Error('Not found') });
    render(React.createElement(EventDetailPage));
    await waitFor(() => {
      expect(screen.getByText('Not found')).toBeDefined();
    });
  });

  it('redirects to /login when not logged in', async () => {
    mocks.useAuth.mockReturnValue({ user: null });
    render(React.createElement(EventDetailPage));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('toggles RSVP on button click and re-syncs from server', async () => {
    const { getEventById, getUserEventResponse, rsvpToEvent } = await import('@nepally/shared');
    render(React.createElement(EventDetailPage));
    await waitFor(() => screen.getByText('RSVP'));
    fireEvent.click(screen.getByText('RSVP'));
    await waitFor(() => {
      expect(rsvpToEvent).toHaveBeenCalledWith({}, 'event-1', 'user-2');
      expect(getEventById).toHaveBeenCalledTimes(2);
      expect(getUserEventResponse).toHaveBeenCalledTimes(2);
    });
  });

  it('creates a conversation and navigates when Message Organizer is clicked', async () => {
    const { getOrCreateConversation } = await import('@nepally/shared');
    render(React.createElement(EventDetailPage));

    await waitFor(() => {
      expect(screen.getByText('Message Organizer')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Message Organizer'));

    await waitFor(() => {
      expect(getOrCreateConversation).toHaveBeenCalledWith(
        {},
        'user-2',
        undefined,
        'user-1',
        'Asha Kumar'
      );
      expect(mockPush).toHaveBeenCalledWith('/messages/conv-1');
    });
  });
});
