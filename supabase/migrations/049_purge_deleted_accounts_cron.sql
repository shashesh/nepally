-- 049_purge_deleted_accounts_cron.sql
-- ADDITIVE / non-destructive: one pg_cron job. No schema changes.
-- Runs the purge-deleted-accounts edge function once a day: the second half
-- of in-app account deletion (spec: docs/specs/2026-09-28-account-deletion.md;
-- 048 added the request, restore and hiding).
--
--   Why an edge function, when 046 moved promotion expiry into SQL: a purge
--   must delete the user's files, and only the Storage API deletes the
--   stored files. Deleting rows from storage.objects in SQL would leave the
--   files behind. The function removes the files, then deletes the auth
--   user, and the ON DELETE CASCADE chain removes every row.
--
--   The job reads two Vault secrets when it runs, so no secret is stored in
--   this file or in cron.job:
--     project_url           https://<project-ref>.supabase.co
--     account_purge_secret  the same value as the function's
--                           ACCOUNT_PURGE_SECRET secret
--   They are created by hand in each environment (runbook:
--   docs/architecture/supabase-setup.md, "Scheduled Jobs"). Until they
--   exist the call fails, cron.job_run_details records the failure, and
--   nothing is deleted.
--
--   Daily at 09:00 UTC, early morning across the US. pg_net sends the
--   request in the background; the 60 s timeout (default 5 s) gives the
--   function time to answer, and its logs record what it purged.
--
--   cron.schedule with a job name replaces an existing job of that name,
--   so re-running this migration does not add a second job.
--
-- Idempotent: the named cron.schedule can be re-run.
--
-- Verify: SELECT jobname, schedule, active FROM cron.job; then, after the
-- secrets exist, npm run test:security:account-purge against staging.
--
-- Rollback (forward-only): a new migration that runs
--   SELECT cron.unschedule('purge-deleted-accounts');

SELECT cron.schedule(
  'purge-deleted-accounts',
  '0 9 * * *',
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
