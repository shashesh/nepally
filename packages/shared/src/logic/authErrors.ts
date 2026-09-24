/**
 * Member-facing sentences for Supabase auth errors.
 *
 * Keyed on the error's `code`, never its `message`: the raw message is for
 * logs (logClientEvent), not for the screen.
 */

export type AuthAction = 'log-in' | 'sign-up' | 'google' | 'resend';

/** The fields of a Supabase AuthError this reads; duck-typed so shared needn't import auth-js classes. */
export interface AuthErrorLike {
  name?: string;
  code?: string;
  status?: number;
}

const RATE_LIMITED = 'Too many attempts. Please wait a minute and try again.';

const CONNECTION_FAILED = "Couldn't reach Nepally. Check your connection and try again.";

const MESSAGES_BY_CODE: ReadonlyMap<string, string> = new Map([
  ['invalid_credentials', "That email and password don't match. Check them and try again."],
  ['email_not_confirmed', 'Confirm your email first. Use the link we sent when you signed up.'],
  ['over_email_send_rate_limit', RATE_LIMITED],
  ['over_request_rate_limit', RATE_LIMITED],
  ['weak_password', 'Choose a stronger password.'],
]);

const FALLBACKS: Record<AuthAction, string> = {
  'log-in': "Couldn't log you in. Please try again.",
  'sign-up': "Couldn't create your account. Please try again.",
  google: "Couldn't continue with Google. Please try again.",
  resend: "Couldn't resend the email. Please try again.",
};

const EXISTING_ACCOUNT_CODES = new Set(['user_already_exists', 'email_exists']);

function readAuthError(error: unknown): AuthErrorLike {
  if (typeof error !== 'object' || error === null) return {};
  const { name, code, status } = error as Record<string, unknown>;
  return {
    name: typeof name === 'string' ? name : undefined,
    code: typeof code === 'string' ? code : undefined,
    status: typeof status === 'number' ? status : undefined,
  };
}

/** A sentence for the member (decision 2). Never the raw message. */
export function getAuthErrorMessage(error: unknown, action: AuthAction): string {
  const { name, code, status } = readAuthError(error);
  const byCode = code === undefined ? undefined : MESSAGES_BY_CODE.get(code);
  if (byCode) return byCode;
  // auth-js wraps 5xx and network failures as AuthRetryableFetchError; the status covers them without it.
  if (name === 'AuthRetryableFetchError' || status === 0 || (status !== undefined && status >= 500)) {
    return CONNECTION_FAILED;
  }
  return FALLBACKS[action];
}

/** True for Supabase's existing-account codes (decision 3). */
export function isExistingAccountError(error: unknown): boolean {
  const { code } = readAuthError(error);
  return code !== undefined && EXISTING_ACCOUNT_CODES.has(code);
}
