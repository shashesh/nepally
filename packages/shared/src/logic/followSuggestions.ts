/**
 * Pure follow-suggestion ranking. Takes a pre-filtered candidate pool (viewer
 * excluded, blocked excluded, already-followed excluded) and scores each with
 * a rule-based formula from docs/specs/2026-04-20-your-community-today-design.md §5.2.
 */
import { formatPublicName } from '../utils/user';

const SCORE_SAME_DISTRICT = 10;
const SCORE_SAME_COLLEGE = 8;
const SCORE_CONTRIBUTOR_BONUS = 5;
const SCORE_BASELINE = 2;
const MAX_SUGGESTIONS = 3;
const CONTRIBUTOR_TRUST_LEVEL = 2;

export interface SuggestionViewer {
  id: string;
  metroAreaId: string;
  hometownDistrict: string | null;
  college: string | null;
}

export interface SuggestionCandidate {
  id: string;
  fullName: string;
  hometownDistrict: string | null;
  college: string | null;
  trustLevel: number;
  followerCount: number;
  createdAt: string; // ISO
  profilePhoto: string | null;
}

export interface RankedSuggestion {
  userId: string;
  displayName: string; // masked
  photo: string | null;
  reason: string;
  score: number;
}

function scoreAndReason(
  viewer: SuggestionViewer,
  candidate: SuggestionCandidate
): { score: number; reason: string } {
  // Choose the single strongest reason to surface to the user; all candidates
  // are assumed same-metro by the caller (filtered at the query layer).
  if (
    viewer.hometownDistrict &&
    candidate.hometownDistrict &&
    viewer.hometownDistrict === candidate.hometownDistrict
  ) {
    return {
      score: SCORE_SAME_DISTRICT,
      reason: `Both from ${candidate.hometownDistrict}`,
    };
  }
  if (
    viewer.college &&
    candidate.college &&
    viewer.college === candidate.college
  ) {
    return {
      score: SCORE_SAME_COLLEGE,
      reason: `Both studied at ${candidate.college}`,
    };
  }
  if (candidate.trustLevel >= CONTRIBUTOR_TRUST_LEVEL) {
    return {
      score: SCORE_BASELINE + SCORE_CONTRIBUTOR_BONUS,
      reason: 'Top contributor in your metro',
    };
  }
  return { score: SCORE_BASELINE, reason: 'Active in your metro' };
}

export function rankFollowSuggestions(
  viewer: SuggestionViewer,
  candidates: SuggestionCandidate[]
): RankedSuggestion[] {
  const scored = candidates.map((c) => {
    const { score, reason } = scoreAndReason(viewer, c);
    return {
      candidate: c,
      score,
      reason,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.candidate.followerCount !== a.candidate.followerCount) {
      return b.candidate.followerCount - a.candidate.followerCount;
    }
    return a.candidate.createdAt.localeCompare(b.candidate.createdAt);
  });

  return scored.slice(0, MAX_SUGGESTIONS).map((s) => ({
    userId: s.candidate.id,
    displayName: formatPublicName(s.candidate.fullName),
    photo: s.candidate.profilePhoto,
    reason: s.reason,
    score: s.score,
  }));
}
