-- Migration 009: Notification push fanout trigger via Edge Function
-- Purpose: define and wire the database invocation path from notifications inserts
-- to the send-push-notification edge function.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION build_notification_push_url(
  p_type notification_type,
  p_data JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url TEXT := '/notifications';
BEGIN
  IF p_type = 'message' AND p_data ? 'conversation_id' THEN
    v_url := '/messages/' || (p_data->>'conversation_id');
  ELSIF (p_type = 'post_response' OR p_type = 'emergency_alert') AND p_data ? 'post_id' THEN
    v_url := '/posts/' || (p_data->>'post_id');
  ELSIF p_data ? 'event_id' THEN
    v_url := '/events/' || (p_data->>'event_id');
  END IF;

  RETURN v_url;
END;
$$;

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
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_service_role_key := current_setting('app.settings.service_role_key', true);

  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    RAISE WARNING 'enqueue_notification_push_delivery: app.settings.supabase_url is not configured; skipping push dispatch for notification %', NEW.id;
    RETURN NEW;
  END IF;

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

DROP TRIGGER IF EXISTS trigger_enqueue_notification_push_delivery ON notifications;

CREATE TRIGGER trigger_enqueue_notification_push_delivery
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_notification_push_delivery();
