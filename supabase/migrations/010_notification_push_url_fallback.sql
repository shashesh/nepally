-- Migration 010: Notification push URL fallback for managed Supabase
-- Purpose: allow push fanout trigger to run even when custom DB settings cannot be altered.
-- NOTE: The hardcoded Supabase URL below is the project-specific fallback for this
-- hosted instance (tlusiongalvszftnzpoq). Update it if the project is ever migrated.

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
  v_supabase_url := COALESCE(
    NULLIF(current_setting('app.settings.supabase_url', true), ''),
    'https://tlusiongalvszftnzpoq.supabase.co'
  );
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json'
  );

  IF v_service_role_key IS NOT NULL AND v_service_role_key <> '' THEN
    v_headers := v_headers || jsonb_build_object(
      'Authorization', 'Bearer ' || v_service_role_key,
      'apikey', v_service_role_key
    );
  ELSE
    RAISE WARNING 'enqueue_notification_push_delivery: app.settings.service_role_key is not configured; invoking edge function without auth headers for notification %', NEW.id;
  END IF;

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
