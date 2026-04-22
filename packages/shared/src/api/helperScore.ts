/**
 * Shared Helper Score API — reads from the user_helper_scores VIEW.
 * See docs/specs/2026-04-20-your-community-today-design.md §4.3
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface HelperScore {
  userId: string;
  helperScore: number;
  helpfulComments: number;
  likesReceivedOnOwnPosts: number;
}

export interface TopHelper {
  userId: string;
  helperScore: number;
  metroAreaId: string;
}

interface ScoreResult {
  data?: HelperScore;
  error?: Error;
}

interface TopHelperResult {
  data?: TopHelper | null;
  error?: Error;
}

// Spec §4.3: hide helper badge when score < 10. Same threshold applied to
// the Top Helper card so we don't surface a "top helper" who barely qualifies.
export const HELPER_SCORE_VISIBILITY_THRESHOLD = 10;

// How many rows to pull when skipping the viewer — small constant avoids a
// self-join while still tolerating the case where the viewer IS the top.
const TOP_HELPER_FETCH_LIMIT = 5;

function toError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw;
  if (raw && typeof raw === 'object' && 'message' in raw) {
    return new Error(String((raw as { message: unknown }).message));
  }
  return new Error(fallback);
}

interface ScoreRow {
  user_id: string;
  helper_score: number;
  helpful_comments: number;
  likes_received_on_own_posts: number;
}

interface TopRow {
  user_id: string;
  helper_score: number;
  metro_area_id: string;
}

/** Returns the helper score for a single user. Score is 0 when no row exists. */
export async function getHelperScore(
  supabase: SupabaseClient,
  userId: string
): Promise<ScoreResult> {
  try {
    const { data, error } = await supabase
      .from('user_helper_scores')
      .select('user_id, helper_score, helpful_comments, likes_received_on_own_posts')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        data: {
          userId,
          helperScore: 0,
          helpfulComments: 0,
          likesReceivedOnOwnPosts: 0,
        },
      };
    }

    const row = data as ScoreRow;
    return {
      data: {
        userId: row.user_id,
        helperScore: row.helper_score,
        helpfulComments: row.helpful_comments,
        likesReceivedOnOwnPosts: row.likes_received_on_own_posts,
      },
    };
  } catch (error) {
    return { error: toError(error, 'Failed to load helper score') };
  }
}

/**
 * Returns the single highest-scoring qualifying helper in the metro (excluding
 * the viewer). Returns `null` (not an error) when nobody qualifies.
 */
export async function getTopHelperInMetro(
  supabase: SupabaseClient,
  metroAreaId: string,
  viewerId: string
): Promise<TopHelperResult> {
  try {
    const { data, error } = await supabase
      .from('user_helper_scores')
      .select('user_id, helper_score, metro_area_id')
      .eq('metro_area_id', metroAreaId)
      .gte('helper_score', HELPER_SCORE_VISIBILITY_THRESHOLD)
      .order('helper_score', { ascending: false })
      .limit(TOP_HELPER_FETCH_LIMIT);

    if (error) throw error;

    const rows = (data ?? []) as TopRow[];
    const firstNonViewer = rows.find((r) => r.user_id !== viewerId) ?? null;

    if (!firstNonViewer) return { data: null };

    return {
      data: {
        userId: firstNonViewer.user_id,
        helperScore: firstNonViewer.helper_score,
        metroAreaId: firstNonViewer.metro_area_id,
      },
    };
  } catch (error) {
    return { error: toError(error, 'Failed to load top helper') };
  }
}
