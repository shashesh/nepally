import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { render, screen, fireEvent, waitFor } from '../../test-utils';
import { FollowButton } from './FollowButton';

const mocks = vi.hoisted(() => ({
  isFollowing: vi.fn(),
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
}));

vi.mock('@nepally/shared', () => ({
  isFollowing: mocks.isFollowing,
  followUser: mocks.followUser,
  unfollowUser: mocks.unfollowUser,
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

    await waitFor(() => expect(getButton().textContent).toBe('Following'));
    expect(mocks.followUser).toHaveBeenCalledWith(supabase, 'viewer', 'target');
    expect(onChange).toHaveBeenCalledWith(true);
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
    expect(getButton().disabled).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
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
