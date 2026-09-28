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
  /**
   * Like toggle, but says which way: for a screen that already knows, such as
   * Saved, where every card is saved even before the ids have loaded.
   */
  setSaved: (listingId: string, saved: boolean) => Promise<boolean>;
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

  const setSaved = useCallback(
    async (listingId: string, saved: boolean) => {
      if (!userId || pendingRef.current.has(listingId)) return false;
      pendingRef.current.add(listingId);

      const withChange = new Set(savedIdsRef.current);
      if (saved) withChange.add(listingId);
      else withChange.delete(listingId);
      apply(withChange);

      const result = saved
        ? await saveListing(supabase, listingId)
        : await unsaveListing(supabase, listingId);
      pendingRef.current.delete(listingId);
      if (!result.error) return true;

      if (mountedRef.current) {
        const rolledBack = new Set(savedIdsRef.current);
        if (saved) rolledBack.delete(listingId);
        else rolledBack.add(listingId);
        apply(rolledBack);
        Alert.alert('Error', SAVE_FAILED);
      }
      return false;
    },
    [userId, apply]
  );

  const toggle = useCallback(
    (listingId: string) => setSaved(listingId, !savedIdsRef.current.has(listingId)),
    [setSaved]
  );

  return { savedIds, toggle, setSaved, reload };
}
