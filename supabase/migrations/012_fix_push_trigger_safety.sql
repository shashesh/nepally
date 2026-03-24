-- Migration 012: Fix push trigger safety guards
-- Purpose: Remove hardcoded Supabase URL fallback (prevents cross-environment data leakage)
-- and short-circuit early when service_role_key is not configured (avoids repeated
-- unauthenticated HTTP requests that will be rejected when verify_jwt = true).

CREATE OR REPLACE FUNCTION enqueue_notification_push_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_headers JSONB;
  v_body JSONB;
BEGIN
  v_supabase_url := NULLIF(current_setting('app.settings.supabase_url', true), '');
  v_service_role_key := NULLIF(current_setting('app.settings.service_role_key', true), '');

  -- Skip if supabase_url is not configured — we cannot safely determine which
  -- project to target, and guessing may route push payloads to the wrong environment.
  -- In local/CI environments this is expected: leave the setting unset to disable
  -- push delivery. In production, this warning indicates a misconfiguration.
  IF v_supabase_url IS NULL THEN
    RAISE WARNING 'enqueue_notification_push_delivery: app.settings.supabase_url is not configured; skipping edge function call for notification %', NEW.id;
    RETURN NEW;
  END IF;

  -- Skip if service_role_key is not configured to avoid repeated unauthenticated
  -- requests that will be rejected when the edge function has verify_jwt = true.
  -- In local/CI environments this is expected: leave the setting unset to disable
  -- push delivery. In production, this warning indicates a misconfiguration.
  IF v_service_role_key IS NULL THEN
    RAISE WARNING 'enqueue_notification_push_delivery: app.settings.service_role_key is not configured; skipping edge function call for notification %', NEW.id;
    RETURN NEW;
  END IF;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_service_role_key,
    'apikey', v_service_role_key
  );

  v_body := jsonb_build_object(
    'userId', NEW.user_id::TEXT,
    'title', NEW.title,
    'body', NEW.body,
    'data', COALESCE(NEW.data, '{}'::jsonb),
    'url', build_notification_push_url(NEW.type, COALESCE(NEW.data, '{}'::jsonb))
  );

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-push-notification',
    headers := v_headers,
    body := v_body
  );

  RETURN NEW;
END;
$$;
