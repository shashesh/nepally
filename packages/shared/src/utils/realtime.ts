/**
 * Supabase Realtime helpers shared by web and mobile.
 */

let topicSequence = 0;

/**
 * A channel topic no earlier subscription in this client used.
 *
 * realtime-js keeps a channel in its list until its leave round trip
 * finishes, and `client.channel(topic)` hands back that leaving channel when
 * the topic matches, whose `subscribe()` then does nothing. Resubscribing to
 * the same topic straight after removing it — React StrictMode's dev remount,
 * or switching A → B → A quickly — would leave the new subscriber with no
 * events at all. A suffix makes every subscription its own channel.
 */
export function uniqueChannelTopic(base: string): string {
  topicSequence += 1;
  return `${base}:${topicSequence}`;
}
