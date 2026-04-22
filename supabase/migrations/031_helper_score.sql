-- 031_helper_score.sql
-- ADDITIVE: creates a read-only VIEW aggregating helper-reputation signals
-- per user over the last 365 days. No source tables modified.
--
-- Formula (v1, simplified from design spec §4.3):
--   helper_score =
--       (count of comments user made on OTHER users' posts in last 365 days) * 2
--     + (count of likes user's own posts received in last 365 days) * 1
--
-- The spec mentioned a third signal (chat threads from other users' posts);
-- dropped because conversations has no FK to posts. Revisit when that schema
-- link exists.
--
-- Why a VIEW not a materialized view:
--   Pre-launch scale is small. Per-read computation is acceptable. If the
--   hot path `getTopHelperInMetro` becomes slow, a future migration can
--   swap this for a MATERIALIZED VIEW with a lazy-refresh pattern mirroring
--   PR 2's fx_rates approach.
--
-- Rollback: write a new forward-only migration that runs:
--   DROP VIEW IF EXISTS user_helper_scores;

-- security_invoker = true so the view honors the caller's RLS on base tables
-- (matches the hardening pattern established in 026_fix_security_definer_views).
CREATE OR REPLACE VIEW user_helper_scores
WITH (security_invoker = true) AS
WITH comments_on_others AS (
  SELECT
    c.author_id AS user_id,
    COUNT(*) AS n
  FROM post_comments c
  JOIN posts p ON p.id = c.post_id
  WHERE c.is_deleted = false
    AND c.author_id <> p.author_id
    AND c.created_at >= (now() - interval '365 days')
  GROUP BY c.author_id
),
likes_received AS (
  SELECT
    p.author_id AS user_id,
    COUNT(*) AS n
  FROM post_likes pl
  JOIN posts p ON p.id = pl.post_id
  WHERE pl.created_at >= (now() - interval '365 days')
  GROUP BY p.author_id
)
SELECT
  u.id AS user_id,
  u.metro_area_id,
  COALESCE(coa.n, 0) AS helpful_comments,
  COALESCE(lr.n, 0) AS likes_received_on_own_posts,
  (COALESCE(coa.n, 0) * 2 + COALESCE(lr.n, 0) * 1) AS helper_score
FROM users u
LEFT JOIN comments_on_others coa ON coa.user_id = u.id
LEFT JOIN likes_received lr ON lr.user_id = u.id
WHERE u.is_banned = false;

COMMENT ON VIEW user_helper_scores IS
  'Derived helper-reputation score per user over last 365 days. Read-only.';

-- Public profile (/users/[id]) calls getHelperScore from the anon role, so
-- both anon and authenticated need SELECT. Matches listing_promotions_display.
GRANT SELECT ON user_helper_scores TO anon, authenticated;

-- Supporting indexes (idempotent; skip if already present).
CREATE INDEX IF NOT EXISTS idx_post_comments_author_created
  ON post_comments (author_id, created_at)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_post_likes_post_created
  ON post_likes (post_id, created_at);
