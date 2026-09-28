import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getListingById,
  incrementListingViews,
  userMessage,
  type MarketplaceListing,
} from '@nepally/shared';
import { supabase } from '../config/supabase';
import { useRefocusEffect } from './useRefocusEffect';

const LOAD_FAILED = "Couldn't load this listing.";

export interface ListingState {
  listing: MarketplaceListing | null;
  loading: boolean;
  /** Set when the read failed, as opposed to the listing being gone (ListingResult.notFound). */
  loadError: string | null;
  /** Loads again from scratch, showing the loading state. */
  reload: () => void;
}

/**
 * One listing for its detail screen, counting the view once.
 *
 * Coming back to the screen, from the edit form say, refetches quietly: the
 * listing stays on screen, a failed refetch leaves it as it was, and it isn't
 * another view. Only a listing already on screen is refetched, so a return
 * can't race the first load.
 */
export function useListing(listingId: string): ListingState {
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadKey, setLoadKey] = useState(0);
  const hasListingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    hasListingRef.current = false;
    const failed = (error: unknown) =>
      userMessage(error, LOAD_FAILED, 'listing_load_failed', { platform: 'mobile', listingId });

    (async () => {
      try {
        const listingResult = await getListingById(supabase, listingId);

        if (cancelled) return;

        if (listingResult.data) {
          hasListingRef.current = true;
          setListing(listingResult.data);
          void incrementListingViews(supabase, listingId);
        } else if (listingResult.error && !listingResult.notFound) {
          setLoadError(failed(listingResult.error));
        }
      } catch (error) {
        if (!cancelled) setLoadError(failed(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listingId, loadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    setLoadKey((key) => key + 1);
  }, []);

  useRefocusEffect(
    useCallback(() => {
      if (!hasListingRef.current) return undefined;
      let cancelled = false;
      // getListingById reports failures in its result rather than throwing.
      void getListingById(supabase, listingId).then((result) => {
        if (!cancelled && result.data) setListing(result.data);
      });
      return () => {
        cancelled = true;
      };
    }, [listingId])
  );

  return { listing, loading, loadError, reload };
}
