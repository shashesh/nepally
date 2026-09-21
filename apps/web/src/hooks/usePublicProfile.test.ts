import { renderHook, waitFor } from '@testing-library/react';
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

describe('usePublicProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserById.mockResolvedValue({ data: mockProfileUser });
    mocks.getPostsByAuthorId.mockResolvedValue({ data: mockPosts });
    mocks.getEventsByOrganizer.mockResolvedValue({ data: mockEvents });
    mocks.getActiveListingsBySeller.mockResolvedValue({ data: mockListings });
    mocks.getHelperScore.mockResolvedValue({
      data: {
        userId: 'profile-user',
        helperScore: 42,
        helpfulComments: 15,
        likesReceivedOnOwnPosts: 12,
      },
    });
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
});
