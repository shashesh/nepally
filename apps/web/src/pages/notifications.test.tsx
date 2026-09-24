import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '../test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Notification } from '@nepally/shared';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  useNotificationsPage: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({ useAuth: mocks.useAuth }));
vi.mock('../hooks/useNotificationsPage', () => ({ useNotificationsPage: mocks.useNotificationsPage }));
vi.mock('../components/ui/notify', () => ({ notify: { error: mocks.notifyError, success: mocks.notifySuccess } }));
vi.mock('next/router', () => ({ useRouter: () => ({ replace: mocks.replace, push: mocks.push }) }));
vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));
vi.mock('next/link', () => ({
  default: React.forwardRef<HTMLAnchorElement, { href: string; children: React.ReactNode }>(function MockLink(
    { href, children, ...rest },
    ref
  ) {
    return React.createElement('a', { href, ref, ...rest }, children);
  }),
}));

import NotificationsPage from './notifications.page';

const VIEWER = { id: 'user-1', full_name: 'Test User', metro_area_id: 'metro-1' };

function notification(id: string, overrides: Partial<Notification> = {}): Notification {
  return {
    id,
    user_id: 'user-1',
    type: 'post_response',
    title: `Title ${id}`,
    body: 'Body',
    data: { post_id: `post-${id}` },
    read: false,
    read_at: null,
    sent_at: new Date().toISOString(),
    ...overrides,
  };
}

function pageState(overrides: Record<string, unknown> = {}) {
  return {
    notifications: [notification('a'), notification('b', { read: true })],
    unreadCount: 3,
    loading: false,
    error: null,
    loadingMore: false,
    loadMoreError: null,
    hasMore: false,
    loadMore: vi.fn(),
    retryLoadMore: vi.fn(),
    reload: vi.fn(),
    markRead: vi.fn().mockResolvedValue(true),
    markAllRead: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: VIEWER, loading: false });
    mocks.useNotificationsPage.mockReturnValue(pageState());
  });

  it('sends a signed-out visitor to log in and renders nothing', async () => {
    mocks.useAuth.mockReturnValue({ user: null, loading: false });
    render(<NotificationsPage />);

    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/login'));
  });

  it('sends a member without a metro to onboarding', async () => {
    mocks.useAuth.mockReturnValue({ user: { ...VIEWER, metro_area_id: null }, loading: false });
    render(<NotificationsPage />);

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/onboarding/zip'));
  });

  it('heads the page Notifications, with the unread count beside the heading', () => {
    render(<NotificationsPage />);

    expect(mocks.useNotificationsPage).toHaveBeenCalledWith('user-1');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Notifications');
    expect(screen.getByText('3 unread')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Preferences' }).getAttribute('href')).toBe('/profile/notifications');
  });

  it('shows no count and no Mark all as read when everything is read', () => {
    mocks.useNotificationsPage.mockReturnValue(pageState({ unreadCount: 0 }));
    render(<NotificationsPage />);

    expect(screen.queryByText(/unread$/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).toBeNull();
  });

  it('shows loading, then the error with a retry', () => {
    mocks.useNotificationsPage.mockReturnValue(pageState({ loading: true, notifications: [] }));
    const { rerender } = render(<NotificationsPage />);
    expect(screen.getByText('Loading notifications…')).toBeDefined();

    const state = pageState({ error: "Couldn't load your notifications.", notifications: [], unreadCount: 0 });
    mocks.useNotificationsPage.mockReturnValue(state);
    rerender(<NotificationsPage />);
    expect(screen.getByText("Couldn't load your notifications.")).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.reload).toHaveBeenCalledTimes(1);
  });

  it('says so when there is nothing', () => {
    mocks.useNotificationsPage.mockReturnValue(pageState({ notifications: [], unreadCount: 0 }));
    render(<NotificationsPage />);

    expect(screen.getByRole('heading', { name: "You're all caught up" })).toBeDefined();
  });

  it('opens a notification at once and marks it read', () => {
    const state = pageState();
    mocks.useNotificationsPage.mockReturnValue(state);
    render(<NotificationsPage />);

    fireEvent.click(screen.getByRole('button', { name: /Title a/ }));

    expect(state.markRead).toHaveBeenCalledWith(state.notifications[0]);
    expect(mocks.push).toHaveBeenCalledWith('/posts/post-a');
  });

  it('says so when a delete fails', async () => {
    const state = pageState({ remove: vi.fn().mockResolvedValue(false) });
    mocks.useNotificationsPage.mockReturnValue(state);
    render(<NotificationsPage />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Delete notification' })[0]);
    });

    expect(mocks.notifyError).toHaveBeenCalledWith("Couldn't delete that notification. Please try again.");
  });

  it('has no Dismiss buttons, only Delete', () => {
    render(<NotificationsPage />);

    expect(screen.queryByRole('button', { name: 'Dismiss notification' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Delete notification' })).toHaveLength(2);
  });

  it('marks everything read, busy but focusable while it runs', async () => {
    let finish!: (ok: boolean) => void;
    const state = pageState({
      markAllRead: vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            finish = resolve;
          })
      ),
    });
    mocks.useNotificationsPage.mockReturnValue(state);
    render(<NotificationsPage />);

    const button = screen.getByRole('button', { name: 'Mark all as read' });
    fireEvent.click(button);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect((button as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button);
    expect(state.markAllRead).toHaveBeenCalledTimes(1);

    await act(async () => {
      finish(false);
    });
    expect(mocks.notifyError).toHaveBeenCalledWith("Couldn't mark your notifications as read. Please try again.");
    expect(button.getAttribute('aria-disabled')).toBeNull();
  });

  it('moves focus to Preferences once Mark all as read is gone', async () => {
    const state = pageState();
    mocks.useNotificationsPage.mockReturnValue(state);
    const { rerender } = render(<NotificationsPage />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    });
    mocks.useNotificationsPage.mockReturnValue(pageState({ unreadCount: 0 }));
    rerender(<NotificationsPage />);

    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Preferences' }));
  });

  it('shows a failed page with a retry', () => {
    const state = pageState({ loadMoreError: "Couldn't load more notifications." });
    mocks.useNotificationsPage.mockReturnValue(state);
    render(<NotificationsPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(state.retryLoadMore).toHaveBeenCalledTimes(1);
  });
});
