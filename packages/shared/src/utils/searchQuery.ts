/**
 * Search input helpers shared by web and mobile.
 */
import { SEARCH_MAX_QUERY_LENGTH, SEARCH_MIN_QUERY_LENGTH } from '../constants/search';

/**
 * Trims, collapses whitespace and truncates; null when too short to search.
 * Lengths count code points, so a cut never leaves half an emoji.
 */
export function normalizeSearchInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  const normalized = Array.from(collapsed).slice(0, SEARCH_MAX_QUERY_LENGTH).join('').trim();
  return Array.from(normalized).length >= SEARCH_MIN_QUERY_LENGTH ? normalized : null;
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

const WORD = /[\p{L}\p{M}\p{N}]+/u;
const TOKENS = /[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu;

/** Below this, a stem is left whole, so "is" or "bed" cannot match everything. */
const MIN_STEM_LENGTH = 3;
const LATIN_WORD = /^[a-z]+$/;
const DOUBLED_FINAL = /([bdfgmnprt])\1$/;

interface EndingRule {
  ending: string;
  replacement: string;
  /** -ing and -ed can leave a doubled consonant: running → runn → run. */
  undouble: boolean;
  /** A longer ending that blocks the rule: "class" is no plural, "speed" no past tense. */
  unless?: string;
}

/** Checked in order; the first rule that applies is the only one applied. */
const ENDING_RULES: readonly EndingRule[] = [
  { ending: 'ies', replacement: 'i', undouble: false },
  { ending: 'es', replacement: '', undouble: false },
  { ending: 's', replacement: '', undouble: false, unless: 'ss' },
  { ending: 'ing', replacement: '', undouble: true },
  { ending: 'ed', replacement: '', undouble: true, unless: 'eed' },
];

function stripEnding(word: string): { stem: string; undouble: boolean } {
  const rule = ENDING_RULES.find(
    (candidate) => word.endsWith(candidate.ending) && !(candidate.unless && word.endsWith(candidate.unless))
  );
  if (!rule) return { stem: word, undouble: false };

  const stem = word.slice(0, -rule.ending.length) + rule.replacement;
  return stem.length >= MIN_STEM_LENGTH ? { stem, undouble: rule.undouble } : { stem: word, undouble: false };
}

function undoubleFinal(stem: string): string {
  return stem.length > MIN_STEM_LENGTH && DOUBLED_FINAL.test(stem) ? stem.slice(0, -1) : stem;
}

function normalizeFinal(stem: string): string {
  if (stem.length <= MIN_STEM_LENGTH) return stem;
  if (stem.endsWith('y')) return `${stem.slice(0, -1)}i`;
  if (stem.endsWith('e')) return stem.slice(0, -1);
  return stem;
}

/**
 * Approximates the `english` stems the database matches on, so "rooms" marks
 * "Room" and "houses" marks "Housing". It covers plurals and -ing/-ed forms of
 * lowercase a–z words; every other word is returned unchanged.
 */
function highlightStem(word: string): string {
  if (!LATIN_WORD.test(word)) return word;
  const { stem, undouble } = stripEnding(word);
  return normalizeFinal(undouble ? undoubleFinal(stem) : stem);
}

/**
 * Splits text into matched / unmatched runs for rendering <mark>. A word
 * matches when it starts with any query word, mirroring the database's prefix
 * matching ("tha" highlights "Thapa"), or when it shares a query word's stem
 * ("rooms" highlights "Room"). Adjacent runs with the same state merge.
 */
export function highlightSegments(text: string, query: string | null): HighlightSegment[] {
  if (!text) return [];
  const queryWords = (query ?? '')
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);
  if (queryWords.length === 0) return [{ text, match: false }];
  const queryStems = new Set(queryWords.map(highlightStem));

  const segments: HighlightSegment[] = [];
  for (const [token] of text.matchAll(TOKENS)) {
    const lower = token.toLocaleLowerCase();
    const match =
      WORD.test(token) &&
      (queryWords.some((word) => lower.startsWith(word)) || queryStems.has(highlightStem(lower)));
    const previous = segments[segments.length - 1];
    if (previous && previous.match === match) {
      previous.text += token;
    } else {
      segments.push({ text: token, match });
    }
  }
  return segments;
}
