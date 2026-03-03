-- Fix: include liker's name in individual like notifications
-- Previously used hardcoded "Someone liked your post"; now matches
-- the comment notification pattern by fetching the liker's full_name.

CREATE OR REPLACE FUNCTION public.notify_on_new_like()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  v_post_author_id UUID;
  v_post_title TEXT;
  v_like_count INT;
  v_notify_likes TEXT;
  v_liker_name TEXT;
BEGIN
  SELECT p.author_id, p.title, p.likes_count
  INTO v_post_author_id, v_post_title, v_like_count
  FROM public.posts p WHERE p.id = NEW.post_id;

  -- Skip if liker is the post author
  IF NEW.user_id = v_post_author_id THEN RETURN NEW; END IF;

  SELECT COALESCE(us.notify_likes, 'grouped') INTO v_notify_likes
  FROM public.user_settings us WHERE us.user_id = v_post_author_id;

  IF v_notify_likes = 'off' THEN RETURN NEW; END IF;

  IF v_notify_likes = 'all' OR (v_notify_likes = 'grouped' AND v_like_count % 5 = 0) THEN
    SELECT full_name INTO v_liker_name FROM public.users WHERE id = NEW.user_id;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_post_author_id,
      'post_response',
      CASE WHEN v_notify_likes = 'all'
        THEN COALESCE(v_liker_name, 'Someone') || ' liked your post'
        ELSE v_like_count::TEXT || ' people liked your post'
      END,
      LEFT(v_post_title, 100),
      jsonb_build_object('post_id', NEW.post_id, 'like_count', v_like_count)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';
