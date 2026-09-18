/**
 * Search input helpers shared by web and mobile.
 */
import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from '../constants/search';

/** Trims, collapses whitespace and truncates; null when too short to search. */
export function normalizeSearchInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX_QUERY_LENGTH).trim();
  return normalized.length >= SEARCH_MIN_QUERY_LENGTH ? normalized : null;
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

const WORD = /[\p{L}\p{M}\p{N}]+/u;
const TOKENS = /[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu;

/**
 * Splits text into matched / unmatched runs for rendering <mark>. A word
 * matches when it starts with any query word, mirroring the database's prefix
 * matching ("tha" highlights "Thapa"). Adjacent runs with the same state merge.
 */
export function highlightSegments(text: string, query: string | null): HighlightSegment[] {
  if (!text) return [];
  const queryWords = (query ?? '')
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
  if (queryWords.length === 0) return [{ text, match: false }];

  const segments: HighlightSegment[] = [];
  for (const [token] of text.matchAll(TOKENS)) {
    const lower = token.toLocaleLowerCase();
    const match = WORD.test(token) && queryWords.some((word) => lower.startsWith(word));
    const previous = segments[segments.length - 1];
    if (previous && previous.match === match) {
      previous.text += token;
    } else {
      segments.push({ text: token, match });
    }
  }
  return segments;
}
