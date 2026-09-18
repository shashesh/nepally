/**
 * Global search limits (web UI overhaul spec §4.4).
 */

/** Queries shorter than this are not sent to the database. */
export const SEARCH_MIN_QUERY_LENGTH = 2;

/** Longer input is truncated before searching. */
export const SEARCH_MAX_QUERY_LENGTH = 100;

/** Pause in typing before live suggestions are requested. */
export const SEARCH_DEBOUNCE_MS = 250;

/** Rows per page on the full results page. */
export const SEARCH_PAGE_SIZE = 20;

/** Rows per group in the live suggestion dropdown. */
export const SEARCH_SUGGESTION_LIMITS = { posts: 3, listings: 2, people: 3 } as const;
