import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPostsByAuthorId: vi.fn(),
  getSavedPostsByUserId: vi.fn(),
  getListingsByOwner: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  getPostsByAuthorId: mocks.getPostsByAuthorId,
  getSavedPostsByUserId: mocks.getSavedPostsByUserId,
  getListingsByOwner: mocks.getListingsByOwner,
}));

import { useOwnProfileContent } from './useOwnProfileContent';

const mockPosts = [{ id: 'post-1', title: 'Roommate needed' }];
const mockSaved = [{ id: 'saved-1', title: 'Saved post' }];
const mockListings = [{ id: 'listing-1', title: 'IKEA desk, like new' }];

describe('useOwnProfileContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPostsByAuthorId.mockResolvedValue({ data: mockPosts });
    mocks.getSavedPostsByUserId.mockResolvedValue({ data: mockSaved });
    mocks.getListingsByOwner.mockResolvedValue({ data: mockListings });
  });

  it('starts each list loading with empty items when there is a user', () => {
    mocks.getPostsByAuthorId.mockReturnValue(new Promise(() => {}));
    mocks.getSavedPostsByUserId.mockReturnValue(new Promise(() => {}));
    mocks.getListingsByOwner.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useOwnProfileContent('user-1'));

    expect(result.current.posts).toEqual({ items: [], loading: true, error: null });
    expect(result.current.saved).toEqual({ items: [], loading: true, error: null });
    expect(result.current.listings).toEqual({ items: [], loading: true, error: null });
  });

  it('requests nothing and reports nothing loading when userId is null', () => {
    const { result } = renderHook(() => useOwnProfileContent(null));

    expect(mocks.getPostsByAuthorId).not.toHaveBeenCalled();
    expect(mocks.getSavedPostsByUserId).not.toHaveBeenCalled();
    expect(mocks.getListingsByOwner).not.toHaveBeenCalled();
    expect(result.current.posts).toEqual({ items: [], loading: false, error: null });
    expect(result.current.saved).toEqual({ items: [], loading: false, error: null });
    expect(result.current.listings).toEqual({ items: [], loading: false, error: null });
  });

  it('loads posts, saved posts, and listings for the user', async () => {
    const { result } = renderHook(() => useOwnProfileContent('user-1'));

    await waitFor(() => expect(result.current.posts.loading).toBe(false));
    await waitFor(() => expect(result.current.saved.loading).toBe(false));
    await waitFor(() => expect(result.current.listings.loading).toBe(false));

    expect(result.current.posts.items).toEqual(mockPosts);
    expect(result.current.saved.items).toEqual(mockSaved);
    expect(result.current.listings.items).toEqual(mockListings);
    expect(result.current.posts.error).toBeNull();
    expect(result.current.saved.error).toBeNull();
    expect(result.current.listings.error).toBeNull();
  });

  it('requests posts with includeOwnPending true so a pending Emergency post shows', async () => {
    renderHook(() => useOwnProfileContent('user-1'));

    await waitFor(() =>
      expect(mocks.getPostsByAuthorId).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        30,
        undefined,
        true
      )
    );
  });

  it('requests saved posts and listings for the user with a limit of 30', async () => {
    renderHook(() => useOwnProfileContent('user-1'));

    await waitFor(() =>
      expect(mocks.getSavedPostsByUserId).toHaveBeenCalledWith(expect.anything(), 'user-1', 30)
    );
    expect(mocks.getListingsByOwner).toHaveBeenCalledWith(expect.anything(), 'user-1', 30);
  });

  it('reports a posts error and clears items', async () => {
    mocks.getPostsByAuthorId.mockResolvedValue({ error: new Error('boom') });
    const { result } = renderHook(() => useOwnProfileContent('user-1'));

    await waitFor(() => expect(result.current.posts.error).toBe('boom'));
    expect(result.current.posts.items).toEqual([]);
    expect(result.current.posts.loading).toBe(false);
  });

  it('falls back to a default message when the posts error has no message', async () => {
    mocks.getPostsByAuthorId.mockResolvedValue({ error: new Error('') });
    const { result } = renderHook(() => useOwnProfileContent('user-1'));

    await waitFor(() => expect(result.current.posts.error).toBe('Failed to load your posts'));
  });

  it('reports a saved posts error and clears items', async () => {
    mocks.getSavedPostsByUserId.mockResolvedValue({ error: new Error('boom') });
    const { result } = renderHook(() => useOwnProfileContent('user-1'));

    await waitFor(() => expect(result.current.saved.error).toBe('boom'));
    expect(result.current.saved.items).toEqual([]);
    expect(result.current.saved.loading).toBe(false);
  });

  it('falls back to a default message when the saved posts error has no message', async () => {
    mocks.getSavedPostsByUserId.mockResolvedValue({ error: new Error('') });
    const { result } = renderHook(() => useOwnProfileContent('user-1'));

    await waitFor(() => expect(result.current.saved.error).toBe('Failed to load saved posts'));
  });

  it('reports a listings error instead of falling through to an empty list', async () => {
    mocks.getListingsByOwner.mockResolvedValue({ error: new Error('listings boom') });
    const { result } = renderHook(() => useOwnProfileContent('user-1'));

    await waitFor(() => expect(result.current.listings.error).toBe('listings boom'));
    expect(result.current.listings.items).toEqual([]);
    expect(result.current.listings.loading).toBe(false);
  });

  it('falls back to a default message when the listings error has no message', async () => {
    mocks.getListingsByOwner.mockResolvedValue({ error: new Error('') });
    const { result } = renderHook(() => useOwnProfileContent('user-1'));

    await waitFor(() => expect(result.current.listings.error).toBe('Failed to load your listings'));
  });

  it('dropSaved removes exactly one post from the saved list', async () => {
    const threeSaved = [
      { id: 'saved-1', title: 'One' },
      { id: 'saved-2', title: 'Two' },
      { id: 'saved-3', title: 'Three' },
    ];
    mocks.getSavedPostsByUserId.mockResolvedValue({ data: threeSaved });
    const { result } = renderHook(() => useOwnProfileContent('user-1'));

    await waitFor(() => expect(result.current.saved.items).toEqual(threeSaved));

    act(() => {
      result.current.dropSaved('saved-2');
    });

    expect(result.current.saved.items).toEqual([
      { id: 'saved-1', title: 'One' },
      { id: 'saved-3', title: 'Three' },
    ]);
  });

  // ─── userId changes / unmount: a caller that keeps this hook mounted
  // across users must not let a stale response paint under the new one ────

  it('drops a stale posts response for the previous user after userId changes', async () => {
    const postsB = [{ id: 'post-b-1', title: "B's post" }];
    let resolveAPosts: (value: { data: typeof mockPosts }) => void = () => {};
    mocks.getPostsByAuthorId.mockImplementation((_client: unknown, requestedId: string) => {
      if (requestedId === 'user-a') {
        return new Promise((resolve) => {
          resolveAPosts = resolve;
        });
      }
      return Promise.resolve({ data: postsB });
    });

    const { result, rerender } = renderHook(({ id }: { id: string }) => useOwnProfileContent(id), {
      initialProps: { id: 'user-a' },
    });

    rerender({ id: 'user-b' });

    await waitFor(() => expect(result.current.posts.items).toEqual(postsB));

    // A's request finally resolves after B's has already landed; it must be dropped.
    await act(async () => {
      resolveAPosts({ data: mockPosts });
    });

    expect(result.current.posts.items).toEqual(postsB);
  });

  it('drops a stale response after unmount without throwing', async () => {
    let resolvePosts: (value: { data: typeof mockPosts }) => void = () => {};
    mocks.getPostsByAuthorId.mockReturnValue(
      new Promise((resolve) => {
        resolvePosts = resolve;
      })
    );

    const { unmount } = renderHook(() => useOwnProfileContent('user-1'));
    unmount();

    await act(async () => {
      resolvePosts({ data: mockPosts });
    });
  });

  it('resets every list to loading with empty items when userId changes', async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useOwnProfileContent(id),
      { initialProps: { id: 'user-a' as string | null } }
    );

    await waitFor(() => expect(result.current.posts.loading).toBe(false));
    expect(result.current.posts.items).toEqual(mockPosts);

    rerender({ id: 'user-b' });

    expect(result.current.posts).toEqual({ items: [], loading: true, error: null });
    expect(result.current.saved).toEqual({ items: [], loading: true, error: null });
    expect(result.current.listings).toEqual({ items: [], loading: true, error: null });
  });
});
