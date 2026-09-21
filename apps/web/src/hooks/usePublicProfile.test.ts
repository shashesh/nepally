import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getUserById: vi.fn(),
  getPostsByAuthorId: vi.fn(),
  getEventsByOrganizer: vi.fn(),
  getActiveListingsBySeller: vi.fn(),
  getHelperScore: vi.fn(),
  getMetroAreaById: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  getUserById: mocks.getUserById,
  getPostsByAuthorId: mocks.getPostsByAuthorId,
  getEventsByOrganizer: mocks.getEventsByOrganizer,
  getActiveListingsBySeller: mocks.getActiveListingsBySeller,
  getHelperScore: mocks.getHelperScore,
  getMetroAreaById: mocks.getMetroAreaById,
}));

import { usePublicProfile } from './usePublicProfile';

const mockProfileUser = {
  id: 'profile-user',
  full_name: 'Bikal Shrestha',
  trust_level: 1,
  metro_area_id: '19100',
  profile_photo: null,
  bio: null,
  created_at: '2024-01-15T00:00:00Z',
};

const mockPosts = [{ id: 'post-1', title: 'Roommate needed' }];
const mockEvents = [{ id: 'event-1', title: 'Nepali Networking Night' }];
const mockListings = [{ id: 'listing-1', title: 'IKEA desk, like new' }];

function helperScoreData(userId: string, helperScore: number) {
  return { userId, helperScore, helpfulComments: 0, likesReceivedOnOwnPosts: 0 };
}

