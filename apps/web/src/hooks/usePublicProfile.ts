import { useCallback, useEffect, useState } from 'react';
import {
  getUserById,
  getPostsByAuthorId,
  getEventsByOrganizer,
  getActiveListingsBySeller,
  getHelperScore,
  getMetroAreaById,
} from '@nepally/shared';
import type { PublicUser, Post, Event, MarketplaceListing } from '@nepally/shared';
import { supabase } from '../lib/supabase';
import { useUserList } from './useUserList';
import type { ListFetcher, ListResource } from './useUserList';

const POSTS_LIMIT = 30;
const EVENTS_LIMIT = 50;
const LISTINGS_LIMIT = 30;

// Module-level so useUserList's effect sees a stable reference.
const fetchPosts: ListFetcher<Post> = (client, userId) => getPostsByAuthorId(client, userId, POSTS_LIMIT);
const fetchEvents: ListFetcher<Event> = (client, userId) => getEventsByOrganizer(client, userId, EVENTS_LIMIT);
const fetchListings: ListFetcher<MarketplaceListing> = (client, userId) =>
  getActiveListingsBySeller(client, userId, LISTINGS_LIMIT);

// PGRST116: no row. 22P02: the id isn't a UUID, as in a mistyped link.
// Either way there is no such member, and no retry would find one.
const NOT_FOUND_CODES = new Set(['PGRST116', '22P02']);

export type PublicProfileStatus = 'loading' | 'ready' | 'not-found' | 'error';

export interface PublicProfile {
  status: PublicProfileStatus;
  profileUser: PublicUser | null;
  metroName: string | null;
  helperScore: number | null;
  /** Re-runs the member lookup (the 'error' state's retry). */
  reload: () => void;
  posts: ListResource<Post>;
  events: ListResource<Event>;
  listings: ListResource<MarketplaceListing>;
}

interface MemberState {
  status: PublicProfileStatus;
  profileUser: PublicUser | null;
  metroName: string | null;
}

const LOADING_MEMBER: MemberState = { status: 'loading', profileUser: null, metroName: null };

function isNotFound(error: Error): boolean {
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && NOT_FOUND_CODES.has(code);
}

/**
 * Loads a public profile page's data for /users/[id]: the member record and
 * metro label, their helper score, and their posts, events and listings.
 * The lookup's `status` tells a missing member (`not-found`) from a failed
 * request (`error`, with `reload`); each list is its own `useUserList`, so
 * one failed list shows its own error and retry while the others load.
 *
 * The Pages Router keeps a page mounted across /users/A -> /users/B, so in a
 * caller that stays mounted a bare `id` effect would leave A's data on screen
 * under B's URL. Every field therefore resets during render when `id`
 * changes (react.dev "Adjusting some state when a prop changes"), and the
 * effects only ever set state after an `await`. The public profile page
 * remounts its view per member (keyed by id), so there this reset is a
 * safeguard for any caller that keeps the hook mounted across an id change.
 */
export function usePublicProfile(id: string | undefined): PublicProfile {
  const userId = id ?? null;
  const [member, setMember] = useState<MemberState>(LOADING_MEMBER);
  const [helperScore, setHelperScore] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const posts = useUserList(userId, fetchPosts, 'Couldn’t load posts.');
  const events = useUserList(userId, fetchEvents, 'Couldn’t load events.');
  const listings = useUserList(userId, fetchListings, 'Couldn’t load listings.');

  const [requestedId, setRequestedId] = useState(id);
  // A different member: drop the previous one's data during render so none
  // of it paints under the new URL.
  if (id !== requestedId) {
    setRequestedId(id);
    setMember(LOADING_MEMBER);
    setHelperScore(null);
  }

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const currentId = id;

    async function loadMember(): Promise<void> {
      const result = await getUserById(supabase, currentId);
      if (cancelled) return;

      if (result.error && !isNotFound(result.error)) {
        setMember({ status: 'error', profileUser: null, metroName: null });
        return;
      }
      if (!result.data) {
        setMember({ status: 'not-found', profileUser: null, metroName: null });
        return;
      }

      const profileUser = result.data;
      setMember({ status: 'ready', profileUser, metroName: null });

      if (profileUser.metro_area_id) {
        const metroResult = await getMetroAreaById(supabase, profileUser.metro_area_id);
        if (!cancelled && metroResult.data) {
          const metroName = `${metroResult.data.name}, ${metroResult.data.state}`;
          setMember({ status: 'ready', profileUser, metroName });
        }
      }
    }

    loadMember();

    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const currentId = id;

    async function loadHelperScore(): Promise<void> {
      const result = await getHelperScore(supabase, currentId);
      if (cancelled) return;
      setHelperScore(result.data?.helperScore ?? 0);
    }

    loadHelperScore();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const reload = useCallback((): void => {
    // Without an id the effect bails out, and loading would never end.
    if (!id) return;
    setMember(LOADING_MEMBER);
    setAttempt((count) => count + 1);
  }, [id]);

  return { ...member, helperScore, reload, posts, events, listings };
}
