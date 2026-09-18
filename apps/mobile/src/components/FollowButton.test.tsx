import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FollowButton } from './FollowButton';

const mockIsFollowing = jest.fn();
const mockFollowUser = jest.fn();
const mockUnfollowUser = jest.fn();

jest.mock('@nepally/shared', () => ({
  isFollowing: (...args: unknown[]) => mockIsFollowing(...args),
  followUser: (...args: unknown[]) => mockFollowUser(...args),
  unfollowUser: (...args: unknown[]) => mockUnfollowUser(...args),
}));

const supabase = {} as SupabaseClient;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('FollowButton', () => {
  beforeEach(() => {
    mockIsFollowing.mockReset().mockResolvedValue({ data: false });
    mockFollowUser.mockReset().mockResolvedValue({});
    mockUnfollowUser.mockReset().mockResolvedValue({});
  });

  it('renders nothing without a viewer', () => {
    const screen = render(
      <FollowButton supabase={supabase} viewerId={null} targetUserId="target" />
    );
    expect(screen.queryByTestId('follow-button')).toBeNull();
    expect(mockIsFollowing).not.toHaveBeenCalled();
  });

  it("renders nothing on the viewer's own profile", () => {
    const screen = render(<FollowButton supabase={supabase} viewerId="me" targetUserId="me" />);
    expect(screen.queryByTestId('follow-button')).toBeNull();
    expect(mockIsFollowing).not.toHaveBeenCalled();
  });

  it('shows the fetched follow status', async () => {
    mockIsFollowing.mockResolvedValue({ data: true });
    const screen = render(
      <FollowButton supabase={supabase} viewerId="viewer" targetUserId="target" />
    );
    await waitFor(() => {
      expect(screen.getByText('Following')).toBeTruthy();
    });
    expect(mockIsFollowing).toHaveBeenCalledWith(supabase, 'viewer', 'target');
  });

  it('follows the user and reports the change', async () => {
    const onChange = jest.fn();
    const screen = render(
      <FollowButton supabase={supabase} viewerId="viewer" targetUserId="target" onChange={onChange} />
    );
    await waitFor(() => {
      expect(screen.getByText('Follow')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('follow-button'));

    await waitFor(() => {
      expect(screen.getByText('Following')).toBeTruthy();
    });
    expect(mockFollowUser).toHaveBeenCalledWith(supabase, 'viewer', 'target');
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reverts the optimistic update when the request fails', async () => {
    mockIsFollowing.mockResolvedValue({ data: true });
    mockUnfollowUser.mockResolvedValue({ error: 'network' });
    const onChange = jest.fn();
    const screen = render(
      <FollowButton supabase={supabase} viewerId="viewer" targetUserId="target" onChange={onChange} />
    );
    await waitFor(() => {
      expect(screen.getByText('Following')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('follow-button'));

    await waitFor(() => {
      expect(mockUnfollowUser).toHaveBeenCalledWith(supabase, 'viewer', 'target');
    });
    await waitFor(() => {
      expect(screen.getByText('Following')).toBeTruthy();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('stays loading after the viewer resolves until their follow status arrives', async () => {
    const status = deferred<{ data: boolean }>();
    mockIsFollowing.mockReturnValue(status.promise);
    const screen = render(
      <FollowButton supabase={supabase} viewerId={null} targetUserId="target" />
    );

    screen.rerender(<FollowButton supabase={supabase} viewerId="viewer" targetUserId="target" />);

    // Spinner, not a clickable "Follow" guess
    expect(screen.getByTestId('follow-button')).toBeTruthy();
    expect(screen.queryByText('Follow')).toBeNull();
    fireEvent.press(screen.getByTestId('follow-button'));
    expect(mockFollowUser).not.toHaveBeenCalled();

    status.resolve({ data: true });
    await waitFor(() => {
      expect(screen.getByText('Following')).toBeTruthy();
    });
  });

  it('shows loading again when the target user changes', async () => {
    const screen = render(
      <FollowButton supabase={supabase} viewerId="viewer" targetUserId="target-1" />
    );
    await waitFor(() => {
      expect(screen.getByText('Follow')).toBeTruthy();
    });

    const status = deferred<{ data: boolean }>();
    mockIsFollowing.mockReturnValue(status.promise);
    screen.rerender(<FollowButton supabase={supabase} viewerId="viewer" targetUserId="target-2" />);

    expect(screen.queryByText('Follow')).toBeNull();
    expect(screen.queryByText('Following')).toBeNull();

    status.resolve({ data: true });
    await waitFor(() => {
      expect(screen.getByText('Following')).toBeTruthy();
    });
    expect(mockIsFollowing).toHaveBeenLastCalledWith(supabase, 'viewer', 'target-2');
  });
});
