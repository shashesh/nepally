-- 051_post_comments_delete_count.sql
-- ADDITIVE / non-destructive: one trigger function and one trigger. No data
-- changes.
--
-- posts.comments_count is kept by two triggers from 001: one on INSERT, and
-- one on the soft-delete UPDATE (is_deleted false -> true). Nothing handles a
-- hard DELETE, so a deleted comment kept counting. No app code hard-deletes a
-- comment (001's DELETE policy allows only moderators to), but the account
-- purge does (spec:
-- docs/specs/2026-09-28-account-deletion.md §4.5): deleting the auth user
-- cascades to the member's comments on other members' posts, which would
-- leave those posts showing too many comments for good.
--
--   decrement_post_comments_count_on_delete(): AFTER DELETE, per row. It
--   decrements the post's comments_count only when the comment wasn't
--   already soft-deleted, because the soft-delete trigger counted that one
--   down already. It clamps at zero and is SECURITY DEFINER with an empty
--   search_path, like the 001 counter triggers. When the post itself is being
--   deleted (a cascade from posts), the UPDATE finds no row and does
--   nothing, the same as the post_likes delete trigger.
--
--   041: a trigger function needs no EXECUTE grant. The trigger fires
--   without one, so no client role gets it.
--
-- Idempotent: CREATE OR REPLACE FUNCTION and CREATE OR REPLACE TRIGGER
-- (Postgres 14+) can be re-run.
--
-- Verify: npm run test:security:account-purge against staging. It checks
-- that a purged member's comment stops counting. To look for drift left by
-- earlier hard deletes:
--   SELECT p.id, p.comments_count, count(c.id) FILTER (WHERE NOT c.is_deleted)
--     FROM posts p LEFT JOIN post_comments c ON c.post_id = p.id
--    GROUP BY p.id
--   HAVING p.comments_count <> count(c.id) FILTER (WHERE NOT c.is_deleted);
--
-- Rollback (forward-only): a new migration that drops the trigger and the
-- function.

CREATE OR REPLACE FUNCTION public.decrement_post_comments_count_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.is_deleted = false THEN
    UPDATE public.posts
       SET comments_count = GREATEST(0, comments_count - 1)
     WHERE id = OLD.post_id;
  END IF;
  RETURN OLD;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrement_post_comments_count_on_delete() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER trigger_decrement_post_comments_count_on_delete
  AFTER DELETE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.decrement_post_comments_count_on_delete();
