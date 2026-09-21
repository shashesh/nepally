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
 * Five independent requests, each tracking its own loading flag; a response
 * arriving after unmount (or after `id` has changed) is dropped.
 */
export function usePublicProfile(id: string | undefined): PublicProfileState {
  const [profileUser, setProfileUser] = useState<PublicUser | null>(null);
  const [metroName, setMetroName] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [helperScore, setHelperScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    const currentId = id;

    async function loadProfile(): Promise<void> {
      setLoading(true);
      setError(null);

      const result = await getUserById(supabase, currentId);

      if (!isMounted) return;

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
        if (isMounted && metroResult.data) {
          setMetroName(`${metroResult.data.name}, ${metroResult.data.state}`);
        }
      }
    }

    async function loadPosts(): Promise<void> {
      setPostsLoading(true);
      const result = await getPostsByAuthorId(supabase, currentId, POSTS_LIMIT);
      if (!isMounted) return;
      setPosts(result.data || []);
      setPostsLoading(false);
    }

    async function loadEvents(): Promise<void> {
      setEventsLoading(true);
      const result = await getEventsByOrganizer(supabase, currentId, EVENTS_LIMIT);
      if (!isMounted) return;
      setEvents(result.data || []);
      setEventsLoading(false);
    }

    async function loadListings(): Promise<void> {
      setListingsLoading(true);
      const result = await getActiveListingsBySeller(supabase, currentId, LISTINGS_LIMIT);
      if (!isMounted) return;
      setListings(result.data || []);
      setListingsLoading(false);
    }

    async function loadHelperScore(): Promise<void> {
      const result = await getHelperScore(supabase, currentId);
      if (!isMounted) return;
      setHelperScore(result.data?.helperScore ?? 0);
    }

    loadProfile();
    loadPosts();
    loadEvents();
    loadListings();
    loadHelperScore();

    return () => {
      isMounted = false;
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
