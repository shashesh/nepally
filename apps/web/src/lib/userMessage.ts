/**
 * The raw-error policy (PR 10b decision 10): a Supabase or shared-API error's
 * `message` is for the logs, never the screen. PostgREST passes RLS and
 * constraint text through unchanged, so showing it tells a member nothing
 * they can act on and leaks how the database is built.
 */
import { CONNECTION_ERROR_MESSAGE, isConnectionError, logClientEvent } from '@nepally/shared';

/** Logs the raw error and returns copy for the member: the connection sentence for a network failure, else `fallback`. */
export function userMessage(
  error: unknown,
  fallback: string,
  event: string,
  context?: Record<string, unknown>
): string {
  logClientEvent({ event, error, context });
  return isConnectionError(error) ? CONNECTION_ERROR_MESSAGE : fallback;
}
