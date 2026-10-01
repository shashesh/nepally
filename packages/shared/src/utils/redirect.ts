/** True for a space, a control character or a backslash, which browsers may read as a slash. */
function hasUnsafeCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x20 || code === 0x7f || char === '\\') return true;
  }
  return false;
}

/**
 * A same-origin path to return to after signing in (e.g. ?redirect=/delete-account),
 * or null when `value` isn't one. It refuses spaces, control characters and
 * backslashes, then parses the value against `origin` and accepts it only when
 * it starts with a single slash and the origin is unchanged. So `//evil.com`,
 * `/\evil.com`, `/<tab>/evil.com` and `https://evil.com` all fail. Pass the
 * value already decoded, as Next's router.query or URLSearchParams gives it.
 */
export function safeRedirectPath(value: unknown, origin: string): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  if (hasUnsafeCharacter(value)) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== new URL(origin).origin) return null;
    // Dot segments collapse during parsing: `/.//evil.com` becomes `//evil.com`,
    // which a browser reads as another site. Check the normalised path too.
    if (url.pathname.startsWith('//')) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Like safeRedirectPath, but never a sign-in page: those only lead back into signing in. */
export function getSignInReturnPath(value: unknown, origin: string): string | null {
  const path = safeRedirectPath(value, origin);
  if (path === null) return null;
  const pathname = new URL(path, origin).pathname.replace(/\/+$/, '');
  if (pathname === '/login' || pathname === '/auth/callback' || pathname.startsWith('/auth/')) {
    return null;
  }
  return path;
}
