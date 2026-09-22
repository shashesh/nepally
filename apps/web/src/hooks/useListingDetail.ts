import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getListingById,
  getUserSavedListingIds,
  incrementListingViews,
  saveListing,
  unsaveListing,
  type MarketplaceListing,
} from '@nepally/shared';
import { supabase } from '../lib/supabase';

export interface ListingDetailState {
  listing: MarketplaceListing | null;
  loading: boolean;
  /** The read failed. Distinct from `notFound`, which means it succeeded and found nothing. */
  error: string | null;
  notFound: boolean;
  isSaved: boolean;
  saving: boolean;
  toggleSave: () => void;
  reload: () => void;
}

/**
 * One listing, for the detail page. The page keys its view by id, so this
 * hook's state starts fresh per listing; the generation guard covers the
 * window where the id changes while a read is still in flight.
 *
 * It keeps a failed read apart from a listing that is genuinely gone. Before
 * this, `getListingById`'s error was dropped and both rendered as "Listing
 * not found." (recon 6).
 */
export function useListingDetail(
  id: string | undefined,
  viewer: { id: string } | null
): ListingDetailState {
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const generationRef = useRef(0);
  const savingRef = useRef(false);

  const viewerId = viewer?.id ?? null;

  // A different listing starts from nothing, even if the page did not remount.
  const [loadedId, setLoadedId] = useState(id);
  if (id !== loadedId) {
    setLoadedId(id);
    setListing(null);
    setLoading(true);
    setError(null);
    setNotFound(false);
    setIsSaved(false);
  }

  useEffect(() => {
    if (!id) return;
    const generation = ++generationRef.current;
    let cancelled = false;

    (async () => {
      const [listingResult, savedResult] = await Promise.all([
        getListingById(supabase, id),
        viewerId
          ? getUserSavedListingIds(supabase, viewerId)
          : Promise.resolve({ data: [] as string[] }),
      ]);
      if (cancelled || generation !== generationRef.current) return;

      // A failed saved-ids read leaves the control showing "Save listing";
      // it never blocks the listing itself.
      setIsSaved(Boolean(savedResult.data?.includes(id)));

      if (listingResult.error) {
        setListing(null);
        setNotFound(Boolean(listingResult.notFound));
        setError(listingResult.notFound ? null : listingResult.error.message);
        setLoading(false);
        return;
      }

      setListing(listingResult.data ?? null);
      setError(null);
      setNotFound(false);
      setLoading(false);
      // Fire and forget: a failed count must not affect what is on screen.
      void incrementListingViews(supabase, id);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, viewerId, reloadKey]);

  const reload = useCallback(() => {
    setListing(null);
    setLoading(true);
    setError(null);
    setNotFound(false);
    setReloadKey((key) => key + 1);
  }, []);

  const toggleSave = useCallback(() => {
    if (!id || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);

    const wasSaved = isSaved;
    const write = wasSaved ? unsaveListing(supabase, id) : saveListing(supabase, id);
    void write.then((result) => {
      savingRef.current = false;
      setSaving(false);
      if (!result.error) setIsSaved(!wasSaved);
    });
  }, [id, isSaved]);

  return {
    listing,
    loading: Boolean(id) && loading,
    error,
    notFound,
    isSaved,
    saving,
    toggleSave,
    reload,
  };
}
