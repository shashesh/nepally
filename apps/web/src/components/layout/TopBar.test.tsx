import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@nepally/shared';
import type { NotificationsFeed } from '../../hooks/useNotificationsFeed';
import { TopBar } from './TopBar';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(
    function MockLink({ href, children, ...rest }, ref) {
      return React.createElement('a', { href, ref, ...rest }, children);
    }
  ),
}));
vi.mock('../LocationSwitcher', () => ({
  default: function MockLocationSwitcher() {
    return React.createElement('div', { 'data-testid': 'location-switcher' });
  },
}));

const user = { id: 'u1', full_name: 'Test User', email: 'test@example.com', trust_level: 1, profile_photo: null } as unknown as User;

const feed: NotificationsFeed = {
  unreadCount: 0,
  items: [],
  markRead: vi.fn(),
  markAllRead: vi.fn(),
  remove: vi.fn(),
};

function renderTopBar(overrides: Partial<React.ComponentProps<typeof TopBar>> = {}) {
  const props = {
    user,
    unreadMessages: 0,
    notifications: feed,
    onOpenNotification: vi.fn(),
    onSignOut: vi.fn(),
    ...overrides,
  };
  render(<TopBar {...props} />);
  return props;
}

describe('TopBar', () => {
  it('links the brand home and shows the location switcher', () => {
    renderTopBar();
    expect(screen.getByRole('link', { name: 'Nepally' }).getAttribute('href')).toBe('/');
    expect(screen.getByTestId('location-switcher')).toBeDefined();
  });

  it('names the Messages link with the unread count', () => {
    renderTopBar({ unreadMessages: 5 });
    expect(screen.getByRole('link', { name: 'Messages, 5 unread' }).getAttribute('href')).toBe('/messages');
    expect(screen.getByText('5')).toBeDefined();
  });

  it('caps the messages badge at 99+', () => {
    renderTopBar({ unreadMessages: 100 });
    expect(screen.getByText('99+')).toBeDefined();
  });

  it('renders the search slot', () => {
    renderTopBar({ search: <input aria-label="Search Nepally" /> });
    expect(screen.getByRole('textbox', { name: 'Search Nepally' })).toBeDefined();
  });

  it('signs out from the account menu', async () => {
    const props = renderTopBar();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
    });
    expect(await screen.findByRole('menuitem', { name: 'View Profile' })).toBeDefined();
    expect(screen.getByRole('menuitem', { name: 'Manage Locations' })).toBeDefined();
    await act(async () => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Sign Out' }));
    });
    await waitFor(() => expect(props.onSignOut).toHaveBeenCalled());
  });
});