describe('usePublicProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserById.mockResolvedValue({ data: mockProfileUser });
    mocks.getPostsByAuthorId.mockResolvedValue({ data: mockPosts });
    mocks.getEventsByOrganizer.mockResolvedValue({ data: mockEvents });
    mocks.getActiveListingsBySeller.mockResolvedValue({ data: mockListings });
    mocks.getHelperScore.mockResolvedValue({ data: helperScoreData('profile-user', 42) });
    mocks.getMetroAreaById.mockResolvedValue({
      data: { id: '19100', name: 'Dallas-Fort Worth', state: 'TX', population: 7000000 },
    });
  });

  it('starts with loading true and empty state', () => {
    mocks.getUserById.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    expect(result.current.loading).toBe(true);
    expect(result.current.profileUser).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('loads the profile, metro name, the three lists, and the helper score', async () => {
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profileUser).toEqual(mockProfileUser);
    expect(result.current.error).toBeNull();

    await waitFor(() => expect(result.current.metroName).toBe('Dallas-Fort Worth, TX'));
    await waitFor(() => expect(result.current.posts).toEqual(mockPosts));
    await waitFor(() => expect(result.current.events).toEqual(mockEvents));
    await waitFor(() => expect(result.current.listings).toEqual(mockListings));
    await waitFor(() => expect(result.current.helperScore).toBe(42));

    expect(result.current.postsLoading).toBe(false);
    expect(result.current.eventsLoading).toBe(false);
    expect(result.current.listingsLoading).toBe(false);

    expect(mocks.getUserById).toHaveBeenCalledWith(expect.anything(), 'profile-user');
    expect(mocks.getPostsByAuthorId).toHaveBeenCalledWith(expect.anything(), 'profile-user', 30);
    expect(mocks.getEventsByOrganizer).toHaveBeenCalledWith(expect.anything(), 'profile-user', 50);
    expect(mocks.getActiveListingsBySeller).toHaveBeenCalledWith(
      expect.anything(),
      'profile-user',
      30
    );
    expect(mocks.getHelperScore).toHaveBeenCalledWith(expect.anything(), 'profile-user');
    expect(mocks.getMetroAreaById).toHaveBeenCalledWith(expect.anything(), '19100');
  });

  it('sets the error message and stops loading when getUserById returns an error', async () => {
    mocks.getUserById.mockResolvedValue({ error: new Error('not found'), data: null });
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(
      'We couldn’t find this member. They may have deleted their account.'
    );
    expect(result.current.profileUser).toBeNull();
    expect(mocks.getMetroAreaById).not.toHaveBeenCalled();
  });

  it('sets the error message when data is null (no data treated as error)', async () => {
    mocks.getUserById.mockResolvedValue({ data: null });
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(
      'We couldn’t find this member. They may have deleted their account.'
    );
  });

  it('leaves metroName null and never calls getMetroAreaById when the member has no metro_area_id', async () => {
    mocks.getUserById.mockResolvedValue({
      data: { ...mockProfileUser, metro_area_id: null },
    });
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    // Give any (incorrect) metro lookup a chance to resolve before asserting.
    await waitFor(() => expect(result.current.posts).toEqual(mockPosts));
    expect(result.current.metroName).toBeNull();
    expect(mocks.getMetroAreaById).not.toHaveBeenCalled();
  });

  it('leaves metroName null without setting error when the metro lookup fails', async () => {
    mocks.getMetroAreaById.mockResolvedValue({ error: new Error('metro lookup failed') });
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    await waitFor(() => expect(mocks.getMetroAreaById).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.metroName).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('requests nothing when id is undefined', () => {
    renderHook(() => usePublicProfile(undefined));

    expect(mocks.getUserById).not.toHaveBeenCalled();
    expect(mocks.getPostsByAuthorId).not.toHaveBeenCalled();
    expect(mocks.getEventsByOrganizer).not.toHaveBeenCalled();
    expect(mocks.getActiveListingsBySeller).not.toHaveBeenCalled();
    expect(mocks.getHelperScore).not.toHaveBeenCalled();
    expect(mocks.getMetroAreaById).not.toHaveBeenCalled();
  });

  // ─── id changes: the Pages Router keeps this hook mounted across
  // /users/A -> /users/B, so the previous member's data must not survive ────

  it('drops a stale response for the previous member after id changes', async () => {
    const mockPostsB = [{ id: 'post-b-1', title: "B's post" }];
    let resolveAPosts: (value: { data: typeof mockPosts }) => void = () => {};
    mocks.getPostsByAuthorId.mockImplementation((_client: unknown, requestedId: string) => {
      if (requestedId === 'user-a') {
        return new Promise((resolve) => {
          resolveAPosts = resolve;
        });
      }
      return Promise.resolve({ data: mockPostsB });
    });

    const { result, rerender } = renderHook(({ id }: { id: string }) => usePublicProfile(id), {
      initialProps: { id: 'user-a' },
    });

    rerender({ id: 'user-b' });

    await waitFor(() => expect(result.current.posts).toEqual(mockPostsB));

    // A's request finally resolves after B's has already landed; it must be dropped.
    await act(async () => {
      resolveAPosts({ data: mockPosts });
    });

    expect(result.current.posts).toEqual(mockPostsB);
  });

  it('going from a member with a metro to one without clears metroName and shows the new helper score', async () => {
    const mockUserA = { ...mockProfileUser, id: 'user-a', metro_area_id: '19100' };
    const mockUserB = { ...mockProfileUser, id: 'user-b', metro_area_id: null };

    mocks.getUserById.mockImplementation((_client: unknown, requestedId: string) =>
      Promise.resolve({ data: requestedId === 'user-a' ? mockUserA : mockUserB })
    );
    mocks.getHelperScore.mockImplementation((_client: unknown, requestedId: string) =>
      Promise.resolve({ data: helperScoreData(requestedId, requestedId === 'user-a' ? 42 : 7) })
    );

    const { result, rerender } = renderHook(({ id }: { id: string }) => usePublicProfile(id), {
      initialProps: { id: 'user-a' },
    });

    await waitFor(() => expect(result.current.metroName).toBe('Dallas-Fort Worth, TX'));
    await waitFor(() => expect(result.current.helperScore).toBe(42));

    rerender({ id: 'user-b' });

    await waitFor(() => expect(result.current.profileUser?.id).toBe('user-b'));
    await waitFor(() => expect(result.current.helperScore).toBe(7));
    expect(result.current.metroName).toBeNull();
  });

  it('has empty posts and loading true on the first render after id changes', async () => {
    const { result, rerender } = renderHook(({ id }: { id: string }) => usePublicProfile(id), {
      initialProps: { id: 'user-a' },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.posts).toEqual(mockPosts);

    rerender({ id: 'user-b' });

    expect(result.current.posts).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('keeps the list loading flags true while their requests are pending', () => {
    mocks.getPostsByAuthorId.mockReturnValue(new Promise(() => {}));
    mocks.getEventsByOrganizer.mockReturnValue(new Promise(() => {}));
    mocks.getActiveListingsBySeller.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePublicProfile('profile-user'));

    expect(result.current.postsLoading).toBe(true);
    expect(result.current.eventsLoading).toBe(true);
    expect(result.current.listingsLoading).toBe(true);
  });

  it('falls back to an empty list on a failed list request and to 0 on a failed helper score', async () => {
    mocks.getPostsByAuthorId.mockResolvedValue({ error: new Error('boom') });
    mocks.getEventsByOrganizer.mockResolvedValue({ error: new Error('boom') });
    mocks.getActiveListingsBySeller.mockResolvedValue({ error: new Error('boom') });
    mocks.getHelperScore.mockResolvedValue({ error: new Error('boom') });

    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.postsLoading).toBe(false));
    expect(result.current.posts).toEqual([]);
    expect(result.current.events).toEqual([]);
    expect(result.current.listings).toEqual([]);
    await waitFor(() => expect(result.current.helperScore).toBe(0));
  });
});
