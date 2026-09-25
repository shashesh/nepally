-- 046_expire_paid_promotions_cron.sql
-- ADDITIVE / non-destructive: one new function and one pg_cron job. No
-- schema changes.
-- Expires paid promotions past their end date from inside the database, on
-- an hourly pg_cron job, in place of the expire-promotions edge function.
--
--   Problem: the expire-promotions edge function was deployed with
--   verify_jwt = false and checked no secret, so anyone who knew its URL
--   could run it. Nothing ever scheduled it either: staging had no pg_cron
--   job, so paid promotions stayed 'active' after their end date. Reads were
--   unaffected (the display policy on listing_promotions from 026, the
--   listing_promotions_display view from 024 and the checkout's duplicate
--   check all compare end_date to now()), but the status column was wrong, and
--   any future reader trusting it alone would show ended promotions.
--
--   The launch plan (SEC-06) proposed a shared-secret header on the
--   function. Running the UPDATE in the database instead removes the public
--   endpoint altogether, with no secret to store, rotate or send over
--   pg_net. The edge function (and the dead expire-posts, which queried the
--   posts.expiry_date column dropped in the 2026-02 tag redesign) is deleted
--   in the same PR.
--
--   expire_paid_promotions() does the same UPDATE the edge function did:
--   active paid promotions whose end_date has passed become 'expired'.
--   premium_perk rows have end_date NULL (023's shape check) and never
--   match. It returns how many rows it expired, which pg_cron records in
--   cron.job_run_details.
--
--   SECURITY INVOKER: pg_cron runs the job as postgres, which owns
--   listing_promotions, and service_role bypasses RLS, so neither needs
--   definer rights. EXECUTE goes to service_role only (for the smoke test
--   and manual runs); anon and authenticated must not be able to expire
--   anyone's promotions. 041's default privileges already withhold it from
--   them; the explicit REVOKE keeps that true on a database set up any
--   other way.
--
--   cron.schedule with a job name replaces an existing job of that name,
--   so re-running this migration does not add a second job.
--
-- Idempotent: CREATE OR REPLACE, GRANT/REVOKE and the named cron.schedule
-- can all be re-run.
--
-- Verify: npm run test:security:promotion-expiry against staging, then
--   SELECT jobname, schedule, active FROM cron.job;
--
-- Rollback (forward-only): a new migration that runs
--   SELECT cron.unschedule('expire-paid-promotions');
-- and drops the function.

CREATE OR REPLACE FUNCTION public.expire_paid_promotions()
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH expired AS (
    UPDATE public.listing_promotions
       SET status = 'expired'
     WHERE status = 'active'
       AND source = 'paid'
       AND end_date <= now()
    RETURNING 1
  )
  SELECT count(*)::integer FROM expired;
$$;

REVOKE EXECUTE ON FUNCTION public.expire_paid_promotions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_paid_promotions() TO service_role;

-- Hourly, five past the hour.
SELECT cron.schedule(
  'expire-paid-promotions',
  '5 * * * *',
  'SELECT public.expire_paid_promotions()'
);
