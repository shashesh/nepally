import { renderHook, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPostsByAuthorId: vi.fn(),
  getSavedPostsByUserId: vi.fn(),
  getListingsByOwner: vi.fn(),
  unsavePost: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('@nepally/shared', async () => ({
  ...(await vi.importActual<object>('@nepally/shared')),
  getPostsByAuthorId: mocks.getPostsByAuthorId,
  getSavedPostsByUserId: mocks.getSavedPostsByUserId,
  getListingsByOwner: mocks.getListingsByOwner,
  unsavePost: mocks.unsavePost,
}));

import { useOwnProfileContent } from './useOwnProfileContent';

const mockPosts = [{ id: 'post-1', title: 'Roommate needed' }];
const mockSaved = [
  { id: 'saved-1', title: 'One' },
  { id: 'saved-2', title: 'Two' },
  { id: 'saved-3', title: 'Three' },
];
const savedWithoutTwo = [
  { id: 'saved-1', title: 'One' },
  { id: 'saved-3', title: 'Three' },
];
const mockListings = [{ id: 'listing-1', title: 'IKEA desk, like new' }];

describe('useOwnProfileContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPostsByAuthorId.mockResolvedValue({ data: mockPosts });
    mocks.getSavedPostsByUserId.mockResolvedValue({ data: mockSaved });
    mocks.getListingsByOwner.mockResolvedValue({ data: mockListings });
    mocks.unsavePost.mockResolvedValue({});
  });

  // ─── wiring: the right fetcher/limit per list ──────────────────────────

  it('loads posts, saved posts, and listings for the user', async () => {
    const { result } = renderHook(() => useOwnProfileContent('user-1'));

    await waitFor(() => expect(result.current.posts.loading).toBe(false));
    await waitFor(() => expect(result.current.saved.loading).toBe(false));
    await waitFor(() => expect(result.current.listings.loading).toBe(false));

    expect(result.current.posts.items).toEqual(mockPosts);
    expect(result.current.saved.items).toEqual(mockSaved);
    expect(result.current.listings.items).toEqual(mockListings);
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

  // ─── unsave: hide at once, delete, roll back on failure ────────────────

  it('unsave hides the post immediately, before the delete resolves', async () => {
    let resolveUnsave: (value: { error?: Error }) => void = () => {};
    mocks.unsavePost.mockReturnValue(
      new Promise((resolve) => {
        resolveUnsave = resolve;
      })
    );
    const { result } = renderHook(() => useOwnProfileContent('user-1'));
    await waitFor(() => expect(result.current.saved.items).toEqual(mockSaved));

    act(() => {
      void result.current.unsave('saved-2');
    });

    expect(result.current.saved.items).toEqual(savedWithoutTwo);

    await act(async () => {
      resolveUnsave({});
    });
  });

  it('keeps the post hidden after a successful unsave', async () => {
    const { result } = renderHook(() => useOwnProfileContent('user-1'));
    await waitFor(() => expect(result.current.saved.items).toEqual(mockSaved));

    await act(async () => {
      await result.current.unsave('saved-2');
    });

    expect(result.current.saved.items).toEqual(savedWithoutTwo);
    expect(mocks.unsavePost).toHaveBeenCalledWith(expect.anything(), 'saved-2');
  });

  it('restores the post in its original position when the delete fails', async () => {
    mocks.unsavePost.mockResolvedValue({ error: new Error('delete failed') });
    const { result } = renderHook(() => useOwnProfileContent('user-1'));
    await waitFor(() => expect(result.current.saved.items).toEqual(mockSaved));

    let unsaveResult: { error?: Error } | undefined;
    await act(async () => {
      unsaveResult = await result.current.unsave('saved-2');
    });

    expect(unsaveResult?.error).toBeInstanceOf(Error);
    expect(result.current.saved.items).toEqual(mockSaved);
  });

  it('a failed unsave after a userId change does not resurrect anything', async () => {
    let resolveUnsave: (value: { error?: Error }) => void = () => {};
    mocks.unsavePost.mockReturnValue(
      new Promise((resolve) => {
        resolveUnsave = resolve;
      })
    );

    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useOwnProfileContent(id),
      { initialProps: { id: 'user-a' } }
    );
    await waitFor(() => expect(result.current.saved.items).toEqual(mockSaved));

    let unsavePromise!: Promise<{ error?: Error }>;
    act(() => {
      unsavePromise = result.current.unsave('saved-2');
    });
    expect(result.current.saved.items).toEqual(savedWithoutTwo);

    // Switch users before the delete resolves — the veil resets for the new user.
    const savedB = [{ id: 'saved-b-1', title: "B's saved post" }];
    mocks.getSavedPostsByUserId.mockResolvedValue({ data: savedB });
    rerender({ id: 'user-b' });

    await waitFor(() => expect(result.current.saved.items).toEqual(savedB));

    await act(async () => {
      resolveUnsave({ error: new Error('delete failed') });
      await unsavePromise;
    });

    expect(result.current.saved.items).toEqual(savedB);
  });
});
