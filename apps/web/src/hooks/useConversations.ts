import { getConversations } from '@nepally/shared';
import type { ConversationWithParticipant } from '@nepally/shared';
import { useUserList, type ListFetcher } from './useUserList';

export interface ConversationsState {
  conversations: ConversationWithParticipant[];
  loading: boolean;
  /** The load failed. The list is empty, never stale. */
  error: string | null;
  reload: () => void;
}

const LOAD_ERROR = "Couldn't load your messages.";

// Module-level so useUserList's effect sees a stable reference. The raw
// PostgREST message is swapped for a sentence a member can act on.
const fetchConversations: ListFetcher<ConversationWithParticipant> = async (client, userId) => {
  const result = await getConversations(client, userId);
  return result.error ? { error: new Error(LOAD_ERROR) } : { data: result.data };
};

/** The member's inbox. Not paged: getConversations returns every conversation. */
export function useConversations(userId: string | null): ConversationsState {
  const { items, loading, error, reload } = useUserList(userId, fetchConversations, LOAD_ERROR);
  return { conversations: items, loading, error, reload };
}
