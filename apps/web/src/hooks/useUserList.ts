import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { userMessage } from '../lib/userMessage';

export interface ListState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

export interface ListResource<T> extends ListState<T> {
  reload: () => void;
}

/** A list-loading API call's shape: client + user id in, `{ data, error }` out. */
export type ListFetcher<T> = (
  client: SupabaseClient,
  userId: string
) => Promise<{ data?: T[]; error?: Error }>;

function startState<T>(userId: string | null): ListState<T> {
  return { items: [], loading: Boolean(userId), error: null };
}

/**
 * Loads one user-scoped list — a member's own posts, saved posts, or
 * listings — with its own loading/error state and a `reload` escape hatch.
 * The row limit is baked into `fetchList` by the caller, so this helper
 * stays limit-agnostic (different lists need different limits).
 *
 * Mirrors usePublicProfile's pattern: state resets during render when
 * `userId` changes (react.dev "Adjusting some state when a prop changes"),
 * so a caller that keeps this hook mounted across users never paints the
 * previous user's data or error under the new one. The effect itself only
 * ever sets state after an `await`, guarded by `cancelled` so a response
 * that lands after `userId` (or `reload`) has moved on is dropped.
 *
 * `fetchList` and `fallbackError` sit in the effect's dependency array
 * (alongside the retry `attempt` counter, following useSearchPage's
 * attempt/retry precedent), so `fetchList` must be a stable — i.e.
 * module-level — reference. An inline closure would refetch every render.
 */
export function useUserList<T>(
  userId: string | null,
  fetchList: ListFetcher<T>,
  fallbackError: string
): ListResource<T> {
  const [state, setState] = useState<ListState<T>>(() => startState(userId));
  const [attempt, setAttempt] = useState(0);

  const [requestedUserId, setRequestedUserId] = useState(userId);
  if (userId !== requestedUserId) {
    setRequestedUserId(userId);
    setState(startState(userId));
  }

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const currentUserId = userId;

    async function load(): Promise<void> {
      const result = await fetchList(supabase, currentUserId);
      if (cancelled) return;

      if (result.error) {
        setState({
          items: [],
          loading: false,
          error: userMessage(result.error, fallbackError, 'user_list_load_failed', {
            platform: 'web',
            userId: currentUserId,
            list: fetchList.name,
          }),
        });
      } else {
        setState({ items: result.data || [], loading: false, error: null });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId, attempt, fetchList, fallbackError]);

  const reload = useCallback((): void => {
    // Without a user there's nothing to fetch, and the effect above bails
    // out too, so loading would flip on and never come back off.
    if (!userId) return;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    setAttempt((count) => count + 1);
  }, [userId]);

  return { ...state, reload };
}
