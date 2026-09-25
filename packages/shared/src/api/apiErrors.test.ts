/**
 * PR 10c decision 1: a request that never reached Supabase comes back from
 * every shared API file as a connection failure, not a bare `Error`.
 *
 * One call per API file is enough: each file routes its non-`Error` failures
 * through `toApiError` (directly or via its private `toError`).
 */
import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isConnectionError } from '../logic/authErrors';
import { blockUser } from './conversations';
import { getUpcomingCulturalEvents } from './culturalEvents';
import { getEventById } from './events';
import { isFollowing } from './follows';
import { getFollowSuggestionCandidates } from './followSuggestions';
import { getHelperScore } from './helperScore';
import { getUserLikedPostIds } from './interactions';
import { getCategories } from './marketplace';
import { getMessages } from './messages';
import { getMetroAreaById } from './metroArea';
import { getPostsByIds } from './moderation';
import { getPostById } from './posts';
import { getPromotionById } from './promotions';
import { resolveReport } from './reports';
import { getSavedLocations } from './savedLocations';
import { searchPosts } from './search';
import { deleteProfilePhoto } from './storage';
import { getTags } from './tags';
import { getUserById } from './users';

/** What postgrest-js resolves with when `fetch` itself rejects. */
const FETCH_FAILURE = {
  data: null,
  error: { message: 'TypeError: fetch failed', details: 'TypeError: fetch failed', hint: '', code: '' },
  count: null,
  status: 0,
  statusText: '',
};

/** A client where every builder call chains and every await resolves to FETCH_FAILURE. */
function offlineClient(): SupabaseClient {
  const node: unknown = new Proxy(() => undefined, {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: unknown) => void) => resolve(FETCH_FAILURE);
      }
      return node;
    },
    apply() {
      return node;
    },
  });
  return node as SupabaseClient;
}

const calls: Array<[string, (supabase: SupabaseClient) => Promise<{ error?: unknown }>]> = [
  ['conversations', (s) => blockUser(s, 'u1', 'u2')],
  ['culturalEvents', (s) => getUpcomingCulturalEvents(s, 30)],
  ['events', (s) => getEventById(s, 'e1')],
  ['follows', (s) => isFollowing(s, 'u1', 'u2')],
  ['followSuggestions', (s) => getFollowSuggestionCandidates(s, 'u1', 'm1')],
  ['helperScore', (s) => getHelperScore(s, 'u1')],
  ['interactions', (s) => getUserLikedPostIds(s, 'u1')],
  ['marketplace', (s) => getCategories(s)],
  ['messages', (s) => getMessages(s, 'c1')],
  ['metroArea', (s) => getMetroAreaById(s, 'm1')],
  ['moderation', (s) => getPostsByIds(s, ['p1'])],
  ['posts', (s) => getPostById(s, 'p1')],
  ['promotions', (s) => getPromotionById(s, 'pr1')],
  ['reports', (s) => resolveReport(s, 'r1', { status: 'dismissed', reviewed_by: 'mod1' })],
  ['savedLocations', (s) => getSavedLocations(s, 'u1')],
  ['search', (s) => searchPosts(s, 'rent', { metroId: 'm1', allMetros: false, limit: 10, offset: 0 })],
  ['storage', (s) => deleteProfilePhoto(s, 'u1')],
  ['tags', (s) => getTags(s)],
  ['users', (s) => getUserById(s, 'u1')],
];

describe('shared API fetch failures', () => {
  it.each(calls)('%s reports a fetch failure as a connection error', async (_file, call) => {
    const result = await call(offlineClient());

    expect(result.error).toBeInstanceOf(Error);
    expect(isConnectionError(result.error)).toBe(true);
  });
});
