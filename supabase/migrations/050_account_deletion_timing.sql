-- 050_account_deletion_timing.sql
-- ADDITIVE / non-destructive: two functions replaced in place, two
-- service_role functions added, and one pg_cron job rescheduled. No schema or
-- data changes.
--
-- Two timing fixes to account deletion (spec:
-- docs/specs/2026-09-28-account-deletion.md §4.4), found in review after 048
-- and 049 were applied to staging.
--
--   Restore closes at the date. Under 048, cancel_account_deletion() cleared
--   the date at any time. The purge re-reads the row before deleting the
--   auth user, but a restore could still land between that read and the
--   delete, and the restored account would be lost. Now cancel refuses once
--   deletion_scheduled_for has passed, raising 'deletion_in_progress'
--   (SQLSTATE P0001, which the apps match on).
--
--   The purge asks the database which accounts are due, through
--   list_due_account_deletions(limit) and is_due_for_purge(uid). An account
--   is due an hour after its date, by now() here. Both "due" and "can
--   restore" are decided by the same clock, so any account the purge can
--   pick is one no member can restore. The hour also covers a cancel whose
--   transaction began just before the date. The row lock keeps a request and
--   a cancel from interleaving. Both functions are service_role only.
--
--   "Within 30 days" holds. The privacy policy promises removal within 30
--   days. With a 30-day grace period and a daily run, removal landed up to
--   25 hours late. request_account_deletion() now sets the date 29 days out
--   (ACCOUNT_DELETION_GRACE_DAYS in @nepally/shared), and the job runs
--   hourly. An account goes at most about two hours after its date: the
--   one-hour margin plus the wait for the next run. A failed purge is
--   retried an hour later.
--
--   The cron.schedule call below repeats 049's job body with the new
--   schedule. Scheduling by name replaces the existing job.
--
-- Grants are restated, although CREATE OR REPLACE keeps them, so this file
-- reads on its own. They match 048.
--
-- Idempotent: CREATE OR REPLACE, GRANT/REVOKE and the named cron.schedule
-- can all be re-run.
--
-- Verify: npm run test:security:account-deletion,
-- npm run test:security:functions and npm run test:security:account-purge
-- (after the function is redeployed) against staging, then
--   SELECT jobname, schedule, active FROM cron.job;
-- lists purge-deleted-accounts | 0 * * * * | t.
--
-- Rollback (forward-only): a new migration that restores 048's bodies of
-- both functions, reschedules the job with 049's '0 9 * * *', and drops the
-- two due-check functions once no deployed purge calls them.

-- ---------------------------------------------------------------------------
-- 1) request_account_deletion(): 29 days
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.request_account_deletion()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_grace_period           CONSTANT interval := interval '29 days';
  c_reauth_max_age_seconds CONSTANT integer  := 600;
  v_user_id   uuid := auth.uid();
  v_scheduled timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT public.amr_signed_in_within(auth.jwt() -> 'amr', c_reauth_max_age_seconds) THEN
    RAISE EXCEPTION 'reauth_required' USING ERRCODE = 'P0001';
  END IF;

  SELECT u.deletion_scheduled_for
    INTO v_scheduled
    FROM public.users u
   WHERE u.id = v_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_scheduled IS NOT NULL THEN
    RETURN v_scheduled;
  END IF;

  UPDATE public.users
     SET deletion_scheduled_for = now() + c_grace_period
   WHERE id = v_user_id
  RETURNING deletion_scheduled_for INTO v_scheduled;

  DELETE FROM public.device_tokens WHERE user_id = v_user_id;

  RETURN v_scheduled;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) cancel_account_deletion(): refused once the date has passed
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id   uuid := auth.uid();
  v_scheduled timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT u.deletion_scheduled_for
    INTO v_scheduled
    FROM public.users u
   WHERE u.id = v_user_id
     FOR UPDATE;

  IF v_scheduled IS NULL THEN
    RETURN;
  END IF;

  IF v_scheduled <= now() THEN
    RAISE EXCEPTION 'deletion_in_progress' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.users
     SET deletion_scheduled_for = NULL
   WHERE id = v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_account_deletion() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.cancel_account_deletion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_account_deletion() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Which accounts are due, by the database's clock
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.list_due_account_deletions(p_limit integer)
RETURNS TABLE (id uuid)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT u.id
    FROM public.users u
   WHERE u.deletion_scheduled_for <= now() - interval '1 hour'
   ORDER BY u.deletion_scheduled_for
   LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.is_due_for_purge(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.users u
     WHERE u.id = p_user_id
       AND u.deletion_scheduled_for <= now() - interval '1 hour'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.list_due_account_deletions(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_due_account_deletions(integer) TO service_role;

REVOKE EXECUTE ON FUNCTION public.is_due_for_purge(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_due_for_purge(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 4) The purge job runs hourly (049's body, new schedule)
-- ---------------------------------------------------------------------------

SELECT cron.schedule(
  'purge-deleted-accounts',
  '0 * * * *',
  $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/purge-deleted-accounts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-purge-secret',
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'account_purge_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
