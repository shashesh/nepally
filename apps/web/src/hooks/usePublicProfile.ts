import { useEffect, useState } from 'react';
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

const POSTS_LIMIT = 30;
const EVENTS_LIMIT = 50;
const LISTINGS_LIMIT = 30;

export interface PublicProfileState {
  profileUser: PublicUser | null;
  metroName: string | null;
  posts: Post[];
  events: Event[];
  listings: MarketplaceListing[];
  helperScore: number | null;
  /** The profile itself; the three lists load on their own flags. */
  loading: boolean;
  postsLoading: boolean;
  eventsLoading: boolean;
  listingsLoading: boolean;
  error: string | null;
}

/**
 * Loads a public profile page's data for /users/[id]: the member record, the
 * metro area label, their posts/events/listings, and their helper score.
 * Five parallel requests plus a follow-up metro lookup; the profile and the
 * three lists have loading flags.
 *
 * The Pages Router keeps this hook mounted across /users/A -> /users/B
 * (profile links in the persistent chrome go straight from one profile to
 * another), so a bare `id` effect would leave A's data on screen — and A's
 * in-flight responses could still land — under B's URL. To prevent that,
 * every field resets during render when `id` changes (react.dev "Adjusting
 * some state when a prop changes"), before the effect below fetches the new
 * member; the effect itself only ever sets state after an `await`.
 */
export function usePublicProfile(id: string | undefined): PublicProfileState {
  const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
  const [metroName, setMetroName] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [helperScore, setHelperScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(Boolean(id));
  const [eventsLoading, setEventsLoading] = useState(Boolean(id));
  const [listingsLoading, setListingsLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const [requestedId, setRequestedId] = useState(id);
  // A different member: drop the previous one's data during render so none
  // of it paints under the new URL.
  if (id !== requestedId) {
    setRequestedId(id);
    setProfileUser(null);
    setMetroName(null);
    setPosts([]);
    setEvents([]);
    setListings([]);
    setHelperScore(null);
    setLoading(true);
    setError(null);
    setPostsLoading(Boolean(id));
    setEventsLoading(Boolean(id));
    setListingsLoading(Boolean(id));
  }

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const currentId = id;

    async function loadProfile(): Promise<void> {
      const result = await getUserById(supabase, currentId);

      if (cancelled) return;

      if (result.error || !result.data) {
        setError(
          'We couldn’t find this member. They may have deleted their account.'
        );
        setLoading(false);
        return;
      }

      setProfileUser(result.data);
      setLoading(false);

      if (result.data.metro_area_id) {
        const metroResult = await getMetroAreaById(supabase, result.data.metro_area_id);
        if (!cancelled && metroResult.data) {
          setMetroName(`${metroResult.data.name}, ${metroResult.data.state}`);
        }
      }
    }

    async function loadPosts(): Promise<void> {
      const result = await getPostsByAuthorId(supabase, currentId, POSTS_LIMIT);
      if (cancelled) return;
      setPosts(result.data || []);
      setPostsLoading(false);
    }

    async function loadEvents(): Promise<void> {
      const result = await getEventsByOrganizer(supabase, currentId, EVENTS_LIMIT);
      if (cancelled) return;
      setEvents(result.data || []);
      setEventsLoading(false);
    }

    async function loadListings(): Promise<void> {
      const result = await getActiveListingsBySeller(supabase, currentId, LISTINGS_LIMIT);
      if (cancelled) return;
      setListings(result.data || []);
      setListingsLoading(false);
    }

    async function loadHelperScore(): Promise<void> {
      const result = await getHelperScore(supabase, currentId);
      if (cancelled) return;
      setHelperScore(result.data?.helperScore ?? 0);
    }

    loadProfile();
    loadPosts();
    loadEvents();
    loadListings();
    loadHelperScore();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return {
    profileUser,
    metroName,
    posts,
    events,
    listings,
    helperScore,
    loading,
    postsLoading,
    eventsLoading,
    listingsLoading,
    error,
  };
}
