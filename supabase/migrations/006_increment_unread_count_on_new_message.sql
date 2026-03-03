CREATE OR REPLACE FUNCTION public.increment_unread_count_on_new_message()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id <> NEW.sender_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

DROP TRIGGER IF EXISTS trigger_increment_unread_on_new_message ON public.messages;

CREATE TRIGGER trigger_increment_unread_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.increment_unread_count_on_new_message();
