/**
 * The error a shared API function returns when Supabase hands back something
 * that isn't an `Error` (PR 10c decision 1).
 *
 * The message stays what the call site chose, so nothing member-facing moves;
 * the raw `code` rides along, and a request that never reached the server
 * carries `status: 0`, which `isConnectionError` reads as a connection failure.
 */

export class ApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, options: { code?: string; status?: number } = {}) {
    super(message);
    this.name = 'ApiError';
    if (options.code !== undefined) this.code = options.code;
    if (options.status !== undefined) this.status = options.status;
  }
}

/**
 * postgrest-js resolves a rejected fetch as `{ message: '<ErrorName>: <text>',
 * code: '' }` with `status: 0` on the response, not the error. A real
 * response always has a non-empty code or none at all.
 */
const FETCH_FAILURE_MESSAGE = /fetch|network|load failed|abort/i;

function isFetchFailure(code: unknown, message: unknown): boolean {
  return code === '' && typeof message === 'string' && FETCH_FAILURE_MESSAGE.test(message);
}

/** An `Error` comes back unchanged; anything else becomes an `ApiError` with `fallback` as its message. */
export function toApiError(raw: unknown, fallback: string): Error {
  if (raw instanceof Error) return raw;
  if (typeof raw !== 'object' || raw === null) return new ApiError(fallback);

  const { code, message } = raw as { code?: unknown; message?: unknown };
  return new ApiError(fallback, {
    code: typeof code === 'string' ? code : undefined,
    status: isFetchFailure(code, message) ? 0 : undefined,
  });
}
