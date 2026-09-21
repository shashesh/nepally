import { useEffect, useState } from 'react';
import { getPostsByAuthorId, getSavedPostsByUserId, getListingsByOwner } from '@nepally/shared';
import type { Post, MarketplaceListing } from '@nepally/shared';
import { supabase } from '../lib/supabase';

const POSTS_LIMIT = 30;
const SAVED_LIMIT = 30;
const LISTINGS_LIMIT = 30;

export interface ListState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

export interface OwnProfileContent {
  posts: ListState<Post>;
  saved: ListState<Post>;
  listings: ListState<MarketplaceListing>;
  /** Drops a post from the saved list, for an optimistic unsave. */
  dropSaved: (postId: string) => void;
}

function initialListState<T>(hasUser: boolean): ListState<T> {
  return { items: [], loading: hasUser, error: null };
}

/**
 * Loads the signed-in member's own profile content for /profile: their
 * posts, saved posts, and marketplace listings. Three parallel requests,
 * each with its own loading flag and error.
 *
 * Mirrors usePublicProfile's render-time reset: if a caller kept this hook
 * mounted across a userId change, every list would need to drop the
 * previous user's data before the effect below fetches the new one, so the
 * reset happens during render (react.dev "Adjusting some state when a prop
 * changes"), and the effect itself only ever sets state after an `await`.
 */
export function useOwnProfileContent(userId: string | null): OwnProfileContent {
  const [posts, setPosts] = useState<ListState<Post>>(() => initialListState(Boolean(userId)));
  const [saved, setSaved] = useState<ListState<Post>>(() => initialListState(Boolean(userId)));
  const [listings, setListings] = useState<ListState<MarketplaceListing>>(() =>
    initialListState(Boolean(userId))
  );

  const [requestedUserId, setRequestedUserId] = useState(userId);
  // A different user: drop the previous one's data during render so none of
  // it paints under the new profile, and mark each list loading again.
  if (userId !== requestedUserId) {
    setRequestedUserId(userId);
    setPosts(initialListState(Boolean(userId)));
    setSaved(initialListState(Boolean(userId)));
    setListings(initialListState(Boolean(userId)));
  }

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const currentUserId = userId;

    async function loadPosts(): Promise<void> {
      // includeOwnPending: this is the viewer's own profile, so a pending
      // Emergency post they submitted should still show up while it waits.
      const result = await getPostsByAuthorId(
        supabase,
        currentUserId,
        POSTS_LIMIT,
        undefined,
        true
      );
      if (cancelled) return;

      if (result.error) {
        setPosts({
          items: [],
          loading: false,
          error: result.error.message || 'Failed to load your posts',
        });
      } else {
        setPosts({ items: result.data || [], loading: false, error: null });
      }
    }

    async function loadSaved(): Promise<void> {
      const result = await getSavedPostsByUserId(supabase, currentUserId, SAVED_LIMIT);
      if (cancelled) return;

      if (result.error) {
        setSaved({
          items: [],
          loading: false,
          error: result.error.message || 'Failed to load saved posts',
        });
      } else {
        setSaved({ items: result.data || [], loading: false, error: null });
      }
    }

    async function loadListings(): Promise<void> {
      const result = await getListingsByOwner(supabase, currentUserId, LISTINGS_LIMIT);
      if (cancelled) return;

      if (result.error) {
        setListings({
          items: [],
          loading: false,
          error: result.error.message || 'Failed to load your listings',
        });
      } else {
        setListings({ items: result.data || [], loading: false, error: null });
      }
    }

    loadPosts();
    loadSaved();
    loadListings();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  function dropSaved(postId: string): void {
    setSaved((prev) => ({ ...prev, items: prev.items.filter((post) => post.id !== postId) }));
  }

  return { posts, saved, listings, dropSaved };
}
