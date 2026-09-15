/**
 * Global search types — snake_case row fields match the search_* functions in
 * supabase/migrations/037_search.sql.
 */
import type { MarketplaceListing } from './marketplace';
import type { Post } from './post';
import type { UserSummary } from './user';

export type SearchTab = 'all' | 'posts' | 'listings' | 'people';

/** `metro` = the viewer's metro (plus global posts/listings); `all` = every metro. */
export type SearchScope = 'metro' | 'all';

/** A member returned by search_people — public columns only. */
export interface PersonSearchResult extends UserSummary {
  metro_area_id: string | null;
  follower_count: number;
  /** True when the member is in the viewer's metro (ranked first). */
  is_local: boolean;
}

export interface SearchPageOptions {
  metroId: string | null;
  allMetros: boolean;
  limit: number;
  offset: number;
}

export type PeopleSearchPageOptions = Omit<SearchPageOptions, 'allMetros'>;

export interface SearchPage<T> {
  data?: T[];
  /** Total matches for the query, across all pages. */
  totalCount?: number;
  hasMore?: boolean;
  error?: Error;
}

export interface SearchGroup<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
}

export interface SearchSuggestions {
  posts: SearchGroup<Post>;
  listings: SearchGroup<MarketplaceListing>;
  people: SearchGroup<PersonSearchResult>;
}

export interface SearchSuggestionsResult {
  data?: SearchSuggestions;
  error?: Error;
}
