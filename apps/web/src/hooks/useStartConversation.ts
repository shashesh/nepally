import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { getOrCreateConversation } from '@nepally/shared';
import { supabase } from '../lib/supabase';
import { notify } from '../components/ui/notify';
import { useAuth } from './useAuth';

export interface ConversationPartner {
  id: string;
  /** Full name; stored on the conversation as the participant's name. */
  name: string;
}

export interface StartConversationOptions {
  /**
   * Runs first, inside the double-press guard, e.g. listing detail's contact
   * counter, so a second press can't run it twice. Best effort: if it
   * rejects, the conversation still opens.
   */
  beforeStart?: () => Promise<unknown>;
}

export interface StartConversation {
  start: (partner: ConversationPartner, options?: StartConversationOptions) => Promise<void>;
  /**
   * True from the press until a failure, or until navigation unmounts the
   * caller: it stays set on success so the button can't start a second one
   * while the route changes.
   */
  starting: boolean;
}

const START_ERROR = "Couldn't start a conversation. Please try again.";

/**
 * Opens the viewer's conversation with a member, creating it on first
 * contact. Every "Message" / "Chat" / "Contact seller" entry point goes
 * through here so they all behave the same way on failure and double press.
 */
export function useStartConversation(): StartConversation {
  const router = useRouter();
  const { user } = useAuth();
  const [starting, setStarting] = useState(false);
  // State lags a render, so a quick second press would see `starting` false.
  const startingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const start = useCallback(
    async (partner: ConversationPartner, options: StartConversationOptions = {}): Promise<void> => {
      if (!user) {
        void router.push('/login');
        return;
      }
      if (partner.id === user.id || startingRef.current) return;

      startingRef.current = true;
      setStarting(true);
      try {
        await options.beforeStart?.();
      } catch {
        // A side effect like a counter must not stand between a member and the chat.
      }
      // Gone before we asked: don't create a conversation nobody will see.
      if (!mountedRef.current) return;

      const result = await getOrCreateConversation(supabase, user.id, user.full_name, partner.id, partner.name);
      if (!mountedRef.current) return;

      if (result.data) {
        void router.push(`/messages/${result.data.conversationId}`);
      } else {
        startingRef.current = false;
        setStarting(false);
        notify.error(START_ERROR);
      }
    },
    [user, router]
  );

  return { start, starting };
}
