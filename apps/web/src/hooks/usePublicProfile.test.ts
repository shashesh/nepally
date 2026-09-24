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

const LIST_KEYS = ['posts', 'events', 'listings'] as const;

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

  it('starts loading, with no member', () => {
    mocks.getUserById.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    expect(result.current.status).toBe('loading');
    expect(result.current.profileUser).toBeNull();
  });

  it('loads the profile, metro name, the three lists, and the helper score', async () => {
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.profileUser).toEqual(mockProfileUser);

    await waitFor(() => expect(result.current.metroName).toBe('Dallas-Fort Worth, TX'));
    await waitFor(() => expect(result.current.posts.items).toEqual(mockPosts));
    await waitFor(() => expect(result.current.events.items).toEqual(mockEvents));
    await waitFor(() => expect(result.current.listings.items).toEqual(mockListings));
    await waitFor(() => expect(result.current.helperScore).toBe(42));

    for (const key of LIST_KEYS) {
      expect(result.current[key].loading).toBe(false);
      expect(result.current[key].error).toBeNull();
    }

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

  // ─── The member lookup: not-found vs a failure ─────────────────────────────

  it('is not-found when the lookup returns no row', async () => {
    mocks.getUserById.mockResolvedValue({ data: null });
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.status).toBe('not-found'));
    expect(result.current.profileUser).toBeNull();
    expect(mocks.getMetroAreaById).not.toHaveBeenCalled();
  });

  it.each(['PGRST116', '22P02'])('is not-found when the lookup fails with code %s', async (code) => {
    mocks.getUserById.mockResolvedValue({ error: Object.assign(new Error('no row'), { code }) });
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.status).toBe('not-found'));
    expect(result.current.profileUser).toBeNull();
  });

  it('is error, not not-found, when the lookup fails for any other reason', async () => {
    mocks.getUserById.mockResolvedValue({ error: new Error('Failed to fetch') });
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.profileUser).toBeNull();
    expect(mocks.getMetroAreaById).not.toHaveBeenCalled();
  });

  it('retries the member lookup on reload after an error', async () => {
    mocks.getUserById.mockResolvedValueOnce({ error: new Error('Failed to fetch') });
    const { result } = renderHook(() => usePublicProfile('profile-user'));
    await waitFor(() => expect(result.current.status).toBe('error'));

    act(() => result.current.reload());

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.profileUser).toEqual(mockProfileUser);
    expect(mocks.getUserById).toHaveBeenCalledTimes(2);
  });

  it('leaves metroName null and never calls getMetroAreaById when the member has no metro_area_id', async () => {
    mocks.getUserById.mockResolvedValue({
      data: { ...mockProfileUser, metro_area_id: null },
    });
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    // Give any (incorrect) metro lookup a chance to resolve before asserting.
    await waitFor(() => expect(result.current.posts.items).toEqual(mockPosts));
    expect(result.current.metroName).toBeNull();
    expect(mocks.getMetroAreaById).not.toHaveBeenCalled();
  });

  it('leaves metroName null and stays ready when the metro lookup fails', async () => {
    mocks.getMetroAreaById.mockResolvedValue({ error: new Error('metro lookup failed') });
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() => expect(mocks.getMetroAreaById).toHaveBeenCalled());
    await act(async () => {});
    expect(result.current.metroName).toBeNull();
    expect(result.current.status).toBe('ready');
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

    await waitFor(() => expect(result.current.posts.items).toEqual(mockPostsB));

    // A's request finally resolves after B's has already landed; it must be dropped.
    await act(async () => {
      resolveAPosts({ data: mockPosts });
    });

    expect(result.current.posts.items).toEqual(mockPostsB);
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

  it('clears a not-found status when the next member loads', async () => {
    mocks.getUserById.mockImplementation((_client: unknown, requestedId: string) =>
      Promise.resolve(requestedId === 'user-a' ? { data: null } : { data: { ...mockProfileUser, id: 'user-b' } })
    );

    const { result, rerender } = renderHook(({ id }: { id: string }) => usePublicProfile(id), {
      initialProps: { id: 'user-a' },
    });

    await waitFor(() => expect(result.current.status).toBe('not-found'));

    rerender({ id: 'user-b' });

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.profileUser?.id).toBe('user-b'));
    expect(result.current.status).toBe('ready');
  });

  it('has empty lists and is loading on the first render after id changes', async () => {
    const { result, rerender } = renderHook(({ id }: { id: string }) => usePublicProfile(id), {
      initialProps: { id: 'user-a' },
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() => expect(result.current.posts.items).toEqual(mockPosts));

    rerender({ id: 'user-b' });

    expect(result.current.profileUser).toBeNull();
    expect(result.current.helperScore).toBeNull();
    expect(result.current.status).toBe('loading');
    for (const key of LIST_KEYS) {
      expect(result.current[key].items).toEqual([]);
      expect(result.current[key].loading).toBe(true);
    }
  });

  it('keeps the lists loading while their requests are pending', () => {
    mocks.getPostsByAuthorId.mockReturnValue(new Promise(() => {}));
    mocks.getEventsByOrganizer.mockReturnValue(new Promise(() => {}));
    mocks.getActiveListingsBySeller.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePublicProfile('profile-user'));

    for (const key of LIST_KEYS) {
      expect(result.current[key].loading).toBe(true);
    }
  });

  // ─── A failed list is an error, not an empty list ──────────────────────────

  it.each([
    ['posts', () => mocks.getPostsByAuthorId],
    ['events', () => mocks.getEventsByOrganizer],
    ['listings', () => mocks.getActiveListingsBySeller],
  ] as const)('gives a failed %s request its own error, and reload refetches it', async (key, fetcher) => {
    fetcher().mockResolvedValueOnce({ error: new Error('boom') });
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current[key].error).not.toBeNull());
    expect(result.current[key].loading).toBe(false);
    expect(result.current[key].items).toEqual([]);
    for (const other of LIST_KEYS.filter((name) => name !== key)) {
      await waitFor(() => expect(result.current[other].items).toHaveLength(1));
      expect(result.current[other].error).toBeNull();
    }

    act(() => result.current[key].reload());

    await waitFor(() => expect(result.current[key].items).toHaveLength(1));
    expect(result.current[key].error).toBeNull();
    expect(fetcher()).toHaveBeenCalledTimes(2);
  });

  it('falls back to 0 on a failed helper score', async () => {
    mocks.getHelperScore.mockResolvedValue({ error: new Error('boom') });
    const { result } = renderHook(() => usePublicProfile('profile-user'));

    await waitFor(() => expect(result.current.helperScore).toBe(0));
  });
});
