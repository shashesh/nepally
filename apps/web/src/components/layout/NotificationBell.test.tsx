import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@nepally/shared';
import { NotificationBell } from './NotificationBell';

vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode; onClick?: () => void }>(
    function MockLink({ href, children, ...rest }, ref) {
      return React.createElement('a', { href, ref, ...rest }, children);
    }
  ),
}));

const item = {
  id: 'n-1',
  user_id: 'u',
  type: 'system',
  title: 'Event reminder',
  body: 'Teej is tomorrow',
  data: {},
  read: false,
  read_at: null,
  sent_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
} as Notification;

function renderBell(overrides: Partial<React.ComponentProps<typeof NotificationBell>> = {}) {
  const props = {
    unreadCount: 0,
    items: [] as Notification[],
    onOpen: vi.fn(),
    onMarkAllRead: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<NotificationBell {...props} />);
  return props;
}

describe('NotificationBell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names the trigger with the unread count and shows a badge', () => {
    renderBell({ unreadCount: 3 });
    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('caps the badge at 9+', () => {
    renderBell({ unreadCount: 12 });
    expect(screen.getByText('9+')).toBeDefined();
  });

  it('opens an empty dropdown with a link to all notifications', async () => {
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    await screen.findByText('No notifications yet');
    const link = await screen.findByText('See all notifications →');
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('/notifications');
  });

  it('offers mark all as read when something is unread', async () => {
    const props = renderBell({ unreadCount: 1, items: [item] });
    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));
    expect(props.onMarkAllRead).toHaveBeenCalled();
  });

  it('opens an item and closes the dropdown', async () => {
    const props = renderBell({ unreadCount: 1, items: [item] });
    fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
    fireEvent.click(await screen.findByRole('button', { name: /Event reminder/ }));
    expect(props.onOpen).toHaveBeenCalledWith(item);
    await waitFor(() => expect(screen.queryByText('Teej is tomorrow')).toBeNull());
  });

  it('is a plain link to /notifications on phones', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query.includes('max-width'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as MediaQueryList
    );
    renderBell({ unreadCount: 2 });
    const link = await screen.findByRole('link', { name: 'Notifications, 2 unread' });
    expect(link.getAttribute('href')).toBe('/notifications');
  });
});
