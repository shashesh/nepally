import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { getUserSavedListingIds, saveListing, unsaveListing } from '@nepally/shared';
import { supabase } from '../config/supabase';

const SAVE_FAILED = "Couldn't update your saved listings. Try again.";

export interface SavedListingIdsState {
  savedIds: ReadonlySet<string>;
  /**
   * Saves or unsaves at once and confirms with the server. Resolves true when
   * the change stuck; on failure the heart goes back and an alert says so.
   */
  toggle: (listingId: string) => Promise<boolean>;
  /** Refetches the ids, e.g. when a screen comes back into view. */
  reload: () => Promise<void>;
}

/** The member's saved listing ids, shared by the marketplace screens that show a heart. */
export function useSavedListingIds(userId: string | undefined): SavedListingIdsState {
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(new Set());
  // Read by toggle, so the previous state never comes from a stale closure.
  const savedIdsRef = useRef<ReadonlySet<string>>(savedIds);
  const pendingRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const apply = useCallback((next: ReadonlySet<string>) => {
    savedIdsRef.current = next;
    setSavedIds(next);
  }, []);

  const reload = useCallback(async () => {
    if (!userId) return;
    const result = await getUserSavedListingIds(supabase, userId);
    if (mountedRef.current && result.data) apply(new Set(result.data));
  }, [userId, apply]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const toggle = useCallback(
    async (listingId: string) => {
      if (!userId || pendingRef.current.has(listingId)) return false;
      pendingRef.current.add(listingId);

      const wasSaved = savedIdsRef.current.has(listingId);
      const withChange = new Set(savedIdsRef.current);
      if (wasSaved) withChange.delete(listingId);
      else withChange.add(listingId);
      apply(withChange);

      const result = wasSaved
        ? await unsaveListing(supabase, listingId)
        : await saveListing(supabase, listingId);
      pendingRef.current.delete(listingId);
      if (!result.error) return true;

      if (mountedRef.current) {
        const rolledBack = new Set(savedIdsRef.current);
        if (wasSaved) rolledBack.add(listingId);
        else rolledBack.delete(listingId);
        apply(rolledBack);
        Alert.alert('Error', SAVE_FAILED);
      }
      return false;
    },
    [userId, apply]
  );

  return { savedIds, toggle, reload };
}
