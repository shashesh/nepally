import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { FollowButton } from './FollowButton';

const mocks = vi.hoisted(() => ({
  isFollowing: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  notificationsShow: vi.fn(),
}));

vi.mock('@nepally/shared', () => ({
  isFollowing: mocks.isFollowing,
  followUser: mocks.followUser,
  unfollowUser: mocks.unfollowUser,
}));

vi.mock('@mantine/notifications', () => ({
  notifications: { show: mocks.notificationsShow },
}));

const supabase = {} as SupabaseClient;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function getButton() {
  return screen.getByTestId('follow-button') as HTMLButtonElement;
}

describe('FollowButton (web)', () => {
  beforeEach(() => {
    mocks.isFollowing.mockReset().mockResolvedValue({ data: false });
    mocks.followUser.mockReset().mockResolvedValue({});
    mocks.unfollowUser.mockReset().mockResolvedValue({});
    mocks.notificationsShow.mockReset();
  });

  it('renders nothing without a viewer', () => {
    render(<FollowButton supabase={supabase} viewerId={null} targetUserId="target" />);
    expect(screen.queryByTestId('follow-button')).toBeNull();
    expect(mocks.isFollowing).not.toHaveBeenCalled();
  });

  it("renders nothing on the viewer's own profile", () => {
    render(<FollowButton supabase={supabase} viewerId="me" targetUserId="me" />);
    expect(screen.queryByTestId('follow-button')).toBeNull();
    expect(mocks.isFollowing).not.toHaveBeenCalled();
  });

  it('shows the fetched follow status', async () => {
    mocks.isFollowing.mockResolvedValue({ data: true });
    render(<FollowButton supabase={supabase} viewerId="viewer" targetUserId="target" />);
    await waitFor(() => expect(getButton().textContent).toBe('Following'));
    expect(getButton().getAttribute('aria-pressed')).toBe('true');
    expect(mocks.isFollowing).toHaveBeenCalledWith(supabase, 'viewer', 'target');
  });

  it('names the loading state and leaves aria-pressed unset until it is known', async () => {
    const status = deferred<{ data: boolean }>();
    mocks.isFollowing.mockReturnValue(status.promise);
    render(<FollowButton supabase={supabase} viewerId="viewer" targetUserId="target" />);

    const button = getButton();
    expect(button.textContent).toBe('…');
    expect(button.getAttribute('aria-label')).toBe('Loading follow status');
    expect(button.getAttribute('aria-pressed')).toBeNull();

    status.resolve({ data: false });
    await waitFor(() => expect(button.textContent).toBe('Follow'));
    expect(button.getAttribute('aria-label')).toBeNull();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });

  it('hides the button when the follow status cannot be loaded', async () => {
    mocks.isFollowing.mockResolvedValue({ error: new Error('network') });
    render(<FollowButton supabase={supabase} viewerId="viewer" targetUserId="target" />);

    expect(getButton().disabled).toBe(true);
    await waitFor(() => expect(screen.queryByTestId('follow-button')).toBeNull());
    expect(mocks.followUser).not.toHaveBeenCalled();
  });

  it('follows the user and reports the change', async () => {
    const onChange = vi.fn();
    render(
      <FollowButton supabase={supabase} viewerId="viewer" targetUserId="target" onChange={onChange} />
    );
    await waitFor(() => expect(getButton().textContent).toBe('Follow'));

    fireEvent.click(getButton());

    // The label now flips optimistically before followUser() resolves, so it can settle
    // ahead of the request; wait for the request/onChange pair together instead.
    await waitFor(() => expect(getButton().textContent).toBe('Following'));
    await waitFor(() => {
      expect(mocks.followUser).toHaveBeenCalledWith(supabase, 'viewer', 'target');
      expect(onChange).toHaveBeenCalledWith(true);
    });
  });

  it('keeps focus and shows the optimistic label while a toggle is in flight', async () => {
    const toggleResult = deferred<{ error?: unknown }>();
    mocks.followUser.mockReturnValue(toggleResult.promise);
    render(<FollowButton supabase={supabase} viewerId="viewer" targetUserId="target" />);
    await waitFor(() => expect(getButton().textContent).toBe('Follow'));

    const button = getButton();
    button.focus();
    fireEvent.click(button);

    // Mid-toggle: optimistic label, marked disabled for assistive tech via aria-disabled,
    // but never natively `disabled` — that's the real guard here, since a real browser (unlike
    // jsdom, which doesn't implement the disabled-focused-element-loses-focus rule) would move
    // focus to <body> the instant a focused button gains the `disabled` attribute. The
    // activeElement check below documents intent but can't catch that regression by itself.
    expect(document.activeElement).toBe(button);
    expect(button.textContent).toBe('Following');
    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');

    toggleResult.resolve({});
    await waitFor(() => expect(button.getAttribute('aria-disabled')).toBeNull());
    expect(button.textContent).toBe('Following');
    expect(button.disabled).toBe(false);
  });

  it('ignores a stale toggle result after the target changes', async () => {
    // /users/[id] keeps FollowButton mounted while navigating between profiles, so a
    // toggle still in flight for the old target must not touch the new target's state.
    const toggleResult = deferred<{ error?: unknown }>();
    mocks.followUser.mockReturnValue(toggleResult.promise);
    const onChange = vi.fn();
    const { rerender } = render(
      <FollowButton supabase={supabase} viewerId="viewer" targetUserId="target-1" onChange={onChange} />
    );
    await waitFor(() => expect(getButton().textContent).toBe('Follow'));

    fireEvent.click(getButton());
    await waitFor(() => expect(getButton().textContent).toBe('Following'));

    // Navigate to a different profile while target-1's follow request is still pending.
    mocks.isFollowing.mockResolvedValue({ data: true });
    rerender(
      <FollowButton supabase={supabase} viewerId="viewer" targetUserId="target-2" onChange={onChange} />
    );
    await waitFor(() => expect(mocks.isFollowing).toHaveBeenLastCalledWith(supabase, 'viewer', 'target-2'));
    await waitFor(() => expect(getButton().textContent).toBe('Following'));

    // target-1's stale request now fails. If it were applied, it would revert `following`
    // to target-1's pre-click value (false) and paint over target-2's loaded state.
    await act(async () => {
      toggleResult.resolve({ error: 'network' });
      await toggleResult.promise;
    });

    expect(getButton().textContent).toBe('Following');
    expect(getButton().getAttribute('aria-disabled')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(mocks.notificationsShow).not.toHaveBeenCalled();
  });

  it('reverts the optimistic update when the request fails', async () => {
    mocks.isFollowing.mockResolvedValue({ data: true });
    mocks.unfollowUser.mockResolvedValue({ error: 'network' });
    const onChange = vi.fn();
    render(
      <FollowButton supabase={supabase} viewerId="viewer" targetUserId="target" onChange={onChange} />
    );
    await waitFor(() => expect(getButton().textContent).toBe('Following'));

    fireEvent.click(getButton());

    await waitFor(() => expect(mocks.unfollowUser).toHaveBeenCalledWith(supabase, 'viewer', 'target'));
    await waitFor(() => expect(getButton().textContent).toBe('Following'));
    // Reverting must release the button (aria-disabled clears); it was never natively
    // disabled mid-toggle, so checking `.disabled` here would always trivially pass.
    expect(getButton().getAttribute('aria-disabled')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(mocks.notificationsShow).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Couldn't update follow. Please try again." })
    );
  });

  it('stays loading after the viewer resolves until their follow status arrives', async () => {
    const status = deferred<{ data: boolean }>();
    mocks.isFollowing.mockReturnValue(status.promise);
    const { rerender } = render(
      <FollowButton supabase={supabase} viewerId={null} targetUserId="target" />
    );

    rerender(<FollowButton supabase={supabase} viewerId="viewer" targetUserId="target" />);

    // Disabled placeholder, not a clickable "Follow" guess
    expect(getButton().disabled).toBe(true);
    expect(getButton().textContent).toBe('…');

    status.resolve({ data: true });
    await waitFor(() => expect(getButton().textContent).toBe('Following'));
    expect(getButton().disabled).toBe(false);
  });

  it('shows loading again when the target user changes', async () => {
    const { rerender } = render(
      <FollowButton supabase={supabase} viewerId="viewer" targetUserId="target-1" />
    );
    await waitFor(() => expect(getButton().textContent).toBe('Follow'));

    const status = deferred<{ data: boolean }>();
    mocks.isFollowing.mockReturnValue(status.promise);
    rerender(<FollowButton supabase={supabase} viewerId="viewer" targetUserId="target-2" />);

    expect(getButton().disabled).toBe(true);
    expect(getButton().textContent).toBe('…');

    status.resolve({ data: true });
    await waitFor(() => expect(getButton().textContent).toBe('Following'));
    expect(mocks.isFollowing).toHaveBeenLastCalledWith(supabase, 'viewer', 'target-2');
  });
});
