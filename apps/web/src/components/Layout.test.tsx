import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useRouter: vi.fn(),
  useUnreadMessageCount: vi.fn(),
  useNotificationsFeed: vi.fn(),
  signOut: vi.fn(),
  push: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('next/router', () => ({ useRouter: mocks.useRouter }));
vi.mock('../hooks/useUnreadMessageCount', () => ({ useUnreadMessageCount: mocks.useUnreadMessageCount }));
vi.mock('../hooks/useNotificationsFeed', () => ({ useNotificationsFeed: mocks.useNotificationsFeed }));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));
vi.mock('./LocationSwitcher', () => ({
  default: function MockLocationSwitcher() {
    return React.createElement('div', { 'data-testid': 'location-switcher' });
  },
}));

import Layout from './Layout';

const member = { id: 'user-1', full_name: 'Test User', email: 'test@example.com', trust_level: 1, profile_photo: null, is_moderator: false };

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useRouter.mockReturnValue({ pathname: '/feed', query: {}, push: mocks.push });
    mocks.useUnreadMessageCount.mockReturnValue(0);
    mocks.useNotificationsFeed.mockReturnValue({
      unreadCount: 0,
      items: [],
      markRead: vi.fn().mockResolvedValue(undefined),
      markAllRead: vi.fn(),
      remove: vi.fn(),
    });
  });

  it('shows only a loader while auth loads', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: true, signOut: mocks.signOut });
    render(<Layout>Content</Layout>);
    expect(screen.queryByText('Content')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('renders the public shell for visitors', () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false, signOut: mocks.signOut });
    render(<Layout>Page content</Layout>);
    expect(screen.getByRole('link', { name: 'Log In' }).getAttribute('href')).toBe('/login');
    expect(screen.getByRole('link', { name: 'Sign Up' }).getAttribute('href')).toBe('/signup');
    expect(screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')).toBe('/privacy');
    expect(screen.getByRole('main').textContent).toContain('Page content');
    expect(screen.queryByRole('navigation', { name: 'Primary' })).toBeNull();
  });

  describe('signed in', () => {
    beforeEach(() => {
      mocks.useAuth.mockReturnValue({ user: member, loading: false, signOut: mocks.signOut });
    });

    it('renders top bar, rail, tabs and children', () => {
      render(<Layout>Main content</Layout>);
      expect(screen.getByTestId('location-switcher')).toBeDefined();
      expect(screen.getByRole('navigation', { name: 'Primary' })).toBeDefined();
      expect(screen.getByRole('navigation', { name: 'Tabs' })).toBeDefined();
      expect(screen.getByRole('main').textContent).toContain('Main content');
      for (const landmark of screen.getAllByRole('navigation')) {
        expect(landmark.getAttribute('aria-label')).toBeTruthy();
      }
    });

    it('offers a skip link to the main content', () => {
      render(<Layout>Content</Layout>);
      expect(screen.getByRole('link', { name: 'Skip to content' }).getAttribute('href')).toBe('#main-content');
      expect(screen.getByRole('main').id).toBe('main-content');
    });

    it('hides the tab bar on task routes', () => {
      mocks.useRouter.mockReturnValue({ pathname: '/posts/create', query: {}, push: mocks.push });
      render(<Layout>Content</Layout>);
      expect(screen.queryByRole('navigation', { name: 'Tabs' })).toBeNull();
    });

    it('stops bell polling on the notifications page', () => {
      mocks.useRouter.mockReturnValue({ pathname: '/notifications', query: {}, push: mocks.push });
      render(<Layout>Content</Layout>);
      expect(mocks.useNotificationsFeed).toHaveBeenCalledWith({ userId: 'user-1', pollingEnabled: false });
    });

    it('marks a notification read and navigates to it', async () => {
      const notification = {
        id: 'n-1',
        user_id: 'user-1',
        type: 'message',
        title: 'New message',
        body: 'Hi',
        data: { conversation_id: 'conv-1' },
        read: false,
        read_at: null,
        sent_at: new Date().toISOString(),
      };
      const feed = {
        unreadCount: 1,
        items: [notification],
        markRead: vi.fn().mockResolvedValue(undefined),
        markAllRead: vi.fn(),
        remove: vi.fn(),
      };
      mocks.useNotificationsFeed.mockReturnValue(feed);
      render(<Layout>Content</Layout>);
      fireEvent.click(screen.getByRole('button', { name: 'Notifications, 1 unread' }));
      fireEvent.click(await screen.findByRole('button', { name: /New message/ }));
      await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/messages/conv-1'));
      expect(feed.markRead).toHaveBeenCalledWith(notification);
    });

    it('signs out and returns home', async () => {
      mocks.signOut.mockResolvedValue(undefined);
      render(<Layout>Content</Layout>);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Open account menu' }));
      });
      await act(async () => {
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Sign Out' }));
      });
      await waitFor(() => {
        expect(mocks.signOut).toHaveBeenCalled();
        expect(mocks.push).toHaveBeenCalledWith('/');
      });
    });
  });
});
