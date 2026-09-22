import { useCallback, useState } from 'react';
import { getPostsByAuthorId, getSavedPostsByUserId, getListingsByOwner, unsavePost } from '@nepally/shared';
import type { Post, MarketplaceListing } from '@nepally/shared';
import { supabase } from '../lib/supabase';
import { useUserList } from './useUserList';
import type { ListFetcher, ListResource } from './useUserList';

export type { ListState, ListResource } from './useUserList';

// Row limit for the profile page's own lists. Kept here rather than in the
// generic useUserList helper: PR 10's public-profile events list needs 50,
// so the helper stays limit-agnostic and each caller bakes its own limit
// into the fetcher it passes in.
const PROFILE_LIST_LIMIT = 30;

// includeOwnPending: this is the viewer's own profile, so a pending
// Emergency post they submitted should still show up while it waits.
const fetchOwnPosts: ListFetcher<Post> = (client, userId) =>
  getPostsByAuthorId(client, userId, PROFILE_LIST_LIMIT, undefined, true);

const fetchSavedPosts: ListFetcher<Post> = (client, userId) =>
  getSavedPostsByUserId(client, userId, PROFILE_LIST_LIMIT);

const fetchOwnListings: ListFetcher<MarketplaceListing> = (client, userId) =>
  getListingsByOwner(client, userId, PROFILE_LIST_LIMIT);

export interface OwnProfileContent {
  posts: ListResource<Post>;
  saved: ListResource<Post>;
  listings: ListResource<MarketplaceListing>;
  /** Hides the post at once, deletes the save, and shows it again in the same place if the delete fails. */
  unsave: (postId: string) => Promise<{ error?: Error }>;
}

/**
 * Loads the signed-in member's own profile content for /profile: their
 * posts, saved posts, and marketplace listings, each backed by
 * `useUserList`. `saved` layers an optimistic-unsave veil on top: ids in
 * `hiddenSavedIds` are filtered out of the list immediately, before the
 * delete round-trip resolves, and put back only if it fails.
 */
export function useOwnProfileContent(userId: string | null): OwnProfileContent {
  const posts = useUserList(userId, fetchOwnPosts, 'Failed to load your posts');
  const savedList = useUserList(userId, fetchSavedPosts, 'Failed to load saved posts');
  const listings = useUserList(userId, fetchOwnListings, 'Failed to load your listings');

  // Ids stay hidden for the life of the mount: a later fetch can't tell a
  // stale read from a re-save, and hiding an id that's no longer in the
  // list is a no-op.
  const [hiddenSavedIds, setHiddenSavedIds] = useState<ReadonlySet<string>>(() => new Set());

  // A different user: the veil only ever hid this user's own saved posts,
  // so it means nothing for the next one.
  const [requestedUserId, setRequestedUserId] = useState(userId);
  if (userId !== requestedUserId) {
    setRequestedUserId(userId);
    setHiddenSavedIds(new Set());
  }

  const saved: ListResource<Post> =
    hiddenSavedIds.size === 0
      ? savedList
      : { ...savedList, items: savedList.items.filter((post) => !hiddenSavedIds.has(post.id)) };

  const unsave = useCallback(async (postId: string): Promise<{ error?: Error }> => {
    setHiddenSavedIds((previous) => new Set(previous).add(postId));

    const result = await unsavePost(supabase, postId);

    if (result.error) {
      // Functional update: if userId changed while this was in flight, the
      // veil was already reset above, and removing an id from that fresh
      // (empty, or some other user's) set is a harmless no-op.
      setHiddenSavedIds((previous) => {
        if (!previous.has(postId)) return previous;
        const next = new Set(previous);
        next.delete(postId);
        return next;
      });
    }

    return result;
  }, []);

  return { posts, saved, listings, unsave };
}
