/**
 * Global search (web UI overhaul spec §4.4).
 *
 * The search_* database functions (migration 037) return ranked ids plus a
 * window total. Ordering and paging are applied here through PostgREST, then
 * posts and listings are hydrated with their usual selects and put back into
 * rank order. Rows RLS hides from the viewer simply drop out.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { SEARCH_SUGGESTION_LIMITS } from '../constants/search';
import type { MarketplaceListing } from '../types/marketplace';
import type { Post } from '../types/post';
import type {
  PeopleSearchPageOptions,
  PersonSearchResult,
  SearchGroup,
  SearchPage,
  SearchPageOptions,
  SearchSuggestionsResult,
} from '../types/search';
import { normalizeSearchInput } from '../utils/searchQuery';
import { LISTING_SELECT } from './marketplace';
import { POST_SELECT, flattenPostTags } from './posts';

type RawPost = Parameters<typeof flattenPostTags>[0];
type RankedIdRow = { id: string; total_count: number };

const EMPTY_PAGE = { data: [], totalCount: 0, hasMore: false };

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  const message = (error as { message?: unknown } | null)?.message;
  return new Error(typeof message === 'string' ? message : fallback);
}

function inRankOrder<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => byId.get(id)).filter((row): row is T => row !== undefined);
}

async function fetchRankedIds(
  supabase: SupabaseClient,
  fn: 'search_posts' | 'search_listings',
  query: string,
  options: SearchPageOptions,
  tiebreaker: 'created_at' | 'refreshed_at'
): Promise<{ ids: string[]; totalCount: number }> {
  const { data, error } = await supabase
    .rpc(fn, { p_query: query, p_metro_id: options.metroId, p_all_metros: options.allMetros })
    .order('rank', { ascending: false })
    .order(tiebreaker, { ascending: false })
    .range(options.offset, options.offset + options.limit - 1);

  if (error) throw error;
  const rows = (data ?? []) as RankedIdRow[];
  return { ids: rows.map((row) => row.id), totalCount: Number(rows[0]?.total_count ?? 0) };
}

export async function searchPosts(
  supabase: SupabaseClient,
  query: string,
  options: SearchPageOptions
): Promise<SearchPage<Post>> {
  const normalized = normalizeSearchInput(query);
  if (!normalized) return EMPTY_PAGE;

  try {
    const { ids, totalCount } = await fetchRankedIds(supabase, 'search_posts', normalized, options, 'created_at');
    if (ids.length === 0) return { data: [], totalCount, hasMore: false };

    const { data, error } = await supabase.from('posts').select(POST_SELECT).in('id', ids);
    if (error) throw error;

    const posts = inRankOrder(((data ?? []) as RawPost[]).map(flattenPostTags), ids);
    return { data: posts, totalCount, hasMore: options.offset + ids.length < totalCount };
  } catch (error: unknown) {
    return { error: toError(error, 'Failed to search posts') };
  }
}

export async function searchListings(
  supabase: SupabaseClient,
  query: string,
  options: SearchPageOptions
): Promise<SearchPage<MarketplaceListing>> {
  const normalized = normalizeSearchInput(query);
  if (!normalized) return EMPTY_PAGE;

  try {
    const { ids, totalCount } = await fetchRankedIds(supabase, 'search_listings', normalized, options, 'refreshed_at');
    if (ids.length === 0) return { data: [], totalCount, hasMore: false };

    const { data, error } = await supabase.from('marketplace_listings_view').select(LISTING_SELECT).in('id', ids);
    if (error) throw error;

    const listings = inRankOrder((data ?? []) as MarketplaceListing[], ids);
    return { data: listings, totalCount, hasMore: options.offset + ids.length < totalCount };
  } catch (error: unknown) {
    return { error: toError(error, 'Failed to search listings') };
  }
}

export async function searchPeople(
  supabase: SupabaseClient,
  query: string,
  options: PeopleSearchPageOptions
): Promise<SearchPage<PersonSearchResult>> {
  const normalized = normalizeSearchInput(query);
  if (!normalized) return EMPTY_PAGE;

  try {
    const { data, error } = await supabase
      .rpc('search_people', { p_query: normalized, p_metro_id: options.metroId })
      .order('is_local', { ascending: false })
      .order('rank', { ascending: false })
      .order('follower_count', { ascending: false })
      .range(options.offset, options.offset + options.limit - 1);
    if (error) throw error;

    const rows = (data ?? []) as Array<PersonSearchResult & { rank: number; total_count: number }>;
    const totalCount = Number(rows[0]?.total_count ?? 0);
    const people = rows.map((row) => ({
      id: row.id,
      full_name: row.full_name,
      profile_photo: row.profile_photo,
      trust_level: row.trust_level,
      metro_area_id: row.metro_area_id,
      follower_count: row.follower_count,
      is_local: row.is_local,
    }));
    return { data: people, totalCount, hasMore: options.offset + rows.length < totalCount };
  } catch (error: unknown) {
    return { error: toError(error, 'Failed to search people') };
  }
}

function toGroup<T>(page: SearchPage<T>): SearchGroup<T> {
  return { items: page.data ?? [], totalCount: page.totalCount ?? 0, hasMore: Boolean(page.hasMore) };
}

/** Live-suggestion groups for the search dropdown (3 posts, 2 listings, 3 people). */
export async function searchSuggestions(
  supabase: SupabaseClient,
  query: string,
  scope: { metroId: string | null; allMetros: boolean }
): Promise<SearchSuggestionsResult> {
  const [posts, listings, people] = await Promise.all([
    searchPosts(supabase, query, { ...scope, limit: SEARCH_SUGGESTION_LIMITS.posts, offset: 0 }),
    searchListings(supabase, query, { ...scope, limit: SEARCH_SUGGESTION_LIMITS.listings, offset: 0 }),
    searchPeople(supabase, query, { metroId: scope.metroId, limit: SEARCH_SUGGESTION_LIMITS.people, offset: 0 }),
  ]);

  const error = posts.error ?? listings.error ?? people.error;
  if (error) return { error };

  return { data: { posts: toGroup(posts), listings: toGroup(listings), people: toGroup(people) } };
}
